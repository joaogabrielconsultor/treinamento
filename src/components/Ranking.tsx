import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Star, Crown } from 'lucide-react';
import { RankingEntry } from '../types';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const MEDAL_COLORS = [
  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', glow: 'rgba(251,191,36,0.2)', emoji: '🥇' },
  { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.2)', text: '#94A3B8', glow: 'rgba(148,163,184,0.1)', emoji: '🥈' },
  { bg: 'rgba(180,120,60,0.12)', border: 'rgba(180,120,60,0.25)', text: '#cd7f32', glow: 'rgba(180,120,60,0.15)', emoji: '🥉' },
];

export function Ranking({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [period, setPeriod] = useState<'all' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = period === 'all' ? '/api/ranking' : `/api/ranking?period=${period}`;
    const r = await API(url);
    const data = await r.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [period]);

  const myEntry = entries.find(e => e.user_id === userId);

  const PERIODS = [
    ['monthly', 'Mensal'],
    ['weekly',  'Semanal'],
    ['all',     'Geral'],
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ color: 'var(--text-1)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.2)',
              boxShadow: '0 0 16px rgba(251,191,36,0.1)',
            }}
          >
            <Trophy className="w-5 h-5" style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Ranking</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {entries.length} corretores na disputa
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div
          className="flex p-1 rounded-xl gap-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {PERIODS.map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={period === val
                ? {
                    background: 'rgba(20,184,166,0.15)',
                    border: '1px solid rgba(20,184,166,0.25)',
                    color: '#2DD4BF',
                    boxShadow: '0 0 10px rgba(20,184,166,0.1)',
                  }
                : { color: 'var(--text-3)', border: '1px solid transparent' }
              }
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* My position banner */}
      {myEntry && (
        <div
          className="rounded-2xl p-4 mb-6 flex items-center gap-4 animate-fade-up"
          style={{
            background: 'rgba(20,184,166,0.06)',
            border: '1px solid rgba(20,184,166,0.2)',
            boxShadow: '0 0 24px rgba(20,184,166,0.05)',
            animationDelay: '60ms',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #14B8A6, #06B6D4)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(20,184,166,0.35)',
            }}
          >
            #{myEntry.position}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#14B8A6' }}>Sua posição</p>
            <p className="font-bold text-sm num" style={{ color: 'var(--text-1)' }}>
              #{myEntry.position} — {myEntry.total_points} pontos
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs num" style={{ color: 'var(--text-3)' }}>{myEntry.proposals_paid} prop. pagas</p>
            <p className="text-sm font-semibold num" style={{ color: 'var(--text-2)' }}>
              {formatCurrency(Number(myEntry.total_value))}
            </p>
          </div>
        </div>
      )}

      {/* Podium top 3 */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {[entries[1], entries[0], entries[2]].map((e, idx) => {
            if (!e) return <div key={idx} />;
            const realIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            const medal = MEDAL_COLORS[realIdx];
            const heights = ['h-28', 'h-36', 'h-24'];
            const isFirst = realIdx === 0;
            return (
              <div
                key={e.user_id}
                className={`flex flex-col items-center justify-end ${heights[idx]} rounded-2xl p-4 relative`}
                style={{
                  background: medal.bg,
                  border: `1px solid ${medal.border}`,
                  boxShadow: `0 0 20px ${medal.glow}`,
                }}
              >
                {isFirst && (
                  <Crown
                    className="w-4 h-4 absolute top-2 right-2"
                    style={{ color: medal.text, opacity: 0.7 }}
                  />
                )}
                <span className="text-2xl mb-1">{medal.emoji}</span>
                <p className="font-bold text-xs text-center truncate w-full" style={{ color: 'var(--text-1)' }}>
                  {(e.full_name || e.email).split(' ')[0]}
                </p>
                <p className="text-[11px] font-bold mt-0.5 num" style={{ color: medal.text }}>
                  {e.total_points} pts
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranking list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner-cyber" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando ranking...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
          >
            <Users className="w-8 h-8" style={{ color: '#334155' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum dado disponível ainda</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden animate-fade-up"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '160ms',
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Classificação completa
            </span>
          </div>

          <div>
            {entries.map((e, i) => {
              const isMe = e.user_id === userId;
              const medal = e.position <= 3 ? MEDAL_COLORS[e.position - 1] : null;
              return (
                <div
                  key={e.user_id}
                  className="table-row-cyber flex items-center gap-4 px-5 py-3"
                  style={isMe ? { background: 'rgba(20,184,166,0.06)' } : {}}
                >
                  {/* Position */}
                  <div className="w-7 text-center flex-shrink-0">
                    {medal
                      ? <span className="text-base">{medal.emoji}</span>
                      : <span className="text-xs font-bold num" style={{ color: 'var(--text-3)' }}>#{e.position}</span>
                    }
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={isMe
                      ? { background: 'linear-gradient(135deg, #14B8A6, #06B6D4)', color: '#fff', boxShadow: '0 0 10px rgba(20,184,166,0.3)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', border: '1px solid var(--border-1)' }
                    }
                  >
                    {(e.full_name || e.email)[0].toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: isMe ? '#E2E8F0' : '#94A3B8' }}>
                      {e.full_name || e.email}
                      {isMe && (
                        <span className="ml-2 text-[10px] font-medium" style={{ color: '#14B8A6' }}>
                          você
                        </span>
                      )}
                    </p>
                    <p className="text-xs num" style={{ color: 'var(--text-3)' }}>
                      {e.proposals_paid} pagas · {formatCurrency(Number(e.total_value))}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3 h-3" style={{ color: '#fbbf24' }} />
                      <span className="font-bold text-sm num" style={{ color: medal ? medal.text : '#E2E8F0' }}>
                        {e.total_points}
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>pontos</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
