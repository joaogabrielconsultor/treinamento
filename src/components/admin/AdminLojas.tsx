import { useState, useEffect } from 'react';
import { Store, Plus, Edit2, Trash2, X, Save, Users, RefreshCw } from 'lucide-react';
import { Loja } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

function LojaModal({ loja, onClose, onSave }: {
  loja: Loja | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(loja?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Nome obrigatório');
    setSaving(true);
    setError('');
    try { await onSave(name.trim()); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao salvar'); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{loja ? 'Editar Loja' : 'Nova Loja'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Nome da Loja</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Loja Centro" autoFocus
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl btn-cyber">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function handle() {
    setLoading(true);
    setError('');
    try { await onConfirm(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao excluir'); setLoading(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir Loja</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Tem certeza que deseja excluir</p>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>{name}?</p>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
          <button onClick={handle} disabled={loading} className="flex-1 py-2.5 text-sm rounded-xl btn-danger font-semibold">
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLojas() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Loja | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Loja | null>(null);

  async function load() {
    setLoading(true);
    const data = await API('/api/admin/lojas').then(r => r.json());
    setLojas(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(name: string) {
    if (modal && modal !== 'new') {
      await API(`/api/admin/lojas/${(modal as Loja).id}`, { method: 'PUT', body: JSON.stringify({ name }) });
    } else {
      await API('/api/admin/lojas', { method: 'POST', body: JSON.stringify({ name }) });
    }
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    const res = await API(`/api/admin/lojas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir');
    }
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {modal !== null && modal !== undefined && (
        <LojaModal
          loja={modal === 'new' ? null : modal as Loja}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}

      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Lojas</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{lojas.length} loja{lojas.length !== 1 ? 's' : ''} cadastrada{lojas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl btn-cyber font-semibold">
            <Plus className="w-4 h-4" /> Nova Loja
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          {lojas.length === 0 ? (
            <div className="text-center py-16">
              <Store className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhuma loja cadastrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Loja', 'Corretores', 'Cadastro', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lojas.map(l => (
                  <tr key={l.id} className="table-row-cyber">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.18)' }}>
                          <Store className="w-4 h-4" style={{ color: '#14B8A6' }} />
                        </div>
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{l.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-3)' }}>
                        <Users className="w-3.5 h-3.5" />
                        {l.user_count ?? 0}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {new Date(l.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setModal(l)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium badge badge-blue">
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button onClick={() => setDeleteTarget(l)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
