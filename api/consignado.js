const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.portaldoconsignado.com.br';

async function consultarMargem(jsessionid, cpf, opcoes = {}) {
  const { matricula = '', orgao = '', produto = '', especie = '' } = opcoes;

  const digits = cpf.replace(/\D/g, '');
  const cpfFmt = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  const session = axios.create({
    baseURL: BASE,
    headers: {
      Cookie: `JSESSIONID=${jsessionid}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  // PASSO 1 — CSRF Token
  const csrfResp = await session.get('/csrfTokenS');
  const tokenMatch = csrfResp.data.match(/"SECURITYTOKEN",\s*"([^"]+)"/);
  if (!tokenMatch) {
    throw new Error('Sessão expirada — cole um novo JSESSIONID no painel');
  }
  const token = tokenMatch[1];

  // PASSO 2 — Endpoint dinâmico do Wicket
  const formResp = await session.get('/consignatario/pesquisarMargem', {
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });

  if (formResp.data.includes('j_spring_security_check') || formResp.data.includes('divLogin')) {
    throw new Error('Sessão expirada — cole um novo JSESSIONID no painel');
  }

  const pageMatch = formResp.data.match(/pesquisarMargem\?(\d+)/);
  if (!pageMatch) {
    const snippet = formResp.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new Error(`Página inesperada do portal: "${snippet}"`);
  }

  const pageId = pageMatch[1];
  const endpoint = `/consignatario/pesquisarMargem?${pageId}-1.IBehaviorListener.0-form-botaoPesquisar`;

  // PASSO 3 — Consulta
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

  const resultado = await session.post(endpoint, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'CSRF Prevention',
    },
    validateStatus: s => s < 500,
  });

  return parseResultado(resultado.data);
}

// Mantém a sessão ativa fazendo uma requisição leve
async function pingSession(jsessionid) {
  try {
    const resp = await axios.get(`${BASE}/csrfTokenS`, {
      headers: { Cookie: `JSESSIONID=${jsessionid}` },
      validateStatus: s => s < 500,
    });
    return resp.data.includes('SECURITYTOKEN');
  } catch {
    return false;
  }
}

function parseResultado(xmlData) {
  const result = { servidor: null, cpf: null, orgaos: [] };

  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let fullHtml = '';
  let m;
  while ((m = cdataRegex.exec(xmlData)) !== null) fullHtml += m[1];
  if (!fullHtml) fullHtml = xmlData;

  const $ = cheerio.load(fullHtml);

  $('span, td, div').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (!result.cpf && /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(txt)) {
      result.cpf = txt.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/)[1];
    }
    if (!result.servidor && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{10,60}$/.test(txt) && txt.split(' ').length >= 2) {
      result.servidor = txt;
    }
  });

  const processadas = new Set();
  $('table[id*="Margem"], table[id*="margem"], table').each((_, table) => {
    const tid = $(table).attr('id') || '';
    if (processadas.has(tid)) return;
    processadas.add(tid);

    const rows = [];
    $(table).find('tr').each((_, tr) => {
      const cells = [];
      $(tr).find('td, th').each((_, td) => cells.push($(td).text().replace(/\s+/g, ' ').trim()));
      if (cells.some(c => c.length > 0)) rows.push(cells);
    });

    if (rows.length >= 2) {
      const header = rows[0].join(' ').toLowerCase();
      result.orgaos.push({
        id: tid || `tabela_${result.orgaos.length}`,
        tipo: (header.includes('margem') || header.includes('produto') || header.includes('valor'))
          ? 'margem' : (header.includes('rgao') || header.includes('identifica'))
          ? 'orgao' : 'dados',
        linhas: rows,
      });
    }
  });

  return result;
}

module.exports = { consultarMargem, pingSession };
