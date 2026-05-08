import { useState, useEffect } from 'react';
import { Search, ChevronDown, FileText, CheckCircle, Clock, DollarSign, XCircle, Edit2, Trash2, Save } from 'lucide-react';
import { Proposal, ProposalStatus, FinancialTable } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const STATUS_CONFIG: Record<ProposalStatus, { color: string; icon: React.ReactNode }> = {
  Digitada:    { color: 'badge badge-blue',   icon: <FileText className="w-3 h-3" /> },
  'Em análise':{ color: 'badge badge-amber',  icon: <Clock className="w-3 h-3" /> },
  Aprovada:    { color: 'badge badge-purple', icon: <CheckCircle className="w-3 h-3" /> },
  Paga:        { color: 'badge badge-green',  icon: <DollarSign className="w-3 h-3" /> },
  Cancelada:   { color: 'badge badge-red',    icon: <XCircle className="w-3 h-3" /> },
};

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const inp = 'input-cyber w-full px-3 py-2.5 rounded-xl text-sm';

export function AdminProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editProposal, setEditProposal] = useState<Proposal | null>(null);
  const [editStatus, setEditStatus] = useState<ProposalStatus>('Digitada');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [pr, tr] = await Promise.all([
      API('/api/proposals').then(r => r.json()),
      API('/api/financial-tables').then(r => r.json()),
    ]);
    setProposals(Array.isArray(pr) ? pr : []);
    setTables(Array.isArray(tr) ? tr : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus() {
    if (!editProposal) return;
    setSaving(true);
    await API(`/api/proposals/${editProposal.id}`, { method: 'PUT', body: JSON.stringify({ status: editStatus }) });
    setEditProposal(null);
    await load();
    setSaving(false);
  }

  async function deleteProposal(id: string) {
    if (!confirm('Excluir esta proposta?')) return;
    await API(`/api/proposals/${id}`, { method: 'DELETE' });
    await load();
  }

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.client_name.toLowerCase().includes(q) || p.proposal_number.includes(q) || (p.user_name || '').toLowerCase().includes(q) || p.bank.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.value), 0);
  const totalPoints = proposals.reduce((a, b) => a + (b.points_earned || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Propostas — Admin</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{proposals.length} propostas no sistema</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',               value: proposals.length,                                  color: '#60a5fa' },
          { label: 'Pagas',               value: proposals.filter(p => p.status === 'Paga').length, color: '#4ade80' },
          { label: 'Volume pago',          value: fmtBRL(totalPaid),                                 color: '#14B8A6' },
          { label: 'Pontos distribuídos',  value: `${totalPoints} pts`,                              color: '#fbbf24' },
        ].map((c, i) => (
          <div key={c.label} className="stat-card rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>{c.label}</p>
            <p className="text-xl font-black num" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, proposta, corretor ou banco..."
            className="input-cyber w-full pl-9 pr-3 py-2.5 text-sm rounded-xl" />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="input-cyber appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl" style={{ minWidth: '160px' }}>
            <option value="">Todos os status</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando propostas...</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Proposta', 'Corretor', 'Cliente', 'Banco / Tabela', 'Valor', 'Status', 'Pontos', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma proposta encontrada</td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="table-row-cyber">
                    <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{p.user_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.client_cpf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{p.bank}</p>
                      <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-3)' }}>{p.table_name || p.convenio}</p>
                    </td>
                    <td className="px-4 py-3 font-bold num" style={{ color: 'var(--text-1)' }}>{fmtBRL(Number(p.value))}</td>
                    <td className="px-4 py-3">
                      <span className={`${STATUS_CONFIG[p.status]?.color} inline-flex items-center gap-1`}>
                        {STATUS_CONFIG[p.status]?.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.points_earned > 0
                        ? <span className="font-bold num" style={{ color: '#fbbf24' }}>+{p.points_earned}</span>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditProposal(p); setEditStatus(p.status); }}
                          className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProposal(p.id)}
                          className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!editProposal}
        onClose={() => setEditProposal(null)}
        title="Alterar Status"
        subtitle={editProposal ? `Proposta #${editProposal.proposal_number} — ${editProposal.client_name}` : undefined}
        size="md"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditProposal(null)} className={btnCancel}>Cancelar</button>
            <button onClick={updateStatus} disabled={saving} className={`${btnPrimary} flex items-center justify-center gap-1.5`}>
              <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {editStatus === 'Paga' && editProposal?.status !== 'Paga' && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              ✅ Ao marcar como <strong>Paga</strong>, os pontos serão calculados e atribuídos automaticamente ao corretor.
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Novo Status</label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={editStatus} onChange={e => setEditStatus(e.target.value as ProposalStatus)} className={`${inp} appearance-none pr-8`}>
                {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
