import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, Package } from 'lucide-react';
import { Product } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

export function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  async function load() {
    setLoading(true);
    const r = await API('/api/products');
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const url = editId ? `/api/products/${editId}` : '/api/products';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify({ name }) });
    setShowForm(false);
    setName('');
    setEditId(null);
    await load();
  }

  async function del(id: string) {
    if (!confirm('Excluir este produto?')) return;
    await API(`/api/products/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1e4033' }}>
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Produtos</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{items.length} produtos cadastrados</p>
          </div>
        </div>
        <button onClick={() => { setName(''); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl p-4 mb-6 text-sm text-purple-700 dark:text-purple-300">
        Os produtos cadastrados aqui aparecem como opção no formulário de proposta.
        Exemplos: <strong>INSS, FGTS, CLT, Siape, Prefeitura</strong>.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="space-y-2 p-3">
          {items.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-3)' }}>Nenhum produto cadastrado</p>}
          {items.slice((page - 1) * perPage, page * perPage).map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}>
              <Package className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              <p className="flex-1 font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => { setName(p.name); setEditId(p.id); setShowForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(p.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          </div>
          <Pagination total={items.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Produto' : 'Novo Produto'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-products" className={btnPrimary} style={primaryBg}>
              <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        }
      >
        <form id="modal-products" onSubmit={save}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Nome do produto *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} required autoFocus placeholder="Ex: INSS, FGTS, Siape..." />
        </form>
      </Modal>
    </div>
  );
}
