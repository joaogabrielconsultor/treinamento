import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  OPERACOES, OperacaoFuturo, ProdutoFuturo, fmtData, saldoContrato, simularFuturo,
} from '../lib/futuro';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (s: string) => {
  const t = s.trim();
  if (!t) return 0;
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return isNaN(n) ? 0 : n;
};

const OP_LABEL: Record<OperacaoFuturo, string> = {
  compra: 'Compra',
  novo: 'Nova contratação',
  saque: 'Saque complementar',
};

interface Contrato { parcela: string; taxa: string; prazo: string }
const vazio = (): Contrato => ({ parcela: '', taxa: '', prazo: '' });

export function SimuladorFuturo({ produto }: { produto: ProdutoFuturo }) {
  const [op, setOp] = useState<OperacaoFuturo>('compra');
  const [contratos, setContratos] = useState<Contrato[]>([vazio()]);
  const [saldoDireto, setSaldoDireto] = useState('');
  const [margemAdicional, setMargemAdicional] = useState('');
  const [margemNovo, setMargemNovo] = useState('');

  const titulo = produto === 'cartao' ? 'SIAPE Cartão Futuro' : 'SIAPE Empréstimo Futuro';
  const regraParcela = produto === 'cartao' ? '95% da margem (5% de margem de segurança)' : 'margem − R$ 5,00 (margem de segurança)';

  const saldos = contratos.map(c => saldoContrato(num(c.parcela), num(c.taxa) / 100, num(c.prazo)));
  const somaParcelas = contratos.reduce((s, c) => s + num(c.parcela), 0);
  const somaSaldos = saldos.reduce((s, v) => s + v, 0);
  const saldoTotal = somaSaldos + num(saldoDireto);

  const margem = op === 'compra' ? somaParcelas + num(margemAdicional) : num(margemNovo);

  const sim = useMemo(
    () => simularFuturo({ produto, op, margem, saldoTotal }),
    [produto, op, margem, saldoTotal],
  );
  const grupos = Array.from(new Set(sim.linhas.map(l => l.grupo)));
  const pronto = margem > 0 && (op !== 'compra' || saldoTotal > 0);

  function setContrato(i: number, campo: keyof Contrato, v: string) {
    setContratos(cs => cs.map((c, j) => (j === i ? { ...c, [campo]: v } : c)));
  }

  const inp = 'input-cyber w-full px-3 py-2 text-sm rounded-xl';
  const lbl = 'block text-xs font-semibold mb-1.5';
  const card = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' };

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5" style={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{titulo}</h2>
          <div className="inline-flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.18)' }}>
            {OPERACOES[produto].map(o => (
              <button key={o} onClick={() => setOp(o)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={op === o ? { background: 'linear-gradient(135deg,#C6FF00,#A9E000)', color: '#111' } : { color: 'var(--text-3)' }}>
                {OP_LABEL[o]}
              </button>
            ))}
          </div>
        </div>

        {op === 'compra' ? (
          <>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>
              Simular saldo para compra
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
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
          </>
        ) : (
          <div className="max-w-xs">
            <label className={lbl} style={{ color: 'var(--text-2)' }}>Margem disponível (R$)</label>
            <input className={inp} value={margemNovo} onChange={e => setMargemNovo(e.target.value)} placeholder="400,00" inputMode="decimal" />
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>1º vencimento: <b style={{ color: 'var(--text-1)' }}>{fmtData(sim.venc1)}</b></span>
          <span>Parcela usada: <b style={{ color: '#fbbf24' }}>{fmtBRL(Math.max(sim.parcela, 0))}</b> ({regraParcela})</span>
          {op === 'compra' && <span>Saldo a quitar: <b style={{ color: 'var(--text-1)' }}>{fmtBRL(saldoTotal)}</b></span>}
        </div>
      </div>

      {!pronto ? (
        <div className="text-center py-12 rounded-2xl text-sm font-semibold" style={{ ...card, color: 'var(--text-3)' }}>
          {op === 'compra' ? 'Informe as parcelas e o saldo devedor (direto ou simulado) para ver o resultado' : 'Informe a margem disponível para ver o resultado'}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={card}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.12)' }}>
                  {['', 'Taxa', 'Prazo', 'Coef.', 'Parcela', 'Seguro', 'Simulado', ...(op === 'compra' ? ['Líquido cliente'] : [])].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => sim.linhas.filter(l => l.grupo === g).map((r, i) => {
                  const neg = r.liquido !== null && r.liquido < 0;
                  return (
                    <tr key={r.key} style={{ borderBottom: '1px solid var(--card-border)', opacity: neg ? 0.7 : 1 }}>
                      <td className="px-3 py-2 text-xs font-black" style={{ color: '#C6FF00' }}>{i === 0 ? g : ''}</td>
                      <td className="px-3 py-2 text-xs num" style={{ color: 'var(--text-1)' }}>{(r.taxa * 100).toFixed(2).replace('.', ',')}%</td>
                      <td className="px-3 py-2 text-xs num" style={{ color: 'var(--text-2)' }}>{r.prazo}x</td>
                      <td className="px-3 py-2 text-[11px] num font-mono" style={{ color: '#a78bfa' }}>{r.coef.toFixed(7)}</td>
                      <td className="px-3 py-2 text-xs num" style={{ color: '#fbbf24' }}>{fmtBRL(r.parcela)}</td>
                      <td className="px-3 py-2 text-xs num" style={{ color: 'var(--text-3)' }}>{(r.seguro * 100).toFixed(2).replace('.', ',')}%</td>
                      <td className="px-3 py-2 text-xs num font-bold" style={{ color: 'var(--text-1)' }}>{fmtBRL(r.simulado)}</td>
                      {r.liquido !== null && (
                        <td className="px-3 py-2 text-xs num font-black" style={{ color: neg ? '#f87171' : '#4ade80' }}>
                          {neg ? '' : '+'}{fmtBRL(r.liquido)}
                        </td>
                      )}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
            Simulado = valor nominal − (seguro + 0,38% IOF + 3%). Mesma fórmula da planilha SIMULADOR_FEDERAIS.
          </p>
        </div>
      )}
    </div>
  );
}
