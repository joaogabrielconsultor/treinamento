import { useState, useCallback } from 'react';
import {
  Building2, Copy, Check, Eye, EyeOff, Plus, Pencil, Trash2,
  X, Search, RefreshCw, Link, User, Lock, ExternalLink,
} from 'lucide-react';
import { useLoginBancos } from '../hooks/useLoginBancos';
import { LoginBanco } from '../types';

const ACCENT_COLORS = [
  '#14B8A6', '#06B6D4', '#8b5cf6', '#f59e0b',
  '#ec4899', '#3b82f6', '#22c55e', '#f43f5e',
  '#a78bfa', '#fb923c', '#2DD4BF', '#60a5fa',
];
function getBankAccent(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h);
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copiado!' : 'Copiar'}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
      style={copied
        ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
        : { background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-3)' }
      }
      onMouseEnter={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,184,166,0.25)';
          (e.currentTarget as HTMLElement).style.color = '#14B8A6';
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
        }
      }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

function BancoModal({ banco, onClose, onSave }: {
  banco: LoginBanco | null;
  onClose: () => void;
  onSave: (data: { nome: string; login: string; senha: string; url: string }) => Promise<void>;
}) {
  const [nome, setNome] = useState(banco?.nome ?? '');
  const [login, setLogin] = useState(banco?.login ?? '');
  const [senha, setSenha] = useState(banco?.senha ?? '');
  const [url, setUrl] = useState(banco?.url ?? '');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !login.trim() || !senha.trim() || !url.trim()) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({ nome: nome.trim(), login: login.trim(), senha: senha.trim(), url: url.trim() });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-overlay-in"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 animate-modal-in modal-panel"
        style={{ zIndex: 1 }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.4), transparent)',
            borderRadius: '16px 16px 0 0',
          }}
        />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>
            {banco ? 'Editar Banco' : 'Adicionar Banco'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ color: 'var(--text-3)', background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {([
            { label: 'Nome do Banco', value: nome, setter: setNome, type: 'text', placeholder: 'Ex: Banco do Brasil, Itaú...' },
            { label: 'Login', value: login, setter: setLogin, type: 'text', placeholder: 'Usuário ou CPF/CNPJ' },
          ] as const).map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>{label} *</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
                placeholder={placeholder}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Senha *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="input-cyber w-full px-3 py-2.5 pr-11 text-sm rounded-xl"
                placeholder="Senha de acesso"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>URL do Banco *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
              placeholder="https://internetbanking.banco.com.br"
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-cyber"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ nome, onConfirm, onCancel }: { nome: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-overlay-in"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 animate-modal-in modal-panel"
        style={{ zIndex: 1 }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)',
            borderRadius: '16px 16px 0 0',
          }}
        />
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Excluir banco?</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          Tem certeza que deseja excluir{' '}
          <strong style={{ color: 'var(--text-2)' }}>{nome}</strong>?{' '}
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-ghost"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-danger"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
      <span className="text-[10px] font-bold uppercase tracking-wider w-9 flex-shrink-0" style={{ color: 'var(--text-3)' }}>{label}</span>
      {children}
    </div>
  );
}

function BancoCard({ banco, isAdmin, onEdit, onDelete }: {
  banco: LoginBanco;
  isAdmin: boolean;
  onEdit: (b: LoginBanco) => void;
  onDelete: (b: LoginBanco) => void;
}) {
  const [showSenha, setShowSenha] = useState(false);
  const maskedSenha = '•'.repeat(Math.min(banco.senha.length, 12));
  const accent = getBankAccent(banco.nome);

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-300 cursor-default"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-lifted), 0 0 0 1px ${accent}22`;
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
      }}
    >
      {/* Accent top line */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
            >
              <Building2 className="w-4.5 h-4.5" style={{ color: accent }} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-1)' }}>
                {banco.nome}
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {new Date(banco.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(banco)}
                title="Editar"
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(banco)}
                title="Excluir"
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                  (e.currentTarget as HTMLElement).style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <FieldRow icon={User} label="Login">
            <span className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--text-1)' }}>{banco.login}</span>
            <CopyButton value={banco.login} />
          </FieldRow>

          <FieldRow icon={Lock} label="Senha">
            <span className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--text-1)' }}>
              {showSenha ? banco.senha : maskedSenha}
            </span>
            <button
              onClick={() => setShowSenha(!showSenha)}
              className="flex-shrink-0 p-1 rounded transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
            >
              {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <CopyButton value={banco.senha} />
          </FieldRow>

          <FieldRow icon={Link} label="URL">
            <a
              href={banco.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm truncate flex items-center gap-1 hover:underline underline-offset-2 transition-colors"
              style={{ color: accent }}
              title={banco.url}
            >
              <span className="truncate">{banco.url.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
            </a>
            <CopyButton value={banco.url} />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

export function LoginBancos({ isAdmin }: { isAdmin: boolean }) {
  const { bancos, loading, createBanco, updateBanco, deleteBanco, refetch } = useLoginBancos();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState<LoginBanco | null>(null);
  const [deletingBanco, setDeletingBanco] = useState<LoginBanco | null>(null);

  const filtered = bancos.filter((b) =>
    b.nome.toLowerCase().includes(search.toLowerCase()) ||
    b.login.toLowerCase().includes(search.toLowerCase()) ||
    b.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: { nome: string; login: string; senha: string; url: string }) => {
    if (editingBanco) await updateBanco(editingBanco.id, data);
    else await createBanco(data);
  };

  const handleDelete = async () => {
    if (!deletingBanco) return;
    await deleteBanco(deletingBanco.id);
    setDeletingBanco(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-cyber" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {(modalOpen || editingBanco) && (
        <BancoModal
          banco={editingBanco}
          onClose={() => { setModalOpen(false); setEditingBanco(null); }}
          onSave={handleSave}
        />
      )}
      {deletingBanco && (
        <DeleteConfirm
          nome={deletingBanco.nome}
          onConfirm={handleDelete}
          onCancel={() => setDeletingBanco(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4" style={{ color: '#14B8A6' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Login Bancos</h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {bancos.length} banco{bancos.length !== 1 ? 's' : ''} cadastrado{bancos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl btn-ghost"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          {isAdmin && (
            <button
              onClick={() => { setEditingBanco(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl btn-cyber"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Banco
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-3)' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar banco, login ou URL..."
          className="input-cyber w-full pl-10 pr-10 py-2.5 text-sm rounded-xl"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((banco, i) => (
            <div key={banco.id} className="animate-fade-up" style={{ animationDelay: `${120 + i * 50}ms` }}>
              <BancoCard
                banco={banco}
                isAdmin={isAdmin}
                onEdit={(b) => { setEditingBanco(b); setModalOpen(false); }}
                onDelete={setDeletingBanco}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 animate-fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
          >
            <Building2 className="w-8 h-8" style={{ color: '#334155' }} />
          </div>
          {search ? (
            <>
              <p className="font-medium mb-1" style={{ color: 'var(--text-3)' }}>Nenhum banco encontrado</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>Tente outro termo de busca</p>
              <button
                onClick={() => setSearch('')}
                className="text-sm font-medium transition-colors"
                style={{ color: '#14B8A6' }}
              >
                Limpar busca
              </button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1" style={{ color: 'var(--text-3)' }}>Nenhum banco cadastrado</p>
              {isAdmin && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#14B8A6' }}
                >
                  Adicionar primeiro banco
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
