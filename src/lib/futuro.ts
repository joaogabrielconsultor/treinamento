// Regras do simulador "Futuro" (SIAPE Cartão / SIAPE Empréstimo), vindas da planilha SIMULADOR_FEDERAIS.
// As tabelas (coeficiente, prazo, comissão) vêm do cadastro de tabelas financeiras, como na Compra de Dívida.
//
//   Parcela usada  = cartão: 95% da margem | empréstimo: margem − R$ 5,00
//   Valor liberado = parcela usada ÷ coeficiente da tabela
//   Troco líquido  = valor liberado − (saldo simulado dos contratos + saldo devedor digitado)
//   Saldo de cada contrato = VP(taxa, prazo restante, parcela)  (−PV do Excel)

export type ProdutoFuturo = 'cartao' | 'emprestimo';

/** Produtos (tipo de proposta) que cada aba puxa do cadastro de tabelas. */
export const PRODUTOS_FUTURO: Record<ProdutoFuturo, string[]> = {
  cartao: ['COMPRA CC', 'COMPRA CB'],
  emprestimo: ['COMPRA EMPRESTIMO'],
};

const normaliza = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Grupo da tabela (ex.: "COMPRA CC") se ela pertence à aba; senão null. */
export function produtoDaTabela(produto: ProdutoFuturo, tipoProposta: string | null | undefined): string | null {
  const tipo = normaliza(tipoProposta || '');
  return PRODUTOS_FUTURO[produto].find(p => tipo === p) ?? null;
}

/** Parcela usada no cálculo: cartão = 95% da margem; empréstimo = margem − R$ 5. */
export function parcelaAjustada(produto: ProdutoFuturo, margem: number): number {
  return produto === 'cartao' ? margem * 0.95 : margem - 5;
}

export const REGRA_PARCELA: Record<ProdutoFuturo, string> = {
  cartao: '95% da margem (5% de margem de segurança)',
  emprestimo: 'margem − R$ 5,00 (margem de segurança)',
};

/** VP de um contrato a comprar. Taxa em decimal (0.018 = 1,80% a.m.). */
export function saldoContrato(parcela: number, taxaAm: number, prazoRestante: number): number {
  if (!parcela || !prazoRestante) return 0;
  if (!taxaAm) return parcela * prazoRestante;
  return parcela * (1 - Math.pow(1 + taxaAm, -prazoRestante)) / taxaAm;
}
