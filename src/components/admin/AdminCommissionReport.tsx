import { useState, useEffect, useMemo } from 'react';
import { Receipt, RefreshCw, Users, Clock, ChevronDown, ChevronRight, Download } from 'lucide-react';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const MONTHS_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTHS_ABBR[parseInt(mo, 10) - 1]}/${y.slice(2)}`;
}

interface MonthCell { corretor: number; empresa: number; }
interface ProposalRow {
  id: string; proposal_number: string; client_name: string; bank: string; table_name: string | null;
  value: number; comissao_corretor: number; comissao_empresa: number;
  status: string; status_comissao: 'Ag. Comissão' | 'Comissão Paga'; updated_at: string;
}
interface BrokerRow {
  user_id: string; user_name: string; user_email: string;
  by_month: Record<string, MonthCell>;
  total_corretor_pendente: number; total_empresa_pendente: number;
  total_corretor_pago: number; total_empresa_pago: number;
  proposals: ProposalRow[];
}
interface ReportData {
  months: string[];
  brokers: BrokerRow[];
  totals: {
    by_month: Record<string, MonthCell>;
    total_corretor_pendente: number; total_empresa_pendente: number;
    total_corretor_pago: number; total_empresa_pago: number;
  };
}

export function AdminCommissionReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCorretor, setFilterCorretor] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Ag. Comissão' | 'Comissão Paga'>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const d = await API('/api/admin/commission-report').then(r => r.json());
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleExpand(userId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  const months = data?.months || [];
  const allBrokers = data?.brokers || [];
  const totals = data?.totals;
  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' };

  const brokers = useMemo(
    () => filterCorretor ? allBrokers.filter(b => b.user_id === filterCorretor) : allBrokers,
    [allBrokers, filterCorretor]
  );

  function visibleProposals(b: BrokerRow) {
    return filterStatus ? b.proposals.filter(p => p.status_comissao === filterStatus) : b.proposals;
  }

  function exportCSV() {
    const header = ['Corretor', 'Proposta', 'Cliente', 'Banco', 'Tabela', 'Valor', 'Comissão Corretor', 'Comissão Empresa', 'Status Comissão', 'Data'];
    const rows: (string | number)[][] = [];
    for (const b of brokers) {
      for (const p of visibleProposals(b)) {
        rows.push([
          b.user_name || b.user_email, p.proposal_number, p.client_name, p.bank, p.table_name || '',
          p.value.toFixed(2), p.comissao_corretor.toFixed(2), p.comissao_empresa.toFixed(2),
          p.status_comissao, fmtDate(p.updated_at),
        ]);
      }
    }
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: '#C6FF00' }} />
          <div>
            <h1 className="text-xl font-bold">Relatório de Comissões</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Pendentes e pagas, por corretor, com detalhe de cada proposta</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl p-4 mb-6 flex items-center gap-3 flex-wrap" style={cardStyle}>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Corretor</label>
          <select value={filterCorretor} onChange={e => setFilterCorretor(e.target.value)} className="input-cyber text-sm rounded-xl" style={{ minWidth: '200px' }}>
            <option value="">Todos</option>
            {allBrokers.map(b => <option key={b.user_id} value={b.user_id}>{b.user_name || b.user_email}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Status comissão</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="input-cyber text-sm rounded-xl" style={{ minWidth: '160px' }}>
            <option value="">Todos</option>
            <option value="Ag. Comissão">Pendente</option>
            <option value="Comissão Paga">Paga</option>
          </select>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Pendente — Corretores</p>
          <p className="text-xl font-black num" style={{ color: '#f59e0b' }}>{fmtBRL(totals?.total_corretor_pendente || 0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Pendente — Empresa</p>
          <p className="text-xl font-black num" style={{ color: '#fb923c' }}>{fmtBRL(totals?.total_empresa_pendente || 0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Já paga — Corretores</p>
          <p className="text-xl font-black num" style={{ color: '#4ade80' }}>{fmtBRL(totals?.total_corretor_pago || 0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Já paga — Empresa</p>
          <p className="text-xl font-black num" style={{ color: '#a78bfa' }}>{fmtBRL(totals?.total_empresa_pago || 0)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
      ) : brokers.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={cardStyle}>
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma comissão registrada</p>
        </div>
      ) : (
        <>
          {/* Resumo por mês — só o que está pendente */}
          {months.length > 0 && (
            <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Pendente por mês</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest sticky left-0" style={{ color: 'var(--text-3)', background: 'var(--card-bg)' }}>
                        <Users className="w-3 h-3 inline mr-1" />Corretor
                      </th>
                      {months.map(m => (
                        <th key={m} className="text-right px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                          {fmtMonth(m)}
                        </th>
                      ))}
                      <th className="text-right px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: '#C6FF00' }}>
                        Total pendente
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokers.map(b => (
                      <tr key={b.user_id} className="table-row-cyber">
                        <td className="px-4 py-3 sticky left-0" style={{ background: 'var(--card-bg)' }}>
                          <p className="font-semibold text-sm">{b.user_name || b.user_email}</p>
                        </td>
                        {months.map(m => {
                          const cell = b.by_month[m];
                          return (
                            <td key={m} className="px-4 py-3 text-right">
                              {cell ? (
                                <div>
                                  <p className="font-bold num" style={{ color: '#f59e0b' }}>{fmtBRL(cell.corretor)}</p>
                                  <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(cell.empresa)}</p>
                                </div>
                              ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <p className="font-black num text-base" style={{ color: '#C6FF00' }}>{fmtBRL(b.total_corretor_pendente)}</p>
                          <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(b.total_empresa_pendente)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--card-border)' }}>
                      <td className="px-4 py-3 font-bold sticky left-0" style={{ background: 'var(--card-bg)' }}>Total geral</td>
                      {months.map(m => {
                        const cell = totals?.by_month[m];
                        return (
                          <td key={m} className="px-4 py-3 text-right">
                            <p className="font-bold num" style={{ color: '#f59e0b' }}>{fmtBRL(cell?.corretor || 0)}</p>
                            <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(cell?.empresa || 0)}</p>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <p className="font-black num text-base" style={{ color: '#C6FF00' }}>{fmtBRL(totals?.total_corretor_pendente || 0)}</p>
                        <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(totals?.total_empresa_pendente || 0)}</p>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Detalhe por corretor — clique para expandir */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Detalhe por corretor</h2>
            </div>
            {brokers.map(b => {
              const isOpen = expanded.has(b.user_id);
              const props = visibleProposals(b);
              return (
                <div key={b.user_id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <button onClick={() => toggleExpand(b.user_id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-all"
                    style={{ background: isOpen ? 'var(--surface-subtle)' : 'transparent' }}>
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
                      <div>
                        <p className="font-semibold text-sm">{b.user_name || b.user_email}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{props.length} proposta{props.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Pendente</p>
                        <p className="font-bold num" style={{ color: '#f59e0b' }}>{fmtBRL(b.total_corretor_pendente)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Já paga</p>
                        <p className="font-bold num" style={{ color: '#4ade80' }}>{fmtBRL(b.total_corretor_pago)}</p>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="overflow-x-auto px-4 pb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                            {['Data', 'Proposta', 'Cliente', 'Banco', 'Tabela', 'Valor', 'Com. Corretor', 'Com. Empresa', 'Status'].map(h => (
                              <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {props.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-6" style={{ color: 'var(--text-3)' }}>Nenhuma proposta com esse filtro</td></tr>
                          ) : props.map(p => (
                            <tr key={p.id} className="table-row-cyber">
                              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(p.updated_at)}</td>
                              <td className="px-3 py-2 font-mono text-xs">{p.proposal_number || '—'}</td>
                              <td className="px-3 py-2">{p.client_name}</td>
                              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-3)' }}>{p.bank}</td>
                              <td className="px-3 py-2 text-xs max-w-[140px] truncate" style={{ color: 'var(--text-3)' }}>{p.table_name || '—'}</td>
                              <td className="px-3 py-2 font-semibold num">{fmtBRL(p.value)}</td>
                              <td className="px-3 py-2 font-semibold num" style={{ color: '#f59e0b' }}>{fmtBRL(p.comissao_corretor)}</td>
                              <td className="px-3 py-2 num" style={{ color: 'var(--text-3)' }}>{fmtBRL(p.comissao_empresa)}</td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={p.status_comissao === 'Comissão Paga'
                                    ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' }
                                    : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                  {p.status_comissao}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
