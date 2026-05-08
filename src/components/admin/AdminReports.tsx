import { useState, useEffect } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import { Proposal, FinancialTable } from '../../types';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

interface UserOption { id: string; full_name: string; email: string; }

export function AdminReports() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    bank: '', table_id: '', user_id: '', convenio: '', product: '', status: '', start_date: '', end_date: '',
  });

  async function load() {
    const [tr, us] = await Promise.all([
      API('/api/financial-tables').then(r => r.json()),
      API('/api/admin/users').then(r => r.json()),
    ]);
    setTables(Array.isArray(tr) ? tr : []);
    setUsers(Array.isArray(us) ? us : []);
  }

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const r = await API(`/api/proposals?${params.toString()}`);
    const data = await r.json();
    setProposals(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); search(); }, []);

  function exportCSV() {
    const header = ['Proposta', 'Corretor', 'Cliente', 'CPF', 'Banco', 'Tabela', 'Convênio', 'Produto', 'Valor', 'Status', 'Pontos', 'Data'];
    const rows = proposals.map(p => [
      p.proposal_number, p.user_name || '', p.client_name, p.client_cpf,
      p.bank, p.table_name || '', p.convenio, p.product,
      Number(p.value).toFixed(2), p.status, p.points_earned, fmtDate(p.created_at),
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propostas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const totalValue = proposals.filter(p => p.status === 'Paga').reduce((a, b) => a + Number(b.value), 0);

  const F = filters;
  const setF = (k: keyof typeof filters, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const inp = 'input-cyber text-sm rounded-xl';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Relatórios</h1>
          <p className="text-xs text-slate-500 mt-0.5">Filtre e exporte dados de produção</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Filtros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Corretor</label>
            <select value={F.user_id} onChange={e => setF('user_id', e.target.value)} className={inp}>
              <option value="">Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Banco</label>
            <input value={F.bank} onChange={e => setF('bank', e.target.value)} className={inp} placeholder="Filtrar por banco" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tabela</label>
            <select value={F.table_id} onChange={e => setF('table_id', e.target.value)} className={inp}>
              <option value="">Todas</option>
              {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Produto</label>
            <input value={F.product} onChange={e => setF('product', e.target.value)} className={inp} placeholder="Filtrar por produto" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Convênio</label>
            <input value={F.convenio} onChange={e => setF('convenio', e.target.value)} className={inp} placeholder="Filtrar por convênio" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select value={F.status} onChange={e => setF('status', e.target.value)} className={inp}>
              <option value="">Todos</option>
              {['Digitada','Em análise','Aprovada','Paga','Cancelada'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data inicial</label>
            <input type="date" value={F.start_date} onChange={e => setF('start_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data final</label>
            <input type="date" value={F.end_date} onChange={e => setF('end_date', e.target.value)} className={inp} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={search} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm btn-cyber font-semibold disabled:opacity-60">
            <Search className="w-4 h-4" />{loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Results summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-gray-500">Resultados</p>
          <p className="text-xl font-bold text-blue-600">{proposals.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-gray-500">Volume pago</p>
          <p className="text-xl font-bold text-green-600">{fmtBRL(totalValue)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs text-gray-500">Propostas pagas</p>
          <p className="text-xl font-bold text-brand">{proposals.filter(p => p.status === 'Paga').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Data', 'Proposta', 'Corretor', 'Cliente', 'Banco', 'Tabela', 'Produto', 'Convênio', 'Valor', 'Status', 'Pts'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Nenhum resultado</td></tr>
              ) : proposals.map(p => (
                <tr key={p.id} className="table-row-cyber">
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-700 dark:text-gray-300">{p.proposal_number || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{p.user_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{p.client_name}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{p.bank}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[140px] truncate">{p.table_name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{p.product}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{p.convenio || '—'}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{fmtBRL(Number(p.value))}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Paga' ? 'bg-green-100 text-green-700' : p.status === 'Cancelada' ? 'bg-red-100 text-red-700' : p.status === 'Aprovada' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.points_earned > 0 ? <span className="text-yellow-600 font-bold text-xs">{p.points_earned}</span> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
