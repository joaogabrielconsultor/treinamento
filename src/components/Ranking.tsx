import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';
import { RankingEntry } from '../types';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const MEDALS = ['🥇', '🥈', '🥉'];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#dabb39' }}>
            <Trophy className="w-5 h-5" style={{ color: '#1e3329' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ranking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{entries.length} corretores na disputa</p>
          </div>
        </div>
        {/* Period selector */}
        <div className="flex bg-gray-100 dark:bg-dk-surface rounded-xl p-1 gap-1">
          {([['monthly', 'Mensal'], ['weekly', 'Semanal'], ['all', 'Geral']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setPeriod(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === val ? 'bg-white dark:bg-dk-card shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* My position banner */}
      {myEntry && (
        <div className="rounded-2xl p-4 mb-6 border-2 flex items-center gap-4" style={{ borderColor: '#dabb39', backgroundColor: '#dabb3910' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black" style={{ backgroundColor: '#dabb39', color: '#1e3329' }}>
            {myEntry.position}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sua posição</p>
            <p className="font-bold text-gray-900 dark:text-white">#{myEntry.position} — {myEntry.total_points} pontos</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">{myEntry.proposals_paid} prop. pagas</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(Number(myEntry.total_value))}</p>
          </div>
        </div>
      )}

      {/* Podium top 3 */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[entries[1], entries[0], entries[2]].map((e, idx) => {
            if (!e) return <div key={idx} />;
            const realIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            const heights = ['h-24', 'h-32', 'h-20'];
            return (
              <div key={e.user_id} className={`flex flex-col items-center justify-end ${heights[idx]} bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border p-4 shadow-sm relative`}>
                <span className="text-2xl mb-1">{MEDALS[realIdx]}</span>
                <p className="font-bold text-sm text-center text-gray-900 dark:text-white truncate w-full text-center">{(e.full_name || e.email).split(' ')[0]}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#dabb39' }}>{e.total_points} pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranking list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum dado disponível ainda</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dk-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Classificação completa</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-dk-border/50">
            {entries.map(e => {
              const isMe = e.user_id === userId;
              return (
                <div key={e.user_id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${isMe ? 'dark:bg-dk-surface/60' : 'hover:bg-gray-50 dark:hover:bg-dk-surface/30'}`}
                  style={isMe ? { backgroundColor: '#dabb3908' } : {}}>
                  <div className="w-8 text-center">
                    {e.position <= 3
                      ? <span className="text-lg">{MEDALS[e.position - 1]}</span>
                      : <span className="text-sm font-bold text-gray-400">#{e.position}</span>
                    }
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: isMe ? '#dabb39' : '#1e4033', color: isMe ? '#1e3329' : '#dabb39' }}>
                    {(e.full_name || e.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${isMe ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {e.full_name || e.email} {isMe && <span className="text-xs ml-1 opacity-60">(você)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{e.proposals_paid} propostas pagas · {formatCurrency(Number(e.total_value))}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{e.total_points}</span>
                    </div>
                    <p className="text-xs text-gray-400">pontos</p>
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
