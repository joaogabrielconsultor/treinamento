import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Users, Headphones, CreditCard, LogOut, ArrowLeft, ShieldCheck,
  Mail, Lock, Eye, EyeOff, ArrowRight, Building2, DollarSign, AlertTriangle,
  MessageCircle, ExternalLink, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/useAdmin';
import { AdminClientes } from '../admin/AdminClientes';

/* ═══════════════════════════════════════════════════════════════
   PORTAL ADMINISTRATIVO — GS CRED (rota /admin, login próprio)
   Separado do app: só o dono (master) entra. CRM de assinantes.
═══════════════════════════════════════════════════════════════ */

const MONO = "'Space Mono', ui-monospace, monospace";
const ANTON = "'Anton', Impact, sans-serif";

type Section = 'overview' | 'clientes' | 'suporte' | 'assinaturas' | 'financeiro';

interface Cliente {
  id: string; empresa: string; responsavel: string; whatsapp: string; email: string;
  sistema_url: string; plano: string; mensalidade: number | string; dia_vencimento: number | null;
  ultimo_pagamento: string | null; status: string; logins_criados: number; logins_limite: number | null;
  features: Record<string, boolean>; observacoes: string;
}

const token = () => localStorage.getItem('token') ?? '';
const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_BADGE: Record<string, string> = {
  ativo: 'badge-green', inadimplente: 'badge-red', suspenso: 'badge-neutral', teste: 'badge-blue', cancelado: 'badge-neutral',
};
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', inadimplente: 'Inadimplente', suspenso: 'Suspenso', teste: 'Em teste', cancelado: 'Cancelado',
};

function useClientes() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/clientes', { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

export function AdminPortal() {
  const { user, loading, signIn, signOut } = useAuth();
  const { isMaster } = useIsAdmin(user);
  const [section, setSection] = useState<Section>('overview');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <div className="spinner-cyber" />
      </div>
    );
  }

  if (!user || !isMaster) {
    return <AdminLogin signIn={signIn} signOut={signOut} loggedNotMaster={!!user && !isMaster} email={user?.email} />;
  }

  return <AdminShell section={section} setSection={setSection} onSignOut={signOut} adminName={user.full_name || user.email} />;
}

/* ── Login próprio do painel ── */
function AdminLogin({ signIn, signOut, loggedNotMaster, email }: {
  signIn: (e: string, p: string) => Promise<void>; signOut: () => void; loggedNotMaster: boolean; email?: string;
}) {
  const [mail, setMail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await signIn(mail, pass); } catch (err) { setError(err instanceof Error ? err.message : 'Credenciais inválidas'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0A0A0A, #000 60%)' }}>
      <div className="w-full max-w-sm" style={{ animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{ fontFamily: MONO, letterSpacing: '0.12em', background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.3)', color: '#C6FF00' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> PAINEL ADMINISTRATIVO
          </span>
          <h1 className="mt-4" style={{ fontFamily: ANTON, fontSize: 30, letterSpacing: '0.02em', color: '#F4F4F4', textTransform: 'uppercase' }}>GS CRED</h1>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
          <h2 className="text-lg font-bold" style={{ color: '#F4F4F4' }}>Acesso restrito</h2>
          <p className="text-sm mt-1 mb-5" style={{ color: '#8A8A8A' }}>Área de administração do GS CRED. Entre com uma conta de administrador.</p>

          {loggedNotMaster ? (
            <div className="text-center">
              <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                A conta <strong>{email}</strong> não tem acesso ao painel administrativo.
              </div>
              <button onClick={signOut} className="btn-cyber w-full py-3 rounded-xl text-sm">Entrar com outra conta</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A8A8A', fontFamily: MONO }}>E-mail de administrador</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7C7C7C' }} />
                  <input type="email" value={mail} onChange={e => setMail(e.target.value)} required placeholder="admin@empresa.com" className="input-cyber w-full pl-10 pr-4 py-2.5 text-sm rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A8A8A', fontFamily: MONO }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7C7C7C' }} />
                  <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} required minLength={6} placeholder="••••••••" className="input-cyber w-full pl-10 pr-11 py-2.5 text-sm rounded-xl" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#7C7C7C' }}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>{error}</div>}
              <button type="submit" disabled={loading} className="btn-cyber w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                {loading ? 'Entrando...' : <>Entrar no painel <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#555' }}>
          Não é administrador? <a href="/" style={{ color: '#C6FF00' }}>Voltar ao app</a>
        </p>
      </div>
    </div>
  );
}

/* ── Shell (sidebar + conteúdo) ── */
const NAV: { key: Section; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'suporte', label: 'Suporte', icon: Headphones },
  { key: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
];

function AdminShell({ section, setSection, onSignOut, adminName }: {
  section: Section; setSection: (s: Section) => void; onSignOut: () => void; adminName: string;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: '#050505' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col h-screen sticky top-0 flex-shrink-0" style={{ background: 'linear-gradient(180deg,#0A0A0A,#000)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontFamily: ANTON, fontSize: 20, color: '#C6FF00', letterSpacing: '0.03em' }}>GS CRED</span>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ fontFamily: MONO, letterSpacing: '0.1em', background: 'rgba(198,255,0,0.12)', border: '1px solid rgba(198,255,0,0.3)', color: '#C6FF00' }}>PAINEL</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO, color: '#555' }}>Gestão</p>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button key={key} onClick={() => setSection(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={active ? { background: 'rgba(198,255,0,0.1)', color: '#C6FF00', border: '1px solid rgba(198,255,0,0.25)' } : { color: '#8A8A8A' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <Icon className="w-[17px] h-[17px]" /> {label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium" style={{ color: '#8A8A8A' }}>
            <ArrowLeft className="w-4 h-4" /> Voltar ao app
          </a>
          <button onClick={onSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium" style={{ color: '#8A8A8A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8A8A8A'; }}>
            <LogOut className="w-4 h-4" /> Sair do painel
          </button>
          <p className="px-3 pt-2 text-[10px] truncate" style={{ color: '#555', fontFamily: MONO }}>{adminName}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        {section === 'clientes' ? <AdminClientes /> : section === 'overview' ? <Overview setSection={setSection} /> : section === 'suporte' ? <Suporte /> : section === 'financeiro' ? <Financeiro /> : <Assinaturas />}
      </main>
    </div>
  );
}

/* ── Visão Geral ── */
function Overview({ setSection }: { setSection: (s: Section) => void }) {
  const { items, loading, reload } = useClientes();
  const ativos = items.filter(c => c.status === 'ativo').length;
  const inadimplentes = items.filter(c => c.status === 'inadimplente');
  const mrr = items.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.mensalidade || 0), 0);
  const stats = [
    { label: 'Clientes', value: String(items.length), icon: Building2, color: '#C6FF00' },
    { label: 'Ativos', value: String(ativos), icon: Users, color: '#22c55e' },
    { label: 'Inadimplentes', value: String(inadimplentes.length), icon: AlertTriangle, color: '#f87171' },
    { label: 'Receita mensal', value: fmtBRL(mrr), icon: DollarSign, color: '#facc15' },
  ];
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <SectionHead title="Visão Geral" subtitle="Resumo dos seus assinantes" onReload={reload} />
      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="stat-card rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                    <p className="text-2xl font-black num" style={{ color: 'var(--text-1)' }}>{s.value}</p></div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}><s.icon className="w-5 h-5" style={{ color: s.color }} /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Precisam de atenção</h3>
              <button onClick={() => setSection('clientes')} className="text-xs font-medium" style={{ color: '#C6FF00' }}>Ver todos →</button>
            </div>
            {inadimplentes.length === 0
              ? <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>Tudo em dia — nenhum cliente inadimplente. 🎉</p>
              : <div className="space-y-2">{inadimplentes.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{c.empresa}</span>
                    <span className="num text-sm" style={{ color: '#f87171' }}>{fmtBRL(Number(c.mensalidade))}/mês</span>
                  </div>))}
                </div>}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Suporte ── */
function Suporte() {
  const { items, loading, reload } = useClientes();
  const waLink = (n: string) => `https://wa.me/${(n || '').replace(/\D/g, '')}`;
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SectionHead title="Suporte" subtitle="Contato rápido e anotações por cliente" onReload={reload} />
      {loading ? <Spinner /> : items.length === 0 ? <Empty /> : (
        <div className="space-y-3">
          {items.map(c => (
            <div key={c.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div><h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{c.empresa}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.responsavel || 'sem responsável'}{c.email ? ` · ${c.email}` : ''}</p></div>
                {c.whatsapp && <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: '#25D366', color: '#062b14' }}><MessageCircle className="w-4 h-4" /> WhatsApp</a>}
              </div>
              {c.observacoes && <p className="text-sm mt-2 rounded-xl px-3 py-2 whitespace-pre-wrap" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-2)' }}>{c.observacoes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Assinaturas ── */
function Assinaturas() {
  const { items, loading, reload } = useClientes();
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SectionHead title="Assinaturas" subtitle="Mensalidade e status de cada cliente" onReload={reload} />
      {loading ? <Spinner /> : items.length === 0 ? <Empty /> : (
        <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '640px' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {['Empresa', 'Plano', 'Mensalidade', 'Vencimento', 'Último pgto', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="table-row-cyber">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--text-1)' }}>{c.empresa}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{c.plano}</td>
                  <td className="px-4 py-3 font-bold num whitespace-nowrap" style={{ color: 'var(--text-1)' }}>{fmtBRL(Number(c.mensalidade))}</td>
                  <td className="px-4 py-3 num whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{c.dia_vencimento ? `dia ${c.dia_vencimento}` : '—'}</td>
                  <td className="px-4 py-3 num whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{c.ultimo_pagamento ? new Date(c.ultimo_pagamento).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className={`badge ${STATUS_BADGE[c.status] || 'badge-neutral'}`}>{STATUS_LABEL[c.status] || c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Financeiro (webhook Cakto) ── */
interface Pagamento {
  id: string; evento: string; status: string; cliente_nome: string; cliente_email: string;
  produto: string; valor: number | string; metodo: string; created_at: string;
}
function Financeiro() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savingCfg, setSavingCfg] = useState(false);
  const [savedCfg, setSavedCfg] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const webhookUrl = `${window.location.origin}/api/webhooks/cakto`;

  const loadPagamentos = useCallback(async () => {
    const p = await fetch('/api/admin/pagamentos', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());
    setPagamentos(Array.isArray(p) ? p : []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await fetch('/api/admin/cakto-config', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());
      setSecret(c?.secret || ''); setClientId(c?.client_id || ''); setClientSecret(c?.client_secret || '');
      await loadPagamentos();
    } catch { /* ignore */ }
    setLoading(false);
  }, [loadPagamentos]);
  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await fetch('/api/admin/cakto-config', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ secret, client_id: clientId, client_secret: clientSecret }) });
      setSavedCfg(true); setTimeout(() => setSavedCfg(false), 2500);
    } catch { /* ignore */ }
    setSavingCfg(false);
  };

  const doSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await fetch('/api/admin/cakto/sync', { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
      const j = await r.json();
      if (!r.ok) { setSyncMsg(j.error || 'Erro na sincronização.'); }
      else { setSyncMsg(`Sincronizado: ${j.imported} pagamento(s), ${j.novosClientes} cliente(s) novo(s).`); await loadPagamentos(); }
    } catch { setSyncMsg('Erro de conexão com a Cakto.'); }
    setSyncing(false);
  };

  const copyUrl = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const total = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const cfgLabel = 'block text-[11px] font-bold uppercase tracking-wider mb-1.5';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SectionHead title="Financeiro" subtitle="Conexão com a Cakto e pagamentos recebidos" onReload={load} />

      {/* Opção A — API (mais fácil) */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--card-bg)', border: '1px solid rgba(198,255,0,0.25)' }}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Conectar via API da Cakto</h3>
          <span className="badge badge-green">Recomendado</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Cole as chaves de API da Cakto (em Integrações → Cakto API) e clique em sincronizar. Puxa suas vendas pagas e ativa os clientes automaticamente.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={cfgLabel} style={{ color: 'var(--text-3)', fontFamily: MONO }}>Client ID</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Cliente ID" className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" style={{ fontFamily: MONO }} />
          </div>
          <div>
            <label className={cfgLabel} style={{ color: 'var(--text-3)', fontFamily: MONO }}>Client Secret</label>
            <input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Cliente Segredo" type="password" className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" style={{ fontFamily: MONO }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={saveConfig} disabled={savingCfg} className="px-4 py-2 text-sm rounded-xl btn-ghost disabled:opacity-50">{savedCfg ? 'Salvo!' : savingCfg ? '...' : 'Salvar chaves'}</button>
          <button onClick={doSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl btn-cyber disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizando...' : 'Sincronizar com Cakto'}
          </button>
          {syncMsg && <span className="text-xs" style={{ color: syncMsg.startsWith('Sincronizado') ? '#4ade80' : '#f87171' }}>{syncMsg}</span>}
        </div>
      </div>

      {/* Opção B — Webhook (tempo real) */}
      <details className="rounded-2xl p-5 mb-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <summary className="text-sm font-bold cursor-pointer" style={{ color: 'var(--text-1)' }}>Webhook (tempo real) — opcional</summary>
        <p className="text-xs mt-2 mb-4" style={{ color: 'var(--text-3)' }}>Ativa o cliente no instante do pagamento. Na Cakto (Webhooks), cadastre a URL abaixo e cole o mesmo segredo aqui.</p>
        <label className={cfgLabel} style={{ color: 'var(--text-3)', fontFamily: MONO }}>URL do webhook</label>
        <div className="flex gap-2 mb-3">
          <input readOnly value={webhookUrl} className="input-cyber flex-1 px-3 py-2.5 text-sm rounded-xl" style={{ fontFamily: MONO }} />
          <button onClick={copyUrl} className="px-4 py-2 text-sm rounded-xl btn-ghost">{copied ? 'Copiado!' : 'Copiar'}</button>
        </div>
        <label className={cfgLabel} style={{ color: 'var(--text-3)', fontFamily: MONO }}>Segredo do webhook</label>
        <div className="flex gap-2">
          <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="secret do webhook" className="input-cyber flex-1 px-3 py-2.5 text-sm rounded-xl" style={{ fontFamily: MONO }} />
          <button onClick={saveConfig} disabled={savingCfg} className="px-4 py-2 text-sm rounded-xl btn-ghost disabled:opacity-50">{savedCfg ? 'Salvo!' : 'Salvar'}</button>
        </div>
      </details>

      {/* Financeiro real */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Financeiro real <span className="badge badge-green ml-1">AO VIVO</span></h3>
        {pagamentos.length > 0 && <span className="text-sm num font-bold" style={{ color: '#4ade80' }}>{fmtBRL(total)} recebidos</span>}
      </div>

      {loading ? <Spinner /> : pagamentos.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-2)' }}>Nenhum pagamento registrado ainda</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Assim que a primeira compra cair pelo webhook da Cakto, aparece aqui.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '680px' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {['Data', 'Cliente', 'Produto', 'Valor', 'Evento'].map(h => <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pagamentos.map(p => (
                <tr key={p.id} className="table-row-cyber">
                  <td className="px-4 py-3 num whitespace-nowrap" style={{ color: 'var(--text-2)', fontSize: '12px' }}>{new Date(p.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><p className="font-semibold" style={{ color: 'var(--text-1)' }}>{p.cliente_nome || '—'}</p><p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.cliente_email}</p></td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{p.produto || '—'}</td>
                  <td className="px-4 py-3 font-bold num whitespace-nowrap" style={{ color: '#4ade80' }}>{fmtBRL(Number(p.valor))}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="badge badge-neutral">{p.evento || p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionHead({ title, subtitle, onReload }: { title: string; subtitle: string; onReload: () => void }) {
  return (
    <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: '#C6FF00' }}>// PAINEL</div>
        <h1 className="mt-1" style={{ fontFamily: ANTON, fontSize: 30, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-1)' }}>{title}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
      </div>
      <button onClick={onReload} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost"><RefreshCw className="w-3.5 h-3.5" /> Atualizar</button>
    </div>
  );
}
function Spinner() { return <div className="flex justify-center py-20"><div className="spinner-cyber" /></div>; }
function Empty() {
  return (
    <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
      <p style={{ color: 'var(--text-3)' }}>Nenhum cliente cadastrado ainda</p>
    </div>
  );
}
