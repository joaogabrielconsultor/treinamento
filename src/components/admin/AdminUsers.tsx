import { useState } from 'react';
import { Users, Shield, ShieldOff, BookOpen, RefreshCw, Plus, X, Eye, EyeOff, Crown } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdmin';

const MASTER_ADMIN_EMAIL = 'adm@rozesstartflow.com';

function CreateUserModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (email: string, password: string, name: string, role: 'user' | 'admin') => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(email, password, name, role);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Criar Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Nome do usuário"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="email@empresa.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Função</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUsers({ currentUserEmail }: { currentUserEmail: string }) {
  const { users, loading, toggleRole, createUser, refetch } = useAdminUsers();
  const [showCreate, setShowCreate] = useState(false);

  const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={createUser}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Usuários</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand rounded-xl hover:bg-brand-hover transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Criar usuário
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Função</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matrículas</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cadastro</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {users.map((user) => {
              const name = user.full_name || user.email?.split('@')[0] || 'Usuário';
              const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
              const date = new Date(user.created_at).toLocaleDateString('pt-BR');
              const isThisMaster = user.email === MASTER_ADMIN_EMAIL;

              return (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isThisMaster ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-brand-light dark:bg-brand/20'}`}>
                        {isThisMaster
                          ? <Crown className="w-4 h-4 text-amber-600" />
                          : <span className="text-brand text-sm font-bold">{initials}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                          {isThisMaster && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              <Crown className="w-2.5 h-2.5" /> Master
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {user.enrollment_count}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{date}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isMasterAdmin && !isThisMaster && (
                      <button
                        onClick={() => toggleRole(user.id, user.role)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.role === 'admin'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                        }`}
                      >
                        {user.role === 'admin'
                          ? <><ShieldOff className="w-3.5 h-3.5" /> Remover Admin</>
                          : <><Shield className="w-3.5 h-3.5" /> Tornar Admin</>}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
