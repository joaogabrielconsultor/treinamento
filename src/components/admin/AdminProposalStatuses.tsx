import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Save, Shield } from 'lucide-react';
import { ProposalStatusDef } from '../../types';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const COLORS = [
  { value: 'blue',   label: 'Azul',    cls: 'badge badge-blue' },
  { value: 'amber',  label: 'Amarelo', cls: 'badge badge-amber' },
  { value: 'purple', label: 'Roxo',    cls: 'badge badge-purple' },
  { value: 'green',  label: 'Verde',   cls: 'badge badge-green' },
  { value: 'red',    label: 'Vermelho',cls: 'badge badge-red' },
  { value: 'teal',   label: 'Teal',    cls: 'badge badge-teal' },
];

function StatusModal({ status, onClose, onSave }: {
  status: ProposalStatusDef | null;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState(status?.name || '');
  const [color, setColor] = useState(status?.color || 'blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Nome obrigatório');
    setSaving(true);
    try { await onSave(name.trim(), color); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao salvar'); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{status ? 'Editar Status' : 'Novo Status'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Nome do Status</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Em Vistoria" autoFocus
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" disabled={status?.is_system} />
            {status?.is_system && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Nome do status do sistema não pode ser alterado</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className={`${c.cls} px-3 py-1 text-xs font-semibold rounded-lg transition-all ${color === c.value ? 'ring-2 ring-offset-1 ring-white/30' : 'opacity-60'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl btn-cyber">
              <Save className="w-3.5 h-3.5" />{saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminProposalStatuses() {
  const [statuses, setStatuses] = useState<ProposalStatusDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ProposalStatusDef | null | 'new'>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await API('/api/proposal-statuses').then(r => r.json());
    setStatuses(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(name: string, color: string) {
    if (modal && modal !== 'new') {
      await API(`/api/admin/proposal-statuses/${(modal as ProposalStatusDef).id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: (modal as ProposalStatusDef).is_system ? (modal as ProposalStatusDef).name : name, color, order_index: (modal as ProposalStatusDef).order_index }),
      });
    } else {
      await API('/api/admin/proposal-statuses', { method: 'POST', body: JSON.stringify({ name, color }) });
    }
    setModal(null);
    load();
  }

  async function handleDelete(s: ProposalStatusDef) {
    setDeleteErr(null);
    const res = await API(`/api/admin/proposal-statuses/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); setDeleteErr(d.error || 'Erro ao excluir'); return; }
    load();
  }

  const BADGE: Record<string, string> = {
    blue: 'badge badge-blue', amber: 'badge badge-amber', purple: 'badge badge-purple',
    green: 'badge badge-green', red: 'badge badge-red', teal: 'badge badge-teal',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {modal !== null && (
        <StatusModal status={modal === 'new' ? null : modal as ProposalStatusDef} onClose={() => setModal(null)} onSave={handleSave} />
      )}

      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Status de Propostas</h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{statuses.length} status cadastrados</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl btn-cyber font-semibold">
          <Plus className="w-4 h-4" /> Novo Status
        </button>
      </div>

      {deleteErr && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {deleteErr}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          {statuses.length === 0 ? (
            <div className="text-center py-16">
              <Tag className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum status cadastrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Status', 'Tipo', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statuses.map(s => (
                  <tr key={s.id} className="table-row-cyber">
                    <td className="px-5 py-3.5">
                      <span className={`${BADGE[s.color] || 'badge badge-blue'} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold`}>
                        {s.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.is_system ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
                          <Shield className="w-3 h-3" /> Sistema
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Personalizado</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setModal(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium badge badge-blue">
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        {!s.is_system && (
                          <button onClick={() => handleDelete(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
