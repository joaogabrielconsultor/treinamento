// Simulador "Futuro" — replica a planilha SIMULADOR_FEDERAIS (abas SIAPE CARTÕES e SIAPE EMPRESTIMO).
//
// Como a planilha calcula:
//   NOMINAL   = Σ parcela / (1 + taxa_aa)^(dias_k / 364), k = 1..min(prazo, 106)
//               taxa_aa = (1 + taxa_am)^12 − 1
//               dias_k  = (1º vencimento + (k−1) meses) − hoje
//   SIMULADO  = NOMINAL − NOMINAL × (seguro + 0,38% + 3%)
//   LÍQUIDO   = SIMULADO − (saldo simulado das compras + saldo devedor digitado)
//   SALDO de cada compra = VP(taxa, prazo restante, parcela)
//
// Obs.: a planilha só soma 106 parcelas (linhas 16..121 da aba BASE). Por isso 117x e 120x
// dão o mesmo NOMINAL. Mantido igual de propósito para os números baterem com a planilha.

export const LIMITE_PARCELAS_PLANILHA = 106;
export const IOF_FLAT = 0.0038;
export const DESCONTO_FIXO = 0.03;

export type ProdutoFuturo = 'cartao' | 'emprestimo';
export type OperacaoFuturo = 'compra' | 'novo' | 'saque';

export interface LinhaTabela {
  grupo: string;      // CB, CC, AF
  taxa: number;       // a.m. em decimal (0.023 = 2,30%)
  prazo: number;      // nº de parcelas
  coef: number;       // coeficiente do banco (exibição)
  seguro: number;     // decimal usado na fórmula (0.1089 = "10,8%")
}

const L = (grupo: string, taxaPct: number, prazo: number, coef: number, seguro: number): LinhaTabela =>
  ({ grupo, taxa: taxaPct / 100, prazo, coef, seguro });

// ── SIAPE CARTÕES (CB e CC têm as mesmas taxas; CC troca 3,10% por 96x e não tem 72x/84x) ──
const CB_BASE: LinhaTabela[] = [
  L('CB', 2.30, 120, 0.0292900, 0.1089),
  L('CB', 2.45, 120, 0.0308860, 0.1089),
  L('CB', 2.70, 120, 0.0336080, 0.1089),
  L('CB', 3.00, 120, 0.0369620, 0.1089),
  L('CB', 3.15, 120, 0.0386720, 0.1089),
  L('CB', 3.40, 120, 0.0415640, 0.1089),
  L('CB', 3.60, 120, 0.0439120, 0.1089),
  L('CB', 3.90, 120, 0.0474840, 0.1089),
  L('CB', 2.30, 117, 0.0336240, 0.1789),
  L('CB', 2.40, 117, 0.0347150, 0.1789),
  L('CB', 2.65, 117, 0.0375020, 0.1789),
  L('CB', 3.00, 117, 0.0415390, 0.1789),
  L('CB', 3.10, 117, 0.0427180, 0.1789),
  L('CB', 3.20, 117, 0.0439090, 0.1789),
  L('CB', 3.35, 117, 0.0457140, 0.1789),
  L('CB', 3.50, 117, 0.0475420, 0.1789),
  L('CB', 3.68, 117, 0.0497630, 0.1789),
  L('CB', 3.80, 117, 0.0512600, 0.1789),
];
const CB_72 = L('CB', 3.80, 72, 0.0525018, 0.1589);
const CB_84 = L('CB', 3.80, 84, 0.0511609, 0.1589);

const CC: LinhaTabela[] = CB_BASE.map(l =>
  l.prazo === 117 && l.taxa === 0.031
    ? L('CC', 3.10, 96, 0.03806993, 0.1789)
    : { ...l, grupo: 'CC' });

// ── SIAPE EMPRÉSTIMO (AF) ──
const AF: LinhaTabela[] = [
  L('AF', 1.80, 120, 0.023380, 0.0789),
  L('AF', 1.80, 120, 0.023917, 0.0989),
  L('AF', 1.80, 120, 0.024771, 0.1289),
  L('AF', 1.80, 120, 0.025688, 0.1589),
  L('AF', 1.80, 120, 0.026338, 0.1789),
  L('AF', 1.80, 120, 0.027377, 0.2089),
  L('AF', 1.80, 120, 0.028117, 0.2289),
  L('AF', 1.80, 120, 0.028898, 0.2489),
  L('AF', 1.80,  96, 0.025493, 0.0889),
  L('AF', 1.80,  96, 0.028396, 0.1789),
  L('AF', 1.80,  96, 0.030313, 0.2289),
  L('AF', 2.03,  84, 0.032279, 0.1789),
];

export function tabelasFuturo(produto: ProdutoFuturo, op: OperacaoFuturo): LinhaTabela[] {
  if (produto === 'emprestimo') return op === 'saque' ? [] : AF;
  if (op === 'saque') return [...CB_BASE, CB_84, ...CC];
  return [...CB_BASE, CB_72, CB_84, ...CC];
}

export const OPERACOES: Record<ProdutoFuturo, OperacaoFuturo[]> = {
  cartao: ['compra', 'novo', 'saque'],
  emprestimo: ['compra', 'novo'],
};

// ── Datas (dias "seriais" UTC para evitar fuso/horário de verão) ──
const dia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5;
const somaMeses = (serial: number, meses: number) => {
  const d = new Date(serial * 864e5);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, d.getUTCDate()) / 864e5;
};
const diaDoMes = (hoje: Date, d: number, meses: number) =>
  Date.UTC(hoje.getFullYear(), hoje.getMonth() + meses, d) / 864e5;

/** 1º vencimento, igual às fórmulas de data da planilha. */
export function primeiroVencimento(produto: ProdutoFuturo, op: OperacaoFuturo, hoje = new Date()): number {
  const d = hoje.getDate();
  if (produto === 'cartao') {
    if (op === 'saque') return d <= 25 ? diaDoMes(hoje, 25, 1) : diaDoMes(hoje, 25, 3);
    return diaDoMes(hoje, 10, 2); // compra e novo: dia 10, dois meses à frente
  }
  // empréstimo: compra corta no dia 1, novo no dia 10
  const corte = op === 'compra' ? 1 : 10;
  return d <= corte ? diaDoMes(hoje, 10, 1) : diaDoMes(hoje, 10, 2);
}

export const fmtData = (serial: number) =>
  new Date(serial * 864e5).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

/** Parcela usada no cálculo: cartão = 95% da margem; empréstimo = margem − R$ 5. */
export function parcelaAjustada(produto: ProdutoFuturo, margem: number): number {
  return produto === 'cartao' ? margem * 0.95 : margem - 5;
}

export function nominal(parcela: number, taxaAm: number, prazo: number, venc1: number, hoje = new Date()): number {
  const aa = Math.pow(1 + taxaAm, 12) - 1;
  const h = dia(hoje);
  let soma = 0;
  for (let k = 1; k <= Math.min(prazo, LIMITE_PARCELAS_PLANILHA); k++) {
    const dias = somaMeses(venc1, k - 1) - h;
    soma += parcela / Math.pow(1 + aa, dias / 364);
  }
  return soma;
}

/** VP de um contrato a comprar (−PV do Excel). Taxa em decimal. */
export function saldoContrato(parcela: number, taxaAm: number, prazoRestante: number): number {
  if (!parcela || !prazoRestante) return 0;
  if (!taxaAm) return parcela * prazoRestante;
  return parcela * (1 - Math.pow(1 + taxaAm, -prazoRestante)) / taxaAm;
}

export interface ResultadoFuturo extends LinhaTabela {
  key: string;
  parcela: number;
  nominal: number;
  simulado: number;
  liquido: number | null; // só na compra
}

export function simularFuturo(opts: {
  produto: ProdutoFuturo;
  op: OperacaoFuturo;
  margem: number;            // compra: soma das parcelas + margem adicional; novo/saque: margem
  saldoTotal: number;        // compra: saldo a quitar
  hoje?: Date;
}): { venc1: number; parcela: number; linhas: ResultadoFuturo[] } {
  const hoje = opts.hoje ?? new Date();
  const venc1 = primeiroVencimento(opts.produto, opts.op, hoje);
  const parcela = parcelaAjustada(opts.produto, opts.margem);
  const linhas = tabelasFuturo(opts.produto, opts.op).map((t, i) => {
    const nom = parcela > 0 ? nominal(parcela, t.taxa, t.prazo, venc1, hoje) : 0;
    const simulado = nom - nom * (t.seguro + IOF_FLAT + DESCONTO_FIXO);
    return {
      ...t,
      key: `${t.grupo}-${i}`,
      parcela,
      nominal: nom,
      simulado,
      liquido: opts.op === 'compra' ? simulado - opts.saldoTotal : null,
    };
  });
  return { venc1, parcela, linhas };
}
