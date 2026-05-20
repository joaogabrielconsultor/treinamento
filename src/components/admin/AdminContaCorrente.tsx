import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, DollarSign, Users, ChevronDown, Search, AlertCircle, Key, Send, XCircle, Inbox, Edit2, X, Check, TrendingDown, Plus, Store } from 'lucide-react';
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

interface Despesa {
  id: string;
  loja_id: string | null;
  loja_name: string | null;
  usuario_banco_id: string | null;
  usuario_banco_nome: string | null;
  descricao: string;
  valor: number;
  data: string;
  created_by_name: string | null;
  created_at: string;
}

interface SaldoLoja {
  loja_id: string;
  loja_name: string;
  total_empresa_recebido: number;
  total_despesas: number;
  saldo: number;
}

interface Loja {
  id: string;
  name: string;
}

interface UsuarioBancoSummary {
  usuario_banco_id: string;
  usuario_banco_nome: string;
  pending_count: number;
  pending_value: number;
  paid_count: number;
  paid_value: number;
  empresa_pending_value: number;
  empresa_paid_value: number;
}

interface UsuarioBanco {
  id: string;
  nome: string;
}

const SAQUE_STATUS_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  'Pendente': { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  'Aprovado': { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  'Pago':     { text: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)' },
  'Recusado': { text: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)' },
};

export function AdminContaCorrente({ isMaster = false }: { isMaster?: boolean }) {
  const [tab, setTab] = useState<'comissoes' | 'saques' | 'despesas'>('comissoes');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [brokers, setBrokers] = useState<BrokerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCorretor, setFilterCorretor] = useState('');
  const [filterLoja, setFilterLoja] = useState('');
  const [filterUsuarioBanco, setFilterUsuarioBanco] = useState('');
  const [usuariosBanco, setUsuariosBanco] = useState<UsuarioBanco[]>([]);
  const [usuariosBancoSummary, setUsuariosBancoSummary] = useState<UsuarioBancoSummary[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [successMsg, setSuccessMsg] = useState('');

  const [saques, setSaques] = useState<WithdrawalRequest[]>([]);
  const [loadingSaques, setLoadingSaques] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editCorr, setEditCorr] = useState('');
  const [editEmp, setEditEmp] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [saldoLojas, setSaldoLojas] = useState<SaldoLoja[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [savingDespesa, setSavingDespesa] = useState(false);
  const [despesaForm, setDespesaForm] = useState({ loja_id: '', descricao: '', valor: '', data: new Date().toISOString().split('T')[0], usuario_banco_id: '' });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCorretor) params.set('user_id', filterCorretor);
    if (filterStatus) params.set('status_comissao', filterStatus);
    if (filterLoja) params.set('loja_id', filterLoja);
    if (filterUsuarioBanco) params.set('usuario_banco_id', filterUsuarioBanco);
    const data = await API(`/api/admin/conta-corrente?${params}`).then(r => r.json());
    setProposals(Array.isArray(data.proposals) ? data.proposals : []);
    setBrokers(Array.isArray(data.brokers) ? data.brokers : []);
    setUsuariosBancoSummary(Array.isArray(data.usuariosBanco) ? data.usuariosBanco : []);
    setSelected(new Set());
    setLoading(false);
  }

  async function loadSaques() {
    setLoadingSaques(true);
    const params = new URLSearchParams();
    if (filterLoja) params.set('loja_id', filterLoja);
    const data = await API(`/api/admin/saques?${params}`).then(r => r.json());
    setSaques(Array.isArray(data) ? data : []);
    setLoadingSaques(false);
  }

  async function loadDespesas() {
    setLoadingDespesas(true);
    const [despData, saldoData, lojasData] = await Promise.all([
      API('/api/admin/despesas').then(r => r.json()),
      API('/api/admin/despesas/saldo-lojas').then(r => r.json()),
      API('/api/admin/lojas/all').then(r => r.json()),
    ]);
    setDespesas(Array.isArray(despData) ? despData : []);
    setSaldoLojas(Array.isArray(saldoData) ? saldoData : []);
    setLojas(Array.isArray(lojasData) ? lojasData : []);
    setLoadingDespesas(false);
  }

  async function saveDespesa() {
    if (!despesaForm.descricao.trim() || !despesaForm.valor) return;
    setSavingDespesa(true);
    await API('/api/admin/despesas', {
      method: 'POST',
      body: JSON.stringify({
        loja_id: despesaForm.loja_id || null,
        descricao: despesaForm.descricao,
        valor: parseFloat(despesaForm.valor.replace(/\./g, '').replace(',', '.')),
        data: despesaForm.data,
        usuario_banco_id: despesaForm.usuario_banco_id || null,
      }),
    });
    setSavingDespesa(false);
    setShowDespesaModal(false);
    setDespesaForm({ loja_id: '', descricao: '', valor: '', data: new Date().toISOString().split('T')[0], usuario_banco_id: '' });
    loadDespesas();
  }

  async function deleteDespesa(id: string) {
    if (!window.confirm('Excluir esta despesa? Esta ação é irreversível.')) return;
    await API(`/api/admin/despesas/${id}`, { method: 'DELETE' });
    loadDespesas();
  }

  async function updateSaque(id: string, status: string) {
    setActionId(id);
    await API(`/api/admin/saques/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setActionId(null);
    loadSaques();
  }

  useEffect(() => {
    API('/api/admin/lojas/all').then(r => r.json()).then(d => setLojas(Array.isArray(d) ? d : []));
    API('/api/usuarios-banco').then(r => r.json()).then(d => setUsuariosBanco(Array.isArray(d) ? d : []));
  }, []);
  useEffect(() => { load(); }, [filterCorretor, filterStatus, filterLoja, filterUsuarioBanco]);
  useEffect(() => { if (tab === 'saques') loadSaques(); }, [tab, filterLoja]);
  useEffect(() => { if (tab === 'despesas') loadDespesas(); }, [tab]);

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

  function startEdit(p: Proposal) {
    const corrVal = p.comissao_corretor_override != null ? p.comissao_corretor_override : (p.comissao_valor ?? '');
    const empVal  = p.comissao_empresa_override  != null ? p.comissao_empresa_override  : (p.comissao_empresa_valor ?? '');
    setEditId(p.id);
    setEditCorr(String(corrVal));
    setEditEmp(String(empVal));
  }

  function cancelEdit() { setEditId(null); }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    const parseVal = (v: string) => v.trim() === '' ? null : parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
    await API(`/api/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        comissao_corretor_override: parseVal(editCorr),
        comissao_empresa_override:  parseVal(editEmp),
      }),
    });
    setSavingEdit(false);
    setEditId(null);
    await load();
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
      </div>

      {/* Tabs + filtro loja global */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
          {([
            { key: 'comissoes', label: 'Comissões', icon: CheckCircle },
            { key: 'saques',    label: `Saques${pendingSaques > 0 ? ` (${pendingSaques})` : ''}`, icon: Send },
            { key: 'despesas',  label: 'Despesas', icon: TrendingDown },
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
        {lojas.length > 0 && (
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <select value={filterLoja} onChange={e => setFilterLoja(e.target.value)}
              className="input-cyber appearance-none pl-9 pr-9 py-2 text-xs rounded-xl" style={{ minWidth: '160px' }}>
              <option value="">Todas as lojas</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        {usuariosBanco.length > 0 && (
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <select value={filterUsuarioBanco} onChange={e => setFilterUsuarioBanco(e.target.value)}
              className="input-cyber appearance-none pl-9 pr-9 py-2 text-xs rounded-xl" style={{ minWidth: '170px' }}>
              <option value="">Todos os usuários banco</option>
              {usuariosBanco.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        )}
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

      {/* ── ABA DESPESAS ── */}
      {tab === 'despesas' && (
        <div className="animate-fade-up">
          {/* Botão lançar + modal */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Registre pagamentos feitos pela empresa e acompanhe o saldo por loja</p>
            <button
              onClick={() => setShowDespesaModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold btn-cyber"
            >
              <Plus className="w-4 h-4" /> Lançar Despesa
            </button>
          </div>

          {/* Modal lançar despesa */}
          {showDespesaModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div className="w-full max-w-md rounded-2xl p-6 animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" style={{ color: '#f87171' }} />
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Lançar Despesa</h2>
                  </div>
                  <button onClick={() => setShowDespesaModal(false)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Loja</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                      <select
                        value={despesaForm.loja_id}
                        onChange={e => setDespesaForm(f => ({ ...f, loja_id: e.target.value }))}
                        className="input-cyber w-full pl-9 pr-3 py-2.5 text-sm rounded-xl appearance-none"
                      >
                        <option value="">Sem loja específica</option>
                        {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Pago de (Usuário Banco)</label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                      <select
                        value={despesaForm.usuario_banco_id}
                        onChange={e => setDespesaForm(f => ({ ...f, usuario_banco_id: e.target.value }))}
                        className="input-cyber w-full px-3 pr-8 py-2.5 text-sm rounded-xl appearance-none"
                      >
                        <option value="">Não especificado</option>
                        {usuariosBanco.map(ub => <option key={ub.id} value={ub.id}>{ub.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: Pagamento de aluguel, material..."
                      value={despesaForm.descricao}
                      onChange={e => setDespesaForm(f => ({ ...f, descricao: e.target.value }))}
                      className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Valor (R$)</label>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={despesaForm.valor}
                        onChange={e => setDespesaForm(f => ({ ...f, valor: e.target.value }))}
                        className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl num"
                        style={{ color: '#f87171' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Data</label>
                      <input
                        type="date"
                        value={despesaForm.data}
                        onChange={e => setDespesaForm(f => ({ ...f, data: e.target.value }))}
                        className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={saveDespesa}
                      disabled={savingDespesa || !despesaForm.descricao.trim() || !despesaForm.valor}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {savingDespesa ? 'Salvando...' : 'Confirmar Despesa'}
                    </button>
                    <button
                      onClick={() => setShowDespesaModal(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingDespesas ? (
            <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
          ) : (
            <>
              {/* Saldo por loja */}
              {saldoLojas.filter(l => l.total_empresa_recebido > 0 || l.total_despesas > 0).length > 0 && (
                <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Saldo por Loja</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                        {['Loja', 'Emp. Recebido', 'Despesas', 'Saldo'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {saldoLojas.filter(l => l.total_empresa_recebido > 0 || l.total_despesas > 0).map(l => (
                        <tr key={l.loja_id} className="table-row-cyber">
                          <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-1)' }}>{l.loja_name}</td>
                          <td className="px-4 py-3 font-bold num" style={{ color: '#a78bfa' }}>{fmtBRL(Number(l.total_empresa_recebido))}</td>
                          <td className="px-4 py-3 font-bold num" style={{ color: '#f87171' }}>− {fmtBRL(Number(l.total_despesas))}</td>
                          <td className="px-4 py-3 font-black num text-base" style={{ color: Number(l.saldo) >= 0 ? '#4ade80' : '#f87171' }}>{fmtBRL(Number(l.saldo))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Lista de despesas */}
              {(() => {
                const despesasFiltradas = filterLoja ? despesas.filter(d => d.loja_id === filterLoja) : despesas;
                return despesasFiltradas.length === 0 ? (
                <div className="text-center py-20">
                  <TrendingDown className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma despesa registrada</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                        {['Data', 'Loja', 'Pago de', 'Descrição', 'Valor', 'Lançado por', ...(isMaster ? [''] : [])].map(h => (
                          <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {despesasFiltradas.map(d => (
                        <tr key={d.id} className="table-row-cyber">
                          <td className="px-4 py-3 text-xs num" style={{ color: 'var(--text-3)' }}>
                            {new Date(d.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </td>
                          <td className="px-4 py-3">
                            {d.loja_name ? (
                              <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                                {d.loja_name}
                              </span>
                            ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {d.usuario_banco_nome ? (
                              <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                                {d.usuario_banco_nome}
                              </span>
                            ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-1)' }}>{d.descricao}</td>
                          <td className="px-4 py-3 font-bold num" style={{ color: '#f87171' }}>− {fmtBRL(Number(d.valor))}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{d.created_by_name || '—'}</td>
                          {isMaster && (
                            <td className="px-4 py-3">
                              <button
                                onClick={() => deleteDespesa(d.id)}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all"
                                style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                                title="Excluir despesa"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── ABA COMISSÕES ── */}
      {tab === 'comissoes' && <>

      {/* Cards globais */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Corr. A Receber',    value: fmtBRL(totalPending),            sub: `disponível p/ saque`,                                          icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
          { label: 'Corr. Pago (Saque)', value: fmtBRL(totalPaid),               sub: `${brokers.reduce((a, b) => a + b.paid_count, 0)} saque(s)`,     icon: CheckCircle,  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)'  },
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
                {([
                  { label: 'Corretor',        tip: null },
                  { label: 'Chave PIX',       tip: null },
                  { label: 'Corr. A Receber', tip: 'Comissão do corretor nas propostas ainda não pagas — o que a empresa ainda deve ao corretor.' },
                  { label: 'Corr. Pago',      tip: 'Comissão do corretor já paga pela empresa.' },
                  { label: 'Emp. Pendente',   tip: 'Comissão da empresa em propostas pagas, mas ainda não recebida.' },
                  { label: 'Emp. Recebida',   tip: 'Comissão da empresa já recebida.' },
                  { label: 'Total Corretor',  tip: 'Soma do que o corretor tem a receber + já recebeu.' },
                ] as const).map(({ label, tip }) => (
                  <th key={label} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    {tip ? (
                      <span className="inline-flex items-center gap-1 group relative cursor-default">
                        {label}
                        <AlertCircle className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <span className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-xl px-3 py-2 text-xs font-normal normal-case tracking-normal leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', color: 'var(--text-2)' }}>
                          {tip}
                        </span>
                      </span>
                    ) : label}
                  </th>
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
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.pending_count} prop. liberada{b.pending_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: '#4ade80' }}>{fmtBRL(parseFloat(String(b.paid_value)))}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.paid_count} saque{b.paid_count !== 1 ? 's' : ''}</p>
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

      {/* Resumo por Usuário Banco */}
      {usuariosBancoSummary.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6 animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '90ms' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Resumo por Usuário Banco</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {([
                  { label: 'Usuário Banco',   tip: null },
                  { label: 'Corr. A Receber', tip: 'Comissão do corretor nas propostas ainda não pagas — o que a empresa ainda deve ao corretor.' },
                  { label: 'Corr. Pago',      tip: 'Comissão do corretor já paga pela empresa.' },
                  { label: 'Emp. Pendente',   tip: 'Comissão da empresa em propostas pagas, mas ainda não recebida na conta bancária.' },
                  { label: 'Emp. Recebida',   tip: 'Comissão da empresa já recebida nesta conta bancária.' },
                  { label: 'Total Corretor',  tip: 'Soma de tudo que o corretor tem a receber + já recebeu nesta conta.' },
                ] as const).map(({ label, tip }) => (
                  <th key={label} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    {tip ? (
                      <span className="inline-flex items-center gap-1 group relative cursor-default">
                        {label}
                        <AlertCircle className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <span className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-xl px-3 py-2 text-xs font-normal normal-case tracking-normal leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', color: 'var(--text-2)' }}>
                          {tip}
                        </span>
                      </span>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosBancoSummary.map(ub => (
                <tr key={ub.usuario_banco_id} className="table-row-cyber">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                        <Users className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{ub.usuario_banco_nome}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: ub.pending_value > 0 ? '#f59e0b' : 'var(--text-3)' }}>{fmtBRL(parseFloat(String(ub.pending_value)))}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{ub.pending_count} proposta{ub.pending_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: '#4ade80' }}>{fmtBRL(parseFloat(String(ub.paid_value)))}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{ub.paid_count} paga{ub.paid_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: (ub.empresa_pending_value || 0) > 0 ? '#fb923c' : 'var(--text-3)' }}>{fmtBRL(parseFloat(String(ub.empresa_pending_value || 0)))}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: '#a78bfa' }}>{fmtBRL(parseFloat(String(ub.empresa_paid_value || 0)))}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold num" style={{ color: 'var(--text-1)' }}>{fmtBRL(parseFloat(String(ub.pending_value)) + parseFloat(String(ub.paid_value)))}</p>
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
          <p className="text-sm flex-1" style={{ color: '#2DD4BF' }}>
            <strong>{selected.size}</strong> proposta{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
          </p>
          <button
            onClick={markAsPaid}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold btn-cyber disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? 'Salvando...' : 'Comissão Recebida'}
          </button>
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
                  {['Proposta', 'Corretor', 'Nome do Cliente', 'CPF', 'Banco / Tabela', 'Valor', 'Comissão Corretor', 'Comissão Empresa', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma comissão encontrada</td>
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
                        {editId === p.id ? (
                          <input
                            type="text"
                            value={editCorr}
                            onChange={e => setEditCorr(e.target.value)}
                            placeholder="0,00"
                            className="input-cyber w-28 px-2 py-1 text-sm rounded-lg num"
                            style={{ color: '#4ade80' }}
                          />
                        ) : Number(p.comissao_valor) > 0 ? (
                          <div>
                            <span className="font-bold text-sm num" style={{ color: '#4ade80' }}>{fmtBRL(Number(p.comissao_valor))}</span>
                            {p.comissao_corretor_override != null && (
                              <p className="text-[10px]" style={{ color: '#94a3b8' }}>override</p>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {editId === p.id ? (
                          <input
                            type="text"
                            value={editEmp}
                            onChange={e => setEditEmp(e.target.value)}
                            placeholder="0,00"
                            className="input-cyber w-28 px-2 py-1 text-sm rounded-lg num"
                            style={{ color: '#a78bfa' }}
                          />
                        ) : Number(p.comissao_empresa_valor) > 0 ? (
                          <div>
                            <span className="font-bold text-sm num" style={{ color: '#a78bfa' }}>{fmtBRL(Number(p.comissao_empresa_valor))}</span>
                            {p.comissao_empresa_override != null && (
                              <p className="text-[10px]" style={{ color: '#94a3b8' }}>override</p>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${isPending ? 'badge badge-amber' : 'badge badge-green'} inline-flex items-center gap-1`}>
                          {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {p.status_comissao}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => saveEdit(p.id)}
                              disabled={savingEdit}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all disabled:opacity-50"
                              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                            >
                              <Check className="w-3 h-3" />{savingEdit ? '...' : 'Salvar'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all disabled:opacity-50"
                              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all"
                            style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                          >
                            <Edit2 className="w-3 h-3" /> Editar
                          </button>
                        )}
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
