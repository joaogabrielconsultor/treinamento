import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, DollarSign, FileText, ChevronDown } from 'lucide-react';
import { Proposal } from '../types';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Summary {
  pending_count: number;
  pending_value: number;
  paid_count: number;
  paid_value: number;
}

const STATUS_BADGE: Record<string, string> = {
  'Ag. Comissão': 'badge badge-amber',
  'Comissão Paga': 'badge badge-green',
};

export function ContaCorrente() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending_count: 0, pending_value: 0, paid_count: 0, paid_value: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  async function load() {
    setLoading(true);
    const data = await API('/api/conta-corrente').then(r => r.json());
    setProposals(Array.isArray(data.proposals) ? data.proposals : []);
    if (data.summary) setSummary(data.summary);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filterStatus ? proposals.filter(p => p.status_comissao === filterStatus) : proposals;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [filterStatus]);

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Conta Corrente</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Acompanhe suas comissões a receber e já recebidas</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'A Receber',        value: fmtBRL(summary.pending_value), sub: `${summary.pending_count} proposta${summary.pending_count !== 1 ? 's' : ''}`, icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
          { label: 'Já Recebido',      value: fmtBRL(summary.paid_value),    sub: `${summary.paid_count} paga${summary.paid_count !== 1 ? 's' : ''}`,            icon: CheckCircle,  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)'  },
          { label: 'Total em Aberto',  value: String(summary.pending_count),  sub: 'aguardando pagamento',                                                         icon: FileText,     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)'  },
          { label: 'Total Acumulado',  value: fmtBRL(summary.pending_value + summary.paid_value), sub: 'comissões totais',                                          icon: DollarSign,   color: '#14B8A6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)'  },
        ].map((c, i) => (
          <div key={c.label} className="rounded-2xl p-4 animate-fade-up" style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: 'var(--shadow-card)', animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>{c.label}</p>
                <p className="text-xl font-black num" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{c.sub}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex gap-3 mb-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="input-cyber appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl" style={{ minWidth: '180px' }}>
            <option value="">Todos os status</option>
            <option value="Ag. Comissão">Ag. Comissão</option>
            <option value="Comissão Paga">Comissão Paga</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Proposta', 'Nome do Cliente', 'CPF', 'Banco / Tabela', 'Valor', 'Comissão', 'Status Comissão'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>
                      Nenhuma comissão encontrada
                    </td>
                  </tr>
                ) : paginated.map(p => (
                  <tr key={p.id} className="table-row-cyber">
                    <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{p.client_cpf || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{p.bank_name || p.bank || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.table_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold num" style={{ color: 'var(--text-1)' }}>{fmtBRL(Number(p.value))}</td>
                    <td className="px-4 py-3">
                      {Number(p.comissao_valor) > 0 ? (
                        <div>
                          <span className="font-bold text-sm num" style={{ color: '#4ade80' }}>{fmtBRL(Number(p.comissao_valor))}</span>
                          <p className="text-xs num" style={{ color: 'var(--text-3)' }}>{Number(p.comissao_corretor_pct || 0).toFixed(2)}%</p>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${STATUS_BADGE[p.status_comissao || ''] || 'badge badge-neutral'} inline-flex items-center gap-1`}>
                        {p.status_comissao === 'Ag. Comissão' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {p.status_comissao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}
    </div>
  );
}
