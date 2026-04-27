import { useState, useCallback } from 'react';
import {
  Building2, Copy, Check, Eye, EyeOff, Plus, Pencil, Trash2,
  X, Search, RefreshCw, Link, User, Lock,
} from 'lucide-react';
import { useLoginBancos } from '../hooks/useLoginBancos';
import { LoginBanco } from '../types';

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
      className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
        copied
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {banco ? 'Editar Banco' : 'Adicionar Banco'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'Nome do Banco *', value: nome, setter: setNome, type: 'text', placeholder: 'Ex: Banco do Brasil, Itaú...' },
            { label: 'Login *',         value: login, setter: setLogin, type: 'text', placeholder: 'Usuário ou CPF/CNPJ' },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                placeholder={placeholder}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Senha *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Senha de acesso"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL do Banco *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="https://internetbanking.banco.com.br"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors font-medium">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ nome, onConfirm, onCancel }: {
  nome: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir banco?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors font-medium">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function BancoCard({ banco, isAdmin, onEdit, onDelete }: {
  banco: LoginBanco; isAdmin: boolean;
  onEdit: (b: LoginBanco) => void;
  onDelete: (b: LoginBanco) => void;
}) {
  const [showSenha, setShowSenha] = useState(false);
  const maskedSenha = '•'.repeat(Math.min(banco.senha.length, 12));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-light dark:bg-brand/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{banco.nome}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(banco.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(banco)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand-light dark:hover:bg-brand/20 transition-colors" title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(banco)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 flex-shrink-0">Login</span>
          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-mono truncate">{banco.login}</span>
          <CopyButton value={banco.login} />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
          <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 flex-shrink-0">Senha</span>
          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-mono truncate">
            {showSenha ? banco.senha : maskedSenha}
          </span>
          <button onClick={() => setShowSenha(!showSenha)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title={showSenha ? 'Ocultar' : 'Mostrar'}>
            {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <CopyButton value={banco.senha} />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
          <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 flex-shrink-0">URL</span>
          <a href={banco.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-sm text-brand hover:text-brand-hover truncate underline-offset-2 hover:underline transition-colors"
            title={banco.url}>
            {banco.url}
          </a>
          <CopyButton value={banco.url} />
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login Bancos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {bancos.length} banco{bancos.length !== 1 ? 's' : ''} cadastrado{bancos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          {isAdmin && (
            <button onClick={() => { setEditingBanco(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover transition-colors font-medium">
              <Plus className="w-4 h-4" />
              Adicionar Banco
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por banco, login ou URL..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          {search ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Nenhum banco encontrado</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Tente outro termo de busca</p>
              <button onClick={() => setSearch('')} className="text-sm text-brand hover:text-brand-hover font-medium">
                Limpar busca
              </button>
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
