import { useState, useEffect, useCallback, useRef } from 'react';
import { SimPrefill } from './Simulator';
import { Plus, Search, FileText, ChevronDown, CheckCircle, Clock, DollarSign, XCircle, Edit2, User, CreditCard, ChevronRight, AlertTriangle, Lock, Unlock, Trash2 } from 'lucide-react';
import { Proposal, ProposalStatusDef, FinancialTable, Bank, Convenio, Product } from '../types';
import { Modal } from './ui/Modal';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const COLOR_MAP: Record<string, string> = {
  blue:   'badge badge-blue',
  amber:  'badge badge-amber',
  purple: 'badge badge-purple',
  green:  'badge badge-green',
  red:    'badge badge-red',
  teal:   'badge badge-teal',
};
const ICON_MAP: Record<string, React.ReactNode> = {
  Digitada:    <FileText className="w-3 h-3" />,
  'Em análise':<Clock className="w-3 h-3" />,
  Aprovada:    <CheckCircle className="w-3 h-3" />,
  Paga:        <DollarSign className="w-3 h-3" />,
  Cancelada:   <XCircle className="w-3 h-3" />,
};
function statusBadge(name: string, color: string) {
  return COLOR_MAP[color] || 'badge badge-blue';
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  client_name: '', client_cpf: '', client_phone: '',
  proposal_number: '', value: '', product_id: '',
  convenio_id: '', bank_id: '', table_id: '',
  created_at: today(),
  status: '' as string,
  coeficiente: '' as string,
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
  isMaster?: boolean;
}

export function Proposals({ prefill, onClearPrefill, isAdmin = false, isMaster = false }: ProposalsProps = {}) {
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
  const [statusDefs, setStatusDefs] = useState<ProposalStatusDef[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);

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
    const [pr, cv, pd, st] = await Promise.all([
      API('/api/proposals').then(r => r.json()),
      API('/api/convenios').then(r => r.json()),
      API('/api/products').then(r => r.json()),
      API('/api/proposal-statuses').then(r => r.json()),
    ]);
    setProposals(Array.isArray(pr) ? pr : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setProducts(Array.isArray(pd) ? pd : []);
    setStatusDefs(Array.isArray(st) ? st : []);
    setLoading(false);
  }

  async function quickStatusChange(id: string, newStatus: string) {
    await API(`/api/proposals/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as Proposal['status'] } : p));
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
      created_at: p.created_at ? p.created_at.slice(0, 10) : today(),
      status: p.status,
      coeficiente: p.coeficiente ? String(p.coeficiente) : '',
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

  function validateAll(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.client_name.trim()) e.client_name = 'Nome obrigatório';
    if (!form.client_cpf.trim() || form.client_cpf.replace(/\D/g, '').length < 11) e.client_cpf = 'CPF inválido';
    if (!form.client_phone.trim() || form.client_phone.replace(/\D/g, '').length < 10) e.client_phone = 'Telefone inválido';
    if (!form.proposal_number.trim()) e.proposal_number = 'Número obrigatório';
    if (dupAlert) e.proposal_number = dupAlert;
    if (!form.value || parseFloat(form.value) <= 0) e.value = 'Valor deve ser maior que zero';
    if (!form.convenio_id) e.convenio_id = 'Selecione o convênio';
    if (!form.bank_id) e.bank_id = 'Selecione o banco';
    if (!form.table_id) e.table_id = 'Selecione a tabela';
    return e;
  }

  async function handleSubmit() {
    const e = editId ? validateAll() : validateStep(2);
    setErrors(e);
    if (Object.keys(e).length > 0 || dupAlert) return;
    setSaving(true);
    const selectedConvenio = convenios.find(c => c.id === form.convenio_id);
    const selectedBank = banks.find(b => b.id === form.bank_id);
    const body: Record<string, unknown> = {
      ...form,
      value: parseFloat(form.value),
      product_id: form.product_id || null,
      table_id: form.table_id || null,
      bank_id: form.bank_id || null,
      convenio_id: form.convenio_id || null,
      bank: selectedBank?.name || '',
      convenio: selectedConvenio?.name || '',
      created_at: form.created_at || today(),
    };
    if (editId && isAdmin) {
      if (form.status) body.status = form.status;
      if (form.coeficiente !== '') body.coeficiente = form.coeficiente;
    }
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

  async function deleteProposal(id: string) {
    await API(`/api/proposals/${id}`, { method: 'DELETE' });
    setProposals(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  }

  async function toggleBrokerEdit(id: string, current: boolean) {
    await API(`/api/admin/proposals/${id}/toggle-edit`, { method: 'PATCH' });
    setProposals(prev => prev.map(p => p.id === id ? { ...p, allow_broker_edit: !current } : p));
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
            {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
                  {['Proposta', 'Corretor', 'Nome do Cliente', 'CPF', 'Convênio', 'Banco', 'Tabela', 'Valor', 'Produto', 'Status', 'Data Digitação', 'Data Status', 'Comissão', 'Pontos', ''].map(h => (
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
                      <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{p.user_name || p.user_email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{p.client_cpf || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>{p.convenio_name || p.convenio || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>{p.bank_name || p.bank || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-3)' }}>{p.table_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold num" style={{ color: 'var(--text-1)' }}>{formatCurrency(Number(p.value))}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-3)' }}>{p.product_name || p.product}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="relative">
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                          <select
                            value={p.status}
                            onChange={e => quickStatusChange(p.id, e.target.value)}
                            className="appearance-none text-xs font-semibold pl-2 pr-6 py-1 rounded-lg cursor-pointer"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', color: 'var(--text-1)' }}
                          >
                            {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        (() => {
                          const sd = statusDefs.find(s => s.name === p.status);
                          return (
                            <span className={`${sd ? statusBadge(sd.name, sd.color) : 'badge badge-blue'} inline-flex items-center gap-1`}>
                              {ICON_MAP[p.status] || <FileText className="w-3 h-3" />} {p.status}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs num" style={{ color: 'var(--text-3)' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs num" style={{ color: 'var(--text-3)' }}>
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : '—'}
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
                      <div className="flex items-center gap-1">
                        {(isAdmin || p.allow_broker_edit) && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                            title="Editar proposta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => toggleBrokerEdit(p.id, p.allow_broker_edit)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: p.allow_broker_edit ? '#4ade80' : 'var(--text-3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            title={p.allow_broker_edit ? 'Travar edição do corretor' : 'Liberar edição ao corretor'}
                          >
                            {p.allow_broker_edit ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {isMaster && (
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                            title="Excluir proposta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      {/* Modal de confirmação de exclusão (só master) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir Proposta</h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Tem certeza que deseja excluir a proposta de</p>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{confirmDelete.client_name}</p>
            <p className="text-xs mb-4" style={{ color: '#f87171' }}>Esta ação é irreversível.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
              <button onClick={() => deleteProposal(confirmDelete.id)}
                className="flex-1 py-2.5 text-sm rounded-xl font-semibold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: edição sem etapas / criação com etapas */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Proposta' : 'Nova Proposta'}
        size="lg"
        footer={
          <div className="flex gap-3">
            {editId ? (
              <button type="button" onClick={handleSubmit} disabled={saving || !!dupAlert} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            ) : (
              <>
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
                    {saving ? 'Salvando...' : 'Cadastrar proposta'}
                  </button>
                )}
              </>
            )}
          </div>
        }
      >
        {editId ? (
          /* ── MODO EDIÇÃO: todos os campos de uma vez ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome completo do cliente" error={errors.client_name}>
                <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inp} />
              </Field>
              <Field label="CPF do cliente" error={errors.client_cpf}>
                <input value={form.client_cpf} onChange={e => setForm(f => ({ ...f, client_cpf: formatCPF(e.target.value) }))} className={inp} inputMode="numeric" />
              </Field>
              <Field label="Telefone do cliente" error={errors.client_phone}>
                <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: formatPhone(e.target.value) }))} className={inp} inputMode="tel" />
              </Field>
              <Field label="Número da proposta" error={errors.proposal_number}>
                <div className="relative">
                  <input value={form.proposal_number} onChange={e => { setForm(f => ({ ...f, proposal_number: e.target.value })); setErrors(er => ({ ...er, proposal_number: '' })); }}
                    className={`${inp} ${dupAlert ? 'border-red-400' : ''}`} />
                  {checkingDup && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />}
                </div>
                {dupAlert && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {dupAlert}</p>}
              </Field>
              <Field label="Valor liberado (R$)" error={errors.value}>
                <input type="number" step="0.01" min="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inp} inputMode="decimal" />
              </Field>
              <Field label="Data de digitação">
                <input type="date" value={form.created_at} onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} className={inp} />
              </Field>
              <Field label="Produto" error={errors.product_id}>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Selecione o produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </Field>
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
                    disabled={!form.convenio_id || loadingBanks} className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                    <option value="">{loadingBanks ? 'Carregando...' : 'Selecione o banco'}</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Tabela financeira" error={errors.table_id}>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))}
                    disabled={!form.bank_id || loadingTables} className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                    <option value="">{loadingTables ? 'Carregando...' : 'Selecione a tabela'}</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </Field>
              {isAdmin && (
                <>
                  <Field label="Status">
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Coeficiente (manual)">
                    <input type="number" step="0.0000001" value={form.coeficiente}
                      onChange={e => setForm(f => ({ ...f, coeficiente: e.target.value }))}
                      className={inp} placeholder="Ex: 0.0123456" />
                  </Field>
                </>
              )}
            </div>
            {errors.submit && <p className="text-xs text-red-400">{errors.submit}</p>}
          </div>
        ) : (
          /* ── MODO CRIAÇÃO: wizard com etapas ── */
          <>
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
              <Field label="Data de digitação">
                <input type="date" value={form.created_at} onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} className={inp} />
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
          </>
        )}
      </Modal>
    </div>
  );
}
