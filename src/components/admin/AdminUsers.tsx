import { useState, useEffect } from 'react';
import { Users, Shield, ShieldOff, BookOpen, RefreshCw, Plus, X, Eye, EyeOff, Crown, Archive, ArchiveRestore, KeyRound, Store, Edit2, Save } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdmin';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const MASTER_ADMIN_EMAIL = 'adm@rozesstartflow.com';

function CreateUserModal({ onClose, onCreate, lojas }: {
  onClose: () => void;
  onCreate: (email: string, password: string, name: string, role: 'user' | 'admin', loja_id?: string) => Promise<void>;
  lojas: { id: string; name: string }[];
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [lojaId, setLojaId] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(email, password, name, role, lojaId || undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Criar Usuário</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}>
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
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
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
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
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
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-dk-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-dk-surface text-gray-900 dark:text-white"
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
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {lojas.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Loja</label>
              <select value={lojaId} onChange={e => setLojaId(e.target.value)}
                className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl">
                <option value="">Sem loja</option>
                {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-cyber"
            >
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ userName, onClose, onSave }: {
  userName: string;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(password);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Alterar Senha</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nova senha para <span className="font-medium text-gray-800 dark:text-gray-200">{userName}</span></p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-dk-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-dk-surface text-gray-900 dark:text-white"
              placeholder="Mínimo 6 caracteres"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-cyber">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArchiveConfirmModal({ userName, isUnarchive, onClose, onConfirm }: {
  userName: string;
  isUnarchive?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao arquivar usuário');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>
            {isUnarchive ? 'Reativar Usuário' : 'Arquivar Usuário'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {isUnarchive ? 'Reativar o usuário' : 'Tem certeza que deseja arquivar'}
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{userName}?</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          {isUnarchive
            ? 'O usuário voltará a ter acesso ao sistema.'
            : 'O usuário perderá o acesso ao sistema. Você pode reativá-lo depois.'}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-ghost">
            Cancelar
          </button>
          <button onClick={confirm} disabled={loading} className={`flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold ${isUnarchive ? 'btn-cyber' : 'btn-danger'}`}>
            {loading ? (isUnarchive ? 'Reativando...' : 'Arquivando...') : (isUnarchive ? 'Reativar' : 'Arquivar')}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }: {
  user: { id: string; name: string; email: string };
  onClose: () => void;
  onSave: (full_name: string, email: string) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(name, email);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Editar Usuário</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome completo</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" placeholder="Nome do usuário" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" placeholder="email@empresa.com" />
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm rounded-xl btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl btn-cyber">
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUsers({ currentUserEmail }: { currentUserEmail: string }) {
  const [showArchived, setShowArchived] = useState(false);
  const { users, loading, toggleRole, createUser, updateLoja, editUser, archiveUser, unarchiveUser, changePassword, refetch } = useAdminUsers(showArchived);
  const [lojas, setLojas] = useState<{ id: string; name: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [changePwdUser, setChangePwdUser] = useState<{ id: string; name: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; isUnarchive?: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const paginated = users.slice((page - 1) * perPage, page * perPage);

  const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;

  useEffect(() => {
    API('/api/admin/lojas/all').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setLojas(data);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-cyber" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={createUser}
          lojas={lojas}
        />
      )}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(name, email) => editUser(editTarget.id, name, email)}
        />
      )}
      {changePwdUser && (
        <ChangePasswordModal
          userName={changePwdUser.name}
          onClose={() => setChangePwdUser(null)}
          onSave={(pwd) => changePassword(changePwdUser.id, pwd)}
        />
      )}
      {archiveTarget && (
        <ArchiveConfirmModal
          userName={archiveTarget.name}
          isUnarchive={archiveTarget.isUnarchive}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => archiveTarget.isUnarchive ? unarchiveUser(archiveTarget.id) : archiveUser(archiveTarget.id)}
        />
      )}

      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Gestão de Usuários</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {users.length} usuário{users.length !== 1 ? 's' : ''} {showArchived ? 'arquivado' : 'ativo'}{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowArchived(v => !v); setPage(1); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl transition-all ${showArchived ? 'btn-cyber' : 'btn-ghost'}`}
          >
            <Archive className="w-3.5 h-3.5" /> {showArchived ? 'Ver ativos' : 'Ver arquivados'}
          </button>
          <button onClick={refetch} className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          {!showArchived && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl btn-cyber font-semibold">
              <Plus className="w-3.5 h-3.5" /> Criar usuário
            </button>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-card)',
          animationDelay: '60ms',
        }}
      >
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {['Usuário', 'Loja', 'Função', 'Matrículas', 'Cadastro', ''].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((user) => {
              const name = user.full_name || user.email?.split('@')[0] || 'Usuário';
              const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
              const date = new Date(user.created_at).toLocaleDateString('pt-BR');
              const isThisMaster = user.email === MASTER_ADMIN_EMAIL;

              return (
                <tr key={user.id} className="table-row-cyber">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={isThisMaster
                          ? { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }
                          : { background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.18)' }
                        }
                      >
                        {isThisMaster
                          ? <Crown className="w-4 h-4" style={{ color: '#fbbf24' }} />
                          : <span className="text-sm font-bold" style={{ color: '#14B8A6' }}>{initials}</span>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{name}</p>
                          {isThisMaster && (
                            <span className="badge badge-amber text-[10px]">
                              <Crown className="w-2.5 h-2.5" /> Master
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {!showArchived && lojas.length > 0 ? (
                      <select value={user.loja_id || ''} onChange={e => updateLoja(user.id, e.target.value || null)}
                        className="input-cyber text-xs rounded-lg px-2 py-1.5" style={{ minWidth: '120px' }}>
                        <option value="">Sem loja</option>
                        {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {user.loja_name ? (
                          <>
                            <Store className="w-3.5 h-3.5" style={{ color: '#14B8A6' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{user.loja_name}</span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-neutral'} inline-flex items-center gap-1.5`}>
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-3)' }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                      {user.enrollment_count}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{date}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {isMasterAdmin && !isThisMaster && (
                      <div className="flex items-center justify-end gap-1.5">
                        {!showArchived && (
                          <>
                            <button
                              onClick={() => setEditTarget({ id: user.id, name, email: user.email })}
                              className="badge badge-blue inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => toggleRole(user.id, user.role)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                user.role === 'admin' ? 'badge-red' : 'badge-purple'
                              }`}
                            >
                              {user.role === 'admin'
                                ? <><ShieldOff className="w-3.5 h-3.5" /> Remover Admin</>
                                : <><Shield className="w-3.5 h-3.5" /> Tornar Admin</>
                              }
                            </button>
                            <button
                              onClick={() => setChangePwdUser({ id: user.id, name })}
                              className="badge badge-blue inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              <KeyRound className="w-3.5 h-3.5" /> Senha
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setArchiveTarget({ id: user.id, name, isUnarchive: showArchived })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={showArchived
                            ? { background: 'rgba(20,184,166,0.1)', color: '#14B8A6' }
                            : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
                          }
                        >
                          {showArchived
                            ? <><ArchiveRestore className="w-3.5 h-3.5" /> Reativar</>
                            : <><Archive className="w-3.5 h-3.5" /> Arquivar</>
                          }
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum usuário encontrado</p>
          </div>
        )}
        <Pagination total={users.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>
    </div>
  );
}
