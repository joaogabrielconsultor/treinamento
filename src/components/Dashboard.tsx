import { useState, useEffect } from 'react';
import { DollarSign, FileText, Calculator, Trophy, Library, Wallet, TrendingUp, BarChart2, ArrowRight, Activity, Percent } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ViewType } from '../types';
import { useCountUp } from '../hooks/useCountUp';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtR = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface DashboardProps {
  user: User;
  onNavigate: (view: ViewType) => void;
  isAdmin?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  'Digitada':   '#60a5fa',
  'Em análise': '#f59e0b',
  'Aprovada':   '#a78bfa',
  'Paga':       '#22c55e',
  'Cancelada':  '#f87171',
};

function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [w, setW] = useState('0%');
  useEffect(() => {
    const t = setTimeout(() => setW(`${pct}%`), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="funnel-bar-fill h-1.5 rounded-full" style={{ width: w, background: color, transition: 'width 0.75s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  );
}

function KpiCard({ label, numValue, textValue, sub, icon: Icon, color, delay = 0 }: {
  label: string;
  numValue?: number;
  textValue?: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}) {
  const animated = useCountUp(numValue ?? 0, 900, delay + 80);
  const display = textValue ?? (numValue !== undefined ? fmtR(animated) : '—');

  return (
    <div className="stat-card rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>{label}</p>
          <p className="text-xl font-black num" style={{ color: 'var(--text-1)' }}>{display}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-glow"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ user, onNavigate, isAdmin = false }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const displayName = user.user_metadata?.full_name || (user as any).full_name || user.email?.split('@')[0] || 'Usuário';
  const firstName = displayName.split(' ')[0];

  useEffect(() => {
    API('/api/production/dashboard?period=month')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { view: 'proposals'   as ViewType, icon: FileText,    label: 'Propostas',        desc: 'Ver e criar propostas',       color: '#60a5fa' },
    { view: 'simulator'   as ViewType, icon: Calculator,  label: 'Simulador',        desc: 'Simular operações',           color: '#a78bfa' },
    { view: 'production'  as ViewType, icon: TrendingUp,  label: 'Análise Detalhada',desc: 'Relatórios e gráficos',       color: '#14B8A6' },
    { view: 'ranking'     as ViewType, icon: Trophy,      label: 'Ranking',          desc: 'Classificação da equipe',     color: '#fbbf24' },
    { view: 'catalog'     as ViewType, icon: Library,     label: 'Treinamentos',     desc: 'Cursos e capacitação',        color: '#22c55e' },
    { view: 'conta-corrente' as ViewType, icon: Wallet,   label: 'Conta Corrente',   desc: 'Saques e comissões',          color: '#f59e0b' },
  ];

  const funnel = !stats?.proposals ? [] : [
    { label: 'Digitadas',  count: stats.proposals.typed       || 0, status: 'Digitada'   },
    { label: 'Em Análise', count: stats.proposals.in_analysis || 0, status: 'Em análise' },
    { label: 'Aprovadas',  count: stats.proposals.approved    || 0, status: 'Aprovada'   },
    { label: 'Pagas',      count: stats.proposals.paid        || 0, status: 'Paga'       },
    { label: 'Canceladas', count: stats.proposals.cancelled   || 0, status: 'Cancelada'  },
  ];
  const totalFunnel = funnel.reduce((s, f) => s + f.count, 0);

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="live-dot" />
          <span className="text-xs font-medium" style={{ color: '#14B8A6' }}>Sistema ativo</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          Olá, {firstName}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          Aqui está o resumo da sua produção este mês.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card rounded-2xl p-5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-3 rounded w-1/2 mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-7 rounded w-3/4 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))
          : [
            <KpiCard key="hoje"   label="Produção Hoje"  numValue={stats?.today?.value || 0}        sub={`${stats?.today?.count || 0} propostas pagas`} icon={Activity}   color="#14B8A6" delay={0}   />,
            <KpiCard key="mes"    label="Este Mês"       numValue={stats?.month?.value || 0}        sub={`${stats?.month?.count || 0} pagas`}           icon={DollarSign} color="#22c55e" delay={60}  />,
            <KpiCard key="ticket" label="Ticket Médio"   numValue={stats?.avg_ticket || 0}          sub="por proposta paga"                             icon={BarChart2}  color="#a78bfa" delay={120} />,
            isAdmin
              ? <KpiCard key="best" label="Melhor Vendedor" textValue={stats?.best_broker?.full_name?.split(' ')[0] || '—'} sub={`${stats?.best_broker?.points || 0} pts`} icon={Trophy}  color="#fbbf24" delay={180} />
              : <KpiCard key="comm" label="Minha Comissão"  numValue={stats?.my_commission_total || 0} sub={`#${stats?.my_position || '—'} no ranking`}  icon={Percent}   color="#60a5fa" delay={180} />,
          ]
        }
      </div>

      {/* Quick actions */}
      <div className="mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Acesso rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map(({ view, icon: Icon, label, desc, color }, i) => (
            <button key={view} onClick={() => onNavigate(view)}
              className="glass-card rounded-2xl p-4 text-left group transition-all hover:scale-[1.02] animate-fade-up"
              style={{ border: '1px solid var(--card-border)', animationDelay: `${220 + i * 40}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-all translate-x-0 group-hover:translate-x-1" style={{ color: 'var(--text-3)' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mini funnel */}
      {funnel.length > 0 && totalFunnel > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '480ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Status das Propostas — Este Mês</h2>
            <button onClick={() => onNavigate('production')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#14B8A6' }}>
              Ver análise completa <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="space-y-3">
              {funnel.map((f, i) => {
                const pct = totalFunnel > 0 ? (f.count / totalFunnel) * 100 : 0;
                const color = STATUS_COLORS[f.status] || '#475569';
                return (
                  <div key={f.status} className="funnel-row">
                    <div className="flex justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span style={{ color: 'var(--text-2)' }}>{f.label}</span>
                      </div>
                      <span className="num font-semibold" style={{ color: 'var(--text-2)' }}>
                        {f.count} <span style={{ color: 'var(--text-3)' }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <AnimBar pct={pct} color={color} delay={600 + i * 80} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 flex justify-between text-xs" style={{ borderTop: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--text-3)' }}>Total de propostas</span>
              <span className="font-bold num" style={{ color: 'var(--text-1)' }}>{totalFunnel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
