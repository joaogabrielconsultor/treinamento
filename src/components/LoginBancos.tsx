import { useState, useCallback } from 'react';
import {
  Building2, Copy, Check, Eye, EyeOff, Plus, Pencil, Trash2,
  X, Search, RefreshCw, Link, User, Lock,
} from 'lucide-react';
import { useLoginBancos } from '../hooks/useLoginBancos';
import { LoginBanco } from '../types';

// ─── Accent color per bank name (deterministic) ────────────────────────────────
const ACCENT_COLORS = [
  '#3b82f6', '#f97316', '#8b5cf6', '#eab308',
  '#ec4899', '#06b6d4', '#10b981', '#f43f5e',
  '#a78bfa', '#fb923c', '#34d399', '#60a5fa',
];
function getBankAccent(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h);
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
}

// ─── Copy button ───────────────────────────────────────────────────────────────
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
      style={{
        backgroundColor: copied ? '#16a34a' : '#1f7a5a',
        color: '#ffffff',
      }}
      onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = '#24936b'; }}
      onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = '#1f7a5a'; }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
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

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-dk-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-dk-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dk-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {banco ? 'Editar Banco' : 'Adicionar Banco'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {([
            { label: 'Nome do Banco *', value: nome, setter: setNome, type: 'text', placeholder: 'Ex: Banco do Brasil, Itaú...' },
            { label: 'Login *', value: login, setter: setLogin, type: 'text', placeholder: 'Usuário ou CPF/CNPJ' },
          ] as const).map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <input type={type} value={value} onChange={(e) => setter(e.target.value)} required className={inputCls} placeholder={placeholder} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Senha *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required className={`${inputCls} pr-10`} placeholder="Senha de acesso" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL do Banco *</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required className={inputCls} placeholder="https://internetbanking.banco.com.br" />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors font-medium">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ nome, onConfirm, onCancel }: { nome: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dk-card rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100 dark:border-white/5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir banco?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir <strong className="text-gray-800 dark:text-gray-200">{nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors font-medium">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-[10px] border"
      style={{
        background: 'rgba(0,0,0,0.25)',
        borderColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
      <span className="text-xs font-medium w-10 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      {children}
    </div>
  );
}

// ─── Bank card ─────────────────────────────────────────────────────────────────
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
      className="relative rounded-2xl overflow-hidden transition-all duration-300 cursor-default
        bg-white dark:bg-[#0b2a1d]
        shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]
        hover:-translate-y-[3px]
        hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Accent top line */}
      <div style={{ height: '3px', backgroundColor: accent, borderRadius: '10px 10px 0 0' }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}22` }}>
              <Building2 className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '18px', lineHeight: '1.2' }}>
                {banco.nome}
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', opacity: 0.6 }}>
                {new Date(banco.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(banco)}
                title="Editar"
                className="p-2 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(banco)}
                title="Excluir"
                className="p-2 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-[10px]">
          {/* Login */}
          <FieldRow icon={User} label="Login">
            <span className="flex-1 text-sm text-white font-mono truncate">{banco.login}</span>
            <CopyButton value={banco.login} />
          </FieldRow>

          {/* Senha */}
          <FieldRow icon={Lock} label="Senha">
            <span className="flex-1 text-sm text-white font-mono truncate">
              {showSenha ? banco.senha : maskedSenha}
            </span>
            <button
              onClick={() => setShowSenha(!showSenha)}
              className="flex-shrink-0 p-1 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              title={showSenha ? 'Ocultar' : 'Mostrar'}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >
              {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <CopyButton value={banco.senha} />
          </FieldRow>

          {/* URL */}
          <FieldRow icon={Link} label="URL">
            <a
              href={banco.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm truncate underline-offset-2 hover:underline transition-colors"
              style={{ color: accent }}
              title={banco.url}
            >
              {banco.url}
            </a>
            <CopyButton value={banco.url} />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
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
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login Bancos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {bancos.length} banco{bancos.length !== 1 ? 's' : ''} cadastrado{bancos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-dk-card border border-gray-200 dark:border-dk-border rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          {isAdmin && (
            <button
              onClick={() => { setEditingBanco(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Banco
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por banco, login ou URL..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-dk-card border border-gray-200 dark:border-dk-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((banco) => (
            <BancoCard
              key={banco.id}
              banco={banco}
              isAdmin={isAdmin}
              onEdit={(b) => { setEditingBanco(b); setModalOpen(false); }}
              onDelete={setDeletingBanco}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-dk-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-300 dark:text-white/20" />
          </div>
          {search ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Nenhum banco encontrado</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Tente outro termo de busca</p>
              <button onClick={() => setSearch('')} className="text-sm text-brand hover:text-brand-hover font-medium">Limpar busca</button>
            </>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Nenhum banco cadastrado</p>
              {isAdmin && (
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Clique em{' '}
                  <button onClick={() => setModalOpen(true)} className="text-brand hover:text-brand-hover font-medium">
                    Adicionar Banco
                  </button>{' '}
                  para começar
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
