import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, ChevronDown, X, CheckCircle, Clock, DollarSign, XCircle, Edit2, User, CreditCard, ChevronRight, AlertTriangle } from 'lucide-react';
import { Proposal, ProposalStatus, FinancialTable, Bank, Convenio, Product } from '../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const STATUS_CONFIG: Record<ProposalStatus, { color: string; icon: React.ReactNode }> = {
  Digitada:    { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',     icon: <FileText className="w-3 h-3" /> },
  'Em análise':{ color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  Aprovada:    { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <CheckCircle className="w-3 h-3" /> },
  Paga:        { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',   icon: <DollarSign className="w-3 h-3" /> },
  Cancelada:   { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',          icon: <XCircle className="w-3 h-3" /> },
};

const EMPTY_FORM = {
  client_name: '', client_cpf: '', client_phone: '',
  proposal_number: '', value: '', product_id: '',
  convenio_id: '', bank_id: '', table_id: '',
};

const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors';

function formatCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const STEPS = [
  { label: 'Dados do Cliente', icon: User },
  { label: 'Dados da Operação', icon: CreditCard },
  { label: 'Produto / Tabela', icon: FileText },
];

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label} <span className="text-red-400">*</span>
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

export function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Cascade data
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [dupAlert, setDupAlert] = useState<string | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);

  async function load() {
    setLoading(true);
    const [pr, cv, pd] = await Promise.all([
      API('/api/proposals').then(r => r.json()),
      API('/api/convenios').then(r => r.json()),
      API('/api/products').then(r => r.json()),
    ]);
    setProposals(Array.isArray(pr) ? pr : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setProducts(Array.isArray(pd) ? pd : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Cascade: convenio → banks
  useEffect(() => {
    if (!form.convenio_id) { setBanks([]); setForm(f => ({ ...f, bank_id: '', table_id: '' })); return; }
    setLoadingBanks(true);
    API(`/api/banks?convenio_id=${form.convenio_id}`).then(r => r.json()).then(d => {
      setBanks(Array.isArray(d) ? d : []);
      setForm(f => ({ ...f, bank_id: '', table_id: '' }));
      setLoadingBanks(false);
    });
  }, [form.convenio_id]);

  // Cascade: bank → tables
  useEffect(() => {
    if (!form.bank_id || !form.convenio_id) { setTables([]); setForm(f => ({ ...f, table_id: '' })); return; }
    setLoadingTables(true);
    API(`/api/financial-tables?convenio_id=${form.convenio_id}&bank_id=${form.bank_id}`).then(r => r.json()).then(d => {
      setTables(Array.isArray(d) ? d : []);
      setForm(f => ({ ...f, table_id: '' }));
      setLoadingTables(false);
    });
  }, [form.bank_id]);

  // Duplicate proposal number check (debounced)
  const checkDuplicate = useCallback(async (num: string, excludeId?: string) => {
    if (!num) { setDupAlert(null); return; }
    setCheckingDup(true);
    const url = `/api/proposals/check-number?proposal_number=${encodeURIComponent(num)}${excludeId ? `&exclude_id=${excludeId}` : ''}`;
    const r = await API(url);
    const data = await r.json();
    setDupAlert(data.exists ? `Número já cadastrado para o cliente "${data.client_name}"` : null);
    setCheckingDup(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (form.proposal_number) checkDuplicate(form.proposal_number, editId || undefined); }, 500);
    return () => clearTimeout(t);
  }, [form.proposal_number]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setStep(0);
    setErrors({});
    setDupAlert(null);
    setBanks([]);
    setTables([]);
    setShowForm(true);
  }

  function openEdit(p: Proposal) {
    setForm({
      client_name: p.client_name, client_cpf: p.client_cpf, client_phone: p.client_phone,
      proposal_number: p.proposal_number, value: String(p.value), product_id: p.product_id || '',
      convenio_id: p.convenio_id || '', bank_id: p.bank_id || '', table_id: p.table_id || '',
    });
    setEditId(p.id);
    setStep(0);
    setErrors({});
    setDupAlert(null);
    setShowForm(true);
  }

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.client_name.trim()) e.client_name = 'Nome obrigatório';
      if (!form.client_cpf.trim() || form.client_cpf.replace(/\D/g, '').length < 11) e.client_cpf = 'CPF inválido';
      if (!form.client_phone.trim() || form.client_phone.replace(/\D/g, '').length < 10) e.client_phone = 'Telefone inválido';
    }
    if (s === 1) {
      if (!form.proposal_number.trim()) e.proposal_number = 'Número obrigatório';
      if (dupAlert) e.proposal_number = dupAlert;
      if (!form.value || parseFloat(form.value) <= 0) e.value = 'Valor deve ser maior que zero';
      if (!form.product_id) e.product_id = 'Selecione o produto';
    }
    if (s === 2) {
      if (!form.convenio_id) e.convenio_id = 'Selecione o convênio';
      if (!form.bank_id) e.bank_id = 'Selecione o banco';
      if (!form.table_id) e.table_id = 'Selecione a tabela';
    }
    return e;
  }

  function nextStep() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(s => s + 1);
  }

  async function handleSubmit() {
    const e = validateStep(2);
    setErrors(e);
    if (Object.keys(e).length > 0 || dupAlert) return;
    setSaving(true);
    const selectedConvenio = convenios.find(c => c.id === form.convenio_id);
    const selectedBank = banks.find(b => b.id === form.bank_id);
    const body = {
      ...form,
      value: parseFloat(form.value),
      product_id: form.product_id || null,
      table_id: form.table_id || null,
      bank_id: form.bank_id || null,
      convenio_id: form.convenio_id || null,
      bank: selectedBank?.name || '',
      convenio: selectedConvenio?.name || '',
    };
    const url = editId ? `/api/proposals/${editId}` : '/api/proposals';
    const resp = await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (!resp.ok) {
      const data = await resp.json();
      setErrors({ proposal_number: data.error || 'Erro ao salvar' });
      setStep(1);
      setSaving(false);
      return;
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.client_name.toLowerCase().includes(q) || p.proposal_number.includes(q) || (p.bank_name || p.bank || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.value), 0);
  const totalPoints = proposals.reduce((a, b) => a + (b.points_earned || 0), 0);
  const totalComissao = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.comissao_valor || 0), 0);

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: proposals.length, color: 'text-blue-600' },
          { label: 'Propostas pagas', value: proposals.filter(p => p.status === 'Paga').length, color: 'text-green-600' },
          { label: 'Volume pago', value: formatCurrency(totalPaid), color: 'text-brand' },
          { label: 'Minha comissão', value: formatCurrency(totalComissao), color: 'text-emerald-600' },
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
                  {['Proposta', 'Cliente', 'Convênio / Banco / Tabela', 'Valor', 'Produto', 'Status', 'Comissão', 'Pontos', ''].map(h => (
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
                      <p className="text-xs text-gray-400">{p.convenio_name || p.convenio || '—'}</p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{p.bank_name || p.bank || '—'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.table_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(p.value))}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.product_name || p.product}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[p.status]?.color}`}>
                        {STATUS_CONFIG[p.status]?.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'Paga' && Number(p.comissao_valor) > 0 ? (
                        <div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{formatCurrency(Number(p.comissao_valor))}</span>
                          <p className="text-xs text-gray-400">{Number(p.comissao_corretor_pct || 0).toFixed(2)}%</p>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.points_earned > 0 ? <span className="text-yellow-600 font-bold">+{p.points_earned} pts</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'Digitada' && (
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-step modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-dk-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Editar Proposta' : 'Nova Proposta'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center px-6 pt-4 pb-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${done ? 'bg-brand text-white' : active ? 'text-white' : 'bg-gray-100 dark:bg-dk-surface text-gray-400'}`}
                        style={active ? { backgroundColor: '#1e4033' } : done ? { backgroundColor: '#1e4033' } : {}}>
                        {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <p className={`text-[10px] mt-1 font-medium ${active ? 'text-brand' : done ? 'text-brand' : 'text-gray-400'}`} style={{ color: active || done ? '#1e4033' : undefined }}>
                        {s.label}
                      </p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-brand' : 'bg-gray-200 dark:bg-dk-border'}`} style={done ? { backgroundColor: '#1e4033' } : {}} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step content */}
            <div className="px-6 py-4 space-y-4 min-h-[220px]">
              {/* Step 0: Cliente */}
              {step === 0 && (
                <>
                  <Field label="Nome completo do cliente" error={errors.client_name}>
                    <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inp} placeholder="João da Silva" autoFocus />
                  </Field>
                  <Field label="CPF do cliente" error={errors.client_cpf}>
                    <input value={form.client_cpf} onChange={e => setForm(f => ({ ...f, client_cpf: formatCPF(e.target.value) }))} className={inp} placeholder="000.000.000-00" inputMode="numeric" />
                  </Field>
                  <Field label="Telefone do cliente" error={errors.client_phone}>
                    <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: formatPhone(e.target.value) }))} className={inp} placeholder="(00) 00000-0000" inputMode="tel" />
                  </Field>
                </>
              )}

              {/* Step 1: Operação */}
              {step === 1 && (
                <>
                  <Field label="Número da proposta" error={errors.proposal_number}>
                    <div className="relative">
                      <input value={form.proposal_number} onChange={e => { setForm(f => ({ ...f, proposal_number: e.target.value })); setErrors(er => ({ ...er, proposal_number: '' })); }}
                        className={`${inp} ${dupAlert ? 'border-red-400 focus:ring-red-300' : ''} ${form.proposal_number && !dupAlert && !checkingDup ? 'border-green-400' : ''}`}
                        placeholder="Ex: 123456" autoFocus />
                      {checkingDup && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />}
                    </div>
                    {dupAlert && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {dupAlert}
                      </p>
                    )}
                    {form.proposal_number && !dupAlert && !checkingDup && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Número disponível</p>
                    )}
                  </Field>
                  <Field label="Valor liberado (R$)" error={errors.value}>
                    <input type="number" step="0.01" min="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inp} placeholder="0,00" inputMode="decimal" />
                  </Field>
                  <Field label="Produto" error={errors.product_id}>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="">{products.length === 0 ? 'Nenhum produto cadastrado' : 'Selecione o produto'}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </Field>
                </>
              )}

              {/* Step 2: Convênio → Banco → Tabela */}
              {step === 2 && (
                <>
                  <Field label="Convênio" error={errors.convenio_id}>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="">Selecione o convênio</option>
                        {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </Field>

                  <Field label="Banco" error={errors.bank_id}>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))}
                        disabled={!form.convenio_id || loadingBanks}
                        className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                        <option value="">{!form.convenio_id ? 'Selecione o convênio primeiro' : loadingBanks ? 'Carregando...' : banks.length === 0 ? 'Nenhum banco disponível' : 'Selecione o banco'}</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </Field>

                  <Field label="Tabela financeira" error={errors.table_id}>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))}
                        disabled={!form.bank_id || loadingTables}
                        className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                        <option value="">{!form.bank_id ? 'Selecione o banco primeiro' : loadingTables ? 'Carregando...' : tables.length === 0 ? 'Nenhuma tabela disponível' : 'Selecione a tabela'}</option>
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </Field>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">
                  Voltar
                </button>
              )}
              {step < 2 ? (
                <button type="button" onClick={nextStep} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#1e4033' }}>
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving || !!dupAlert} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all" style={{ backgroundColor: '#1e4033' }}>
                  {saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar proposta'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
