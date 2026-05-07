import { useState, useEffect } from 'react';
import { Search, ChevronDown, FileText, CheckCircle, Clock, DollarSign, XCircle, Edit2, Trash2, X, Save } from 'lucide-react';
import { Proposal, ProposalStatus, FinancialTable } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const STATUS_CONFIG: Record<ProposalStatus, { color: string; icon: React.ReactNode }> = {
  Digitada:    { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',     icon: <FileText className="w-3 h-3" /> },
  'Em análise':{ color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  Aprovada:    { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <CheckCircle className="w-3 h-3" /> },
  Paga:        { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',   icon: <DollarSign className="w-3 h-3" /> },
  Cancelada:   { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',          icon: <XCircle className="w-3 h-3" /> },
};

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Propostas — Visão Geral</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{proposals.length} propostas no sistema</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: proposals.length, color: 'text-blue-600' },
          { label: 'Pagas', value: proposals.filter(p => p.status === 'Paga').length, color: 'text-green-600' },
          { label: 'Volume pago', value: fmtBRL(totalPaid), color: 'text-brand' },
          { label: 'Pontos distribuídos', value: `${totalPoints} pts`, color: 'text-yellow-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-dk-card rounded-xl p-4 border border-gray-100 dark:border-dk-border shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, proposta, corretor ou banco..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-card dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-card dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="">Todos os status</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-white dark:bg-dk-card rounded-xl border border-gray-100 dark:border-dk-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dk-border">
                  {['Proposta', 'Corretor', 'Cliente', 'Banco / Tabela', 'Valor', 'Status', 'Pontos', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhuma proposta encontrada</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-dk-border/50 hover:bg-gray-50 dark:hover:bg-dk-surface/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-xs">{p.user_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{p.client_name}</p>
                      <p className="text-xs text-gray-400">{p.client_cpf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 dark:text-gray-300">{p.bank}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.table_name || p.convenio}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmtBRL(Number(p.value))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[p.status]?.color}`}>
                        {STATUS_CONFIG[p.status]?.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.points_earned > 0 ? <span className="text-yellow-600 font-bold">+{p.points_earned}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditProposal(p); setEditStatus(p.status); }} title="Alterar status"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-brand transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProposal(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
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

      {/* Edit status modal */}
      {editProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Alterar Status</h2>
                <p className="text-xs text-gray-500 mt-0.5">Proposta #{editProposal.proposal_number} — {editProposal.client_name}</p>
              </div>
              <button onClick={() => setEditProposal(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {editStatus === 'Paga' && editProposal.status !== 'Paga' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 text-sm text-green-700 dark:text-green-300">
                  ✅ Ao marcar como <strong>Paga</strong>, os pontos serão calculados e atribuídos automaticamente ao corretor.
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Novo Status</label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as ProposalStatus)} className={`${inp} appearance-none pr-8`}>
                    {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditProposal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">Cancelar</button>
                <button onClick={updateStatus} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: '#1e4033' }}>
                  <Save className="w-4 h-4 inline mr-1" />{saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
