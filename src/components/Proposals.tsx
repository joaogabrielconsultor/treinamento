import { useState, useEffect, useCallback, useRef } from 'react';
import { SimPrefill } from './Simulator';
import { Plus, Search, FileText, ChevronDown, CheckCircle, Clock, DollarSign, XCircle, Edit2, User, CreditCard, ChevronRight, AlertTriangle } from 'lucide-react';
import { Proposal, ProposalStatus, FinancialTable, Bank, Convenio, Product } from '../types';
import { Modal } from './ui/Modal';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const STATUS_CONFIG: Record<ProposalStatus, { color: string; icon: React.ReactNode }> = {
  Digitada:    { color: 'badge badge-blue',   icon: <FileText className="w-3 h-3" /> },
  'Em análise':{ color: 'badge badge-amber',  icon: <Clock className="w-3 h-3" /> },
  Aprovada:    { color: 'badge badge-purple', icon: <CheckCircle className="w-3 h-3" /> },
  Paga:        { color: 'badge badge-green',  icon: <DollarSign className="w-3 h-3" /> },
  Cancelada:   { color: 'badge badge-red',    icon: <XCircle className="w-3 h-3" /> },
};

const EMPTY_FORM = {
  client_name: '', client_cpf: '', client_phone: '',
  proposal_number: '', value: '', product_id: '',
  convenio_id: '', bank_id: '', table_id: '',
};

const inp = 'input-cyber w-full px-3 py-2.5 rounded-xl text-sm';

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
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label} <span style={{ color: '#f87171' }}>*</span>
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#f87171' }}>
          <AlertTriangle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

interface ProposalsProps {
  prefill?: SimPrefill | null;
  onClearPrefill?: () => void;
  isAdmin?: boolean;
}

export function Proposals({ prefill, onClearPrefill, isAdmin = false }: ProposalsProps = {}) {
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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Cascade data
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [dupAlert, setDupAlert] = useState<string | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);

  // Refs para o prefill do simulador (refs pois a cascata usa closures)
  const pendingBankIdRef = useRef<string | null>(null);
  const pendingTableIdRef = useRef<string | null>(null);

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
      const pending = pendingBankIdRef.current;
      if (pending) {
        setForm(f => ({ ...f, bank_id: pending, table_id: '' }));
      } else {
        setForm(f => ({ ...f, bank_id: '', table_id: '' }));
      }
      setLoadingBanks(false);
    });
  }, [form.convenio_id]);

  // Cascade: bank → tables
  useEffect(() => {
    if (!form.bank_id || !form.convenio_id) { setTables([]); setForm(f => ({ ...f, table_id: '' })); return; }
    setLoadingTables(true);
    API(`/api/financial-tables?convenio_id=${form.convenio_id}&bank_id=${form.bank_id}`).then(r => r.json()).then(d => {
      setTables(Array.isArray(d) ? d : []);
      const pending = pendingTableIdRef.current;
      if (pending) {
        setForm(f => ({ ...f, table_id: pending }));
        pendingTableIdRef.current = null;
      } else {
        setForm(f => ({ ...f, table_id: '' }));
      }
      setLoadingTables(false);
    });
  }, [form.bank_id]);

  // Prefill vindo do Simulador
  useEffect(() => {
    if (!prefill) return;
    pendingBankIdRef.current = prefill.bank_id || null;
    pendingTableIdRef.current = prefill.table_id || null;
    setForm({ ...EMPTY_FORM, value: prefill.value || '', convenio_id: prefill.convenio_id || '' });
    setEditId(null);
    setStep(0);
    setErrors({});
    setDupAlert(null);
    setBanks([]);
    setTables([]);
    setShowForm(true);
    onClearPrefill?.();
  }, [prefill]);

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

  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPaid = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.value), 0);
  const totalPoints = proposals.reduce((a, b) => a + (b.points_earned || 0), 0);
  const totalComissao = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.comissao_valor || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Minhas Propostas</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{proposals.length} propostas cadastradas</p>
        </div>
        <button onClick={openNew} className="btn-cyber flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Nova Proposta
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total',           value: proposals.length,                                   color: '#60a5fa' },
          { label: 'Pagas',           value: proposals.filter(p => p.status === 'Paga').length,  color: '#4ade80' },
          { label: 'Volume pago',     value: formatCurrency(totalPaid),                           color: '#14B8A6' },
          { label: 'Minha comissão',  value: formatCurrency(totalComissao),                       color: '#2DD4BF' },
          { label: 'Meus pontos',     value: `${totalPoints} pts`,                                color: '#fbbf24' },
        ].map((c, i) => (
          <div
            key={c.label}
            className="stat-card rounded-xl p-4 animate-fade-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>{c.label}</p>
            <p className="text-lg font-black num" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, proposta ou banco..."
            className="input-cyber w-full pl-9 pr-3 py-2.5 text-sm rounded-xl"
          />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-cyber appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl"
            style={{ minWidth: '160px' }}
          >
            <option value="">Todos os status</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando propostas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
            <FileText className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-3)' }}>Nenhuma proposta encontrada</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Clique em "Nova Proposta" para começar</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden animate-fade-up"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '140ms',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Proposta', 'Cliente', 'Convênio / Banco / Tabela', 'Valor', 'Produto', 'Status', 'Comissão', 'Pontos', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id} className="table-row-cyber">
                    <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.client_cpf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.convenio_name || p.convenio || '—'}</p>
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{p.bank_name || p.bank || '—'}</p>
                      <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-3)' }}>{p.table_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold num" style={{ color: 'var(--text-1)' }}>{formatCurrency(Number(p.value))}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-3)' }}>{p.product_name || p.product}</td>
                    <td className="px-4 py-3">
                      <span className={`${STATUS_CONFIG[p.status]?.color} inline-flex items-center gap-1`}>
                        {STATUS_CONFIG[p.status]?.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'Paga' && Number(p.comissao_valor) > 0 ? (
                        <div>
                          <span className="font-bold text-sm num" style={{ color: '#4ade80' }}>{formatCurrency(Number(p.comissao_valor))}</span>
                          <p className="text-xs num" style={{ color: 'var(--text-3)' }}>{Number(p.comissao_corretor_pct || 0).toFixed(2)}%</p>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.points_earned > 0
                        ? <span className="font-bold text-sm num" style={{ color: '#fbbf24' }}>+{p.points_earned}</span>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'Digitada' && (
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--text-3)' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)';
                            (e.currentTarget as HTMLElement).style.color = '#14B8A6';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      {/* Multi-step modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Proposta' : 'Nova Proposta'}
        size="lg"
        footer={
          <div className="flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-ghost">
                Voltar
              </button>
            )}
            {step < 2 ? (
              <button type="button" onClick={nextStep} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving || !!dupAlert} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm">
                {saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar proposta'}
              </button>
            )}
          </div>
        }
      >
        {/* Step indicator */}
        <div className="flex items-center mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={done || active
                      ? { background: 'linear-gradient(135deg, #14B8A6, #06B6D4)', color: '#fff', boxShadow: '0 0 12px rgba(20,184,166,0.35)' }
                      : { background: 'var(--bg-surface)', border: '1px solid var(--border-2)', color: 'var(--text-3)' }
                    }
                  >
                    {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: active || done ? '#14B8A6' : 'var(--text-3)' }}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-2 mb-4 transition-all"
                    style={{ background: done ? 'linear-gradient(90deg, #14B8A6, #06B6D4)' : 'var(--border-2)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="space-y-4 min-h-[200px]">
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
                {(() => {
                  const sel = tables.find(t => t.id === form.table_id);
                  if (!sel) return null;
                  const val = parseFloat(form.value) || 0;
                  const empPct = Number(sel.comissao_empresa) || 0;
                  const corPct = Number(sel.comissao_corretor) || 0;
                  const empVal = val * empPct / 100;
                  const corVal = val * corPct / 100;
                  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  return (
                    <div className="mt-3 space-y-2">
                      {sel.coeficiente ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>Coeficiente:</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
                            {Number(sel.coeficiente).toFixed(7)}
                          </span>
                        </div>
                      ) : null}
                      {corPct > 0 && (
                        <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#14B8A6' }}>Simulação de Comissão</p>
                          <div className={`grid gap-2 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {isAdmin && (
                              <div>
                                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Empresa ({empPct}%)</p>
                                <p className="text-sm font-bold" style={{ color: '#60a5fa' }}>{val > 0 ? fmtBRL(empVal) : '—'}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Sua comissão ({corPct}%)</p>
                              <p className="text-sm font-bold" style={{ color: '#4ade80' }}>{val > 0 ? fmtBRL(corVal) : '—'}</p>
                            </div>
                          </div>
                          {val <= 0 && <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Preencha o valor no passo anterior para ver o cálculo</p>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Field>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
