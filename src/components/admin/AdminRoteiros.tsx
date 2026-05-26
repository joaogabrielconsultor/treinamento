import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, BookOpen, FileText, Building2, ExternalLink, Upload } from 'lucide-react';
import { Bank } from '../../types';
import { Modal, btnCancel, btnPrimary } from '../ui/Modal';

const token = () => localStorage.getItem('token') ?? '';
const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts?.headers ?? {}) } });

interface Roteiro {
  id: string;
  bank_id: string | null;
  bank_name: string | null;
  title: string;
  description: string;
  file_url: string;
  original_name: string;
  created_at: string;
}

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

export function AdminRoteiros() {
  const [items, setItems] = useState<Roteiro[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Roteiro | null>(null);

  const [bankId, setBankId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([API('/api/roteiros'), API('/api/banks')]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    setItems(Array.isArray(d1) ? d1 : []);
    setBanks(Array.isArray(d2) ? d2 : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditItem(null);
    setBankId('');
    setTitle('');
    setDesc('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setShowForm(true);
  }

  function openEdit(item: Roteiro) {
    setEditItem(item);
    setBankId(item.bank_id ?? '');
    setTitle(item.title);
    setDesc(item.description);
    setFile(null);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      if (editItem) {
        await API(`/api/roteiros/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title, description: desc, bank_id: bankId || null }),
        });
      } else {
        if (!file) return;
        const fd = new FormData();
        fd.append('pdf', file);
        fd.append('title', title);
        fd.append('description', desc);
        if (bankId) fd.append('bank_id', bankId);
        await fetch('/api/roteiros/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        });
      }
      setShowForm(false);
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function del(id: string) {
    if (!confirm('Excluir este roteiro? O arquivo PDF será removido permanentemente.')) return;
    await API(`/api/roteiros/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1a2e4a' }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Roteiros Operacionais</h1>
            <p className="text-xs text-slate-500 mt-0.5">{items.length} roteiro{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
          <Plus className="w-4 h-4" /> Novo Roteiro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p style={{ color: 'var(--text-3)' }}>Nenhum roteiro cadastrado</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Clique em "Novo Roteiro" para adicionar o primeiro PDF</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="space-y-2 p-3">
            {items.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}
              >
                <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#2DD4BF' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{r.title}</p>
                  {r.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{r.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{r.bank_name ?? 'Sem banco'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: '#2DD4BF' }}
                    title="Abrir PDF"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? 'Editar Roteiro' : 'Novo Roteiro'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-roteiros" className={btnPrimary} disabled={uploading}>
              {uploading
                ? <span className="flex items-center gap-2 justify-center"><Upload className="w-4 h-4 animate-bounce" /> Enviando...</span>
                : <span className="flex items-center gap-2 justify-center"><Save className="w-4 h-4" />{editItem ? 'Salvar' : 'Enviar'}</span>
              }
            </button>
          </div>
        }
      >
        <form id="modal-roteiros" onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Banco</label>
            <select value={bankId} onChange={e => setBankId(e.target.value)} className={inp}>
              <option value="">Sem banco</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inp}
              required
              autoFocus
              placeholder="Ex: Roteiro Novo FGTS"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Produto / Descrição</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className={inp}
              placeholder="Ex: FGTS – Saque Aniversário"
            />
          </div>
          {!editItem && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Arquivo PDF *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className={inp}
                required
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                Para trocar o arquivo, exclua e crie um novo roteiro.
              </p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
