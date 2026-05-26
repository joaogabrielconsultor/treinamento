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

function extractCookies(resp, current) {
  if (!resp.headers['set-cookie']) return current;
  return mergeCookies(current, parseCookies(resp.headers['set-cookie']));
}

// PASSO 1 — Login
async function login(usuario, senha) {
  const body = new URLSearchParams({ j_username: usuario, j_password: senha });

  const resp = await axios.post(
    `${BASE}/consignatario/j_spring_security_check`,
    body.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: s => s < 500,
    }
  );

  let cookies = parseCookies(resp.headers['set-cookie']);

  // Segue redirect manual para consolidar todos os cookies
  let location = resp.headers.location;
  let lastHtml = resp.data || '';
  let followed = 0;

  while (location && followed < 8) {
    const url = location.startsWith('http') ? location : `${BASE}${location}`;
    const r = await axios.get(url, {
      headers: { Cookie: cookies },
      maxRedirects: 0,
      validateStatus: s => s < 500,
    });
    cookies = extractCookies(r, cookies);
    lastHtml = r.data || '';
    location = r.headers.location || null;
    followed++;
  }

  if (!cookies.includes('JSESSIONID')) {
    throw new Error('Login falhou — verifique usuário e senha no cadastro de Login Bancos');
  }

  return { cookies, lastHtml };
}

// PASSO 1b — Seleção de perfil (se o portal exibir tela de perfil após login)
async function selecionarPerfil(cookies, html) {
  const $ = cheerio.load(html);

  // Verifica se é uma tela de seleção de perfil
  const listaPerfil = $('.listaPerfil, #divPerfilLogin');
  if (listaPerfil.length === 0) return cookies;

  // Pega a action do form e o primeiro radio/perfil disponível
  const form = $('form').first();
  const action = form.attr('action') || '';
  const firstRadio = $('input[type="radio"]').first();
  const radioName = firstRadio.attr('name') || '';
  const radioValue = firstRadio.attr('value') || '';

  if (!action || !radioValue) return cookies;

  const url = action.startsWith('http') ? action : `${BASE}${action}`;

  const body = new URLSearchParams();
  if (radioName) body.set(radioName, radioValue);
  // Adiciona hidden fields
  $('input[type="hidden"]').each((_, el) => {
    const n = $(el).attr('name');
    const v = $(el).attr('value') || '';
    if (n) body.set(n, v);
  });
  // Botão de submit
  const btnName = $('button[type="submit"], input[type="submit"]').first().attr('name');
  const btnValue = $('button[type="submit"], input[type="submit"]').first().attr('value') || '1';
  if (btnName) body.set(btnName, btnValue);

  const resp = await axios.post(url, body.toString(), {
    headers: { Cookie: cookies, 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 5,
    validateStatus: s => s < 500,
  });

  return extractCookies(resp, cookies);
}

// PASSO 2 — CSRF Token
async function getCsrfToken(cookies) {
  const resp = await axios.get(`${BASE}/csrfTokenS`, {
    headers: { Cookie: cookies },
  });
  const match = resp.data.match(/"SECURITYTOKEN",\s*"([^"]+)"/);
  if (!match) throw new Error('CSRF token não encontrado — sessão pode ter expirado');
  return match[1];
}

// PASSO 3 — Endpoint dinâmico do Wicket
async function getWicketEndpoint(cookies) {
  const resp = await axios.get(`${BASE}/consignatario/pesquisarMargem`, {
    headers: { Cookie: cookies },
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });

  const cookies2 = extractCookies(resp, cookies);
  const html = resp.data || '';

  // Diagnóstico: detecta se voltou para tela de login
  if (html.includes('j_spring_security_check') || html.includes('divLogin')) {
    throw new Error('Sessão não autenticada — login falhou ou perfil não foi selecionado');
  }

  // Extrai o número de sessão Wicket da action do formulário
  const match = html.match(/pesquisarMargem\?(\d+)/);
  if (!match) {
    // Retorna trecho da página para ajudar no diagnóstico
    const snippet = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    throw new Error(`Endpoint Wicket não encontrado. Página retornada: "${snippet}"`);
  }

  const pageId = match[1];
  const endpoint = `${BASE}/consignatario/pesquisarMargem?${pageId}-1.IBehaviorListener.0-form-botaoPesquisar`;

  return { endpoint, cookies: cookies2 };
}

// PASSO 4 — Parser do resultado XML/AJAX
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
        tipo: (header.includes('margem') || header.includes('produto') || header.includes('valor')) ? 'margem'
            : (header.includes('rgao') || header.includes('identifica')) ? 'orgao' : 'dados',
        linhas: rows,
      });
    }
  });

  return result;
}

async function consultarMargem(usuario, senha, cpf, opcoes = {}) {
  const { matricula = '', orgao = '', produto = '', especie = '' } = opcoes;

  const digits = cpf.replace(/\D/g, '');
  const cpfFmt = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  // Passo 1 — login
  let { cookies, lastHtml } = await login(usuario, senha);

  // Passo 1b — seleciona perfil se necessário
  cookies = await selecionarPerfil(cookies, lastHtml);

  // Passo 2 — CSRF
  const token = await getCsrfToken(cookies);

  // Passo 3 — endpoint Wicket
  const { endpoint, cookies: cookies3 } = await getWicketEndpoint(cookies);
  cookies = cookies3;

  // Passo 4 — consulta
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

  return parseResultado(resp.data);
}

module.exports = { consultarMargem };
