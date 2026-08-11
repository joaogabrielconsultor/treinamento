import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit2, Save, Building2, RefreshCw, Users, DollarSign,
  AlertTriangle, MessageCircle, ExternalLink, Calendar, Layers,
} from 'lucide-react';
import { Modal, btnCancel, btnPrimary } from '../ui/Modal';
import { confirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

const token = () => localStorage.getItem('token') ?? '';
const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts?.headers ?? {}) } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const MODULES = ['Propostas', 'Simulador', 'Produção', 'Conta Corrente', 'Ranking', 'Treinamentos', 'Consulta de Margem', 'Login Bancos', 'Roteiros', 'Importação CRM'];

const STATUS: Record<string, { label: string; badge: string }> = {
  ativo:        { label: 'Ativo',        badge: 'badge-green' },
  inadimplente: { label: 'Inadimplente', badge: 'badge-red' },
  suspenso:     { label: 'Suspenso',     badge: 'badge-neutral' },
  teste:        { label: 'Em teste',     badge: 'badge-blue' },
  cancelado:    { label: 'Cancelado',    badge: 'badge-neutral' },
};

interface Cliente {
  id: string;
  empresa: string;
  responsavel: string;
  whatsapp: string;
  email: string;
  sistema_url: string;
  plano: string;
  mensalidade: number | string;
  dia_vencimento: number | null;
  ultimo_pagamento: string | null;
  status: string;
  logins_criados: number;
  logins_limite: number | null;
  features: Record<string, boolean>;
  observacoes: string;
}

const EMPTY: Partial<Cliente> = {
  empresa: '', responsavel: '', whatsapp: '', email: '', sistema_url: '',
  plano: 'Completo', mensalidade: '', dia_vencimento: null, ultimo_pagamento: null,
  status: 'ativo', logins_criados: 0, logins_limite: null, features: {}, observacoes: '',
};

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';
const lbl = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

export function AdminClientes() {
  const toast = useToast();
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cliente>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await API('/api/admin/clientes');
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch { toast.error('Erro ao carregar clientes.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setForm({ ...EMPTY, features: {} }); setEditId(null); setShowForm(true); }
  function openEdit(c: Cliente) {
    setForm({ ...c, mensalidade: String(c.mensalidade ?? ''), ultimo_pagamento: c.ultimo_pagamento?.slice(0, 10) ?? null, features: c.features || {} });
    setEditId(c.id); setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.empresa?.trim()) { toast.warning('Informe o nome da empresa.'); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/clientes/${editId}` : '/api/admin/clientes';
      const res = await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || 'Erro ao salvar.'); setSaving(false); return; }
      setShowForm(false);
      toast.success(editId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      await load();
    } catch { toast.error('Erro ao salvar cliente.'); }
    setSaving(false);
  }

  async function del(c: Cliente) {
    if (!(await confirmDialog({ title: 'Excluir cliente?', message: `Remover "${c.empresa}" do painel? Esta ação não pode ser desfeita.`, variant: 'danger', confirmText: 'Excluir' }))) return;
    await API(`/api/admin/clientes/${c.id}`, { method: 'DELETE' });
    toast.success('Cliente removido.');
    await load();
  }

  const filtered = items.filter(c =>
    (!statusFilter || c.status === statusFilter) &&
    (!filter || c.empresa.toLowerCase().includes(filter.toLowerCase()) || (c.responsavel || '').toLowerCase().includes(filter.toLowerCase())),
  );

  const ativos = items.filter(c => c.status === 'ativo').length;
  const inadimplentes = items.filter(c => c.status === 'inadimplente').length;
  const mrr = items.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.mensalidade || 0), 0);

  const waLink = (n: string) => `https://wa.me/${(n || '').replace(/\D/g, '')}`;
  const feats = (f: Record<string, boolean>) => Object.values(f || {}).filter(Boolean).length;

  const stats = [
    { label: 'Clientes', value: String(items.length), icon: Building2, color: '#C6FF00' },
    { label: 'Ativos', value: String(ativos), icon: Users, color: '#22c55e' },
    { label: 'Inadimplentes', value: String(inadimplentes), icon: AlertTriangle, color: '#f87171' },
    { label: 'Receita mensal', value: fmtBRL(mrr), icon: DollarSign, color: '#facc15' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Clientes & Assinaturas</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Painel do dono — gerencie quem assina o GS CRED</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber">
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="stat-card rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                <p className="text-xl font-black num" style={{ color: 'var(--text-1)' }}>{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar empresa ou responsável..." className={`${inp} max-w-xs`} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-cyber px-3 py-2.5 text-sm rounded-xl">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="mb-4" style={{ color: 'var(--text-3)' }}>Nenhum cliente cadastrado</p>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm btn-cyber"><Plus className="w-4 h-4" /> Cadastrar primeiro cliente</button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(c => {
            const st = STATUS[c.status] || STATUS.ativo;
            return (
              <div key={c.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[15px] truncate" style={{ color: 'var(--text-1)' }}>{c.empresa}</h3>
                      <span className={`badge ${st.badge}`}>{st.label}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{c.responsavel || 'sem responsável'} · {c.plano}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.whatsapp && (
                      <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" title="Suporte no WhatsApp"
                        className="p-1.5 rounded-lg" style={{ color: '#25D366', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)' }}>
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg btn-ghost"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(c)} className="p-1.5 rounded-lg btn-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Info icon={DollarSign} label="Mensalidade" value={`${fmtBRL(Number(c.mensalidade))}${c.dia_vencimento ? ` · vence dia ${c.dia_vencimento}` : ''}`} />
                  <Info icon={Calendar} label="Último pagamento" value={c.ultimo_pagamento ? new Date(c.ultimo_pagamento).toLocaleDateString('pt-BR') : '—'} />
                  <Info icon={Users} label="Logins criados" value={`${c.logins_criados || 0}${c.logins_limite ? ` / ${c.logins_limite}` : ''}`} />
                  <Info icon={Layers} label="Módulos liberados" value={`${feats(c.features)} de ${MODULES.length}`} />
                </div>

                {c.sistema_url && (
                  <a href={c.sistema_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs mt-3 font-medium" style={{ color: '#C6FF00' }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir sistema do cliente
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'} size="lg"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="form-cliente" disabled={saving} className={btnPrimary}>
              <Save className="w-4 h-4 inline mr-1" />{saving ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        }>
        <form id="form-cliente" onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Empresa *</label>
              <input value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className={inp} required autoFocus placeholder="Ex: Consignados Silva LTDA" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Responsável</label>
              <input value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} className={inp} placeholder="Nome do contato" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>WhatsApp (suporte)</label>
              <input value={form.whatsapp || ''} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inp} placeholder="Ex: 5591912345678" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>E-mail</label>
              <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="contato@empresa.com" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>URL do sistema</label>
              <input value={form.sistema_url || ''} onChange={e => setForm(f => ({ ...f, sistema_url: e.target.value }))} className={inp} placeholder="https://cliente.onrender.com" />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Plano</label>
              <input value={form.plano || ''} onChange={e => setForm(f => ({ ...f, plano: e.target.value }))} className={inp} placeholder="Completo" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Status</label>
              <select value={form.status || 'ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Mensalidade (R$)</label>
              <input type="number" step="0.01" value={form.mensalidade as string || ''} onChange={e => setForm(f => ({ ...f, mensalidade: e.target.value }))} className={inp} placeholder="399" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Dia vencimento</label>
              <input type="number" min="1" max="31" value={form.dia_vencimento ?? ''} onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value ? parseInt(e.target.value) : null }))} className={inp} placeholder="10" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Último pagamento</label>
              <input type="date" value={form.ultimo_pagamento ?? ''} onChange={e => setForm(f => ({ ...f, ultimo_pagamento: e.target.value || null }))} className={inp} />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Logins criados</label>
              <input type="number" min="0" value={form.logins_criados ?? 0} onChange={e => setForm(f => ({ ...f, logins_criados: parseInt(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-3)' }}>Limite de logins</label>
              <input type="number" min="0" value={form.logins_limite ?? ''} onChange={e => setForm(f => ({ ...f, logins_limite: e.target.value ? parseInt(e.target.value) : null }))} className={inp} placeholder="sem limite" />
            </div>
          </div>

          <div>
            <label className={lbl} style={{ color: 'var(--text-3)' }}>Módulos liberados</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODULES.map(m => {
                const on = !!form.features?.[m];
                return (
                  <button type="button" key={m}
                    onClick={() => setForm(f => ({ ...f, features: { ...(f.features || {}), [m]: !on } }))}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all"
                    style={{ background: on ? 'rgba(198,255,0,0.1)' : 'var(--surface-subtle)', border: `1px solid ${on ? 'rgba(198,255,0,0.35)' : 'var(--border-1)'}`, color: on ? '#C6FF00' : 'var(--text-3)' }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ border: `1px solid ${on ? '#C6FF00' : 'var(--border-2)'}`, background: on ? '#C6FF00' : 'transparent', color: '#0A0A0A', fontSize: 10, fontWeight: 700 }}>{on ? '✓' : ''}</span>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={lbl} style={{ color: 'var(--text-3)' }}>Observações / suporte</label>
            <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={`${inp} min-h-[80px] resize-y`} placeholder="Histórico de atendimento, combinados, pendências..." />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</p>
        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
      </div>
    </div>
  );
}
