import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Building2 } from 'lucide-react';
import { Bank } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

export function AdminBanks() {
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');

  async function load() {
    setLoading(true);
    const r = await API('/api/banks');
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const url = editId ? `/api/banks/${editId}` : '/api/banks';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify({ name }) });
    setShowForm(false);
    setName('');
    setEditId(null);
    await load();
  }

  async function del(id: string) {
    if (!confirm('Excluir este banco? As tabelas vinculadas perderão a referência.')) return;
    await API(`/api/banks/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1e4033' }}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bancos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} bancos cadastrados</p>
          </div>
        </div>
        <button onClick={() => { setName(''); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
          <Plus className="w-4 h-4" /> Novo Banco
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 mb-6 text-sm text-blue-700 dark:text-blue-300">
        Os bancos cadastrados aqui ficam disponíveis para serem vinculados às tabelas financeiras.
        Ao criar uma tabela, o banco selecionado aparece automaticamente no formulário de propostas quando o convênio for escolhido.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum banco cadastrado</p>}
          {items.map(b => (
            <div key={b.id} className="flex items-center gap-4 p-4 bg-white dark:bg-dk-card rounded-xl border border-gray-100 dark:border-dk-border shadow-sm">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <p className="flex-1 font-medium text-gray-900 dark:text-white">{b.name}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => { setName(b.name); setEditId(b.id); setShowForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(b.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dk-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Editar Banco' : 'Novo Banco'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nome do banco *</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inp} required autoFocus placeholder="Ex: Banco do Brasil" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">Cancelar</button>
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
