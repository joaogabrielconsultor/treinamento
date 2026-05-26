const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.portaldoconsignado.com.br';

function getTextAfterLabel($, label) {
  let value = null;
  $('.dados').each((_, el) => {
    if ($(el).text().includes(label)) {
      value = $(el).find('span').first().text().trim() || null;
      return false;
    }
  });
  return value;
}

function parseResultado(xmlData) {
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let fullHtml = '';
  let m;
  while ((m = cdataRegex.exec(xmlData)) !== null) fullHtml += m[1];
  if (!fullHtml) fullHtml = xmlData;

  const $ = cheerio.load(fullHtml);

  const servidor = {
    cpf:          getTextAfterLabel($, 'CPF -'),
    nome:         getTextAfterLabel($, 'Nome -'),
    orgao:        getTextAfterLabel($, 'Órgão -'),
    identificacao: getTextAfterLabel($, 'Identificação -'),
    mesReferencia: getTextAfterLabel($, 'Mês de Referência'),
    proximaFolha:  getTextAfterLabel($, 'Próxima Folha'),
    lotacao:      $('input#inputLotacao').attr('value') || null,
    cargo:        $('input#inputCargo').attr('value') || null,
    dataAdmissao: $('input#inputDataAdmissao').attr('value') || null,
    tipoVinculo:  $('input#inputTipoVinculo').attr('value') || null,
  };

  function extrairMargem(painelId) {
    const resultado = [];
    $(`#${painelId} table#tabelaMargem tbody tr`).each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length >= 2) {
        resultado.push({
          produto: $(cells[0]).text().replace(/\s+/g, ' ').trim(),
          valor:   $(cells[1]).text().replace(/\s+/g, ' ').trim(),
        });
      }
    });
    return resultado;
  }

  return {
    servidor,
    margemBruta:      extrairMargem('painelMargensBrutas'),
    margemDisponivel: extrairMargem('painelMargensDisponiveis'),
  };
}

async function consultarMargem(jsessionid, cpf, opcoes = {}) {
  const { matricula = '', orgao = '', produto = '', especie = '' } = opcoes;
  const cpfDigits = cpf.replace(/\D/g, '');

  const baseHeaders = {
    Cookie: `JSESSIONID=${jsessionid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Origin': BASE,
  };

  // PASSO 1 — CSRF Token
  const csrfResp = await axios.get(`${BASE}/csrfTokenS`, { headers: baseHeaders });
  const tokenMatch = csrfResp.data.match(/"SECURITYTOKEN",\s*"([^"]+)"/);
  if (!tokenMatch) throw new Error('Sessão expirada — cole um novo JSESSIONID no painel');
  const token = tokenMatch[1];

  // PASSO 2 — Endpoint Wicket + ID do formulário
  const formResp = await axios.get(`${BASE}/consignatario/pesquisarMargem`, {
    headers: baseHeaders,
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });

  if (formResp.data.includes('j_spring_security_check') || formResp.data.includes('divLogin')) {
    throw new Error('Sessão expirada — cole um novo JSESSIONID no painel');
  }

  const pageMatch = formResp.data.match(/pesquisarMargem\?(\d+)/);
  if (!pageMatch) throw new Error('Página do portal não reconhecida');
  const N = pageMatch[1];

  const $form = cheerio.load(formResp.data);
  const formId = $form('form').first().attr('id') || 'id1d';
  const hiddenField = `${formId}_hf_0`;

  // PASSO 3 — POST de consulta com todos os headers exatos do browser
  const body = new URLSearchParams({
    [hiddenField]: '',
    cpfServidor:       cpfDigits,
    matriculaServidor: matricula,
    selectOrgao:       orgao,
    selectProduto:     produto,
    selectEspecie:     especie,
    SECURITYTOKEN:     token,
    botaoPesquisar:    '1',
  });

  const resultado = await axios.post(
    `${BASE}/consignatario/pesquisarMargem?${N}-1.IBehaviorListener.0-form-botaoPesquisar`,
    body.toString(),
    {
      headers: {
        ...baseHeaders,
        'Accept':             'application/xml, text/xml, */*; q=0.01',
        'Content-Type':       'application/x-www-form-urlencoded; charset=UTF-8',
        'SECURITYTOKEN':      token,
        'X-Requested-With':   'XMLHttpRequest, CSRF Prevention',
        'Wicket-Ajax':        'true',
        'Wicket-Ajax-BaseURL': `consignatario/pesquisarMargem?${N}`,
        'Referer':            `${BASE}/consignatario/pesquisarMargem?${N}`,
      },
      validateStatus: s => s < 500,
    }
  );

  return parseResultado(resultado.data);
}

// Ping para manter sessão viva (usar /autenticado conforme o portal)
async function pingSession(jsessionid) {
  try {
    const resp = await axios.get(`${BASE}/consignatario/autenticado`, {
      headers: { Cookie: `JSESSIONID=${jsessionid}` },
      maxRedirects: 0,
      validateStatus: s => s < 500,
    });
    return resp.status < 400;
  } catch {
    return false;
  }
}

// Inicia ping a cada 20 min para manter sessão ativa
function startPingInterval(getJsessionid) {
  setInterval(async () => {
    try {
      const id = await getJsessionid();
      if (id) await pingSession(id);
    } catch {}
  }, 20 * 60 * 1000);
}

module.exports = { consultarMargem, pingSession, startPingInterval };
