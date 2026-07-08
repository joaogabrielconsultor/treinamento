import { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Users, Clock } from 'lucide-react';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MONTHS_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTHS_ABBR[parseInt(mo, 10) - 1]}/${y.slice(2)}`;
}

interface MonthCell { corretor: number; empresa: number; }
interface BrokerRow {
  user_id: string; user_name: string; user_email: string;
  by_month: Record<string, MonthCell>;
  total_corretor: number; total_empresa: number;
}
interface ReportData {
  months: string[];
  brokers: BrokerRow[];
  totals: { by_month: Record<string, MonthCell>; total_corretor: number; total_empresa: number };
}

export function AdminCommissionReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await API('/api/admin/commission-report').then(r => r.json());
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const months = data?.months || [];
  const brokers = data?.brokers || [];
  const totals = data?.totals;
  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: '#14B8A6' }} />
          <div>
            <h1 className="text-xl font-bold">Relatório de Comissões</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Comissões ainda não pagas, por corretor e por mês</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Total em aberto — Corretores</p>
          <p className="text-xl font-black num" style={{ color: '#f59e0b' }}>{fmtBRL(totals?.total_corretor || 0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Total em aberto — Empresa</p>
          <p className="text-xl font-black num" style={{ color: '#a78bfa' }}>{fmtBRL(totals?.total_empresa || 0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Corretores com pendência</p>
          <p className="text-xl font-black num" style={{ color: '#60a5fa' }}>{brokers.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
      ) : brokers.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={cardStyle}>
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma comissão em aberto no momento</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest sticky left-0" style={{ color: 'var(--text-3)', background: 'var(--card-bg)' }}>
                    <Users className="w-3 h-3 inline mr-1" />Corretor
                  </th>
                  {months.map(m => (
                    <th key={m} className="text-right px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                      {fmtMonth(m)}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: '#14B8A6' }}>
                    Total em aberto
                  </th>
                </tr>
              </thead>
              <tbody>
                {brokers.map(b => (
                  <tr key={b.user_id} className="table-row-cyber">
                    <td className="px-4 py-3 sticky left-0" style={{ background: 'var(--card-bg)' }}>
                      <p className="font-semibold text-sm">{b.user_name || b.user_email}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.user_email}</p>
                    </td>
                    {months.map(m => {
                      const cell = b.by_month[m];
                      return (
                        <td key={m} className="px-4 py-3 text-right">
                          {cell ? (
                            <div>
                              <p className="font-bold num" style={{ color: '#f59e0b' }}>{fmtBRL(cell.corretor)}</p>
                              <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(cell.empresa)}</p>
                            </div>
                          ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <p className="font-black num text-base" style={{ color: '#14B8A6' }}>{fmtBRL(b.total_corretor)}</p>
                      <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(b.total_empresa)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--card-border)' }}>
                  <td className="px-4 py-3 font-bold sticky left-0" style={{ background: 'var(--card-bg)' }}>Total geral</td>
                  {months.map(m => {
                    const cell = totals?.by_month[m];
                    return (
                      <td key={m} className="px-4 py-3 text-right">
                        <p className="font-bold num" style={{ color: '#f59e0b' }}>{fmtBRL(cell?.corretor || 0)}</p>
                        <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(cell?.empresa || 0)}</p>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <p className="font-black num text-base" style={{ color: '#14B8A6' }}>{fmtBRL(totals?.total_corretor || 0)}</p>
                    <p className="text-xs num" style={{ color: 'var(--text-3)' }}>emp. {fmtBRL(totals?.total_empresa || 0)}</p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
