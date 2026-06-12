import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, Building2, RefreshCw } from 'lucide-react';
import { Bank } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

export function AdminBanks() {
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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
            <h1 className="text-xl font-bold text-gray-100">Bancos</h1>
            <p className="text-xs text-slate-500 mt-0.5">{items.length} bancos cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={() => { setName(''); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
            <Plus className="w-4 h-4" /> Novo Banco
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 mb-6 text-sm text-blue-700 dark:text-blue-300">
        Os bancos cadastrados aqui ficam disponíveis para serem vinculados às tabelas financeiras.
        Ao criar uma tabela, o banco selecionado aparece automaticamente no formulário de propostas quando o convênio for escolhido.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="space-y-2 p-3">
          {items.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-3)' }}>Nenhum banco cadastrado</p>}
          {items.slice((page - 1) * perPage, page * perPage).map(b => (
            <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}>
              <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              <p className="flex-1 font-medium" style={{ color: 'var(--text-1)' }}>{b.name}</p>
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
          <Pagination total={items.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Banco' : 'Novo Banco'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-banks" className={btnPrimary} style={primaryBg}>
              <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        }
      >
        <form id="modal-banks" onSubmit={save}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Nome do banco *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} required autoFocus placeholder="Ex: Banco do Brasil" />
        </form>
      </Modal>
    </div>
  );
}
