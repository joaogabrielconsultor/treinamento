import { useState, useEffect } from 'react';
import { FileText, Calculator, Trophy, Library, Wallet, TrendingUp, ArrowRight, TrendingDown, Receipt, Calendar } from 'lucide-react';
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

function KpiCell({ label, numValue, textValue, sub, primary = false, delay = 0 }: {
  label: string;
  numValue?: number;
  textValue?: string;
  sub?: string;
  primary?: boolean;
  delay?: number;
}) {
  const animated = useCountUp(numValue ?? 0, 900, delay + 80);
  const display = textValue ?? (numValue !== undefined ? fmtR(animated) : '—');

  return (
    <div className={`kpi-cell ${primary ? 'kpi-cell-primary' : ''}`}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value truncate" style={primary ? { color: 'var(--accent)', fontSize: 30 } : undefined}>{display}</p>
      {sub && <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
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
    { view: 'proposals'      as ViewType, icon: FileText,   label: 'Propostas',         desc: 'Ver e cadastrar propostas' },
    { view: 'simulator'      as ViewType, icon: Calculator, label: 'Simulador',         desc: 'Simular operações' },
    { view: 'production'     as ViewType, icon: TrendingUp, label: 'Análise detalhada', desc: 'Relatórios e gráficos' },
    { view: 'ranking'        as ViewType, icon: Trophy,     label: 'Ranking',           desc: 'Classificação da equipe' },
    { view: 'catalog'        as ViewType, icon: Library,    label: 'Treinamentos',      desc: 'Cursos e capacitação' },
    { view: 'conta-corrente' as ViewType, icon: Wallet,     label: 'Conta Corrente',    desc: 'Saques e comissões' },
  ];

  const funnel = !stats?.proposals ? [] : [
    { label: 'Digitadas',  count: stats.proposals.typed       || 0, status: 'Digitada'   },
    { label: 'Em análise', count: stats.proposals.in_analysis || 0, status: 'Em análise' },
    { label: 'Aprovadas',  count: stats.proposals.approved    || 0, status: 'Aprovada'   },
    { label: 'Pagas',      count: stats.proposals.paid        || 0, status: 'Paga'       },
    { label: 'Canceladas', count: stats.proposals.cancelled   || 0, status: 'Cancelada'  },
  ];
  const totalFunnel = funnel.reduce((s, f) => s + f.count, 0);

  return (
    <div className="page">

      <header className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {firstName}</h1>
          <p className="page-subtitle">Resumo da sua produção neste mês.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-3)' }}>
          <Calendar className="w-4 h-4" /> {todayLabel}
        </span>
      </header>

      {/* Indicadores — uma régua só, o mês em destaque */}
      <section className="card kpi-strip mb-8 animate-fade-up" aria-label="Indicadores do mês">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-cell">
              <div className="skeleton h-3 w-1/2 mb-3" />
              <div className="skeleton h-7 w-3/4 mb-2" />
              <div className="skeleton h-2.5 w-1/3" />
            </div>
          ))
          : <>
            <KpiCell label="Produção do mês" numValue={stats?.month?.value || 0} sub={`${stats?.month?.count || 0} propostas pagas`} primary />
            <KpiCell label="Produção hoje"   numValue={stats?.today?.value || 0} sub={`${stats?.today?.count || 0} propostas pagas`} delay={60} />
            <KpiCell label="Ticket médio"    numValue={stats?.avg_ticket || 0}   sub="por proposta paga" delay={120} />
            {isAdmin
              ? <KpiCell label="Melhor vendedor" textValue={stats?.best_broker?.full_name?.split(' ')[0] || '—'} sub={`${stats?.best_broker?.points || 0} pontos`} />
              : <KpiCell label="Minha comissão"  numValue={stats?.my_commission_total || 0} sub={stats?.my_position ? `${stats.my_position}º no ranking` : 'Sem posição no ranking'} delay={180} />}
          </>
        }
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Atalhos */}
        <section aria-labelledby="atalhos">
          <h2 id="atalhos" className="section-title mb-3">Atalhos</h2>
          <div className="card divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {quickActions.map(({ view, icon: Icon, label, desc }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className="group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] first:rounded-t-[12px] last:rounded-b-[12px]"
                style={{ borderColor: 'var(--border-1)' }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-2)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</span>
                  <span className="block text-[13px]" style={{ color: 'var(--text-3)' }}>{desc}</span>
                </span>
                <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-4)' }} />
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-8 min-w-0">
          {/* Status das propostas */}
          {funnel.length > 0 && totalFunnel > 0 && (
            <section aria-labelledby="funil">
              <div className="flex items-center justify-between mb-3">
                <h2 id="funil" className="section-title">Propostas do mês por status</h2>
                <button onClick={() => onNavigate('production')} className="flex items-center gap-1 text-[13px] font-medium hover:underline" style={{ color: 'var(--text-2)' }}>
                  Ver análise <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="card card-pad">
                {/* barra empilhada: proporção de cada status */}
                <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px] mb-5" role="img" aria-label="Distribuição por status">
                  {funnel.filter(f => f.count > 0).map(f => (
                    <div key={f.status} style={{ flexGrow: f.count, background: STATUS_COLORS[f.status] || '#475569' }} />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {funnel.map((f, i) => {
                    const pct = totalFunnel > 0 ? (f.count / totalFunnel) * 100 : 0;
                    const color = STATUS_COLORS[f.status] || '#475569';
                    return (
                      <div key={f.status} className="funnel-row grid grid-cols-[1fr_auto_3rem] items-center gap-3 text-[13px]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                            <span style={{ color: 'var(--text-2)' }}>{f.label}</span>
                          </div>
                          <AnimBar pct={pct} color={color} delay={300 + i * 60} />
                        </div>
                        <span className="num font-medium text-right" style={{ color: 'var(--text-1)' }}>{f.count}</span>
                        <span className="num text-right" style={{ color: 'var(--text-3)' }}>{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 flex justify-between text-[13px]" style={{ borderTop: '1px solid var(--border-1)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Total</span>
                  <span className="font-semibold num" style={{ color: 'var(--text-1)' }}>{totalFunnel}</span>
                </div>
              </div>
            </section>
          )}

          {/* Saídas do mês — só admin */}
          {isAdmin && !loading && stats?.saidas_mes && (
            <section aria-labelledby="saidas">
              <div className="flex items-center justify-between mb-3">
                <h2 id="saidas" className="section-title">Saídas do mês</h2>
                <button onClick={() => onNavigate('admin-conta-corrente')} className="flex items-center gap-1 text-[13px] font-medium hover:underline" style={{ color: 'var(--text-2)' }}>
                  Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="card grid sm:grid-cols-2 sm:divide-x" style={{ borderColor: 'var(--card-border)' }}>
                <div className="p-5" style={{ borderColor: 'var(--border-1)' }}>
                  <p className="kpi-label flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Comissão paga a corretores</p>
                  <p className="kpi-value" style={{ color: 'var(--neg)' }}>{fmtR(stats.saidas_mes.comissao_paga.total)}</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>{stats.saidas_mes.comissao_paga.count} pagamento{stats.saidas_mes.comissao_paga.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="p-5 border-t sm:border-t-0" style={{ borderColor: 'var(--border-1)' }}>
                  <p className="kpi-label flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Despesas</p>
                  <p className="kpi-value" style={{ color: '#FB923C' }}>{fmtR(stats.saidas_mes.despesas.total)}</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>{stats.saidas_mes.despesas.count} lançamento{stats.saidas_mes.despesas.count !== 1 ? 's' : ''}</p>
                  {stats.saidas_mes.despesas_por_banco?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {stats.saidas_mes.despesas_por_banco.map((ub: { id: string; nome: string; total: number; count: number }) => (
                        <span key={ub.id} className="badge badge-neutral">
                          {ub.nome} <span className="num font-semibold" style={{ color: 'var(--text-1)' }}>{fmtR(ub.total)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Estado vazio — nenhuma proposta ainda */}
          {!loading && totalFunnel === 0 && (
            <section className="card">
              <div className="empty-state">
                <FileText />
                <strong>Nenhuma produção neste mês</strong>
                <p className="max-w-sm">Cadastre uma proposta e os indicadores e o status aparecem aqui.</p>
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  <button onClick={() => onNavigate('proposals')} className="btn btn-primary">
                    <FileText className="w-4 h-4" /> Cadastrar proposta
                  </button>
                  <button onClick={() => onNavigate('simulator')} className="btn btn-secondary">
                    <Calculator className="w-4 h-4" /> Abrir simulador
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
