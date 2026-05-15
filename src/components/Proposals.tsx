import { useState, useEffect, useCallback, useRef } from 'react';
import { SimPrefill } from './Simulator';
import {
  Plus, Search, FileText, ChevronDown, CheckCircle, Clock, DollarSign, XCircle,
  Edit2, User, CreditCard, ChevronRight, AlertTriangle, Lock, Unlock, Trash2,
  Upload, Filter, Download, Calendar, TrendingUp, X, Eye, EyeOff,
} from 'lucide-react';
import { Proposal, ProposalStatusDef, FinancialTable, Bank, Convenio, Product } from '../types';
import { Modal } from './ui/Modal';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const COLOR_MAP: Record<string, string> = {
  blue: 'badge badge-blue', amber: 'badge badge-amber', purple: 'badge badge-purple',
  green: 'badge badge-green', red: 'badge badge-red', teal: 'badge badge-teal',
};
const SC_MAP: Record<string, { text: string; border: string; bg: string }> = {
  blue:   { text: '#60a5fa', border: 'rgba(96,165,250,0.4)',   bg: 'rgba(96,165,250,0.1)' },
  amber:  { text: '#fbbf24', border: 'rgba(245,158,11,0.4)',   bg: 'rgba(245,158,11,0.1)' },
  purple: { text: '#a78bfa', border: 'rgba(139,92,246,0.4)',   bg: 'rgba(139,92,246,0.1)' },
  green:  { text: '#4ade80', border: 'rgba(34,197,94,0.4)',    bg: 'rgba(34,197,94,0.1)' },
  red:    { text: '#f87171', border: 'rgba(248,113,113,0.4)',  bg: 'rgba(248,113,113,0.1)' },
  teal:   { text: '#2DD4BF', border: 'rgba(20,184,166,0.4)',   bg: 'rgba(20,184,166,0.1)' },
};
const ICON_MAP: Record<string, React.ReactNode> = {
  Digitada:     <FileText className="w-3 h-3" />,
  'Em análise': <Clock className="w-3 h-3" />,
  Aprovada:     <CheckCircle className="w-3 h-3" />,
  Paga:         <DollarSign className="w-3 h-3" />,
  Cancelada:    <XCircle className="w-3 h-3" />,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = todayStr();
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      const s = d.toISOString().slice(0, 10); return { from: s, to: s };
    }
    case 'last7': {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    case 'last30': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    case 'this_month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: today };
    }
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: d.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
    }
    default: return { from: '', to: '' };
  }
}

const DATE_PRESETS = [
  { key: 'today',      label: 'Hoje' },
  { key: 'yesterday',  label: 'Ontem' },
  { key: 'last7',      label: 'Últ. 7 dias' },
  { key: 'last30',     label: 'Últ. 30 dias' },
  { key: 'this_month', label: 'Este mês' },
  { key: 'last_month', label: 'Mês passado' },
  { key: 'all',        label: 'Todos' },
  { key: 'custom',     label: <><Calendar className="w-3 h-3 inline mr-1" />Personalizado</> },
];

const ALL_COL_KEYS = ['ID','Proposta','Corretor','Cliente','CPF','Convênio','Banco','Tabela','Valor','Produto','Status','Dt. Digit.','Dt. Status','Comissão','Pts'];
const DEFAULT_COLS = new Set(['Proposta','Corretor','Cliente','Convênio','Banco','Tabela','Valor','Produto','Status','Dt. Digit.','Comissão']);

function loadSavedCols(): Set<string> {
  try {
    const raw = localStorage.getItem('proposals_visible_cols');
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return new Set(arr); }
  } catch {}
  return new Set(DEFAULT_COLS);
}

const EMPTY_FORM = {
  client_name: '', client_cpf: '', client_phone: '',
  proposal_number: '', value: '', product_id: '',
  convenio_id: '', bank_id: '', table_id: '',
  created_at: todayStr(),
  status: '' as string,
  coeficiente: '' as string,
  comissao_corretor_override: '' as string,
  comissao_empresa_override: '' as string,
  user_id: '' as string,
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
      {error && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#f87171' }}><AlertTriangle className="w-3 h-3" />{error}</p>}
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
  // ── Core data ──
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusDefs, setStatusDefs] = useState<ProposalStatusDef[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allBanks, setAllBanks] = useState<Bank[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);

  // ── Date filter ──
  const [datePreset, setDatePreset] = useState('this_month');
  const initRange = getDateRange('this_month');
  const [dateFrom, setDateFrom] = useState(initRange.from);
  const [dateTo, setDateTo] = useState(initRange.to);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // ── Advanced filters ──
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterConvenioId, setFilterConvenioId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterUserSearch, setFilterUserSearch] = useState('');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');
  const [filterOnlyPaid, setFilterOnlyPaid] = useState(false);
  const [filterNoPendingComm, setFilterNoPendingComm] = useState(false);
  const [filterLocked, setFilterLocked] = useState<'' | 'locked' | 'unlocked'>('');

  // ── Table UI ──
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(loadSavedCols);
  const [showColPicker, setShowColPicker] = useState(false);

  // ── Form/edit ──
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);
  const [dupAlert, setDupAlert] = useState<string | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);

  // ── Form cascade ──
  const [banks, setBanks] = useState<Bank[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const pendingBankIdRef = useRef<string | null>(null);
  const pendingTableIdRef = useRef<string | null>(null);

  // ── Batch actions ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState('');
  const [applyingBatch, setApplyingBatch] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // ── Import CSV ──
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; errors: { row: string; error: string }[] } | null>(null);

  // ── Load ──
  async function load(from?: string, to?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    const f = from ?? dateFrom;
    const t = to ?? dateTo;
    if (f) params.set('start_date', f);
    if (t) params.set('end_date', t);
    const fetches: Promise<unknown>[] = [
      API(`/api/proposals?${params}`).then(r => r.json()),
      API('/api/convenios').then(r => r.json()),
      API('/api/products').then(r => r.json()),
      API('/api/proposal-statuses').then(r => r.json()),
      API('/api/banks').then(r => r.json()),
    ];
    const [pr, cv, pd, st, bk] = await Promise.all(fetches) as [unknown, unknown, unknown, unknown, unknown];
    setProposals(Array.isArray(pr) ? pr : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setProducts(Array.isArray(pd) ? pd : []);
    setStatusDefs(Array.isArray(st) ? st : []);
    setAllBanks(Array.isArray(bk) ? bk : []);
    setLoading(false);
  }

  // Único efeito de carga — dispara no mount e a cada troca de preset
  useEffect(() => {
    if (datePreset === 'custom') { setShowCustom(true); return; }
    setShowCustom(false);
    const { from, to } = getDateRange(datePreset);
    setDateFrom(from); setDateTo(to);
    load(from, to);
  }, [datePreset]);

  // Carrega lista de usuários separadamente para o master (garante que sempre carrega)
  useEffect(() => {
    if (!isMaster) return;
    API('/api/admin/users').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setAllUsers(d);
    });
  }, [isMaster]);

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    setDateFrom(customFrom); setDateTo(customTo);
    setShowCustom(false);
    load(customFrom, customTo);
  }

  // ── Form cascade ──
  useEffect(() => {
    if (!form.convenio_id) { setBanks([]); setForm(f => ({ ...f, bank_id: '', table_id: '' })); return; }
    setLoadingBanks(true);
    API(`/api/banks?convenio_id=${form.convenio_id}`).then(r => r.json()).then(d => {
      setBanks(Array.isArray(d) ? d : []);
      const pending = pendingBankIdRef.current;
      if (pending) setForm(f => ({ ...f, bank_id: pending, table_id: '' }));
      else setForm(f => ({ ...f, bank_id: '', table_id: '' }));
      setLoadingBanks(false);
    });
  }, [form.convenio_id]);

  useEffect(() => {
    if (!form.bank_id || !form.convenio_id) { setTables([]); setForm(f => ({ ...f, table_id: '' })); return; }
    setLoadingTables(true);
    API(`/api/financial-tables?convenio_id=${form.convenio_id}&bank_id=${form.bank_id}`).then(r => r.json()).then(d => {
      setTables(Array.isArray(d) ? d : []);
      const pending = pendingTableIdRef.current;
      if (pending) { setForm(f => ({ ...f, table_id: pending })); pendingTableIdRef.current = null; }
      else setForm(f => ({ ...f, table_id: '' }));
      setLoadingTables(false);
    });
  }, [form.bank_id]);

  // Prefill from simulator
  useEffect(() => {
    if (!prefill) return;
    pendingBankIdRef.current = prefill.bank_id || null;
    pendingTableIdRef.current = prefill.table_id || null;
    setForm({ ...EMPTY_FORM, value: prefill.value || '', convenio_id: prefill.convenio_id || '' });
    setEditId(null); setStep(0); setErrors({}); setDupAlert(null);
    setBanks([]); setTables([]); setShowForm(true);
    onClearPrefill?.();
  }, [prefill]);

  // Duplicate check
  const checkDuplicate = useCallback(async (num: string, excludeId?: string) => {
    if (!num) { setDupAlert(null); return; }
    setCheckingDup(true);
    const url = `/api/proposals/check-number?proposal_number=${encodeURIComponent(num)}${excludeId ? `&exclude_id=${excludeId}` : ''}`;
    const data = await API(url).then(r => r.json());
    setDupAlert(data.exists ? `Número já cadastrado para o cliente "${data.client_name}"` : null);
    setCheckingDup(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (form.proposal_number) checkDuplicate(form.proposal_number, editId || undefined); }, 500);
    return () => clearTimeout(t);
  }, [form.proposal_number]);

  // ── Column visibility ──
  function toggleCol(col: string) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      localStorage.setItem('proposals_visible_cols', JSON.stringify([...next]));
      return next;
    });
  }

  // ── CSV Export ──
  function exportCSV() {
    const headers = [
      'ID','Nr.Proposta','Data Digitação','Data Atualização',
      'Cliente','CPF','Telefone',
      'Corretor','Email Corretor',
      'Convênio','Banco','Tabela','Categoria','Produto','Tipo Proposta',
      'Valor','Coeficiente','Status',
      '% Comissão Corretor','Comissão Corretor R$','Override Corretor R$',
      'Comissão Empresa R$','Override Empresa R$',
      'Pontos','Status Comissão','Edição Corretor',
    ];
    const rows = (selected.size > 0 ? filtered.filter(p => selected.has(p.id)) : filtered).map(p => [
      p.id,
      p.proposal_number,
      p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
      p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : '',
      p.client_name, p.client_cpf, p.client_phone,
      p.user_name || '', p.user_email || '',
      p.convenio_name || p.convenio || '',
      p.bank_name || p.bank || '',
      p.table_name || '',
      p.category_name || '',
      p.product_name || p.product || '',
      p.tipo_proposta || '',
      String(p.value),
      p.coeficiente ? String(p.coeficiente) : '',
      p.status,
      p.comissao_corretor_pct ? String(p.comissao_corretor_pct) : '',
      String(p.comissao_valor || ''),
      p.comissao_corretor_override != null ? String(p.comissao_corretor_override) : '',
      String(p.comissao_empresa_valor || ''),
      p.comissao_empresa_override != null ? String(p.comissao_empresa_override) : '',
      String(p.points_earned || ''),
      p.status_comissao || '',
      p.allow_broker_edit ? 'Sim' : 'Não',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `propostas_${dateFrom || 'todos'}_${dateTo || ''}.csv`; a.click();
  }

  // ── Form actions ──
  function openNew() {
    setForm(EMPTY_FORM); setEditId(null); setStep(0); setErrors({});
    setDupAlert(null); setBanks([]); setTables([]); setShowForm(true);
  }
  function openEdit(p: Proposal) {
    pendingBankIdRef.current  = p.bank_id  || null;
    pendingTableIdRef.current = p.table_id || null;
    setForm({
      client_name: p.client_name, client_cpf: p.client_cpf, client_phone: p.client_phone,
      proposal_number: p.proposal_number, value: String(p.value), product_id: p.product_id || '',
      convenio_id: p.convenio_id || '', bank_id: '', table_id: '',
      created_at: p.created_at ? p.created_at.slice(0, 10) : todayStr(),
      status: p.status, coeficiente: p.coeficiente ? String(p.coeficiente) : '',
      comissao_corretor_override: p.comissao_corretor_override != null ? String(p.comissao_corretor_override) : '',
      comissao_empresa_override:  p.comissao_empresa_override  != null ? String(p.comissao_empresa_override)  : '',
      user_id: p.user_id || '',
    });
    setEditId(p.id); setStep(0); setErrors({}); setDupAlert(null); setShowForm(true);
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
  function validateAll(): Record<string, string> {
    return { ...validateStep(0), ...validateStep(1), ...validateStep(2) };
  }
  function nextStep() {
    const e = validateStep(step); setErrors(e);
    if (Object.keys(e).length === 0) setStep(s => s + 1);
  }

  async function handleSubmit() {
    const e = editId ? validateAll() : validateStep(2);
    setErrors(e);
    if (Object.keys(e).length > 0 || dupAlert) return;
    setSaving(true);
    const selectedConvenio = convenios.find(c => c.id === form.convenio_id);
    const selectedBank = banks.find(b => b.id === form.bank_id);
    const body: Record<string, unknown> = {
      ...form, value: parseFloat(form.value),
      product_id: form.product_id || null, table_id: form.table_id || null,
      bank_id: form.bank_id || null, convenio_id: form.convenio_id || null,
      bank: selectedBank?.name || '', convenio: selectedConvenio?.name || '',
      created_at: form.created_at || todayStr(),
    };
    if (editId && isAdmin) {
      if (form.status) body.status = form.status;
      if (form.coeficiente !== '') body.coeficiente = form.coeficiente;
      body.comissao_corretor_override = form.comissao_corretor_override !== '' ? parseFloat(form.comissao_corretor_override) : '';
      body.comissao_empresa_override  = form.comissao_empresa_override  !== '' ? parseFloat(form.comissao_empresa_override)  : '';
      if (isMaster && form.user_id) body.user_id = form.user_id;
    }
    const resp = await API(editId ? `/api/proposals/${editId}` : '/api/proposals', {
      method: editId ? 'PUT' : 'POST', body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json();
      setErrors({ proposal_number: data.error || 'Erro ao salvar' }); setStep(1); setSaving(false); return;
    }
    setShowForm(false); await load(); setSaving(false);
  }

  async function deleteProposal(id: string) {
    await API(`/api/proposals/${id}`, { method: 'DELETE' });
    setProposals(prev => prev.filter(p => p.id !== id)); setConfirmDelete(null);
  }

  async function quickStatusChange(id: string, newStatus: string) {
    await API(`/api/proposals/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as Proposal['status'] } : p));
  }

  async function toggleBrokerEdit(id: string, current: boolean) {
    await API(`/api/admin/proposals/${id}/toggle-edit`, { method: 'PATCH' });
    setProposals(prev => prev.map(p => p.id === id ? { ...p, allow_broker_edit: !current } : p));
  }

  async function deleteBulkSelected() {
    if (selected.size === 0) return;
    setDeletingBulk(true);
    await API('/api/proposals/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: [...selected] }) });
    setProposals(prev => prev.filter(p => !selected.has(p.id)));
    setSelected(new Set()); setConfirmBulkDelete(false); setDeletingBulk(false);
  }

  async function applyBatchStatus() {
    if (!batchStatus || selected.size === 0) return;
    setApplyingBatch(true);
    await Promise.all([...selected].map(id =>
      API(`/api/proposals/${id}`, { method: 'PUT', body: JSON.stringify({ status: batchStatus }) })
    ));
    setProposals(prev => prev.map(p => selected.has(p.id) ? { ...p, status: batchStatus as Proposal['status'] } : p));
    setSelected(new Set()); setBatchStatus(''); setApplyingBatch(false);
  }

  // ── CSV Import ──
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('Arquivo vazio ou sem dados.'); return; }
      const normalizeHeader = (h: string) => {
        const colMap: Record<string, string> = {
          'data digitao': 'data_digitacao', 'data digita': 'data_digitacao',
          'data_digitao': 'data_digitacao', 'data digitação': 'data_digitacao',
          'nome do cliente': 'nome_cliente', 'nome_do_cliente': 'nome_cliente',
          'situao': 'situacao', 'situação': 'situacao',
          'convnio': 'convenio', 'convênio': 'convenio',
          'id': 'id',
          'proposta': 'proposta', 'nr proposta': 'proposta', 'nr_proposta': 'proposta', 'nrproposta': 'proposta',
          'cpf': 'cpf', 'corretor': 'corretor',
          'banco': 'banco', 'tabela': 'tabela', 'tipo': 'tipo', 'produto': 'tipo',
          'valor': 'valor', 'vl proposta': 'valor', 'vl_proposta': 'valor', 'vlproposta': 'valor', 'vl proposta': 'valor',
          'esteira': 'esteira', 'status': 'esteira',
          'emisso': 'data_digitacao', 'emissao': 'data_digitacao', 'emiss': 'data_digitacao', 'data emissao': 'data_digitacao', 'data_emissao': 'data_digitacao',
          'cliente': 'nome_cliente', 'nome': 'nome_cliente', 'nome cliente': 'nome_cliente', 'nome_cliente': 'nome_cliente',
        };
        const withSpaces = h.trim().replace(/^﻿/, '').replace(/[^\w\s]/g, '').trim().toLowerCase();
        const clean = withSpaces.replace(/\s+/g, '_');
        return colMap[withSpaces] || colMap[clean] || clean;
      };
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      const headers = firstLine.split(sep).map(normalizeHeader);
      const rows = lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      }).filter(r => r.proposta && r.proposta !== '');
      setImportPreview(rows); setImportResult(null); setImportProgress(0); setShowImport(true);
    };
    reader.readAsText(file, 'windows-1252'); e.target.value = '';
  }

  async function doImport() {
    if (importPreview.length === 0) return;
    setImporting(true); setImportProgress(0);
    const BATCH = 50; let totalImported = 0, totalUpdated = 0;
    const allErrors: { row: string; error: string }[] = [];
    const batches = Math.ceil(importPreview.length / BATCH);
    for (let b = 0; b < batches; b++) {
      const slice = importPreview.slice(b * BATCH, (b + 1) * BATCH);
      const res = await API('/api/admin/proposals/import', { method: 'POST', body: JSON.stringify({ rows: slice }) });
      const result = await res.json();
      totalImported += result.imported || 0; totalUpdated += result.updated || 0;
      allErrors.push(...(result.errors || []));
      setImportProgress(Math.round(((b + 1) / batches) * 100));
    }
    setImportResult({ imported: totalImported, updated: totalUpdated, errors: allErrors });
    setImporting(false);
    if (totalImported + totalUpdated > 0) await load();
  }

  function closeImport() {
    if (importing) return;
    setShowImport(false); setImportPreview([]); setImportResult(null); setImportProgress(0);
  }

  // ── Filtering & sorting (client-side from loaded data) ──
  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.client_name.toLowerCase().includes(q) && !p.proposal_number.includes(q) &&
        !(p.bank_name || p.bank || '').toLowerCase().includes(q) &&
        !(p.user_name || '').toLowerCase().includes(q) && !(p.client_cpf || '').includes(q))
      return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterBankId && p.bank_id !== filterBankId) return false;
    if (filterConvenioId && p.convenio_id !== filterConvenioId) return false;
    if (filterProductId && p.product_id !== filterProductId) return false;
    if (filterUserSearch) {
      const u = (p.user_name || p.user_email || '').toLowerCase();
      if (!u.includes(filterUserSearch.toLowerCase())) return false;
    }
    if (filterMinValue && Number(p.value) < parseFloat(filterMinValue)) return false;
    if (filterMaxValue && Number(p.value) > parseFloat(filterMaxValue)) return false;
    if (filterOnlyPaid && p.status !== 'Paga') return false;
    if (filterNoPendingComm && !(p.status === 'Paga' && !p.status_comissao)) return false;
    if (filterLocked === 'locked' && p.allow_broker_edit) return false;
    if (filterLocked === 'unlocked' && !p.allow_broker_edit) return false;
    return true;
  });

  const activeFilterCount = [
    filterStatus, filterBankId, filterConvenioId, filterProductId, filterUserSearch,
    filterMinValue, filterMaxValue,
  ].filter(Boolean).length + (filterOnlyPaid ? 1 : 0) + (filterNoPendingComm ? 1 : 0) + (filterLocked ? 1 : 0);

  function clearAllFilters() {
    setSearch(''); setFilterStatus(''); setFilterBankId(''); setFilterConvenioId('');
    setFilterProductId(''); setFilterUserSearch(''); setFilterMinValue(''); setFilterMaxValue('');
    setFilterOnlyPaid(false); setFilterNoPendingComm(false); setFilterLocked('');
  }

  useEffect(() => { setPage(1); }, [search, filterStatus, filterBankId, filterConvenioId, filterProductId, filterUserSearch, filterMinValue, filterMaxValue, filterOnlyPaid, filterNoPendingComm, filterLocked, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null); setSortDir(null);
  }

  const SORT_FIELDS: Record<string, (p: Proposal) => string | number> = {
    'ID':         p => p.id,
    'Proposta':   p => p.proposal_number || '',
    'Corretor':   p => (p.user_name || p.user_email || '').toLowerCase(),
    'Cliente':    p => p.client_name.toLowerCase(),
    'CPF':        p => p.client_cpf || '',
    'Convênio':   p => (p.convenio_name || p.convenio || '').toLowerCase(),
    'Banco':      p => (p.bank_name || p.bank || '').toLowerCase(),
    'Tabela':     p => (p.table_name || '').toLowerCase(),
    'Valor':      p => Number(p.value),
    'Produto':    p => (p.product_name || p.product || '').toLowerCase(),
    'Status':     p => p.status.toLowerCase(),
    'Dt. Digit.': p => p.created_at || '',
    'Dt. Status': p => p.updated_at || '',
    'Comissão':   p => Number(p.comissao_valor || 0),
    'Pts':        p => p.points_earned || 0,
  };

  const sorted = sortCol && sortDir && SORT_FIELDS[sortCol]
    ? [...filtered].sort((a, b) => {
        const va = SORT_FIELDS[sortCol](a), vb = SORT_FIELDS[sortCol](b);
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;

  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  // ── Cards stats — calculam sobre `filtered` para refletir filtros ativos ──
  const paidProps    = filtered.filter(p => p.status === 'Paga');
  const analysisProps = filtered.filter(p => p.status === 'Em análise');
  const cancelledProps = filtered.filter(p => p.status === 'Cancelada');
  const totalPaid    = paidProps.reduce((a, b) => a + Number(b.value), 0);
  const totalVolume  = filtered.reduce((a, b) => a + Number(b.value), 0);
  const totalPoints  = filtered.reduce((a, b) => a + (b.points_earned || 0), 0);
  const totalComissao = paidProps.reduce((a, b) => a + Number(b.comissao_valor || 0), 0);
  const pendingComissao = filtered.filter(p => p.status === 'Paga' && !p.status_comissao).reduce((a, b) => a + Number(b.comissao_valor || 0), 0);
  const avgTicket    = paidProps.length > 0 ? totalPaid / paidProps.length : 0;

  const allCards = [
    { key: 'total',     label: 'Total',          value: filtered.length,                  color: '#60a5fa', fmt: 'num' },
    { key: 'pagas',     label: 'Pagas',           value: paidProps.length,                color: '#4ade80', fmt: 'num' },
    { key: 'analise',   label: 'Em Análise',      value: analysisProps.length,            color: '#fbbf24', fmt: 'num' },
    { key: 'cancelada', label: 'Canceladas',      value: cancelledProps.length,           color: '#f87171', fmt: 'num' },
    { key: 'volume',    label: 'Volume Pago',     value: formatCurrency(totalPaid),       color: '#14B8A6', fmt: 'str' },
    { key: 'vtotal',    label: 'Volume Total',    value: formatCurrency(totalVolume),     color: '#2DD4BF', fmt: 'str' },
    { key: 'comissao',  label: 'Minha Comissão',  value: formatCurrency(totalComissao),   color: '#a78bfa', fmt: 'str' },
    { key: 'pendente',  label: 'Comiss. Pend.',   value: formatCurrency(pendingComissao), color: '#fb923c', fmt: 'str' },
    { key: 'ticket',    label: 'Ticket Médio',    value: formatCurrency(avgTicket),       color: '#38bdf8', fmt: 'str' },
    { key: 'pontos',    label: 'Meus Pontos',     value: `${totalPoints} pts`,            color: '#fbbf24', fmt: 'str' },
  ];
  const visibleCards = isAdmin
    ? allCards
    : allCards.filter(c => !['pendente'].includes(c.key));

  return (
    <div className="p-4 w-full" style={{ color: 'var(--text-1)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{isAdmin ? 'Propostas' : 'Minhas Propostas'}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{filtered.length} de {proposals.length} propostas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowColPicker(v => !v)}
            className="p-2 rounded-xl transition-all" title="Colunas visíveis"
            style={{ background: showColPicker ? 'rgba(20,184,166,0.15)' : 'var(--card-bg)', border: '1px solid var(--card-border)', color: showColPicker ? '#14B8A6' : 'var(--text-3)' }}>
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          {isAdmin && (
            <button onClick={() => { setShowImport(true); setImportPreview([]); setImportResult(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
              <Upload className="w-3.5 h-3.5" /> Importar CSV
            </button>
          )}
          <button onClick={openNew} className="btn-cyber flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nova Proposta
          </button>
        </div>
      </div>

      {/* ── Column picker dropdown ── */}
      {showColPicker && (
        <div className="mb-4 p-4 rounded-2xl animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Colunas visíveis</p>
            <div className="flex gap-2">
              <button onClick={() => { const s = new Set(ALL_COL_KEYS); setVisibleCols(s); localStorage.setItem('proposals_visible_cols', JSON.stringify([...s])); }}
                className="text-xs px-2 py-1 rounded-lg btn-ghost">Todas</button>
              <button onClick={() => { setVisibleCols(new Set(DEFAULT_COLS)); localStorage.setItem('proposals_visible_cols', JSON.stringify([...DEFAULT_COLS])); }}
                className="text-xs px-2 py-1 rounded-lg btn-ghost">Padrão</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_COL_KEYS.map(col => (
              <button key={col} onClick={() => toggleCol(col)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={visibleCols.has(col)
                  ? { background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }
                  : { background: 'var(--surface-subtle)', color: 'var(--text-3)', border: '1px solid var(--card-border)' }}>
                {visibleCols.has(col) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {col}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Cards ── */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Período:</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(20,184,166,0.1)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.2)' }}>
          {datePreset === 'all' ? 'Todos os registros' :
           datePreset === 'custom' && dateFrom && dateTo
             ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} — ${new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}`
             : dateFrom && dateTo
               ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} — ${new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}`
               : '—'}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{proposals.length} proposta{proposals.length !== 1 ? 's' : ''} carregada{proposals.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
        {visibleCards.map((c, i) => (
          <div key={c.key} className="stat-card rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>{c.label}</p>
            <p className="text-base font-black num" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Date presets ── */}
      <div className="mb-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {DATE_PRESETS.map(p => (
            <button key={p.key} onClick={() => setDatePreset(p.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={datePreset === p.key
                ? { background: 'rgba(20,184,166,0.2)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }
                : { background: 'var(--card-bg)', color: 'var(--text-3)', border: '1px solid var(--card-border)' }}>
              {p.label}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>De:</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input-cyber text-xs px-2 py-1.5 rounded-lg" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Até:</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input-cyber text-xs px-2 py-1.5 rounded-lg" />
            <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold btn-cyber disabled:opacity-40">Aplicar</button>
            <button onClick={() => { setShowCustom(false); setDatePreset('this_month'); }} className="p-1.5 rounded-lg btn-ghost">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {dateFrom && dateTo && datePreset !== 'custom' && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
            {new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      {/* ── Search + Filters toggle ── */}
      <div className="flex gap-3 mb-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, proposta, banco, corretor, CPF..."
            className="input-cyber w-full pl-9 pr-3 py-2.5 text-sm rounded-xl" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            </button>
          )}
        </div>
        <button onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={showAdvanced || activeFilterCount > 0
            ? { background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.35)' }
            : { background: 'var(--card-bg)', color: 'var(--text-2)', border: '1px solid var(--card-border)' }}>
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#14B8A6', color: '#000' }}>{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="px-3 py-2.5 rounded-xl text-sm btn-ghost flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* ── Advanced filters panel ── */}
      {showAdvanced && (
        <div className="mb-4 p-4 rounded-2xl animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {/* Status */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Status</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="input-cyber appearance-none w-full pl-2 pr-7 py-2 text-xs rounded-lg">
                  <option value="">Todos</option>
                  {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {/* Banco */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Banco</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterBankId} onChange={e => setFilterBankId(e.target.value)}
                  className="input-cyber appearance-none w-full pl-2 pr-7 py-2 text-xs rounded-lg">
                  <option value="">Todos</option>
                  {allBanks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            {/* Convênio */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Convênio</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterConvenioId} onChange={e => setFilterConvenioId(e.target.value)}
                  className="input-cyber appearance-none w-full pl-2 pr-7 py-2 text-xs rounded-lg">
                  <option value="">Todos</option>
                  {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {/* Produto */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Produto</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterProductId} onChange={e => setFilterProductId(e.target.value)}
                  className="input-cyber appearance-none w-full pl-2 pr-7 py-2 text-xs rounded-lg">
                  <option value="">Todos</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            {/* Corretor (admin only) */}
            {isAdmin && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Corretor</label>
                <input value={filterUserSearch} onChange={e => setFilterUserSearch(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="input-cyber w-full px-2 py-2 text-xs rounded-lg" />
              </div>
            )}
            {/* Valor mín */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Valor mín (R$)</label>
              <input type="number" min="0" value={filterMinValue} onChange={e => setFilterMinValue(e.target.value)}
                placeholder="0,00" className="input-cyber w-full px-2 py-2 text-xs rounded-lg" />
            </div>
            {/* Valor máx */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Valor máx (R$)</label>
              <input type="number" min="0" value={filterMaxValue} onChange={e => setFilterMaxValue(e.target.value)}
                placeholder="Sem limite" className="input-cyber w-full px-2 py-2 text-xs rounded-lg" />
            </div>
            {/* Liberação */}
            {isAdmin && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>Edição corretor</label>
                <div className="relative">
                  <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  <select value={filterLocked} onChange={e => setFilterLocked(e.target.value as '' | 'locked' | 'unlocked')}
                    className="input-cyber appearance-none w-full pl-2 pr-7 py-2 text-xs rounded-lg">
                    <option value="">Todos</option>
                    <option value="unlocked">Liberadas</option>
                    <option value="locked">Bloqueadas</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          {/* Toggles */}
          <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
            {[
              { key: 'only_paid',       label: 'Somente Pagas',            val: filterOnlyPaid,       set: setFilterOnlyPaid },
              { key: 'no_comm',         label: 'Sem comissão paga',        val: filterNoPendingComm,  set: setFilterNoPendingComm },
            ].map(t => (
              <button key={t.key} onClick={() => t.set(!t.val)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={t.val
                  ? { background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }
                  : { background: 'var(--surface-subtle)', color: 'var(--text-3)', border: '1px solid var(--card-border)' }}>
                {t.val ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded border" style={{ borderColor: 'var(--text-3)' }} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Batch action bar ── */}
      {isAdmin && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl animate-fade-up"
          style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <span className="text-xs font-semibold" style={{ color: '#14B8A6' }}>{selected.size} selecionada(s)</span>
          <div className="relative flex-1 max-w-xs">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <select value={batchStatus} onChange={e => setBatchStatus(e.target.value)}
              className="input-cyber appearance-none w-full pl-3 pr-8 py-1.5 text-xs rounded-lg">
              <option value="">Selecionar novo status...</option>
              {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={applyBatchStatus} disabled={!batchStatus || applyingBatch}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
            style={{ background: '#14B8A6', color: '#000' }}>
            {applyingBatch ? 'Aplicando...' : 'Aplicar'}
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold"
            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
            <Download className="w-3 h-3" /> Exportar seleção
          </button>
          {isMaster && (
            <button onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Trash2 className="w-3 h-3" /> Excluir selecionadas
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs rounded-lg btn-ghost">Limpar</button>
        </div>
      )}

      {/* ── Table ── */}
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
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {activeFilterCount > 0 ? 'Tente ajustar os filtros ou ' : ''} Clique em "Nova Proposta" para começar
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '100ms' }}>
          <div className="overflow-x-auto">
            <table className="text-xs" style={{ tableLayout: 'auto', width: '100%', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {isAdmin && (
                    <th className="px-2 py-2.5 w-8">
                      <input type="checkbox"
                        checked={paginated.length > 0 && paginated.every(p => selected.has(p.id))}
                        onChange={e => {
                          const next = new Set(selected);
                          paginated.forEach(p => e.target.checked ? next.add(p.id) : next.delete(p.id));
                          setSelected(next);
                        }}
                        className="w-3.5 h-3.5 cursor-pointer accent-teal-500" />
                    </th>
                  )}
                  {ALL_COL_KEYS.filter(h => visibleCols.has(h)).concat(['']).map(h => {
                    const sortable = h !== '' && !!SORT_FIELDS[h];
                    const isActive = sortCol === h;
                    return (
                      <th key={h} onClick={sortable ? () => handleSort(h) : undefined}
                        className="text-left px-2 py-2.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap select-none"
                        style={{ color: isActive ? '#14B8A6' : 'var(--text-3)', cursor: sortable ? 'pointer' : 'default', minWidth: h === '' ? '70px' : undefined }}>
                        <span className="inline-flex items-center gap-0.5">
                          {h}
                          {sortable && (
                            <span style={{ fontSize: '8px', opacity: isActive ? 1 : 0.4, marginLeft: '2px' }}>
                              {isActive && sortDir === 'asc' ? '▲' : isActive && sortDir === 'desc' ? '▼' : '⇅'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => {
                  const sd = statusDefs.find(s => s.name === p.status);
                  const sc = SC_MAP[sd?.color || 'blue'] || SC_MAP.blue;
                  return (
                    <tr key={p.id} className="table-row-cyber" style={{ background: selected.has(p.id) ? 'rgba(20,184,166,0.06)' : undefined }}>
                      {isAdmin && (
                        <td className="px-2 py-2">
                          <input type="checkbox" checked={selected.has(p.id)}
                            onChange={e => { const next = new Set(selected); e.target.checked ? next.add(p.id) : next.delete(p.id); setSelected(next); }}
                            className="w-3.5 h-3.5 cursor-pointer accent-teal-500" />
                        </td>
                      )}
                      {visibleCols.has('ID') && (
                        <td className="px-2 py-2" title={p.id}>
                          <button onClick={() => navigator.clipboard.writeText(p.id)}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
                            style={{ background: 'rgba(20,184,166,0.08)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.2)', letterSpacing: '0.02em' }}>
                            {p.id.slice(0, 8)}
                          </button>
                        </td>
                      )}
                      {visibleCols.has('Proposta') && <td className="px-2 py-2 font-mono num truncate max-w-[100px]" style={{ color: 'var(--text-2)', fontSize: '10px' }}>{p.proposal_number || '—'}</td>}
                      {visibleCols.has('Corretor') && <td className="px-2 py-2 truncate max-w-[90px]" style={{ color: 'var(--text-2)' }}>{p.user_name || p.user_email || '—'}</td>}
                      {visibleCols.has('Cliente') && <td className="px-2 py-2 font-semibold truncate max-w-[130px]" style={{ color: 'var(--text-1)', fontSize: '11px' }}>{p.client_name}</td>}
                      {visibleCols.has('CPF') && <td className="px-2 py-2 font-mono truncate max-w-[95px]" style={{ color: 'var(--text-3)', fontSize: '10px' }}>{p.client_cpf || '—'}</td>}
                      {visibleCols.has('Convênio') && <td className="px-2 py-2 truncate max-w-[90px]" style={{ color: 'var(--text-2)' }}>{p.convenio_name || p.convenio || '—'}</td>}
                      {visibleCols.has('Banco') && <td className="px-2 py-2 truncate max-w-[90px]" style={{ color: 'var(--text-2)' }}>{p.bank_name || p.bank || '—'}</td>}
                      {visibleCols.has('Tabela') && <td className="px-2 py-2 truncate max-w-[110px]" style={{ color: 'var(--text-3)' }}>{p.table_name || '—'}</td>}
                      {visibleCols.has('Valor') && <td className="px-2 py-2 font-bold num whitespace-nowrap" style={{ color: 'var(--text-1)' }}>{formatCurrency(Number(p.value))}</td>}
                      {visibleCols.has('Produto') && <td className="px-2 py-2 truncate max-w-[80px]" style={{ color: 'var(--text-3)' }}>{p.product_name || p.product || '—'}</td>}
                      {visibleCols.has('Status') && (
                        <td className="px-2 py-2">
                          {isAdmin ? (
                            <div className="relative">
                              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color: sc.text }} />
                              <select value={p.status} onChange={e => quickStatusChange(p.id, e.target.value)}
                                className="appearance-none font-semibold pl-1.5 pr-5 py-0.5 rounded-lg cursor-pointer w-full truncate"
                                style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, fontSize: '10px' }}>
                                {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                          ) : (
                            <span className={`${sd ? (COLOR_MAP[sd.color] || 'badge badge-blue') : 'badge badge-blue'} inline-flex items-center gap-1 truncate max-w-full`} style={{ fontSize: '9px' }}>
                              {ICON_MAP[p.status] || <FileText className="w-2.5 h-2.5" />} {p.status}
                            </span>
                          )}
                        </td>
                      )}
                      {visibleCols.has('Dt. Digit.') && (
                        <td className="px-2 py-2 num whitespace-nowrap" style={{ color: 'var(--text-3)', fontSize: '10px' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      )}
                      {visibleCols.has('Dt. Status') && (
                        <td className="px-2 py-2 num whitespace-nowrap" style={{ color: 'var(--text-3)', fontSize: '10px' }}>
                          {p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      )}
                      {visibleCols.has('Comissão') && (
                        <td className="px-2 py-2">
                          {p.status === 'Paga' && Number(p.comissao_valor) > 0
                            ? <span className="font-bold num whitespace-nowrap" style={{ color: '#4ade80', fontSize: '10px' }}>{formatCurrency(Number(p.comissao_valor))}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                      )}
                      {visibleCols.has('Pts') && (
                        <td className="px-2 py-2">
                          {p.points_earned > 0
                            ? <span className="font-bold num" style={{ color: '#fbbf24', fontSize: '10px' }}>+{p.points_earned}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                      )}
                      {/* Ações */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5">
                          {(isAdmin || p.allow_broker_edit) && (
                            <button onClick={() => openEdit(p)} className="p-1 rounded-lg transition-all" title="Editar"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => toggleBrokerEdit(p.id, p.allow_broker_edit)} className="p-1 rounded-lg transition-all"
                              style={{ color: p.allow_broker_edit ? '#4ade80' : 'var(--text-3)' }}
                              title={p.allow_broker_edit ? 'Travar edição' : 'Liberar edição'}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              {p.allow_broker_edit ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            </button>
                          )}
                          {isMaster && (
                            <button onClick={() => setConfirmDelete(p)} className="p-1 rounded-lg transition-all" title="Excluir"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir Proposta</h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Excluir a proposta de</p>
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

      {/* ── Confirm bulk delete ── */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir Propostas</h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Você está prestes a excluir</p>
            <p className="text-lg font-bold mb-1" style={{ color: '#f87171' }}>{selected.size} proposta(s)</p>
            <p className="text-xs mb-4" style={{ color: '#f87171' }}>Esta ação é irreversível.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBulkDelete(false)} disabled={deletingBulk} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
              <button onClick={deleteBulkSelected} disabled={deletingBulk}
                className="flex-1 py-2.5 text-sm rounded-xl font-semibold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {deletingBulk ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import CSV modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-panel rounded-2xl w-full max-w-2xl p-6 animate-fade-up">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-1)' }}>Importar Propostas — CSV</h2>
            <div className="space-y-4">
              {!importResult && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Arquivo CSV (separador: ponto-e-vírgula)</label>
                  <input type="file" accept=".csv" onChange={handleImportFile} className="block w-full text-sm cursor-pointer" style={{ color: 'var(--text-3)' }} />
                </div>
              )}
              {importing && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>
                    <span>Processando...</span>
                    <span className="font-semibold" style={{ color: '#14B8A6' }}>{importProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${importProgress}%`, background: 'linear-gradient(90deg,#14B8A6,#60a5fa)' }} />
                  </div>
                </div>
              )}
              {importPreview.length > 0 && !importResult && !importing && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>{importPreview.length} linha(s) — prévia das primeiras 10:</p>
                  <div className="rounded-xl overflow-hidden overflow-x-auto max-h-56" style={{ border: '1px solid var(--card-border)' }}>
                    <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                      <thead><tr style={{ background: 'var(--card-border)' }}>
                        {['Proposta','Cliente','Corretor','Banco','Valor','Status'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-3)' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                            <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-2)' }}>{row.proposta || '—'}</td>
                            <td className="px-3 py-1.5 max-w-[120px] truncate" style={{ color: 'var(--text-1)' }}>{row.nome_cliente || '—'}</td>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-2)' }}>{row.corretor || '—'}</td>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-2)' }}>{row.banco || '—'}</td>
                            <td className="px-3 py-1.5 num" style={{ color: 'var(--text-1)' }}>{row.valor || '—'}</td>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text-3)' }}>{row.esteira || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 10 && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>...e mais {importPreview.length - 10} linha(s)</p>}
                </div>
              )}
              {importResult && (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p className="text-2xl font-black num" style={{ color: '#4ade80' }}>{importResult.imported}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Novas</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                      <p className="text-2xl font-black num" style={{ color: '#60a5fa' }}>{importResult.updated}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Atualizadas</p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="rounded-xl p-3 max-h-40 overflow-y-auto" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#f87171' }}>{importResult.errors.length} erro(s)</p>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-3)' }}><span style={{ color: '#f87171' }}>#{e.row}</span> — {e.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeImport} disabled={importing} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
              {!importResult
                ? <button onClick={doImport} disabled={importPreview.length === 0 || importing}
                    className="flex-1 py-2.5 text-sm rounded-xl font-semibold btn-cyber flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    {importing ? `Importando... ${importProgress}%` : `Importar ${importPreview.length} proposta(s)`}
                  </button>
                : <button onClick={closeImport} className="flex-1 py-2.5 text-sm rounded-xl font-semibold btn-cyber">Fechar</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Edit/Create form modal ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Proposta' : 'Nova Proposta'} size="lg"
        footer={
          <div className="flex gap-3">
            {editId ? (
              <button type="button" onClick={handleSubmit} disabled={saving || !!dupAlert} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            ) : (
              <>
                {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-ghost">Voltar</button>}
                {step < 2
                  ? <button type="button" onClick={nextStep} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">Próximo <ChevronRight className="w-4 h-4" /></button>
                  : <button type="button" onClick={handleSubmit} disabled={saving || !!dupAlert} className="btn-cyber flex-1 py-2.5 rounded-xl text-sm">{saving ? 'Salvando...' : 'Cadastrar proposta'}</button>
                }
              </>
            )}
          </div>
        }>
        {editId ? (
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
                <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Selecione o produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Convênio" error={errors.convenio_id}>
                <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Selecione o convênio</option>
                    {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Banco" error={errors.bank_id}>
                <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))}
                    disabled={!form.convenio_id || loadingBanks} className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                    <option value="">{loadingBanks ? 'Carregando...' : 'Selecione o banco'}</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Tabela financeira" error={errors.table_id}>
                <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
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
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        {statusDefs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Coeficiente (manual)">
                    <input type="number" step="0.0000001" value={form.coeficiente}
                      onChange={e => setForm(f => ({ ...f, coeficiente: e.target.value }))} className={inp} placeholder="Ex: 0.0123456" />
                  </Field>
                </>
              )}
            </div>
            {isAdmin && editId && (() => {
              const currentProp = proposals.find(p => p.id === editId);
              return (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                  {isMaster && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#a78bfa' }}>
                        <User className="w-3.5 h-3.5" /> Transferir Corretor
                      </p>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                        <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                          disabled={allUsers.length === 0}
                          className="input-cyber appearance-none w-full pl-3 pr-9 py-2.5 text-sm rounded-xl">
                          <option value="">{allUsers.length === 0 ? 'Carregando corretores...' : '— Manter corretor atual —'}</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name || u.email} {u.full_name ? `(${u.email})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#14B8A6' }}>
                    <DollarSign className="w-3.5 h-3.5" /> Comissões desta proposta
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Comissão Corretor (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.comissao_corretor_override}
                        onChange={e => setForm(f => ({ ...f, comissao_corretor_override: e.target.value }))} className={inp}
                        placeholder={currentProp?.comissao_valor != null ? `Auto: ${formatCurrency(Number(currentProp.comissao_valor))}` : 'Automático'} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Comissão Empresa (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.comissao_empresa_override}
                        onChange={e => setForm(f => ({ ...f, comissao_empresa_override: e.target.value }))} className={inp}
                        placeholder={currentProp?.comissao_empresa_valor != null ? `Auto: ${formatCurrency(Number(currentProp.comissao_empresa_valor))}` : 'Automático'} />
                    </div>
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-3)' }}>Deixe vazio para calcular automaticamente pela tabela financeira.</p>
                </div>
              );
            })()}
            {errors.submit && <p className="text-xs text-red-400">{errors.submit}</p>}
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center mb-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step, active = i === step;
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={done || active
                          ? { background: 'linear-gradient(135deg, #14B8A6, #06B6D4)', color: '#fff', boxShadow: '0 0 12px rgba(20,184,166,0.35)' }
                          : { background: 'var(--bg-surface)', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>
                        {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <p className="text-[10px] mt-1 font-medium" style={{ color: active || done ? '#14B8A6' : 'var(--text-3)' }}>{s.label}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px mx-2 mb-4 transition-all"
                        style={{ background: done ? 'linear-gradient(90deg, #14B8A6, #06B6D4)' : 'var(--border-2)' }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="space-y-4 min-h-[200px]">
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
              {step === 1 && (
                <>
                  <Field label="Número da proposta" error={errors.proposal_number}>
                    <div className="relative">
                      <input value={form.proposal_number}
                        onChange={e => { setForm(f => ({ ...f, proposal_number: e.target.value })); setErrors(er => ({ ...er, proposal_number: '' })); }}
                        className={`${inp} ${dupAlert ? 'border-red-400 focus:ring-red-300' : ''} ${form.proposal_number && !dupAlert && !checkingDup ? 'border-green-400' : ''}`}
                        placeholder="Ex: 123456" autoFocus />
                      {checkingDup && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />}
                    </div>
                    {dupAlert && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {dupAlert}</p>}
                    {form.proposal_number && !dupAlert && !checkingDup && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Número disponível</p>}
                  </Field>
                  <Field label="Valor liberado (R$)" error={errors.value}>
                    <input type="number" step="0.01" min="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inp} placeholder="0,00" inputMode="decimal" />
                  </Field>
                  <Field label="Data de digitação">
                    <input type="date" value={form.created_at} onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} className={inp} />
                  </Field>
                  <Field label="Produto" error={errors.product_id}>
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="">{products.length === 0 ? 'Nenhum produto cadastrado' : 'Selecione o produto'}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </Field>
                </>
              )}
              {step === 2 && (
                <>
                  <Field label="Convênio" error={errors.convenio_id}>
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="">Selecione o convênio</option>
                        {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Banco" error={errors.bank_id}>
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))}
                        disabled={!form.convenio_id || loadingBanks} className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
                        <option value="">{!form.convenio_id ? 'Selecione o convênio primeiro' : loadingBanks ? 'Carregando...' : banks.length === 0 ? 'Nenhum banco disponível' : 'Selecione o banco'}</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Tabela financeira" error={errors.table_id}>
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))}
                        disabled={!form.bank_id || loadingTables} className={`${inp} appearance-none pr-8 disabled:opacity-50`}>
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
                                    <p className="text-sm font-bold" style={{ color: '#60a5fa' }}>{val > 0 ? fmtBRL(val * empPct / 100) : '—'}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Sua comissão ({corPct}%)</p>
                                  <p className="text-sm font-bold" style={{ color: '#4ade80' }}>{val > 0 ? fmtBRL(val * corPct / 100) : '—'}</p>
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
