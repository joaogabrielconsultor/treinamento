const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.portaldoconsignado.com.br';

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  const arr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return arr.map(c => c.split(';')[0]).join('; ');
}

function mergeCookies(base, incoming) {
  const map = {};
  [...base.split('; '), ...incoming.split('; ')].forEach(c => {
    const idx = c.indexOf('=');
    if (idx < 0) return;
    const k = c.slice(0, idx).trim();
    const v = c.slice(idx + 1);
    if (k) map[k] = v;
  });
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// PASSO 1 — Login e obtenção do JSESSIONID
async function login(usuario, senha) {
  const body = new URLSearchParams({ j_username: usuario, j_password: senha });

  const resp = await axios.post(
    `${BASE}/consignatario/j_spring_security_check`,
    body.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: s => s < 400,
    }
  );

  let cookies = parseCookies(resp.headers['set-cookie']);

  // Segue o redirect para consolidar cookies
  if ((resp.status === 301 || resp.status === 302) && resp.headers.location) {
    const loc = resp.headers.location.startsWith('http')
      ? resp.headers.location
      : `${BASE}${resp.headers.location}`;
    const resp2 = await axios.get(loc, {
      headers: { Cookie: cookies },
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });
    if (resp2.headers['set-cookie']) {
      cookies = mergeCookies(cookies, parseCookies(resp2.headers['set-cookie']));
    }
  }

  if (!cookies.includes('JSESSIONID')) {
    throw new Error('Login falhou — verifique usuário e senha');
  }

  return cookies;
}

// PASSO 2 — CSRF Token
async function getCsrfToken(cookies) {
  const resp = await axios.get(`${BASE}/csrfTokenS`, {
    headers: { Cookie: cookies },
  });
  // Formato exato retornado pelo portal
  const match = resp.data.match(/"SECURITYTOKEN",\s*"([^"]+)"/);
  if (!match) throw new Error('CSRF token não encontrado na resposta');
  return match[1];
}

// PASSO 3 — Endpoint dinâmico do Wicket
async function getWicketEndpoint(cookies) {
  const resp = await axios.get(`${BASE}/consignatario/pesquisarMargem`, {
    headers: { Cookie: cookies },
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });

  let updatedCookies = cookies;
  if (resp.headers['set-cookie']) {
    updatedCookies = mergeCookies(cookies, parseCookies(resp.headers['set-cookie']));
  }

  // Extrai o número de sessão da action do formulário
  // Ex: action="./pesquisarMargem?29-1.IFormSubmitListener-form"
  const match = resp.data.match(/pesquisarMargem\?(\d+)/);
  if (!match) throw new Error('Endpoint Wicket não encontrado na página');

  const pageId = match[1];
  const endpoint = `${BASE}/consignatario/pesquisarMargem?${pageId}-1.IBehaviorListener.0-form-botaoPesquisar`;

  return { endpoint, cookies: updatedCookies };
}

// PASSO 5 — Parser da resposta XML/AJAX
function parseResultado(xmlData) {
  const result = {
    servidor: null,
    cpf: null,
    orgaos: [],
  };

  // Extrai HTML dos blocos CDATA
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let fullHtml = '';
  let m;
  while ((m = cdataRegex.exec(xmlData)) !== null) {
    fullHtml += m[1];
  }

  const $ = cheerio.load(fullHtml);

  // Nome e CPF do servidor
  $('span, td, div').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (!result.cpf && /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(txt)) {
      result.cpf = txt.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/)[1];
    }
    if (!result.servidor && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{10,60}$/.test(txt) && txt.split(' ').length >= 2) {
      result.servidor = txt;
    }
  });

  // Tabelas de margem (id="tabelaMargem" ou qualquer tabela com dados financeiros)
  const tabelasProcessadas = new Set();

  $('table[id*="Margem"], table[id*="margem"], table').each((_, table) => {
    const tableId = $(table).attr('id') || '';
    if (tabelasProcessadas.has(tableId)) return;
    tabelasProcessadas.add(tableId);

    const rows = [];
    $(table).find('tr').each((_, tr) => {
      const cells = [];
      $(tr).find('td, th').each((_, td) => {
        cells.push($(td).text().replace(/\s+/g, ' ').trim());
      });
      if (cells.some(c => c.length > 0)) rows.push(cells);
    });

    if (rows.length >= 2) {
      // Detecta se é tabela de órgão/identificação ou de margens
      const header = rows[0].join(' ').toLowerCase();
      const temMargem = header.includes('margem') || header.includes('produto') || header.includes('valor');
      const temOrgao = header.includes('órgão') || header.includes('orgao') || header.includes('identificação');

      result.orgaos.push({
        id: tableId || `tabela_${result.orgaos.length}`,
        tipo: temMargem ? 'margem' : temOrgao ? 'orgao' : 'dados',
        linhas: rows,
      });
    }
  });

  return result;
}

// Função principal exportada
async function consultarMargem(usuario, senha, cpf, opcoes = {}) {
  const { matricula = '', orgao = '', produto = '', especie = '' } = opcoes;

  const digits = cpf.replace(/\D/g, '');
  const cpfFmt = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  // Passo 1
  let cookies = await login(usuario, senha);

  // Passo 2
  const token = await getCsrfToken(cookies);

  // Passo 3
  const { endpoint, cookies: updatedCookies } = await getWicketEndpoint(cookies);
  cookies = updatedCookies;

  // Passo 4 — POST com os dados
  const body = new URLSearchParams({
    'id1bc_hf_0': '',
    cpfServidor: cpfFmt,
    matriculaServidor: matricula,
    selectOrgao: orgao,
    selectProduto: produto,
    selectEspecie: especie,
    SECURITYTOKEN: token,
    botaoPesquisar: '1',
  });

  const resp = await axios.post(endpoint, body.toString(), {
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'CSRF Prevention',
    },
    validateStatus: s => s < 500,
  });

  // Passo 5
  return parseResultado(resp.data);
}

module.exports = { consultarMargem };
