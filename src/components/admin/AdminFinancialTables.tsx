import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, ChevronDown, Save, Settings } from 'lucide-react';
import { FinancialTable, TableCategory, ScoringRule } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

const EMPTY_TABLE = { name: '', bank: '', category_id: '', active: true };

export function AdminFinancialTables() {
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TABLE);
  const [rulesTableId, setRulesTableId] = useState<string | null>(null);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [newRule, setNewRule] = useState({ min_value: '', max_value: '', points: '' });

  async function load() {
    setLoading(true);
    const [t, c] = await Promise.all([
      API('/api/financial-tables').then(r => r.json()),
      API('/api/categories').then(r => r.json()),
    ]);
    setTables(Array.isArray(t) ? t : []);
    setCategories(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  async function loadRules(tableId: string) {
    const r = await API(`/api/scoring-rules/${tableId}`);
    const data = await r.json();
    setRules(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function saveTable(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, category_id: form.category_id || null };
    const url = editId ? `/api/financial-tables/${editId}` : '/api/financial-tables';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
    setShowForm(false);
    setEditId(null);
    await load();
  }

  async function deleteTable(id: string) {
    if (!confirm('Excluir esta tabela? As regras serão removidas.')) return;
    await API(`/api/financial-tables/${id}`, { method: 'DELETE' });
    await load();
  }

  async function openRules(t: FinancialTable) {
    setRulesTableId(t.id);
    await loadRules(t.id);
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    await API('/api/scoring-rules', {
      method: 'POST',
      body: JSON.stringify({
        table_id: rulesTableId,
        min_value: parseFloat(newRule.min_value) || 0,
        max_value: newRule.max_value ? parseFloat(newRule.max_value) : null,
        points: parseInt(newRule.points) || 0,
      }),
    });
    setNewRule({ min_value: '', max_value: '', points: '' });
    await loadRules(rulesTableId!);
  }

  async function deleteRule(id: string) {
    await API(`/api/scoring-rules/${id}`, { method: 'DELETE' });
    await loadRules(rulesTableId!);
  }

  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const rulesTable = tables.find(t => t.id === rulesTableId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tabelas Financeiras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tables.length} tabelas cadastradas</p>
        </div>
        <button onClick={() => { setForm(EMPTY_TABLE); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
          <Plus className="w-4 h-4" /> Nova Tabela
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dk-border">
                {['Nome', 'Banco', 'Categoria', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhuma tabela cadastrada</td></tr>
              ) : tables.map(t => (
                <tr key={t.id} className="border-b border-gray-50 dark:border-dk-border/50 hover:bg-gray-50 dark:hover:bg-dk-surface/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[300px] truncate">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.bank || '—'}</td>
                  <td className="px-4 py-3">
                    {t.category_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">
                        {t.category_name} <span className="opacity-60">×{t.category_multiplier}</span>
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-dk-surface text-gray-500'}`}>
                      {t.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openRules(t)} title="Regras de pontuação"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-brand transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setForm({ name: t.name, bank: t.bank, category_id: t.category_id || '', active: t.active }); setEditId(t.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTable(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Editar Tabela' : 'Nova Tabela'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={saveTable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nome da Tabela *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} required placeholder="Ex: APROVAMAIS NEO_096-299_318661 - CC-CB" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Banco</label>
                <input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Categoria</label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Tabela ativa</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
                  <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scoring rules modal */}
      {rulesTableId && rulesTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Regras de Pontuação</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[350px]">{rulesTable.name}</p>
              </div>
              <button onClick={() => setRulesTableId(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {/* Existing rules */}
              {rules.length > 0 && (
                <div className="mb-4 space-y-2">
                  {rules.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dk-surface rounded-xl">
                      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {fmtBRL(Number(r.min_value))} {r.max_value ? `até ${fmtBRL(Number(r.max_value))}` : 'ou mais'} = <span className="font-bold text-brand">{r.points} pontos</span>
                      </div>
                      <button onClick={() => deleteRule(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add rule form */}
              <form onSubmit={addRule} className="border border-dashed border-gray-200 dark:border-dk-border rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nova faixa</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor mínimo (R$)</label>
                    <input type="number" step="0.01" min="0" value={newRule.min_value} onChange={e => setNewRule(r => ({ ...r, min_value: e.target.value }))} className={inp} placeholder="0" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor máximo (R$)</label>
                    <input type="number" step="0.01" min="0" value={newRule.max_value} onChange={e => setNewRule(r => ({ ...r, max_value: e.target.value }))} className={inp} placeholder="Sem limite" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pontos base</label>
                    <input type="number" min="0" value={newRule.points} onChange={e => setNewRule(r => ({ ...r, points: e.target.value }))} className={inp} placeholder="10" required />
                  </div>
                </div>
                <button type="submit" className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
                  <Plus className="w-4 h-4 inline mr-1" />Adicionar faixa
                </button>
              </form>
              {rulesTable.category_name && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Multiplicador da categoria <strong>{rulesTable.category_name}</strong>: ×{rulesTable.category_multiplier}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
