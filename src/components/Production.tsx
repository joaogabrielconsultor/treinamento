import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CheckCircle, BarChart2, Star, Award, Target, Zap, Bell, BellOff, Percent } from 'lucide-react';
import { ProductionStats, Badge, UserStreak, MonthlyGoal, Notification } from '../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-dk-card rounded-2xl p-5 border border-gray-100 dark:border-dk-border shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === 'text-yellow-600' ? 'bg-yellow-50 dark:bg-yellow-900/20' : color === 'text-green-600' ? 'bg-green-50 dark:bg-green-900/20' : color === 'text-blue-600' ? 'bg-blue-50 dark:bg-blue-900/20' : color === 'text-emerald-600' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export function Production({ isAdmin }: { isAdmin: boolean }) {
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [goal, setGoal] = useState<MonthlyGoal | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const reqs = [
      API('/api/production/dashboard').then(r => r.json()),
      API('/api/badges').then(r => r.json()),
      API('/api/notifications').then(r => r.json()),
    ];
    if (!isAdmin) {
      reqs.push(API('/api/streak').then(r => r.json()));
      reqs.push(API('/api/goals').then(r => r.json()));
    }
    const [st, bg, notifs, sk, gl] = await Promise.all(reqs);
    setStats(st);
    setBadges(Array.isArray(bg) ? bg : []);
    setNotifications(Array.isArray(notifs) ? notifs : []);
    if (sk) setStreak(sk);
    if (gl) setGoal(gl);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await API('/api/notifications/read-all', { method: 'PUT' });
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>;
  if (!stats) return null;

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Produção</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isAdmin ? 'Visão geral da equipe' : 'Sua produção'}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)} className="relative p-2.5 rounded-xl border border-gray-200 dark:border-dk-border hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">
            {unreadCount > 0 ? <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <BellOff className="w-5 h-5 text-gray-400" />}
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-dk-card border border-gray-100 dark:border-dk-border rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dk-border">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">Notificações</span>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-brand hover:underline">Marcar todas lidas</button>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">Nenhuma notificação</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 dark:border-dk-border/50 ${!n.read ? 'bg-brand/5' : ''}`}>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main stats */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 mb-6`}>
        <StatCard label="Produção Hoje" value={formatCurrency(stats.today.value)} sub={`${stats.today.count} propostas`} icon={DollarSign} color="text-green-600" />
        <StatCard label="Produção do Mês" value={formatCurrency(stats.month.value)} sub={`${stats.month.count} propostas pagas`} icon={TrendingUp} color="text-blue-600" />
        <StatCard label="Ticket Médio" value={formatCurrency(stats.avg_ticket)} icon={BarChart2} color="text-purple-600" />
        {isAdmin
          ? <StatCard label="Melhor Corretor" value={stats.best_broker?.full_name?.split(' ')[0] || '—'} sub={`${stats.best_broker?.points || 0} pontos`} icon={Award} color="text-yellow-600" />
          : <>
              <StatCard label="Minha Comissão" value={formatCurrency(stats.my_commission_total || 0)} sub="propostas pagas" icon={Percent} color="text-emerald-600" />
              <StatCard label="Meus Pontos" value={`${stats.my_points} pts`} sub={`#${stats.my_position || '—'} no ranking`} icon={Star} color="text-yellow-600" />
            </>
        }
      </div>

      {/* Proposal status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status das Propostas</h3>
          <div className="space-y-3">
            {[
              { label: 'Pagas', count: stats.proposals.paid, color: 'bg-green-500', max: stats.proposals.total_proposals },
              { label: 'Aprovadas', count: stats.proposals.approved, color: 'bg-purple-500', max: stats.proposals.total_proposals },
              { label: 'Em Análise', count: stats.proposals.in_analysis, color: 'bg-yellow-500', max: stats.proposals.total_proposals },
              { label: 'Digitadas', count: stats.proposals.typed, color: 'bg-blue-500', max: stats.proposals.total_proposals },
              { label: 'Canceladas', count: stats.proposals.cancelled, color: 'bg-red-400', max: stats.proposals.total_proposals },
            ].map(item => {
              const pct = item.max ? Math.round((item.count / item.max) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-dk-surface rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: streak + goal (corretor) or top table (admin) */}
        <div className="space-y-4">
          {!isAdmin && streak && (
            <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Streak Diária</h3>
              </div>
              <p className="text-3xl font-black text-yellow-500">🔥 {streak.current_streak} dias</p>
              <p className="text-xs text-gray-400 mt-1">Recorde: {streak.best_streak} dias</p>
            </div>
          )}

          {!isAdmin && goal && (
            <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Meta do Mês</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Pontos</span>
                    <span className="font-semibold">{stats.my_points}/{goal.target_points}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-dk-surface rounded-full overflow-hidden">
                    <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, goal.target_points ? Math.round((stats.my_points / goal.target_points) * 100) : 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Propostas Pagas</span>
                    <span className="font-semibold">{stats.proposals.paid}/{goal.target_proposals}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-dk-surface rounded-full overflow-hidden">
                    <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, goal.target_proposals ? Math.round((stats.proposals.paid / goal.target_proposals) * 100) : 0)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAdmin && stats.top_table && (
            <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tabela mais usada</h3>
              <p className="font-bold text-brand">{stats.top_table.name}</p>
              <p className="text-sm text-gray-400 mt-1">{stats.top_table.count} propostas pagas</p>
            </div>
          )}

          {/* Total proposals */}
          <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Total de Propostas</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.proposals.total_proposals}</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Medalhas</h3>
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">{earnedBadges.length}/{badges.length}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {badges.map(b => (
              <div key={b.id} title={`${b.name}: ${b.description}`}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${b.earned ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-100 dark:border-dk-border bg-gray-50 dark:bg-dk-surface opacity-40 grayscale'}`}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[10px] text-center mt-1 text-gray-600 dark:text-gray-400 leading-tight">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
