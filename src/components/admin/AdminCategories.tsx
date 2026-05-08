import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';
import { TableCategory } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

export function AdminCategories() {
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', multiplier: '1' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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
          <h1 className="text-xl font-bold text-gray-100">Categorias de Tabelas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure os multiplicadores de pontuação</p>
        </div>
        <button onClick={() => { setForm({ name: '', multiplier: '1' }); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
        <strong>Como funciona:</strong> Os pontos ganhos em uma proposta = <em>pontos da faixa × multiplicador da categoria</em>.
        Uma tabela com categoria "Alta comissão" (×2) e faixa de 60 pontos gera <strong>120 pontos</strong>.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="space-y-2 p-3">
          {categories.slice((page - 1) * perPage, page * perPage).map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{c.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-sm font-bold num" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  ×{c.multiplier}
                </div>
                <button onClick={() => { setForm({ name: c.name, multiplier: String(c.multiplier) }); setEditId(c.id); setShowForm(true); }}
                  className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(c.id)}
                  className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma categoria cadastrada</p>}
          </div>
          <Pagination total={categories.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Categoria' : 'Nova Categoria'}
        size="md"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-categories" className={btnPrimary} style={primaryBg}>
              <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        }
      >
        <form id="modal-categories" onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} required autoFocus placeholder="Ex: Alta comissão" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Multiplicador</label>
            <input type="number" step="0.01" min="0.1" value={form.multiplier} onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))} className={inp} required />
            <p className="text-xs text-gray-400 mt-1">Ex: 2 = dobra os pontos, 0.5 = metade dos pontos</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
