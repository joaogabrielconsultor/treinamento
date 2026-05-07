import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { TableCategory } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

export function AdminCategories() {
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', multiplier: '1' });

  async function load() {
    setLoading(true);
    const r = await API('/api/categories');
    const data = await r.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const url = editId ? `/api/categories/${editId}` : '/api/categories';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify({ name: form.name, multiplier: parseFloat(form.multiplier) }) });
    setShowForm(false);
    await load();
  }

  async function del(id: string) {
    if (!confirm('Excluir esta categoria?')) return;
    await API(`/api/categories/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias de Tabelas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure os multiplicadores de pontuação</p>
        </div>
        <button onClick={() => { setForm({ name: '', multiplier: '1' }); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* Explanation */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-xl p-4 mb-6 text-sm text-yellow-800 dark:text-yellow-300">
        <strong>Como funciona:</strong> Os pontos ganhos em uma proposta = <em>pontos da faixa × multiplicador da categoria</em>.
        Uma tabela com categoria "Alta comissão" (×2) e faixa de 60 pontos gera <strong>120 pontos</strong>.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 bg-white dark:bg-dk-card rounded-xl border border-gray-100 dark:border-dk-border shadow-sm">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#dabb3920', color: '#dabb39' }}>
                  ×{c.multiplier}
                </div>
                <button onClick={() => { setForm({ name: c.name, multiplier: String(c.multiplier) }); setEditId(c.id); setShowForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(c.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma categoria cadastrada</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} required placeholder="Ex: Alta comissão" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Multiplicador</label>
                <input type="number" step="0.01" min="0.1" value={form.multiplier} onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))} className={inp} required />
                <p className="text-xs text-gray-400 mt-1">Ex: 2 = dobra os pontos, 0.5 = metade dos pontos</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: '#1e4033' }}>
                  <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
