import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, DollarSign, Users, ChevronDown, Search, AlertCircle, Key, Send, XCircle, Inbox } from 'lucide-react';
import { Proposal, WithdrawalRequest } from '../../types';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave Aleatória',
};

interface BrokerSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  pix_key: string | null;
  pix_key_type: string | null;
  pending_count: number;
  pending_value: number;
  paid_count: number;
  paid_value: number;
  empresa_pending_value: number;
  empresa_paid_value: number;
}

const SAQUE_STATUS_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  'Pendente': { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  'Aprovado': { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  'Pago':     { text: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)' },
  'Recusado': { text: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)' },
};

export function AdminContaCorrente() {
  const [tab, setTab] = useState<'comissoes' | 'saques'>('comissoes');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [brokers, setBrokers] = useState<BrokerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCorretor, setFilterCorretor] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [successMsg, setSuccessMsg] = useState('');

  const [saques, setSaques] = useState<WithdrawalRequest[]>([]);
  const [loadingSaques, setLoadingSaques] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCorretor) params.set('user_id', filterCorretor);
    if (filterStatus) params.set('status_comissao', filterStatus);
    const data = await API(`/api/admin/conta-corrente?${params}`).then(r => r.json());
    setProposals(Array.isArray(data.proposals) ? data.proposals : []);
    setBrokers(Array.isArray(data.brokers) ? data.brokers : []);
    setSelected(new Set());
    setLoading(false);
  }

  async function loadSaques() {
    setLoadingSaques(true);
    const data = await API('/api/admin/saques').then(r => r.json());
    setSaques(Array.isArray(data) ? data : []);
    setLoadingSaques(false);
  }

  async function updateSaque(id: string, status: string) {
    setActionId(id);
    await API(`/api/admin/saques/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setActionId(null);
    loadSaques();
  }

  useEffect(() => { load(); }, [filterCorretor, filterStatus]);
  useEffect(() => { if (tab === 'saques') loadSaques(); }, [tab]);

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    return !q || p.client_name.toLowerCase().includes(q) || p.client_cpf?.includes(q) || p.proposal_number.includes(q);
  });

  useEffect(() => { setPage(1); }, [search, filterStatus, filterCorretor]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginated.filter(p => p.status_comissao === 'Ag. Comissão').map(p => p.id);
    const allSelected = pageIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectablePage = paginated.filter(p => p.status_comissao === 'Ag. Comissão');
  const allPageSelected = selectablePage.length > 0 && selectablePage.every(p => selected.has(p.id));

  const totalPending   = brokers.reduce((a, b) => a + parseFloat(String(b.pending_value)), 0);
  const totalPaid      = brokers.reduce((a, b) => a + parseFloat(String(b.paid_value)), 0);
  const totalEmpresaPending = brokers.reduce((a, b) => a + parseFloat(String(b.empresa_pending_value || 0)), 0);
  const totalEmpresaPaid    = brokers.reduce((a, b) => a + parseFloat(String(b.empresa_paid_value || 0)), 0);
  const brokersWithPending = brokers.filter(b => b.pending_count > 0).length;

  async function markAsPaid() {
    if (selected.size === 0) return;
    setSaving(true);
    await API('/api/admin/conta-corrente/pay', {
      method: 'POST',
      body: JSON.stringify({ proposal_ids: Array.from(selected) }),
    });
    setSuccessMsg(`${selected.size} comissão(ões) marcada(s) como paga(s)!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    await load();
    setSaving(false);
  }

  const pendingSaques = saques.filter(s => s.status === 'Pendente').length;

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Conta Corrente — Admin</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Gerencie comissões e solicitações de saque</p>
        </div>
        {selected.size > 0 && tab === 'comissoes' && (
          <button
            onClick={markAsPaid}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-cyber"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Salvando...' : `Marcar ${selected.size} como Pago`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
        {([
          { key: 'comissoes', label: 'Comissões', icon: CheckCircle },
          { key: 'saques',    label: `Saques${pendingSaques > 0 ? ` (${pendingSaques})` : ''}`, icon: Send },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === t.key
              ? { background: 'var(--card-bg)', color: '#14B8A6', boxShadow: 'var(--shadow-card)' }
              : { color: 'var(--text-3)' }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {successMsg && tab === 'comissoes' && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium animate-fade-up"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* ── ABA SAQUES ── */}
      {tab === 'saques' && (
        <div className="animate-fade-up">
          {loadingSaques ? (
            <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
          ) : saques.length === 0 ? (
            <div className="text-center py-20">
              <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma solicitação de saque</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Corretor','Chave PIX','Valor','Status','Data','Ações'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saques.map(s => {
                    const sc = SAQUE_STATUS_COLOR[s.status] || SAQUE_STATUS_COLOR['Pendente'];
                    const isPending = s.status === 'Pendente';
                    const isApproved = s.status === 'Aprovado';
                    return (
                      <tr key={s.id} className="table-row-cyber">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{s.user_name || s.user_email}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.user_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {s.pix_key ? (
                            <div>
                              <p className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>{s.pix_key}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{PIX_TYPE_LABELS[s.pix_key_type || ''] || s.pix_key_type}</p>
                            </div>
                          ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold num text-base" style={{ color: '#14B8A6' }}>{fmtBRL(Number(s.amount))}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <button onClick={() => updateSaque(s.id, 'Aprovado')} disabled={actionId === s.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                                <CheckCircle className="w-3 h-3" /> Aprovar
                              </button>
                            )}
                            {isApproved && (
                              <button onClick={() => updateSaque(s.id, 'Pago')} disabled={actionId === s.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                                <DollarSign className="w-3 h-3" /> Marcar Pago
                              </button>
                            )}
                            {(isPending || isApproved) && (
                              <button onClick={() => updateSaque(s.id, 'Recusado')} disabled={actionId === s.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                                <XCircle className="w-3 h-3" /> Recusar
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
          )}
        </div>
      )}

      {/* ── ABA COMISSÕES ── */}
      {tab === 'comissoes' && <>

      {/* Cards globais */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Corretor Pendente',  value: fmtBRL(totalPending),            sub: `${brokers.reduce((a, b) => a + b.pending_count, 0)} propostas`, icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
          { label: 'Corretor Pago',      value: fmtBRL(totalPaid),               sub: `${brokers.reduce((a, b) => a + b.paid_count, 0)} pagas`,        icon: CheckCircle,  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)'  },
          { label: 'Empresa Pendente',   value: fmtBRL(totalEmpresaPending),      sub: 'comissão empresa a receber',                                    icon: Clock,        color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)'  },
          { label: 'Empresa Recebida',   value: fmtBRL(totalEmpresaPaid),         sub: 'comissão empresa recebida',                                     icon: DollarSign,   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
          { label: 'Corretores Pend.',   value: String(brokersWithPending),       sub: 'aguardando pagamento',                                          icon: Users,        color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)'  },
          { label: 'Total Geral',        value: fmtBRL(totalPending + totalPaid + totalEmpresaPending + totalEmpresaPaid), sub: 'corretor + empresa',   icon: Wallet,       color: '#14B8A6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)'  },
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

      {/* Resumo por corretor */}
      {brokers.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6 animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '80ms' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Resumo por Corretor</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Corretor', 'Chave PIX', 'Corr. A Receber', 'Corr. Pago', 'Emp. Pendente', 'Emp. Recebida', 'Total Corretor'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brokers.map(b => (
                <tr key={b.user_id} className="table-row-cyber">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{b.user_name || b.user_email}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {b.pix_key ? (
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3 h-3 flex-shrink-0" style={{ color: '#14B8A6' }} />
                        <div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(20,184,166,0.12)', color: '#2DD4BF' }}>
                            {PIX_TYPE_LABELS[b.pix_key_type || ''] || b.pix_key_type}
                          </span>
                          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>{b.pix_key}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: b.pending_value > 0 ? '#f59e0b' : 'var(--text-3)' }}>
                      {fmtBRL(parseFloat(String(b.pending_value)))}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.pending_count} proposta{b.pending_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: '#4ade80' }}>{fmtBRL(parseFloat(String(b.paid_value)))}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.paid_count} paga{b.paid_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: (b.empresa_pending_value || 0) > 0 ? '#fb923c' : 'var(--text-3)' }}>
                      {fmtBRL(parseFloat(String(b.empresa_pending_value || 0)))}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: '#a78bfa' }}>
                      {fmtBRL(parseFloat(String(b.empresa_paid_value || 0)))}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: 'var(--text-1)' }}>
                      {fmtBRL(parseFloat(String(b.pending_value)) + parseFloat(String(b.paid_value)))}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1" style={{ minWidth: '200px' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou nº proposta..."
            className="input-cyber w-full pl-9 pr-3 py-2.5 text-sm rounded-xl" />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <select value={filterCorretor} onChange={e => setFilterCorretor(e.target.value)}
            className="input-cyber appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl" style={{ minWidth: '170px' }}>
            <option value="">Todos os corretores</option>
            {brokers.map(b => (
              <option key={b.user_id} value={b.user_id}>{b.user_name || b.user_email}</option>
            ))}
          </select>
        </div>
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

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl animate-fade-up"
          style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#14B8A6' }} />
          <p className="text-sm" style={{ color: '#2DD4BF' }}>
            <strong>{selected.size}</strong> proposta{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''} — clique em "Marcar como Pago" para confirmar.
          </p>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '140ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer accent-teal-500" />
                  </th>
                  {['Proposta', 'Corretor', 'Nome do Cliente', 'CPF', 'Banco / Tabela', 'Valor', 'Comissão Corretor', 'Comissão Empresa', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma comissão encontrada</td>
                  </tr>
                ) : paginated.map(p => {
                  const isPending = p.status_comissao === 'Ag. Comissão';
                  const isChecked = selected.has(p.id);
                  return (
                    <tr key={p.id}
                      className="table-row-cyber"
                      style={isChecked ? { background: 'rgba(20,184,166,0.05)' } : undefined}
                    >
                      <td className="px-4 py-3">
                        {isPending && (
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(p.id)}
                            className="w-3.5 h-3.5 rounded cursor-pointer accent-teal-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{(p as any).user_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{p.client_cpf || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{(p as any).bank_name || p.bank || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{(p as any).table_name || '—'}</p>
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
                        {Number(p.comissao_empresa_valor) > 0 ? (
                          <div>
                            <span className="font-bold text-sm num" style={{ color: '#a78bfa' }}>{fmtBRL(Number(p.comissao_empresa_valor))}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${isPending ? 'badge badge-amber' : 'badge badge-green'} inline-flex items-center gap-1`}>
                          {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {p.status_comissao}
                        </span>
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
      </>}
    </div>
  );
}
