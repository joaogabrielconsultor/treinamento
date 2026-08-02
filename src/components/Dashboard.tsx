import { useState, useEffect } from 'react';
import { DollarSign, FileText, Calculator, Trophy, Library, Wallet, TrendingUp, BarChart2, ArrowRight, Activity, Percent, TrendingDown, Receipt, Calendar, Sparkles } from 'lucide-react';
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
  'C PAGA':     '#C6FF00',
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

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const rawDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const todayLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

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
    { view: 'production'  as ViewType, icon: TrendingUp,  label: 'Análise Detalhada',desc: 'Relatórios e gráficos',       color: '#C6FF00' },
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
      <div className="mb-8 animate-fade-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="live-dot" />
            <span className="text-xs font-medium" style={{ color: '#C6FF00' }}>Sistema ativo</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
            {greeting}, <span className="text-gradient-teal">{firstName}</span> 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Aqui está o resumo da sua produção este mês.
          </p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl self-center"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}
        >
          <Calendar className="w-4 h-4" style={{ color: '#C6FF00' }} />
          <span className="text-xs font-medium num" style={{ color: 'var(--text-2)' }}>{todayLabel}</span>
        </div>
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
            <KpiCard key="hoje"   label="Produção Hoje"  numValue={stats?.today?.value || 0}        sub={`${stats?.today?.count || 0} propostas pagas`} icon={Activity}   color="#C6FF00" delay={0}   />,
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

      {/* Saídas do Mês — admin only */}
      {isAdmin && !loading && stats?.saidas_mes && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Saídas do Mês</h2>
            <button onClick={() => onNavigate('admin-conta-corrente')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#f87171' }}>
              Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Comissão Paga Corretores</p>
                  <p className="text-xl font-black num" style={{ color: '#f87171' }}>{fmtR(stats.saidas_mes.comissao_paga.total)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{stats.saidas_mes.comissao_paga.count} pagamento{stats.saidas_mes.comissao_paga.count !== 1 ? 's' : ''} este mês</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <TrendingDown className="w-4 h-4" style={{ color: '#f87171' }} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.18)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Despesas</p>
                  <p className="text-xl font-black num" style={{ color: '#fb923c' }}>{fmtR(stats.saidas_mes.despesas.total)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{stats.saidas_mes.despesas.count} lançamento{stats.saidas_mes.despesas.count !== 1 ? 's' : ''} este mês</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                  <Receipt className="w-4 h-4" style={{ color: '#fb923c' }} />
                </div>
              </div>
              {stats.saidas_mes.despesas_por_banco?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(251,146,60,0.15)' }}>
                  {stats.saidas_mes.despesas_por_banco.map((ub: { id: string; nome: string; total: number; count: number }) => (
                    <span key={ub.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px]"
                      style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                      <span style={{ color: 'var(--text-3)' }}>{ub.nome}</span>
                      <span className="font-bold num" style={{ color: '#fb923c' }}>{fmtR(ub.total)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini funnel */}
      {funnel.length > 0 && totalFunnel > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '480ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Status das Propostas — Este Mês</h2>
            <button onClick={() => onNavigate('production')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#C6FF00' }}>
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

      {/* Estado vazio — nenhuma proposta ainda */}
      {!loading && totalFunnel === 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '360ms' }}>
          <div
            className="rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%, rgba(198,255,0,0.08), transparent 60%)' }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-float"
                style={{ background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.22)', boxShadow: 'var(--glow-md)' }}
              >
                <Sparkles className="w-7 h-7" style={{ color: '#C6FF00' }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
                Tudo pronto para começar!
              </h3>
              <p className="text-sm mt-1.5 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Você ainda não tem produção registrada este mês. Assim que suas propostas forem cadastradas, seus indicadores e o funil de status aparecem aqui automaticamente.
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-5 flex-wrap">
                <button
                  onClick={() => onNavigate('proposals')}
                  className="btn-cyber px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Criar primeira proposta
                </button>
                <button
                  onClick={() => onNavigate('simulator')}
                  className="btn-ghost px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" /> Abrir simulador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
