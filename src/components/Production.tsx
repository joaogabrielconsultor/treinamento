import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, CheckCircle, BarChart2, Award,
  Target, Zap, Bell, BellOff, X, ChevronDown,
  Users, Building2, Percent, Activity, Clock,
  Handshake, Package, Table2, UserCog, Star
} from 'lucide-react';
import { Badge, UserStreak, MonthlyGoal, Notification } from '../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const fmtR = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`;

function todayStr() { return new Date().toISOString().split('T')[0]; }
function addDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }

type Tab = 'overview' | 'dimensions' | 'brokers' | 'commissions' | 'gamification';
type DimKey = 'bank' | 'convenio' | 'product' | 'table' | 'tipo' | 'usuario_banco';
type SortKey = 'value' | 'count' | 'ticket' | 'commission';

interface PropRow {
  id: string; value: number; status: string;
  bank?: string; convenio?: string; product?: string;
  table_name?: string; tipo_proposta?: string;
  user_name?: string; user_email?: string;
  client_name?: string; created_at?: string;
  comissao_valor?: number; comissao_empresa_valor?: number;
  status_comissao?: string; points_earned?: number;
  usuario_banco_nome?: string;
}

interface AggItem { label: string; value: number; count: number; commission: number; ticket: number; }
interface FilterUser { id: string; full_name: string | null; email: string; }

function agg(rows: PropRow[], keyFn: (p: PropRow) => string): AggItem[] {
  const m = new Map<string, AggItem>();
  for (const p of rows) {
    const key = keyFn(p) || '—';
    const cur = m.get(key) || { label: key, value: 0, count: 0, commission: 0, ticket: 0 };
    cur.value += Number(p.value || 0);
    cur.count += 1;
    cur.commission += Number(p.comissao_valor || 0);
    m.set(key, cur);
  }
  return Array.from(m.values())
    .map(i => ({ ...i, ticket: i.count > 0 ? i.value / i.count : 0 }))
    .sort((a, b) => b.value - a.value);
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, color, delay = 0 }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; delay?: number }) {
  return (
    <div className="stat-card rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>{label}</p>
          <p className="text-xl font-black num" style={{ color: 'var(--text-1)' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function AggBar({ item, maxVal, color, metric }: { item: AggItem; maxVal: number; color: string; metric: SortKey }) {
  const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
  const display = metric === 'count' ? `${item.count} props` : metric === 'ticket' ? fmtR(item.ticket) : metric === 'commission' ? fmtR(item.commission) : fmtR(item.value);
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium truncate max-w-[55%]" style={{ color: 'var(--text-2)' }}>{item.label}</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{item.count} · {fmtR(item.ticket)}/prop</span>
          <span className="font-bold num" style={{ color }}>{display}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const STATUS_CFG = [
  { key: 'Digitada',   label: 'Digitada',   color: '#60a5fa', cls: 'progress-bar-blue'   },
  { key: 'Em análise', label: 'Em Análise', color: '#f59e0b', cls: 'progress-bar-amber'  },
  { key: 'Aprovada',   label: 'Aprovada',   color: '#a78bfa', cls: 'progress-bar-purple' },
  { key: 'Paga',       label: 'Paga',       color: '#22c55e', cls: 'progress-bar-green'  },
  { key: 'Cancelada',  label: 'Cancelada',  color: '#f87171', cls: 'progress-bar-red'    },
] as const;

export function Production({ isAdmin }: { isAdmin: boolean }) {
  const [proposals, setProposals] = useState<PropRow[]>([]);
  const [stats, setStats]         = useState<any>(null);
  const [ranking, setRanking]     = useState<any[]>([]);
  const [badges, setBadges]       = useState<Badge[]>([]);
  const [streak, setStreak]       = useState<UserStreak | null>(null);
  const [goal, setGoal]           = useState<MonthlyGoal | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNotif, setShowNotif] = useState(false);

  const [tab, setTab]         = useState<Tab>('overview');
  const [dim, setDim]         = useState<DimKey>('bank');
  const [dimSort, setDimSort] = useState<SortKey>('value');

  const [period, setPeriod]       = useState('month');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [filterCorretor, setFilterCorretor] = useState('');
  const [corretores, setCorretores] = useState<FilterUser[]>([]);

  function getPeriodDates() {
    if (dateFrom || dateTo) return { start_date: dateFrom, end_date: dateTo };
    const t = todayStr();
    if (period === 'today') return { start_date: t, end_date: t };
    if (period === 'week')  return { start_date: addDays(-7), end_date: t };
    if (period === 'month') return { start_date: monthStart(), end_date: t };
    return {};
  }

  async function loadData() {
    setLoading(true);
    const dates = getPeriodDates();
    const pp = new URLSearchParams();
    if (dates.start_date) pp.set('start_date', dates.start_date);
    if (dates.end_date)   pp.set('end_date', dates.end_date);
    if (isAdmin && filterCorretor) pp.set('user_id', filterCorretor);

    const dp = new URLSearchParams({ period });
    if (dateFrom) dp.set('date_from', dateFrom);
    if (dateTo)   dp.set('date_to', dateTo);
    if (isAdmin && filterCorretor) dp.set('corretor_id', filterCorretor);

    const reqs: Promise<any>[] = [
      API(`/api/proposals?${pp}`).then(r => r.json()),
      API(`/api/production/dashboard?${dp}`).then(r => r.json()),
      API('/api/badges').then(r => r.json()),
      API('/api/notifications').then(r => r.json()),
      API('/api/ranking').then(r => r.json()),
    ];
    if (!isAdmin) {
      reqs.push(API('/api/streak').then(r => r.json()));
      reqs.push(API('/api/goals').then(r => r.json()));
    }
    const [props, st, bg, notifs, rank, sk, gl] = await Promise.all(reqs);
    setProposals(Array.isArray(props) ? props : []);
    setStats(st || null);
    setBadges(Array.isArray(bg) ? bg : []);
    setNotifications(Array.isArray(notifs) ? notifs : []);
    setRanking(Array.isArray(rank) ? rank : []);
    if (sk) setStreak(sk);
    if (gl) setGoal(gl);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) {
      API('/api/admin/users').then(r => r.json()).then(d => { if (Array.isArray(d)) setCorretores(d); });
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [period, dateFrom, dateTo, filterCorretor]);

  async function markAllRead() {
    await API('/api/notifications/read-all', { method: 'PUT' });
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  }

  const unread = notifications.filter(n => !n.read).length;

  // ── Aggregations ──
  const paid    = useMemo(() => proposals.filter(p => p.status === 'Paga'), [proposals]);
  const aggBank = useMemo(() => agg(paid, p => p.bank || '—'), [paid]);
  const aggConv = useMemo(() => agg(paid, p => p.convenio || '—'), [paid]);
  const aggProd = useMemo(() => agg(paid, p => p.product || 'Sem produto'), [paid]);
  const aggTab  = useMemo(() => agg(paid, p => p.table_name || 'Sem tabela'), [paid]);
  const aggTipo = useMemo(() => agg(paid, p => p.tipo_proposta || 'Sem tipo'), [paid]);
  const aggUB   = useMemo(() => agg(paid, p => p.usuario_banco_nome || 'Sem usuário banco'), [paid]);
  const aggBrok = useMemo(() => agg(paid, p => p.user_name || p.user_email || '—'), [paid]);

  const dimData = useMemo(() => {
    const base = dim === 'bank' ? aggBank : dim === 'convenio' ? aggConv : dim === 'product' ? aggProd : dim === 'table' ? aggTab : dim === 'tipo' ? aggTipo : aggUB;
    return [...base].sort((a, b) => {
      if (dimSort === 'count')      return b.count - a.count;
      if (dimSort === 'ticket')     return b.ticket - a.ticket;
      if (dimSort === 'commission') return b.commission - a.commission;
      return b.value - a.value;
    }).slice(0, 15);
  }, [dim, dimSort, aggBank, aggConv, aggProd, aggTab, aggTipo, aggUB]);

  const totalPaid  = useMemo(() => paid.reduce((s, p) => s + Number(p.value || 0), 0), [paid]);
  const totalAll   = proposals.length;
  const approvalPct = totalAll > 0 ? (paid.length / totalAll) * 100 : 0;

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayProps = proposals.filter(p => (p.created_at || '').startsWith(ds));
      const dayPaid  = dayProps.filter(p => p.status === 'Paga');
      days.push({
        ds, label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        total: dayProps.length, paid: dayPaid.length,
        value: dayPaid.reduce((s, p) => s + Number(p.value || 0), 0),
      });
    }
    return days;
  }, [proposals]);
  const maxDay = Math.max(...last7.map(d => d.value), 1);

  const comm = useMemo(() => ({
    corrTotal:  paid.reduce((s, p) => s + Number(p.comissao_valor || 0), 0),
    empTotal:   paid.reduce((s, p) => s + Number(p.comissao_empresa_valor || 0), 0),
    corrPago:   paid.filter(p => p.status_comissao === 'Comissão Paga').reduce((s, p) => s + Number(p.comissao_valor || 0), 0),
    corrPend:   paid.filter(p => p.status_comissao !== 'Comissão Paga').reduce((s, p) => s + Number(p.comissao_valor || 0), 0),
    cntPago:    paid.filter(p => p.status_comissao === 'Comissão Paga').length,
    cntPend:    paid.filter(p => p.status_comissao !== 'Comissão Paga').length,
  }), [paid]);

  const tabs = [
    { id: 'overview' as Tab,     label: 'Visão Geral' },
    { id: 'dimensions' as Tab,   label: 'Dimensões' },
    ...(isAdmin ? [{ id: 'brokers' as Tab, label: 'Corretores' }] : []),
    { id: 'commissions' as Tab,  label: 'Comissões' },
    { id: 'gamification' as Tab, label: isAdmin ? 'Conquistas' : 'Metas' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><div className="spinner-cyber mx-auto mb-4" /><p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando análises...</p></div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="live-dot" />
            <span className="text-xs font-medium" style={{ color: '#14B8A6' }}>Análise em tempo real</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Análise de Produção</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{isAdmin ? 'Visão completa da equipe' : 'Sua performance detalhada'}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)} className="relative p-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: unread > 0 ? '#14B8A6' : '#475569' }}>
            {unread > 0 ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#14B8A6,#06B6D4)' }}>{unread}</span>}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 rounded-2xl z-50 overflow-hidden" style={{ background: 'rgba(8,13,24,0.97)', border: '1px solid var(--border-1)', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Notificações</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && <button onClick={markAllRead} className="text-xs" style={{ color: '#14B8A6' }}>Marcar lidas</button>}
                  <button onClick={() => setShowNotif(false)}><X className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} /></button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma notificação</p>
                  : notifications.map(n => (
                    <div key={n.id} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: !n.read ? 'rgba(20,184,166,0.04)' : 'transparent' }}>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ background: '#14B8A6' }} />}
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 animate-fade-up" style={{ animationDelay: '40ms' }}>
        {(['today', 'week', 'month', 'all'] as const).map(p => (
          <button key={p} onClick={() => { setPeriod(p); setDateFrom(''); setDateTo(''); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === p && !dateFrom && !dateTo ? 'btn-cyber' : 'btn-ghost'}`}>
            {p === 'today' ? 'Hoje' : p === 'week' ? 'Esta Semana' : p === 'month' ? 'Este Mês' : 'Todo Período'}
          </button>
        ))}
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriod(''); }} className="input-cyber px-3 py-1.5 text-xs rounded-xl" title="De" />
        <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value); setPeriod(''); }}   className="input-cyber px-3 py-1.5 text-xs rounded-xl" title="Até" />
        {isAdmin && (
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <select value={filterCorretor} onChange={e => setFilterCorretor(e.target.value)}
              className="input-cyber appearance-none pl-3 pr-8 py-1.5 text-xs rounded-xl" style={{ minWidth: '160px' }}>
              <option value="">Todos os corretores</option>
              {corretores.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl animate-fade-up" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content', animationDelay: '60ms' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === t.id ? { background: 'linear-gradient(135deg,#14B8A6,#06B6D4)', color: '#fff', boxShadow: '0 2px 10px rgba(20,184,166,0.35)' } : { color: 'var(--text-3)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-5'} gap-4`}>
            <KPI label="Produção Total" value={fmtR(totalPaid)} sub={`${paid.length} propostas pagas`} icon={DollarSign} color="#22c55e" delay={0} />
            <KPI label="Hoje" value={fmtR(stats?.today?.value || 0)} sub={`${stats?.today?.count || 0} pagas`} icon={Activity} color="#14B8A6" delay={60} />
            <KPI label="Ticket Médio" value={fmtR(paid.length > 0 ? totalPaid / paid.length : 0)} sub="por proposta paga" icon={BarChart2} color="#a78bfa" delay={120} />
            <KPI label="Taxa de Conversão" value={fmtPct(approvalPct)} sub={`${paid.length}/${totalAll} propostas`} icon={TrendingUp} color="#f59e0b" delay={180} />
            {isAdmin
              ? <KPI label="Comissão Gerada" value={fmtR(comm.corrTotal)} sub="total corretores" icon={Percent} color="#60a5fa" delay={240} />
              : <KPI label="Minha Comissão" value={fmtR(stats?.my_commission_total || 0)} sub={`#${stats?.my_position || '—'} no ranking`} icon={Star} color="#60a5fa" delay={240} />
            }
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Funnel */}
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Funil de Propostas</h3>
              <div className="space-y-3.5">
                {STATUS_CFG.map(s => {
                  const count = proposals.filter(p => p.status === s.key).length;
                  const pct   = totalAll > 0 ? (count / totalAll) * 100 : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                        </div>
                        <span className="num font-semibold" style={{ color: 'var(--text-2)' }}>
                          {count} <span style={{ color: 'var(--text-3)' }}>({fmtPct(pct)})</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className={`h-2 rounded-full transition-all duration-700 ${s.cls}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 flex justify-between text-xs" style={{ borderTop: '1px solid var(--card-border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Total no período</span>
                <span className="font-bold num" style={{ color: 'var(--text-1)' }}>{totalAll}</span>
              </div>
            </Card>

            {/* 7-day chart */}
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Últimos 7 Dias</h3>
              <div className="flex items-end gap-1.5 mb-2" style={{ height: '100px' }}>
                {last7.map(d => {
                  const h = d.value > 0 ? (d.value / maxDay) * 100 : 0;
                  return (
                    <div key={d.ds} className="flex-1 flex flex-col items-center gap-1" title={`${d.label}: ${fmtR(d.value)} (${d.paid} pagas)`}>
                      <span className="text-[9px] font-bold num" style={{ color: d.paid > 0 ? '#4ade80' : 'transparent' }}>{d.paid || ''}</span>
                      <div className="w-full flex flex-col justify-end rounded-t-lg" style={{ height: '80px', background: 'rgba(255,255,255,0.04)' }}>
                        {h > 0 && <div className="w-full rounded-t-lg" style={{ height: `${h}%`, background: 'linear-gradient(to top, #14B8A6, #22c55e)', minHeight: '4px' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mb-4">
                {last7.map(d => <div key={d.ds} className="flex-1 text-center"><p className="text-[9px] truncate" style={{ color: 'var(--text-3)' }}>{d.label}</p></div>)}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                {[
                  { label: 'Volume 7d', value: fmtR(last7.reduce((s, d) => s + d.value, 0)), color: '#4ade80' },
                  { label: 'Pagas 7d', value: String(last7.reduce((s, d) => s + d.paid, 0)), color: 'var(--text-1)' },
                  { label: 'Melhor dia', value: fmtR(maxDay === 1 ? 0 : maxDay), color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{label}</p>
                    <p className="text-sm font-black num" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top 3 preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Top Bancos',    data: aggBank.slice(0, 3), color: '#60a5fa' },
              { title: 'Top Convênios', data: aggConv.slice(0, 3), color: '#a78bfa' },
              { title: 'Top Produtos',  data: aggProd.slice(0, 3), color: '#14B8A6' },
            ].map(({ title, data, color }) => (
              <Card key={title}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>{title}</h3>
                {data.length === 0
                  ? <p className="text-xs" style={{ color: 'var(--text-3)' }}>Sem propostas pagas</p>
                  : data.map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${color}18`, color }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{item.label}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{item.count} props · {fmtR(item.ticket)}/prop</p>
                      </div>
                      <p className="text-xs font-bold num flex-shrink-0" style={{ color }}>{fmtR(item.value)}</p>
                    </div>
                  ))
                }
              </Card>
            ))}
          </div>

          {/* Best broker (admin) */}
          {isAdmin && stats?.best_broker && (
            <Card>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                  <Award className="w-6 h-6" style={{ color: '#fbbf24' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Melhor Corretor do Período</p>
                  <p className="text-lg font-black" style={{ color: '#fbbf24' }}>{stats.best_broker.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stats.best_broker.points} pontos</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── DIMENSÕES ── */}
      {tab === 'dimensions' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Dimension toggle */}
            <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {([
                { id: 'bank',         label: 'Banco',       Icon: Building2 },
                { id: 'convenio',     label: 'Convênio',    Icon: Handshake },
                { id: 'product',      label: 'Produto',     Icon: Package },
                { id: 'table',        label: 'Tabela',      Icon: Table2 },
                { id: 'tipo',         label: 'Tipo',        Icon: CheckCircle },
                { id: 'usuario_banco',label: 'Usr. Banco',  Icon: UserCog },
              ] as { id: DimKey; label: string; Icon: React.ElementType }[]).map(d => (
                <button key={d.id} onClick={() => setDim(d.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={dim === d.id ? { background: 'rgba(20,184,166,0.2)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' } : { color: 'var(--text-3)', border: '1px solid transparent' }}>
                  <d.Icon className="w-3.5 h-3.5" />
                  {d.label}
                </button>
              ))}
            </div>
            {/* Sort */}
            <div className="flex gap-1 ml-auto">
              {([{ id: 'value', label: 'Volume' }, { id: 'count', label: 'Qtd' }, { id: 'ticket', label: 'Ticket' }, { id: 'commission', label: 'Comissão' }] as { id: SortKey; label: string }[]).map(s => (
                <button key={s.id} onClick={() => setDimSort(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${dimSort === s.id ? 'btn-cyber' : 'btn-ghost'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Card>
            {dimData.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Sem propostas pagas no período</p>
              : (
                <>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider pb-3 mb-1" style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--card-border)' }}>
                    <span>Dimensão</span>
                    <span>{dimSort === 'value' ? 'Volume Pago' : dimSort === 'count' ? 'Qtd Props' : dimSort === 'ticket' ? 'Ticket Médio' : 'Comissão'}</span>
                  </div>
                  {dimData.map((item, i) => <AggBar key={item.label + i} item={item} maxVal={dimData[0].value} color="#14B8A6" metric={dimSort} />)}
                  <div className="mt-4 pt-4 grid grid-cols-4 gap-3 text-center" style={{ borderTop: '1px solid var(--card-border)' }}>
                    {[
                      { label: 'Registros', value: dimData.length, color: 'var(--text-1)' },
                      { label: 'Volume', value: fmtR(dimData.reduce((s, i) => s + i.value, 0)), color: '#4ade80' },
                      { label: 'Props', value: dimData.reduce((s, i) => s + i.count, 0), color: 'var(--text-1)' },
                      { label: 'Ticket Médio', value: fmtR(dimData.reduce((s, i) => s + i.count, 0) > 0 ? dimData.reduce((s, i) => s + i.value, 0) / dimData.reduce((s, i) => s + i.count, 0) : 0), color: '#a78bfa' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</p>
                        <p className="font-bold num text-sm" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </Card>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Bancos', value: aggBank.length, color: '#60a5fa' },
              { label: 'Convênios', value: aggConv.length, color: '#a78bfa' },
              { label: 'Produtos', value: aggProd.length, color: '#14B8A6' },
              { label: 'Tabelas', value: aggTab.length, color: '#f59e0b' },
              { label: 'Tipos', value: aggTipo.length, color: '#22c55e' },
              { label: 'Usr. Banco', value: aggUB.filter(u => u.label !== 'Sem usuário banco').length, color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <p className="text-2xl font-black num" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CORRETORES (admin) ── */}
      {tab === 'brokers' && isAdmin && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Corretores Ativos" value={String(aggBrok.length)} sub="com propostas pagas" icon={Users} color="#14B8A6" delay={0} />
            <KPI label="Volume Total" value={fmtR(totalPaid)} sub={`${paid.length} pagas`} icon={DollarSign} color="#22c55e" delay={60} />
            <KPI label="Ticket Médio Equipe" value={fmtR(paid.length > 0 ? totalPaid / paid.length : 0)} sub="por proposta paga" icon={BarChart2} color="#a78bfa" delay={120} />
            <KPI label="Comissão Total" value={fmtR(comm.corrTotal)} sub="a pagar corretores" icon={Percent} color="#f59e0b" delay={180} />
          </div>

          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Ranking de Corretores — Volume no Período</h3>
            {aggBrok.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Sem propostas pagas no período</p>
              : aggBrok.map((b, i) => {
                const pct = aggBrok[0].value > 0 ? (b.value / aggBrok[0].value) * 100 : 0;
                const mc  = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#475569';
                return (
                  <div key={b.label} className="py-3" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
                        style={{ background: `${mc}15`, color: mc, border: `1px solid ${mc}30` }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{b.label}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                          {b.count} pagas · {fmtR(b.ticket)}/prop · Comissão: {fmtR(b.commission)}
                        </p>
                      </div>
                      <p className="text-sm font-black num flex-shrink-0" style={{ color: '#22c55e' }}>{fmtR(b.value)}</p>
                    </div>
                    <div className="h-1.5 rounded-full ml-10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: mc }} />
                    </div>
                  </div>
                );
              })
            }
          </Card>

          {ranking.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Ranking All-Time (Pontos Acumulados)</h3>
              {ranking.slice(0, 10).map((r, i) => {
                const pct = ranking[0].total_points > 0 ? (r.total_points / ranking[0].total_points) * 100 : 0;
                return (
                  <div key={r.user_id} className="py-2.5" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: i < 3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', color: i < 3 ? '#fbbf24' : '#475569' }}>
                        {r.position}
                      </span>
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-1)' }}>{r.full_name || r.email}</span>
                      <span className="text-xs num" style={{ color: 'var(--text-3)' }}>{r.proposals_paid} pagas</span>
                      <span className="text-sm font-black num" style={{ color: '#fbbf24' }}>{r.total_points} pts</span>
                    </div>
                    <div className="h-1 rounded-full ml-9" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: '#fbbf24' }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* ── COMISSÕES ── */}
      {tab === 'commissions' && (
        <div className="space-y-5">
          <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            <KPI label="Comissão Corretores" value={fmtR(comm.corrTotal)} sub="total gerada" icon={Percent} color="#14B8A6" delay={0} />
            {isAdmin && <KPI label="Comissão Empresa" value={fmtR(comm.empTotal)} sub="total gerada" icon={Building2} color="#60a5fa" delay={60} />}
            <KPI label="Comissão Paga" value={fmtR(comm.corrPago)} sub={`${comm.cntPago} propostas`} icon={CheckCircle} color="#22c55e" delay={isAdmin ? 120 : 60} />
            <KPI label="Aguardando Pgto" value={fmtR(comm.corrPend)} sub={`${comm.cntPend} propostas`} icon={Clock} color="#f59e0b" delay={isAdmin ? 180 : 120} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Status de Pagamento</h3>
              <div className="space-y-4">
                {[
                  { label: 'Comissão Paga',         value: comm.corrPago, count: comm.cntPago, color: '#22c55e' },
                  { label: 'Aguardando Pagamento',  value: comm.corrPend, count: comm.cntPend, color: '#f59e0b' },
                ].map(s => {
                  const pct = comm.corrTotal > 0 ? (s.value / comm.corrTotal) * 100 : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                          <span style={{ color: 'var(--text-3)' }}>({s.count} props)</span>
                        </div>
                        <span className="font-bold num" style={{ color: s.color }}>{fmtR(s.value)} · {fmtPct(pct)}</span>
                      </div>
                      <div className="h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {isAdmin && comm.corrTotal + comm.empTotal > 0 && (
                <div className="mt-5 pt-4 space-y-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Empresa vs Corretor</p>
                  {[
                    { label: 'Empresa',    value: comm.empTotal,  color: '#60a5fa' },
                    { label: 'Corretores', value: comm.corrTotal, color: '#14B8A6' },
                  ].map(r => {
                    const total = comm.empTotal + comm.corrTotal;
                    const pct = total > 0 ? (r.value / total) * 100 : 0;
                    return (
                      <div key={r.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
                          <span className="font-bold num" style={{ color: r.color }}>{fmtR(r.value)} ({fmtPct(pct)})</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {isAdmin ? (
              <Card>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Comissão por Corretor</h3>
                {aggBrok.length === 0
                  ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sem dados no período</p>
                  : aggBrok.slice(0, 10).map((b, i) => {
                    const pct = comm.corrTotal > 0 ? (b.commission / comm.corrTotal) * 100 : 0;
                    return (
                      <div key={b.label} className="py-2" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="truncate max-w-[60%]" style={{ color: 'var(--text-2)' }}>{b.label}</span>
                          <span className="font-bold num" style={{ color: '#14B8A6' }}>{fmtR(b.commission)} ({fmtPct(pct)})</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#14B8A6' }} />
                        </div>
                      </div>
                    );
                  })
                }
              </Card>
            ) : (
              <Card>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Resumo da Minha Comissão</h3>
                <div className="text-center py-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Total Gerado no Período</p>
                  <p className="text-4xl font-black num" style={{ color: '#14B8A6' }}>{fmtR(comm.corrTotal)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { label: 'Já recebido', value: comm.corrPago, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
                    { label: 'A receber',   value: comm.corrPend, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                      <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</p>
                      <p className="text-lg font-black num" style={{ color }}>{fmtR(value)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Commission by dimension */}
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Comissão por Banco</h3>
            {aggBank.slice(0, 8).map((b, i) => {
              const pct = comm.corrTotal > 0 ? (b.commission / comm.corrTotal) * 100 : 0;
              return (
                <div key={b.label} className="py-2" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-2)' }}>{b.label}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ color: 'var(--text-3)' }}>{b.count} props</span>
                      <span className="font-bold num" style={{ color: '#60a5fa' }}>{fmtR(b.commission)} ({fmtPct(pct)})</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#60a5fa' }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── GAMIFICAÇÃO / METAS ── */}
      {tab === 'gamification' && (
        <div className="space-y-5">
          {!isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {streak && (
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4" style={{ color: '#fbbf24' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Streak Diária</h3>
                  </div>
                  <p className="text-5xl font-black num mb-2" style={{ color: '#fbbf24' }}>🔥 {streak.current_streak}</p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>dias consecutivos com proposta paga</p>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {[
                      { label: 'Streak atual', value: `${streak.current_streak}d`, color: '#fbbf24' },
                      { label: 'Recorde',      value: `${streak.best_streak}d`,   color: '#94a3b8' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</p>
                        <p className="text-xl font-black num" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {goal && (
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4" style={{ color: '#14B8A6' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Meta do Mês</h3>
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: 'Pontos', current: stats?.my_points || 0, target: goal.target_points, color: '#14B8A6', cls: 'progress-bar' },
                      { label: 'Propostas Pagas', current: paid.length, target: goal.target_proposals, color: '#22c55e', cls: 'progress-bar-green' },
                    ].map(({ label, current, target, color, cls }) => {
                      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-2">
                            <span style={{ color: 'var(--text-2)' }}>{label}</span>
                            <span className="font-bold num" style={{ color }}>
                              {current} / {target} <span style={{ color: 'var(--text-3)' }}>({fmtPct(pct)})</span>
                            </span>
                          </div>
                          <div className="h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className={`h-3 rounded-full ${cls}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {stats?.my_position && (
                      <div className="mt-2 p-3 rounded-xl text-center" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Posição no ranking</p>
                        <p className="text-3xl font-black" style={{ color: '#14B8A6' }}>#{stats.my_position}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <Award className="w-4 h-4" style={{ color: '#fbbf24' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Conquistas</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                  {badges.filter(b => b.earned).length}/{badges.length}
                </span>
              </div>

              {badges.some(b => b.earned) && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#fbbf24' }}>Conquistadas</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 mb-6">
                    {badges.filter(b => b.earned).map(b => (
                      <div key={b.id} title={`${b.name}: ${b.description}`}
                        className="flex flex-col items-center p-2.5 rounded-xl"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 0 12px rgba(245,158,11,0.08)' }}>
                        <span className="text-xl badge-icon">{b.icon}</span>
                        <span className="text-[9px] text-center mt-1.5 leading-tight line-clamp-2" style={{ color: '#94A3B8' }}>{b.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {badges.some(b => !b.earned) && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Em progresso</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {badges.filter(b => !b.earned).map(b => (
                      <div key={b.id} title={`${b.name}: ${b.description}`}
                        className="flex flex-col items-center p-2.5 rounded-xl opacity-50"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', filter: 'grayscale(0.75)' }}>
                        <span className="text-xl badge-icon">{b.icon}</span>
                        <span className="text-[9px] text-center mt-1.5 leading-tight line-clamp-2" style={{ color: '#64748B' }}>{b.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Admin: team ranking */}
          {isAdmin && ranking.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Pontuação da Equipe (All-Time)</h3>
              {ranking.slice(0, 10).map((r, i) => {
                const pct = ranking[0].total_points > 0 ? (r.total_points / ranking[0].total_points) * 100 : 0;
                return (
                  <div key={r.user_id} className="py-2.5" style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : {}}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: i < 3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', color: i < 3 ? '#fbbf24' : '#475569' }}>
                        {r.position}
                      </span>
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-1)' }}>{r.full_name || r.email}</span>
                      <span className="text-xs num" style={{ color: 'var(--text-3)' }}>{r.proposals_paid} pagas · {fmtR(r.total_value || 0)}</span>
                      <span className="text-sm font-black num" style={{ color: '#fbbf24' }}>{r.total_points} pts</span>
                    </div>
                    <div className="h-1 rounded-full ml-9" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: '#fbbf24' }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
