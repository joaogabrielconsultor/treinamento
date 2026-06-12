import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Clock, CheckCircle, DollarSign, FileText, ChevronDown, Key, Edit2, X, Save, Send, ArrowDownToLine, AlertCircle, TrendingUp, Info, Eye, RefreshCw } from 'lucide-react';
import { Proposal, WithdrawalRequest } from '../types';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave Aleatória',
};

interface Summary {
  pending_count: number;
  pending_value: number;
  paid_count: number;
  paid_value: number;
  all_time_paid_value: number;
  available_balance: number;
  total_withdrawn: number;
  withdrawn_count: number;
  withdrawn_paid: number;
  withdrawn_paid_count: number;
  production_month: number;
  production_month_count: number;
}

interface PixInfo { pix_key: string | null; pix_key_type: string | null; }

const SAQUE_STATUS_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  'Pendente': { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  'Aprovado': { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  'Pago':     { text: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)' },
  'Recusado': { text: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)' },
};

// ── Tooltip card de descrição ──
function InfoCard({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function updatePos() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top + window.scrollY - 8, left: r.left + window.scrollX + r.width / 2 });
  }

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onMouseEnter={() => { updatePos(); setShow(true); }}
        onMouseLeave={() => setShow(false)}
        onClick={() => { updatePos(); setShow(v => !v); }}
        className="flex-shrink-0"
      >
        <Info className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
      </button>
      {show && createPortal(
        <div
          className="w-52 rounded-xl px-3 py-2 text-[11px] leading-relaxed pointer-events-none animate-fade-up"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
            zIndex: 9999,
            background: 'rgba(8,13,24,0.97)',
            border: '1px solid var(--border-1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            color: 'var(--text-2)',
          }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(8,13,24,0.97)' }} />
        </div>,
        document.body
      )}
    </div>
  );
}

function PixModal({ current, onClose, onSave }: { current: PixInfo; onClose: () => void; onSave: (info: PixInfo) => Promise<void> }) {
  const [type, setType] = useState(current.pix_key_type || '');
  const [key, setKey] = useState(current.pix_key || '');
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    await onSave({ pix_key: key.trim() || null, pix_key_type: type || null });
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" style={{ color: '#14B8A6' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Cadastrar Chave PIX</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Tipo de chave</label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={type} onChange={e => setType(e.target.value)} className="input-cyber w-full appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl">
                <option value="">Selecione o tipo</option>
                {Object.entries(PIX_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Chave PIX</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="Digite sua chave PIX" className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--card-border)', color: 'var(--text-2)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !type || !key.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

interface User { id: string; full_name: string; email: string; }

export function ContaCorrente({ adminMode, isAdmin }: { adminMode?: { userId: string; userName: string }; isAdmin?: boolean } = {}) {
  // Seletor de corretor para admin (quando não em adminMode externo)
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; userName: string } | null>(null);

  useEffect(() => {
    if (isAdmin && !adminMode) {
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(d => setUsers(Array.isArray(d) ? d.filter((u: any) => !u.archived) : []));
    }
  }, [isAdmin, adminMode]);

  const effectiveAdminMode = adminMode ?? selectedUser ?? undefined;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<Summary>({
    pending_count: 0, pending_value: 0, paid_count: 0, paid_value: 0,
    all_time_paid_value: 0, available_balance: 0,
    total_withdrawn: 0, withdrawn_count: 0,
    withdrawn_paid: 0, withdrawn_paid_count: 0,
    production_month: 0, production_month_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pixInfo, setPixInfo] = useState<PixInfo>({ pix_key: null, pix_key_type: null });
  const [showPixModal, setShowPixModal] = useState(false);
  const [saques, setSaques] = useState<WithdrawalRequest[]>([]);
  const [showSaqueModal, setShowSaqueModal] = useState(false);
  const [saqueAmount, setSaqueAmount] = useState('');
  const [requestingSaque, setRequestingSaque] = useState(false);
  const [saqueError, setSaqueError] = useState('');
  const [saqueSuccess, setSaqueSuccess] = useState('');

  // Extrato filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState(currentMonthValue);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  function handleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null); setSortDir(null);
  }
  const [saqueSort, setSaqueSort] = useState<string | null>(null);
  const [saqueSortDir, setSaqueSortDir] = useState<'asc' | 'desc' | null>(null);
  function handleSaqueSort(col: string) {
    if (saqueSort !== col) { setSaqueSort(col); setSaqueSortDir('asc'); return; }
    if (saqueSortDir === 'asc') { setSaqueSortDir('desc'); return; }
    setSaqueSort(null); setSaqueSortDir(null);
  }

  async function load(month?: string) {
    setLoading(true);
    const m = month ?? filterMonth;
    if (effectiveAdminMode) {
      const params = new URLSearchParams({ user_id: effectiveAdminMode.userId });
      if (m) params.set('month', m);
      const contaData = await API(`/api/admin/conta-corrente/user-view?${params}`).then(r => r.json());
      setProposals(Array.isArray(contaData.proposals) ? contaData.proposals : []);
      if (contaData.summary) setSummary(contaData.summary);
      if (contaData.userInfo) setPixInfo({ pix_key: contaData.userInfo.pix_key || null, pix_key_type: contaData.userInfo.pix_key_type || null });
      setSaques(Array.isArray(contaData.saques) ? contaData.saques : []);
    } else {
      const [contaData, meData, saquesData] = await Promise.all([
        API(`/api/conta-corrente${m ? `?month=${m}` : ''}`).then(r => r.json()),
        API('/api/auth/me').then(r => r.json()),
        API('/api/conta-corrente/saques').then(r => r.json()),
      ]);
      setProposals(Array.isArray(contaData.proposals) ? contaData.proposals : []);
      if (contaData.summary) setSummary(contaData.summary);
      if (meData) setPixInfo({ pix_key: meData.pix_key || null, pix_key_type: meData.pix_key_type || null });
      setSaques(Array.isArray(saquesData) ? saquesData : []);
    }
    setLoading(false);
  }

  async function savePix(info: PixInfo) {
    await API('/api/profile/pix', { method: 'PUT', body: JSON.stringify(info) });
    setPixInfo(info); setShowPixModal(false);
  }

  async function requestSaque() {
    const parseBRL = (v: string) => v.includes(',') ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : parseFloat(v);
    const amt = parseBRL(saqueAmount);
    if (!amt || amt <= 0) { setSaqueError('Informe um valor válido'); return; }
    if (Math.round(amt * 100) > Math.round(summary.available_balance * 100)) {
      setSaqueError(`Valor excede o disponível (${fmtBRL(summary.available_balance)})`); return;
    }
    setRequestingSaque(true); setSaqueError('');
    const res = await API('/api/conta-corrente/saque', { method: 'POST', body: JSON.stringify({ amount: amt }) });
    const data = await res.json();
    if (!res.ok) { setSaqueError(data.error || 'Erro ao solicitar'); setRequestingSaque(false); return; }
    setSaqueSuccess('Solicitação enviada com sucesso!');
    setShowSaqueModal(false); setSaqueAmount(''); setRequestingSaque(false);
    setTimeout(() => setSaqueSuccess(''), 5000);
    load();
  }

  useEffect(() => { load(); }, [selectedUser]);
  useEffect(() => { setPage(1); load(filterMonth); }, [filterMonth]);
  useEffect(() => { setPage(1); }, [filterStatus]);

  // Meses disponíveis a partir das propostas
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      const d = p.updated_at || p.created_at;
      if (d) set.add(d.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [proposals]);

  const filtered = useMemo(() => proposals.filter(p => {
    if (filterStatus && p.status_comissao !== filterStatus) return false;
    if (filterMonth) {
      const d = p.updated_at || (p as any).created_at || '';
      if (!d.startsWith(filterMonth)) return false;
    }
    return true;
  }), [proposals, filterStatus, filterMonth]);

  const EXTRATO_SORT: Record<string, (p: Proposal) => string | number> = {
    'Proposta': p => p.proposal_number || '',
    'Cliente':  p => p.client_name.toLowerCase(),
    'CPF':      p => p.client_cpf || '',
    'Banco / Tabela': p => (p.bank_name || p.bank || '').toLowerCase(),
    'Valor':    p => Number(p.value),
    'Comissão': p => Number(p.comissao_valor || 0),
    'Status':   p => p.status_comissao || '',
  };
  const SAQUE_SORT: Record<string, (s: WithdrawalRequest) => string | number> = {
    'Data':   s => s.created_at || '',
    'Valor':  s => Number(s.amount),
    'Status': s => s.status,
  };
  const sortedFiltered = sortCol && sortDir && EXTRATO_SORT[sortCol]
    ? [...filtered].sort((a, b) => {
        const va = EXTRATO_SORT[sortCol!](a), vb = EXTRATO_SORT[sortCol!](b);
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;
  const sortedSaques = saqueSort && saqueSortDir && SAQUE_SORT[saqueSort]
    ? [...saques].sort((a, b) => {
        const va = SAQUE_SORT[saqueSort!](a), vb = SAQUE_SORT[saqueSort!](b);
        if (va < vb) return saqueSortDir === 'asc' ? -1 : 1;
        if (va > vb) return saqueSortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : saques;
  const paginated = sortedFiltered.slice((page - 1) * perPage, page * perPage);

  // Porcentagem sacada do total recebido (all-time)
  const pctSacado = summary.all_time_paid_value > 0
    ? Math.min(100, (summary.total_withdrawn / summary.all_time_paid_value) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>

      {/* Header */}
      {/* Seletor de corretor para admin (sem adminMode externo) */}
      {isAdmin && !adminMode && (
        <div className="mb-5 animate-fade-up rounded-2xl p-4"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4" style={{ color: '#60a5fa' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#60a5fa' }}>Ver conta de um corretor</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1" style={{ minWidth: '220px' }}>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select
                value={selectedUser?.userId || ''}
                onChange={e => {
                  const u = users.find(u => u.id === e.target.value);
                  setSelectedUser(u ? { userId: u.id, userName: u.full_name || u.email } : null);
                }}
                className="input-cyber appearance-none w-full pl-3 pr-9 py-2.5 text-sm rounded-xl">
                <option value="">Minha conta</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            {selectedUser && (
              <button onClick={() => setSelectedUser(null)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                <X className="w-3.5 h-3.5" /> Minha conta
              </button>
            )}
          </div>
          {selectedUser && (
            <p className="text-xs mt-2" style={{ color: '#60a5fa' }}>
              Visualizando como: <strong>{selectedUser.userName}</strong>
            </p>
          )}
        </div>
      )}

      {/* Banner modo admin externo */}
      {adminMode && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-up"
          style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold">Visualizando como corretor: <span className="font-bold">{adminMode.userName}</span></span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Conta Corrente</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Acompanhe suas comissões, saques e produção</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Chave PIX + botão saque */}
      <div className="rounded-2xl p-4 mb-6 animate-fade-up flex flex-wrap items-center justify-between gap-4"
        style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,184,166,0.12)' }}>
            <Key className="w-4 h-4" style={{ color: '#14B8A6' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Chave PIX</p>
            {pixInfo.pix_key ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(20,184,166,0.15)', color: '#2DD4BF' }}>
                  {PIX_TYPE_LABELS[pixInfo.pix_key_type || ''] || pixInfo.pix_key_type}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-1)' }}>{pixInfo.pix_key}</span>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma chave cadastrada</p>
            )}
          </div>
        </div>
        {!effectiveAdminMode && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {summary.available_balance > 0 && (
              <button onClick={() => { setShowSaqueModal(true); setSaqueError(''); setSaqueAmount(''); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
                <Send className="w-3.5 h-3.5" /> Solicitar Saque
              </button>
            )}
            <button onClick={() => setShowPixModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-cyber">
              <Edit2 className="w-3.5 h-3.5" />
              {pixInfo.pix_key ? 'Editar PIX' : 'Cadastrar PIX'}
            </button>
          </div>
        )}
      </div>

      {saqueSuccess && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium animate-fade-up flex items-center gap-2"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {saqueSuccess}
        </div>
      )}

      {/* KPI cards — linha do mês */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          {
            label: 'Aguardando Comissão',
            value: fmtBRL(summary.pending_value),
            sub: `${summary.pending_count} proposta${summary.pending_count !== 1 ? 's' : ''} no mês`,
            icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
            info: 'Comissão das suas propostas pagas que a empresa ainda não liberou. Aguarda confirmação.',
          },
          {
            label: 'Total Comissão Mês',
            value: fmtBRL(summary.pending_value + summary.paid_value),
            sub: `${summary.pending_count + summary.paid_count} proposta${(summary.pending_count + summary.paid_count) !== 1 ? 's' : ''} no mês`,
            icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)',
            info: 'Soma de toda a sua comissão do mês: aguardando + confirmada.',
          },
        ].map((c, i) => (
          <div key={c.label} className="rounded-2xl p-4 animate-fade-up stat-card"
            style={{ background: c.bg, border: `1px solid ${c.border}`, animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider leading-tight flex-1 mr-1" style={{ color: 'var(--text-3)' }}>{c.label}</p>
              <InfoCard text={c.info} />
            </div>
            <p className="text-lg font-black num" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Card de fluxo financeiro */}
      <div className="rounded-2xl p-5 mb-4 animate-fade-up"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '60ms' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>Seu saldo — acumulado</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Reservado */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4ade80' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Comissão Recebida</span>
              <InfoCard text="Total que a empresa confirmou e reservou pra você. Esse valor ainda está na empresa, mas é seu." />
            </div>
            <p className="text-base font-black num" style={{ color: '#4ade80' }}>{fmtBRL(summary.all_time_paid_value)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>reservado pela empresa</p>
          </div>
          {/* Sacado */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Send className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f87171' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Já Sacado (Pago)</span>
              <InfoCard text="Saques com status Pago — esse dinheiro já saiu da empresa e foi para o seu PIX." />
            </div>
            <p className="text-base font-black num" style={{ color: '#f87171' }}>{fmtBRL(summary.withdrawn_paid)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{summary.withdrawn_paid_count} saque{summary.withdrawn_paid_count !== 1 ? 's' : ''} pago{summary.withdrawn_paid_count !== 1 ? 's' : ''}</p>
          </div>
          {/* Disponível */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowDownToLine className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#14B8A6' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Disponível p/ Saque</span>
              <InfoCard text="Comissão recebida menos saques já solicitados (pagos + pendentes). É o que você pode sacar agora." />
            </div>
            <p className="text-base font-black num" style={{ color: '#14B8A6' }}>{fmtBRL(summary.available_balance)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>pronto para solicitar</p>
          </div>
        </div>
        {/* Barra de progresso: sacado vs disponível */}
        {summary.all_time_paid_value > 0 && (
          <div>
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>
              <span>Sacado: {pctSacado.toFixed(0)}%</span>
              <span>Disponível: {(100 - pctSacado).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${pctSacado}%`, background: 'linear-gradient(90deg, #f87171, #fb923c)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Saques solicitados */}
      {saques.length > 0 && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Saques Solicitados</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Data', 'Valor', 'Status', 'Observação'].map(h => {
                      const sortable = !!SAQUE_SORT[h]; const active = saqueSort === h;
                      return (
                        <th key={h} onClick={sortable ? () => handleSaqueSort(h) : undefined}
                          className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: active ? '#14B8A6' : 'var(--text-3)', cursor: sortable ? 'pointer' : 'default', userSelect: 'none' }}>
                          {h}{sortable && <span className="ml-1 opacity-60">{active ? (saqueSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedSaques.map(s => {
                    const sc = SAQUE_STATUS_COLOR[s.status] || SAQUE_STATUS_COLOR['Pendente'];
                    return (
                      <tr key={s.id} className="table-row-cyber">
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td className="px-4 py-3 font-bold num" style={{ color: '#14B8A6' }}>{fmtBRL(Number(s.amount))}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{s.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Extrato */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
            Extrato de Comissões
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* Filtro por mês */}
            {availableMonths.length > 0 && (
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="input-cyber appearance-none pl-3 pr-8 py-2 text-xs rounded-xl min-w-[150px]">
                  <option value="">Todos os meses</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Filtro por status */}
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="input-cyber appearance-none pl-3 pr-8 py-2 text-xs rounded-xl min-w-[160px]">
                <option value="">Todos os status</option>
                <option value="Ag. Comissão">Aguardando Comissão</option>
                <option value="Comissão Paga">Comissão Recebida</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="spinner-cyber" />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Proposta', 'Cliente', 'CPF', 'Banco / Tabela', 'Valor', 'Comissão', 'Status'].map(h => {
                      const active = sortCol === h;
                      return (
                        <th key={h} onClick={() => handleSort(h)}
                          className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: active ? '#14B8A6' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                          {h} <span className="opacity-60">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : paginated.map(p => (
                    <tr key={p.id} className="table-row-cyber">
                      <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                          {(p.updated_at || (p as any).created_at || '').slice(0, 10).split('-').reverse().join('/')}
                        </p>
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
                        <span className={`badge inline-flex items-center gap-1 ${p.status_comissao === 'Comissão Paga' ? 'badge-green' : 'badge-amber'}`}>
                          {p.status_comissao === 'Ag. Comissão'
                            ? <><Clock className="w-3 h-3" />Aguardando</>
                            : <><CheckCircle className="w-3 h-3" />Recebida</>}
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

      {!effectiveAdminMode && showPixModal && <PixModal current={pixInfo} onClose={() => setShowPixModal(false)} onSave={savePix} />}

      {!effectiveAdminMode && showSaqueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl w-full max-w-sm p-6 animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" style={{ color: '#14B8A6' }} />
                <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Solicitar Saque</h2>
              </div>
              <button onClick={() => setShowSaqueModal(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Disponível para Saque</p>
              <p className="text-xl font-black num" style={{ color: '#14B8A6' }}>{fmtBRL(summary.available_balance)}</p>
            </div>
            {pixInfo.pix_key ? (
              <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Chave PIX de destino</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-1)' }}>{pixInfo.pix_key}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{PIX_TYPE_LABELS[pixInfo.pix_key_type || ''] || pixInfo.pix_key_type}</p>
              </div>
            ) : (
              <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
                <p className="text-xs" style={{ color: '#f87171' }}>Cadastre uma chave PIX antes de solicitar o saque.</p>
              </div>
            )}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Valor desejado (R$)</label>
                <button type="button" onClick={() => setSaqueAmount(summary.available_balance.toFixed(2))}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all"
                  style={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.25)' }}>
                  Usar tudo
                </button>
              </div>
              <input value={saqueAmount} onChange={e => setSaqueAmount(e.target.value)}
                onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text'); const n = parseFloat(t.replace(/\./g, '').replace(',', '.')); setSaqueAmount(isNaN(n) ? t : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }}
                placeholder="0,00" type="text" inputMode="decimal"
                className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
              {saqueError && <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f87171' }}><AlertCircle className="w-3 h-3" />{saqueError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSaqueModal(false)} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
              <button onClick={requestSaque} disabled={requestingSaque || !pixInfo.pix_key || !saqueAmount}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl font-semibold btn-cyber disabled:opacity-50">
                <Send className="w-4 h-4" />
                {requestingSaque ? 'Enviando...' : 'Solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
