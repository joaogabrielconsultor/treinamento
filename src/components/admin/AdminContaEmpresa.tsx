import React, { useState, useEffect } from 'react';
import { Building2, TrendingUp, TrendingDown, DollarSign, Clock, ChevronLeft, ArrowUpRight, ArrowDownLeft, Store, Trash2, UserCog } from 'lucide-react';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface UsuarioBancoBalance {
  loja_id: string;
  id: string;
  nome: string;
  descricao: string;
  proposal_count: number;
  total_empresa: number;
  total_despesas: number;
}

interface LojaBalance {
  loja_id: string;
  loja_name: string;
  broker_count: number;
  total_creditos: number;
  empresa_ag_comissao: number;
  total_debitos: number;
  total_comissao_paga: number;
  total_despesas_loja: number;
  comissao_pendente: number;
}

interface ExtratoItem {
  type: 'credito' | 'debito';
  subtype: 'comissao' | 'despesa' | null;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function loadExtrato() {
    setLoading(true);
    API(`/api/admin/conta-empresa/${loja.loja_id}/extrato`).then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }

  useEffect(() => { loadExtrato(); }, [loja.loja_id]);

  async function deleteSelected() {
    setDeleting(true);
    await API('/api/admin/commission-payments/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    setConfirmDel(false);
    setDeleting(false);
    loadExtrato();
  }

  const debitoItems = items.filter(i => i.type === 'debito' && i.subtype === 'comissao');
  const totalCreditos = items.reduce((a, i) => a + (i.type === 'credito' ? Number(i.value) : 0), 0);
  const totalDebitos  = items.reduce((a, i) => a + (i.type === 'debito'  ? Number(i.value) : 0), 0);
  const saldo = totalCreditos - totalDebitos;

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
          { label: 'Total Entradas', value: fmtBRL(totalCreditos), color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: TrendingUp },
          { label: 'Total Saídas', value: fmtBRL(totalDebitos), color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: TrendingDown },
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
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Extrato</h3>
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir {selected.size} saída{selected.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma movimentação encontrada</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox"
                      className="w-3.5 h-3.5 cursor-pointer accent-red-500"
                      checked={debitoItems.length > 0 && debitoItems.every(d => selected.has(d.reference_id))}
                      onChange={e => {
                        const next = new Set(selected);
                        debitoItems.forEach(d => e.target.checked ? next.add(d.reference_id) : next.delete(d.reference_id));
                        setSelected(next);
                      }}
                      title="Selecionar todas as saídas"
                    />
                  </th>
                  {['Tipo', 'Corretor', 'Descrição', 'Valor', 'Data'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isCredito = item.type === 'credito';
                  const isSelected = !isCredito && selected.has(item.reference_id);
                  return (
                    <tr key={`${item.reference_id}-${i}`} className="table-row-cyber"
                      style={{ background: isSelected ? 'rgba(239,68,68,0.05)' : undefined }}>
                      <td className="px-3 py-3">
                        {item.subtype === 'comissao' && (
                          <input type="checkbox"
                            className="w-3.5 h-3.5 cursor-pointer accent-red-500"
                            checked={isSelected}
                            onChange={e => {
                              const next = new Set(selected);
                              e.target.checked ? next.add(item.reference_id) : next.delete(item.reference_id);
                              setSelected(next);
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isCredito ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                            <ArrowUpRight className="w-3 h-3" /> Entrada
                          </span>
                        ) : item.subtype === 'despesa' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                            <ArrowDownLeft className="w-3 h-3" /> Despesa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                            <ArrowDownLeft className="w-3 h-3" /> Saída
                          </span>
                        )}
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
                        ) : item.subtype === 'despesa' ? (
                          <p className="text-xs font-medium" style={{ color: '#fb923c' }}>{item.description_ref}</p>
                        ) : (
                          <p className="text-xs" style={{ color: 'var(--text-2)' }}>{item.description_ref || 'Pagamento de comissão'}</p>
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
          {/* Modal confirmação exclusão */}
          {confirmDel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
              <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
                <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir Saídas</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                  Excluir {selected.size} registro{selected.size > 1 ? 's' : ''} de saída? Esta ação é irreversível.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
                  <button onClick={deleteSelected} disabled={deleting}
                    className="flex-1 py-2.5 text-sm rounded-xl font-semibold disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminContaEmpresa() {
  const [lojas, setLojas] = useState<LojaBalance[]>([]);
  const [ubByLoja, setUbByLoja] = useState<Record<string, UsuarioBancoBalance[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LojaBalance | null>(null);

  async function load() {
    setLoading(true);
    const [data, ubData] = await Promise.all([
      API('/api/admin/conta-empresa').then(r => r.json()),
      API('/api/admin/conta-empresa/usuarios-banco').then(r => r.json()),
    ]);
    setLojas(Array.isArray(data) ? data : []);
    const grouped: Record<string, UsuarioBancoBalance[]> = {};
    if (Array.isArray(ubData)) {
      for (const ub of ubData) {
        if (!grouped[ub.loja_id]) grouped[ub.loja_id] = [];
        grouped[ub.loja_id].push(ub);
      }
    }
    setUbByLoja(grouped);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalCreditos = lojas.reduce((a, l) => a + Number(l.total_creditos), 0);
  const totalAgComissao = lojas.reduce((a, l) => a + Number(l.empresa_ag_comissao), 0);
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Comissão Recebida', value: fmtBRL(totalCreditos), sub: 'já recebida do banco', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: TrendingUp },
              { label: 'Ag. Comissão', value: fmtBRL(totalAgComissao), sub: 'proposta paga, comissão pendente', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: Clock },
              { label: 'Total Saídas', value: fmtBRL(totalDebitos), sub: 'saques + despesas', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: TrendingDown },
              { label: 'Pend. Corretores', value: fmtBRL(totalPendente), sub: 'a pagar aos corretores', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: Clock },
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
                    {['Loja', 'Corretores', 'Recebido', 'Ag. Comissão', 'Saídas', 'Saldo', 'Pend. Corretores', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lojas.map(l => {
                    const saldo = Number(l.total_creditos) - Number(l.total_debitos);
                    return (
                      <React.Fragment key={l.loja_id}>
                      <tr className="table-row-cyber">
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
                          <span className="font-semibold num" style={{ color: Number(l.empresa_ag_comissao) > 0 ? '#a78bfa' : 'var(--text-3)' }}>{fmtBRL(Number(l.empresa_ag_comissao))}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold num" style={{ color: '#f87171' }}>{fmtBRL(Number(l.total_debitos))}</span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {Number(l.total_comissao_paga) > 0 && (
                              <span className="text-[10px] num" style={{ color: 'var(--text-3)' }}>
                                Corr: <span style={{ color: '#f87171' }}>{fmtBRL(Number(l.total_comissao_paga))}</span>
                              </span>
                            )}
                            {Number(l.total_despesas_loja) > 0 && (
                              <span className="text-[10px] num" style={{ color: 'var(--text-3)' }}>
                                Desp: <span style={{ color: '#fb923c' }}>{fmtBRL(Number(l.total_despesas_loja))}</span>
                              </span>
                            )}
                          </div>
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
                      {ubByLoja[l.loja_id]?.length > 0 && (
                        <tr key={`${l.loja_id}-ub`} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td colSpan={8} className="px-4 pb-3 pt-0">
                            <div className="flex flex-wrap gap-2 pl-10">
                              {ubByLoja[l.loja_id].map(ub => {
                                const saldoUb = Number(ub.total_empresa) - Number(ub.total_despesas);
                                return (
                                <span key={ub.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                                  style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.14)' }}>
                                  <UserCog className="w-3 h-3 flex-shrink-0" style={{ color: '#60a5fa' }} />
                                  <span style={{ color: 'var(--text-2)' }}>{ub.nome}</span>
                                  <span className="font-bold num" style={{ color: '#60a5fa' }}>{fmtBRL(Number(ub.total_empresa))}</span>
                                  {Number(ub.total_despesas) > 0 && (
                                    <span className="num" style={{ color: '#f87171' }}>− {fmtBRL(Number(ub.total_despesas))}</span>
                                  )}
                                  <span className="font-bold num" style={{ color: saldoUb >= 0 ? '#4ade80' : '#f87171' }}>= {fmtBRL(saldoUb)}</span>
                                  <span style={{ color: 'var(--text-3)' }}>· {ub.proposal_count} prop</span>
                                </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
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
