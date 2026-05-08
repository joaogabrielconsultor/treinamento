import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CheckCircle, BarChart2, Star, Award, Target, Zap, Bell, BellOff, Percent, X } from 'lucide-react';
import { ProductionStats, Badge, UserStreak, MonthlyGoal, Notification } from '../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass: string;
  iconColor: string;
  delay?: number;
}

function StatCard({ label, value, sub, icon: Icon, iconClass, iconColor, delay = 0 }: StatCardProps) {
  return (
    <div className="stat-card rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>{label}</p>
          <p className="text-2xl font-black num" style={{ color: 'var(--text-1)' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

const PROPOSAL_BARS = [
  { label: 'Pagas',      key: 'paid',        barClass: 'progress-bar-green'  },
  { label: 'Aprovadas',  key: 'approved',    barClass: 'progress-bar-purple' },
  { label: 'Em Análise', key: 'in_analysis', barClass: 'progress-bar-amber'  },
  { label: 'Digitadas',  key: 'typed',       barClass: 'progress-bar-blue'   },
  { label: 'Canceladas', key: 'cancelled',   barClass: 'progress-bar-red'    },
] as const;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="spinner-cyber mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="live-dot" />
            <span className="text-xs font-medium" style={{ color: '#14B8A6' }}>Dashboard live</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Produção</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {isAdmin ? 'Visão geral da equipe' : 'Sua performance em tempo real'}
          </p>
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative p-2.5 rounded-xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: unreadCount > 0 ? '#14B8A6' : '#475569',
            }}
          >
            {unreadCount > 0 ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #14B8A6, #06B6D4)', boxShadow: '0 0 8px rgba(20,184,166,0.5)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div
              className="absolute right-0 top-12 w-80 rounded-2xl z-50 overflow-hidden animate-fade-up"
              style={{
                background: 'rgba(8,13,24,0.97)',
                border: '1px solid var(--border-1)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--card-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Notificações</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs transition-colors"
                      style={{ color: '#14B8A6' }}
                    >
                      Marcar lidas
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotif(false)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma notificação</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="px-4 py-3"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: !n.read ? 'rgba(20,184,166,0.04)' : 'transparent',
                      }}
                    >
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ background: '#14B8A6' }} />
                      )}
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                        {new Date(n.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main stats */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 mb-6`}>
        <StatCard label="Produção Hoje"   value={formatCurrency(stats.today.value)}  sub={`${stats.today.count} propostas`}      icon={DollarSign}  iconClass="icon-box-green"  iconColor="#22c55e" delay={0}   />
        <StatCard label="Produção do Mês" value={formatCurrency(stats.month.value)}  sub={`${stats.month.count} pagas`}           icon={TrendingUp}  iconClass="icon-box-blue"   iconColor="#60a5fa" delay={60}  />
        <StatCard label="Ticket Médio"    value={formatCurrency(stats.avg_ticket)}                                                  icon={BarChart2}   iconClass="icon-box-purple" iconColor="#a78bfa" delay={120} />
        {isAdmin
          ? <StatCard label="Melhor Corretor" value={stats.best_broker?.full_name?.split(' ')[0] || '—'} sub={`${stats.best_broker?.points || 0} pts`} icon={Award} iconClass="icon-box-amber" iconColor="#fbbf24" delay={180} />
          : <>
              <StatCard label="Minha Comissão" value={formatCurrency(stats.my_commission_total || 0)} sub="propostas pagas"        icon={Percent} iconClass="icon-box-teal"   iconColor="#14B8A6" delay={180} />
              <StatCard label="Meus Pontos"    value={`${stats.my_points} pts`} sub={`#${stats.my_position || '—'} no ranking`}    icon={Star}    iconClass="icon-box-amber"  iconColor="#fbbf24" delay={240} />
            </>
        }
      </div>

      {/* Middle section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Proposal status */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 animate-fade-up"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '200ms',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="live-dot" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Status das Propostas</h3>
          </div>
          <div className="space-y-4">
            {PROPOSAL_BARS.map(({ label, key, barClass }) => {
              const count = stats.proposals[key] as number;
              const pct = stats.proposals.total_proposals
                ? Math.round((count / stats.proposals.total_proposals) * 100)
                : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-3)' }}>{label}</span>
                    <span className="font-semibold num" style={{ color: 'var(--text-2)' }}>
                      {count} <span style={{ color: 'var(--text-3)' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-track h-2">
                    <div className={`${barClass} h-2 transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {!isAdmin && streak && (
            <div
              className="rounded-2xl p-5 animate-fade-up"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                animationDelay: '240ms',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" style={{ color: '#fbbf24' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Streak Diária</h3>
              </div>
              <p className="text-3xl font-black num" style={{ color: '#fbbf24' }}>
                🔥 {streak.current_streak} dias
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Recorde: {streak.best_streak} dias</p>
            </div>
          )}

          {!isAdmin && goal && (
            <div
              className="rounded-2xl p-5 animate-fade-up"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-card)',
                animationDelay: '280ms',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4" style={{ color: '#14B8A6' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Meta do Mês</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-3)' }}>Pontos</span>
                    <span className="font-semibold num" style={{ color: 'var(--text-2)' }}>
                      {stats.my_points}/{goal.target_points}
                    </span>
                  </div>
                  <div className="progress-track h-2">
                    <div
                      className="progress-bar h-2"
                      style={{ width: `${Math.min(100, goal.target_points ? Math.round((stats.my_points / goal.target_points) * 100) : 0)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-3)' }}>Propostas Pagas</span>
                    <span className="font-semibold num" style={{ color: 'var(--text-2)' }}>
                      {stats.proposals.paid}/{goal.target_proposals}
                    </span>
                  </div>
                  <div className="progress-track h-2">
                    <div
                      className="progress-bar-green h-2"
                      style={{ width: `${Math.min(100, goal.target_proposals ? Math.round((stats.proposals.paid / goal.target_proposals) * 100) : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAdmin && stats.top_table && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(20,184,166,0.06)',
                border: '1px solid rgba(20,184,166,0.15)',
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Tabela mais usada</h3>
              <p className="font-bold" style={{ color: '#2DD4BF' }}>{stats.top_table.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{stats.top_table.count} propostas pagas</p>
            </div>
          )}

          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Total de Propostas</h3>
            </div>
            <p className="text-3xl font-black num" style={{ color: 'var(--text-1)' }}>
              {stats.proposals.total_proposals}
            </p>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div
          className="rounded-2xl p-5 animate-fade-up"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '320ms',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Conquistas</h3>
            <span className="badge badge-amber text-[10px]">
              {earnedBadges.length}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
            {badges.map(b => (
              <div
                key={b.id}
                title={`${b.name}: ${b.description}`}
                className="badge-card flex flex-col items-center p-2.5 rounded-xl cursor-default"
                style={b.earned
                  ? {
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      boxShadow: '0 0 12px rgba(245,158,11,0.08)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      opacity: 0.6,
                      filter: 'grayscale(0.75)',
                    }
                }
              >
                <span className="text-xl badge-icon">{b.icon}</span>
                <span
                  className="text-[9px] text-center mt-1.5 leading-tight line-clamp-2"
                  style={{ color: b.earned ? '#94A3B8' : '#64748B' }}
                >
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
