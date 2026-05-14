import { useState, useEffect } from 'react';
import { Building2, TrendingUp, TrendingDown, DollarSign, Clock, ChevronLeft, ArrowUpRight, ArrowDownLeft, Store } from 'lucide-react';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface LojaBalance {
  loja_id: string;
  loja_name: string;
  broker_count: number;
  total_creditos: number;
  total_debitos: number;
  comissao_pendente: number;
}

interface ExtratoItem {
  type: 'credito' | 'debito';
  reference_id: string;
  description_ref: string | null;
  broker_name: string;
  value: number;
  client_name: string | null;
  date: string;
}

function ExtratoView({ loja, onBack }: { loja: LojaBalance; onBack: () => void }) {
  const [items, setItems] = useState<ExtratoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API(`/api/admin/conta-empresa/${loja.loja_id}/extrato`).then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [loja.loja_id]);

  const creditos = items.reduce((a, i) => a + (i.type === 'credito' ? Number(i.value) : 0), 0);
  const debitos = items.reduce((a, i) => a + (i.type === 'debito' ? Number(i.value) : 0), 0);
  const saldo = creditos - debitos;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <Store className="w-5 h-5" style={{ color: '#14B8A6' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{loja.loja_name}</h2>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{loja.broker_count} corretor{loja.broker_count !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Entradas', value: fmtBRL(creditos), color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: TrendingUp },
          { label: 'Total Saídas', value: fmtBRL(debitos), color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: TrendingDown },
          { label: 'Saldo', value: fmtBRL(saldo), color: saldo >= 0 ? '#4ade80' : '#f87171', bg: saldo >= 0 ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: saldo >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)', icon: DollarSign },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>{c.label}</p>
                <p className="text-xl font-black num" style={{ color: c.color }}>{c.value}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Extrato</h3>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma movimentação encontrada</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Tipo', 'Corretor', 'Descrição', 'Valor', 'Data'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isCredito = item.type === 'credito';
                  return (
                    <tr key={`${item.reference_id}-${i}`} className="table-row-cyber">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold`}
                          style={isCredito
                            ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                          {isCredito ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {isCredito ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.broker_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isCredito ? (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--text-2)' }}>Proposta {item.description_ref || item.reference_id?.slice(0, 8)}</p>
                            {item.client_name && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.client_name}</p>}
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: 'var(--text-2)' }}>Pagamento de comissão</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm num" style={{ color: isCredito ? '#4ade80' : '#f87171' }}>
                          {isCredito ? '+' : '-'}{fmtBRL(Number(item.value))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs num" style={{ color: 'var(--text-3)' }}>{fmtDate(item.date)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminContaEmpresa() {
  const [lojas, setLojas] = useState<LojaBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LojaBalance | null>(null);

  async function load() {
    setLoading(true);
    const data = await API('/api/admin/conta-empresa').then(r => r.json());
    setLojas(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalCreditos = lojas.reduce((a, l) => a + Number(l.total_creditos), 0);
  const totalDebitos = lojas.reduce((a, l) => a + Number(l.total_debitos), 0);
  const totalPendente = lojas.reduce((a, l) => a + Number(l.comissao_pendente), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center gap-2 mb-6 animate-fade-up">
        <Building2 className="w-5 h-5" style={{ color: '#14B8A6' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Conta Empresa</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Saldo e extrato financeiro por loja</p>
        </div>
      </div>

      {selected ? (
        <ExtratoView loja={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Entradas', value: fmtBRL(totalCreditos), sub: 'comissões empresa', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: TrendingUp },
              { label: 'Total Saídas', value: fmtBRL(totalDebitos), sub: 'comissões pagas', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: TrendingDown },
              { label: 'Pendente Pagar', value: fmtBRL(totalPendente), sub: 'a corretores', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: Clock },
            ].map((c, i) => (
              <div key={c.label} className="rounded-2xl p-4 animate-fade-up" style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: 'var(--shadow-card)', animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>{c.label}</p>
                    <p className="text-xl font-black num" style={{ color: c.color }}>{c.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{c.sub}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                    <c.icon className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
          ) : lojas.length === 0 ? (
            <div className="rounded-2xl p-16 text-center animate-fade-up"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <Store className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma loja cadastrada. Crie lojas e associe corretores.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden animate-fade-up"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '80ms' }}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Loja', 'Corretores', 'Entradas', 'Saídas', 'Saldo', 'Pend. Corretores', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lojas.map(l => {
                    const saldo = Number(l.total_creditos) - Number(l.total_debitos);
                    return (
                      <tr key={l.loja_id} className="table-row-cyber">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.18)' }}>
                              <Store className="w-4 h-4" style={{ color: '#14B8A6' }} />
                            </div>
                            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{l.loja_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm" style={{ color: 'var(--text-3)' }}>{l.broker_count}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold num" style={{ color: '#4ade80' }}>{fmtBRL(Number(l.total_creditos))}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold num" style={{ color: '#f87171' }}>{fmtBRL(Number(l.total_debitos))}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold num" style={{ color: saldo >= 0 ? '#4ade80' : '#f87171' }}>{fmtBRL(saldo)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="num" style={{ color: Number(l.comissao_pendente) > 0 ? '#f59e0b' : 'var(--text-3)' }}>{fmtBRL(Number(l.comissao_pendente))}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button onClick={() => setSelected(l)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium badge badge-blue">
                            Ver Extrato
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
        </>
      )}
    </div>
  );
}
