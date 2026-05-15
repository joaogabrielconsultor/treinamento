import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, DollarSign, FileText, ChevronDown, Key, Edit2, X, Save, Send, ArrowDownToLine, AlertCircle } from 'lucide-react';
import { Proposal, WithdrawalRequest } from '../types';
import { Pagination } from './ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatória',
};

interface Summary {
  pending_count: number;
  pending_value: number;
  paid_count: number;
  paid_value: number;
  available_balance: number;
}

interface PixInfo {
  pix_key: string | null;
  pix_key_type: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  'Ag. Comissão': 'badge badge-amber',
  'Comissão Paga': 'badge badge-green',
};

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
              <select value={type} onChange={e => setType(e.target.value)}
                className="input-cyber w-full appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl">
                <option value="">Selecione o tipo</option>
                {Object.entries(PIX_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Chave PIX</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="Digite sua chave PIX"
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--card-border)', color: 'var(--text-2)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !type || !key.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const SAQUE_STATUS_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  'Pendente': { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  'Aprovado': { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  'Pago':     { text: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)' },
  'Recusado': { text: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)' },
};

export function ContaCorrente() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending_count: 0, pending_value: 0, paid_count: 0, paid_value: 0, available_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pixInfo, setPixInfo] = useState<PixInfo>({ pix_key: null, pix_key_type: null });
  const [showPixModal, setShowPixModal] = useState(false);

  const [saques, setSaques] = useState<WithdrawalRequest[]>([]);
  const [showSaqueModal, setShowSaqueModal] = useState(false);
  const [saqueAmount, setSaqueAmount] = useState('');
  const [requestingSaque, setRequestingSaque] = useState(false);
  const [saqueError, setSaqueError] = useState('');
  const [saqueSuccess, setSaqueSuccess] = useState('');

  async function load() {
    setLoading(true);
    const [contaData, meData, saquesData] = await Promise.all([
      API('/api/conta-corrente').then(r => r.json()),
      API('/api/auth/me').then(r => r.json()),
      API('/api/conta-corrente/saques').then(r => r.json()),
    ]);
    setProposals(Array.isArray(contaData.proposals) ? contaData.proposals : []);
    if (contaData.summary) setSummary(contaData.summary);
    if (meData) setPixInfo({ pix_key: meData.pix_key || null, pix_key_type: meData.pix_key_type || null });
    setSaques(Array.isArray(saquesData) ? saquesData : []);
    setLoading(false);
  }

  async function savePix(info: PixInfo) {
    await API('/api/profile/pix', { method: 'PUT', body: JSON.stringify(info) });
    setPixInfo(info);
    setShowPixModal(false);
  }

  async function requestSaque() {
    const amt = parseFloat(saqueAmount.replace(',', '.'));
    if (!amt || amt <= 0) { setSaqueError('Informe um valor válido'); return; }
    setRequestingSaque(true); setSaqueError('');
    const res = await API('/api/conta-corrente/saque', { method: 'POST', body: JSON.stringify({ amount: amt }) });
    const data = await res.json();
    if (!res.ok) { setSaqueError(data.error || 'Erro ao solicitar'); setRequestingSaque(false); return; }
    setSaqueSuccess('Solicitação enviada com sucesso!');
    setShowSaqueModal(false); setSaqueAmount(''); setRequestingSaque(false);
    setTimeout(() => setSaqueSuccess(''), 5000);
    load();
  }

  useEffect(() => { load(); }, []);

  const filtered = filterStatus ? proposals.filter(p => p.status_comissao === filterStatus) : proposals;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [filterStatus]);

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Conta Corrente</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Acompanhe suas comissões a receber e já recebidas</p>
        </div>
      </div>

      {/* Chave PIX */}
      <div className="rounded-2xl p-4 mb-6 animate-fade-up flex items-center justify-between gap-4"
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {summary.available_balance > 0 && (
            <button onClick={() => { setShowSaqueModal(true); setSaqueError(''); setSaqueAmount(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
              <Send className="w-3.5 h-3.5" /> Solicitar Saque
            </button>
          )}
          <button onClick={() => setShowPixModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-cyber">
            <Edit2 className="w-3.5 h-3.5" />
            {pixInfo.pix_key ? 'Editar PIX' : 'Cadastrar PIX'}
          </button>
        </div>
      </div>

      {saqueSuccess && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium animate-fade-up flex items-center gap-2"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {saqueSuccess}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'A Receber',             value: fmtBRL(summary.pending_value),    sub: `${summary.pending_count} proposta${summary.pending_count !== 1 ? 's' : ''}`, icon: Clock,            color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
          { label: 'Empresa Liberou',        value: fmtBRL(summary.paid_value),       sub: `${summary.paid_count} comissão${summary.paid_count !== 1 ? 'ões' : ''} paga${summary.paid_count !== 1 ? 's' : ''}`, icon: CheckCircle, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
          { label: 'Disponível p/ Saque',   value: fmtBRL(summary.available_balance), sub: 'saldo disponível',                                                          icon: ArrowDownToLine,  color: '#14B8A6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)'  },
          { label: 'Total Acumulado',        value: fmtBRL(summary.pending_value + summary.paid_value), sub: 'comissões totais',                                         icon: DollarSign,       color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
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

      {/* Filtro */}
      <div className="flex gap-3 mb-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Proposta', 'Nome do Cliente', 'CPF', 'Banco / Tabela', 'Valor', 'Comissão', 'Status Comissão'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>
                      Nenhuma comissão encontrada
                    </td>
                  </tr>
                ) : paginated.map(p => (
                  <tr key={p.id} className="table-row-cyber">
                    <td className="px-4 py-3 font-mono text-xs num" style={{ color: 'var(--text-2)' }}>{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.client_name}</p>
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
                      <span className={`${STATUS_BADGE[p.status_comissao || ''] || 'badge badge-neutral'} inline-flex items-center gap-1`}>
                        {p.status_comissao === 'Ag. Comissão' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {p.status_comissao}
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

      {/* Histórico de solicitações de saque */}
      {saques.length > 0 && (
        <div className="mt-8 animate-fade-up">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Solicitações de Saque</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Data', 'Valor', 'Status', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saques.map(s => {
                  const sc = SAQUE_STATUS_COLOR[s.status] || SAQUE_STATUS_COLOR['Pendente'];
                  return (
                    <tr key={s.id} className="table-row-cyber">
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
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
      )}

      {showPixModal && (
        <PixModal current={pixInfo} onClose={() => setShowPixModal(false)} onSave={savePix} />
      )}

      {/* Modal solicitar saque */}
      {showSaqueModal && (
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
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Valor desejado (R$)</label>
              <input value={saqueAmount} onChange={e => setSaqueAmount(e.target.value)} placeholder="0,00"
                type="number" step="0.01" max={summary.available_balance}
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
