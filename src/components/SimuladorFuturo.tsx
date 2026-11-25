import { useMemo, useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { FinancialTable } from '../types';
import {
  PRODUTOS_FUTURO, ProdutoFuturo, REGRA_PARCELA, parcelaAjustada, produtoDaTabela, saldoContrato,
} from '../lib/futuro';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${Number(v).toFixed(2).replace('.', ',')}%`;
const num = (s: string) => {
  const t = s.trim();
  if (!t) return 0;
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return isNaN(n) ? 0 : n;
};

interface Contrato { parcela: string; taxa: string; prazo: string }
const vazio = (): Contrato => ({ parcela: '', taxa: '', prazo: '' });

export interface FuturoPrefill {
  convenio_id: string;
  bank_id: string;
  table_id: string;
  value: string;
}

interface Props {
  produto: ProdutoFuturo;
  tables: FinancialTable[];
  loading: boolean;
  isAdmin: boolean;
  onSendProposal: (data: FuturoPrefill) => void;
}

export function SimuladorFuturo({ produto, tables, loading, isAdmin, onSendProposal }: Props) {
  const [contratos, setContratos] = useState<Contrato[]>([vazio()]);
  const [saldoDireto, setSaldoDireto] = useState('');
  const [margemAdicional, setMargemAdicional] = useState('');

  const titulo = produto === 'cartao' ? 'SIAPE Cartão Futuro' : 'SIAPE Empréstimo Futuro';

  const saldos = contratos.map(c => saldoContrato(num(c.parcela), num(c.taxa) / 100, num(c.prazo)));
  const somaParcelas = contratos.reduce((s, c) => s + num(c.parcela), 0);
  const somaSaldos = saldos.reduce((s, v) => s + v, 0);
  const saldoTotal = somaSaldos + num(saldoDireto);
  const parcela = parcelaAjustada(produto, somaParcelas + num(margemAdicional));
  const pronto = parcela > 0 && saldoTotal > 0;

  const linhas = useMemo(() => {
    const out = [];
    for (const t of tables) {
      if (!t.active) continue;
      const grupo = produtoDaTabela(produto, t.tipo_proposta);
      if (!grupo) continue;
      const coef = Number(t.coef_final ?? t.coef_inicial ?? t.coeficiente) || 0;
      if (!coef) continue;
      const valor = parcela / coef;
      const empPct = Number(t.comissao_empresa) || 0;
      const corPct = Number(t.comissao_corretor) || 0;
      out.push({
        t, grupo, coef, valor,
        prazo: Number(t.prazo_final ?? t.prazo_inicial) || 0,
        troco: valor - saldoTotal,
        empPct, corPct,
        empVal: valor * empPct / 100,
        corVal: valor * corPct / 100,
      });
    }
    // mesma ordem do sistema: por produto, depois menor coeficiente (maior valor) primeiro
    const ordem = PRODUTOS_FUTURO[produto];
    return out.sort((a, b) => ordem.indexOf(a.grupo) - ordem.indexOf(b.grupo) || a.coef - b.coef);
  }, [tables, produto, parcela, saldoTotal]);

  function setContrato(i: number, campo: keyof Contrato, v: string) {
    setContratos(cs => cs.map((c, j) => (j === i ? { ...c, [campo]: v } : c)));
  }

  const inp = 'input-cyber w-full px-3 py-2 text-sm rounded-xl';
  const lbl = 'block text-xs font-semibold mb-1.5';
  const card = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' };
  const produtosTxt = PRODUTOS_FUTURO[produto].join(' / ');

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5" style={card}>
        <div className="mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{titulo}</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Puxa as tabelas cadastradas com produto <b>{produtosTxt}</b>.
          </p>
        </div>

        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>
          Simular saldo para compra
        </p>
        <div className="overflow-x-auto mb-3">
          <table className="data-table text-sm">
            <thead>
              <tr className="text-xs" style={{ color: 'var(--text-3)' }}>
                <th className="text-left py-1 pr-2"></th>
                <th className="text-left py-1 pr-2">Parcela (R$)</th>
                <th className="text-left py-1 pr-2">Taxa (% a.m.)</th>
                <th className="text-left py-1 pr-2">Prazo restante</th>
                <th className="text-right py-1 pr-2 th-num">Saldo simulado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c, i) => (
                <tr key={i}>
                  <td className="pr-2 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-2)' }}>Compra {i + 1}</td>
                  <td className="pr-2 py-1"><input className={inp} value={c.parcela} onChange={e => setContrato(i, 'parcela', e.target.value)} placeholder="400,00" inputMode="decimal" /></td>
                  <td className="pr-2 py-1"><input className={inp} value={c.taxa} onChange={e => setContrato(i, 'taxa', e.target.value)} placeholder="1,80" inputMode="decimal" /></td>
                  <td className="pr-2 py-1"><input className={inp} value={c.prazo} onChange={e => setContrato(i, 'prazo', e.target.value)} placeholder="72" inputMode="numeric" /></td>
                  <td className="pr-2 text-right text-xs num font-semibold" style={{ color: 'var(--text-1)' }}>{fmtBRL(saldos[i])}</td>
                  <td>
                    {contratos.length > 1 && (
                      <button onClick={() => setContratos(cs => cs.filter((_, j) => j !== i))} title="Remover" className="p-1.5 rounded-lg" style={{ color: '#f87171' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--card-border)' }}>
                <td className="pr-2 py-2 text-xs font-bold" style={{ color: 'var(--text-1)' }}>Total</td>
                <td className="pr-2 text-xs num font-bold" style={{ color: 'var(--text-1)' }}>{fmtBRL(somaParcelas)}</td>
                <td></td><td></td>
                <td className="pr-2 text-right text-xs num font-bold" style={{ color: 'var(--text-1)' }}>{fmtBRL(somaSaldos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        {contratos.length < 10 && (
          <button onClick={() => setContratos(cs => [...cs, vazio()])} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: '#C6FF00' }}>
            <Plus className="w-3.5 h-3.5" /> Adicionar contrato
          </button>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={lbl} style={{ color: 'var(--text-2)' }}>Saldo devedor (preencher direto)</label>
            <input className={inp} value={saldoDireto} onChange={e => setSaldoDireto(e.target.value)} placeholder="10.000,00" inputMode="decimal" />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>Deixe vazio se usar a simulação de saldo acima. Os dois são somados.</p>
          </div>
          <div>
            <label className={lbl} style={{ color: 'var(--text-2)' }}>Adicionar margem (R$)</label>
            <input className={inp} value={margemAdicional} onChange={e => setMargemAdicional(e.target.value)} placeholder="0,00" inputMode="decimal" />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>Margem livre somada à parcela das compras.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>Parcela usada: <b style={{ color: '#fbbf24' }}>{fmtBRL(Math.max(parcela, 0))}</b> ({REGRA_PARCELA[produto]})</span>
          <span>Saldo a quitar: <b style={{ color: 'var(--text-1)' }}>{fmtBRL(saldoTotal)}</b></span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 rounded-2xl text-sm font-semibold" style={{ ...card, color: 'var(--text-3)' }}>Carregando tabelas...</div>
      ) : !pronto ? (
        <div className="text-center py-12 rounded-2xl text-sm font-semibold" style={{ ...card, color: 'var(--text-3)' }}>
          Informe as parcelas e o saldo devedor (direto ou simulado) para ver o resultado
        </div>
      ) : linhas.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={card}>
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Nenhuma tabela ativa com produto {produtosTxt}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.7 }}>
            Cadastre as tabelas no admin com o tipo de proposta {produtosTxt} e um coeficiente.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={card}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.12)' }}>
                  {['Produto', 'Banco', 'Convênio', 'Tabela', 'Prazo', 'Coeficiente', 'Valor Liberado', 'Troco Líquido', 'Parcela',
                    ...(isAdmin ? ['Emp %'] : []), 'Cor %', ...(isAdmin ? ['Com. Empresa'] : []), 'Com. Corretor', ''].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map(r => {
                  const neg = r.troco < 0;
                  return (
                    <tr key={r.t.id} style={{ borderBottom: '1px solid var(--card-border)', opacity: neg ? 0.7 : 1 }}>
                      <td className="px-3 py-2 text-xs font-black whitespace-nowrap" style={{ color: '#C6FF00' }}>{r.grupo}</td>
                      <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-1)' }}>{r.t.bank_name || '—'}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-3)' }}>{r.t.convenio_name || '—'}</td>
                      <td className="px-3 py-2 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-2)' }} title={r.t.name}>{r.t.name || '—'}</td>
                      <td className="px-3 py-2 text-xs num" style={{ color: 'var(--text-2)' }}>{r.prazo > 0 ? `${r.prazo}x` : '—'}</td>
                      <td className="px-3 py-2 text-[11px] num font-mono" style={{ color: '#a78bfa' }}>{r.coef.toFixed(7)}</td>
                      <td className="px-3 py-2 text-xs num font-bold" style={{ color: 'var(--text-1)' }}>{fmtBRL(r.valor)}</td>
                      <td className="px-3 py-2 text-xs num font-black whitespace-nowrap" style={{ color: neg ? '#f87171' : '#4ade80' }}>
                        {neg ? '' : '+'}{fmtBRL(r.troco)}
                      </td>
                      <td className="px-3 py-2 text-xs num" style={{ color: '#fbbf24' }}>{fmtBRL(parcela)}</td>
                      {isAdmin && <td className="px-3 py-2 text-xs num" style={{ color: '#60a5fa' }}>{fmtPct(r.empPct)}</td>}
                      <td className="px-3 py-2 text-xs num" style={{ color: '#4ade80' }}>{fmtPct(r.corPct)}</td>
                      {isAdmin && <td className="px-3 py-2 text-xs num font-semibold" style={{ color: '#60a5fa' }}>{fmtBRL(r.empVal)}</td>}
                      <td className="px-3 py-2 text-xs num font-bold" style={{ color: '#4ade80' }}>{fmtBRL(r.corVal)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => onSendProposal({
                            convenio_id: r.t.convenio_id || '',
                            bank_id: r.t.bank_id || '',
                            table_id: r.t.id,
                            value: r.valor.toFixed(2),
                          })}
                          disabled={neg}
                          title={neg ? 'Valor liberado não cobre a dívida do cliente' : undefined}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold btn-cyber whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-3 h-3" /> Enviar Proposta
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
