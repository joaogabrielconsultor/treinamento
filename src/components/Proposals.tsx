import { useState, useEffect } from 'react';
import { Plus, Search, FileText, ChevronDown, X, CheckCircle, Clock, AlertCircle, DollarSign, XCircle, Edit2 } from 'lucide-react';
import { Proposal, ProposalStatus, FinancialTable } from '../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  Digitada:    { label: 'Digitada',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   icon: <FileText className="w-3 h-3" /> },
  'Em análise':{ label: 'Em análise', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  Aprovada:    { label: 'Aprovada',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <CheckCircle className="w-3 h-3" /> },
  Paga:        { label: 'Paga',        color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',  icon: <DollarSign className="w-3 h-3" /> },
  Cancelada:   { label: 'Cancelada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',    icon: <XCircle className="w-3 h-3" /> },
};

const EMPTY_FORM = {
  proposal_number: '', value: '', product: '', bank: '', convenio: '',
  table_id: '', client_name: '', client_cpf: '', client_phone: '', status: 'Digitada' as ProposalStatus,
};

function formatCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}
function formatPhone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    setLoading(true);
    const [pr, tr] = await Promise.all([
      API('/api/proposals').then(r => r.json()),
      API('/api/financial-tables').then(r => r.json()),
    ]);
    setProposals(Array.isArray(pr) ? pr : []);
    setTables(Array.isArray(tr) ? tr.filter((t: FinancialTable) => t.active) : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(p: Proposal) {
    setForm({
      proposal_number: p.proposal_number, value: String(p.value), product: p.product,
      bank: p.bank, convenio: p.convenio, table_id: p.table_id || '',
      client_name: p.client_name, client_cpf: p.client_cpf, client_phone: p.client_phone,
      status: p.status,
    });
    setEditId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, value: parseFloat(form.value) || 0, table_id: form.table_id || null };
    const url = editId ? `/api/proposals/${editId}` : '/api/proposals';
    const method = editId ? 'PUT' : 'POST';
    await API(url, { method, body: JSON.stringify(body) });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.client_name.toLowerCase().includes(q) || p.proposal_number.includes(q) || p.bank.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.value), 0);
  const totalPoints = proposals.reduce((a, b) => a + (b.points_earned || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Propostas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{proposals.length} propostas cadastradas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: '#1e4033' }}>
          <Plus className="w-4 h-4" /> Nova Proposta
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de propostas', value: proposals.length, color: 'text-blue-600' },
          { label: 'Propostas pagas', value: proposals.filter(p => p.status === 'Paga').length, color: 'text-green-600' },
          { label: 'Volume pago', value: formatCurrency(totalPaid), color: 'text-brand' },
          { label: 'Meus pontos', value: `${totalPoints} pts`, color: 'text-yellow-600' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, proposta ou banco..."
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

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma proposta encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Proposta" para começar</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dk-card rounded-xl border border-gray-100 dark:border-dk-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dk-border">
                  {['Proposta', 'Cliente', 'Banco / Tabela', 'Valor', 'Produto', 'Status', 'Pontos', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-dk-border/50 hover:bg-gray-50 dark:hover:bg-dk-surface/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{p.client_name}</p>
                      <p className="text-xs text-gray-400">{p.client_cpf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 dark:text-gray-300">{p.bank}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.table_name || p.convenio}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(p.value))}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.product}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[p.status]?.color}`}>
                        {STATUS_CONFIG[p.status]?.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.points_earned > 0 ? (
                        <span className="text-yellow-600 font-bold">+{p.points_earned} pts</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Editar Proposta' : 'Nova Proposta'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Número da Proposta" required>
                <input value={form.proposal_number} onChange={e => setForm(f => ({ ...f, proposal_number: e.target.value }))} className={inp} placeholder="Ex: 123456" required />
              </Field>
              <Field label="Valor Liberado (R$)" required>
                <input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inp} placeholder="0,00" required />
              </Field>
              <Field label="Nome do Cliente" required>
                <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inp} required />
              </Field>
              <Field label="CPF do Cliente">
                <input value={form.client_cpf} onChange={e => setForm(f => ({ ...f, client_cpf: formatCPF(e.target.value) }))} className={inp} placeholder="000.000.000-00" />
              </Field>
              <Field label="Telefone do Cliente">
                <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: formatPhone(e.target.value) }))} className={inp} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Banco" required>
                <input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className={inp} required />
              </Field>
              <Field label="Produto" required>
                <input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} className={inp} required />
              </Field>
              <Field label="Convênio">
                <input value={form.convenio} onChange={e => setForm(f => ({ ...f, convenio: e.target.value }))} className={inp} />
              </Field>
              <Field label="Tabela Financeira" className="sm:col-span-2">
                <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))} className={inp}>
                  <option value="">Selecione a tabela</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Status" className="sm:col-span-2">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProposalStatus }))} className={inp}>
                  {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: '#1e4033' }}>
                  {saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar proposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
