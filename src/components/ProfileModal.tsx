import { useState, useRef } from 'react';
import { X, User, Mail, Lock, Save, Eye, EyeOff, CheckCircle, Phone, Camera, Upload } from 'lucide-react';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

interface Props {
  user: { full_name: string | null; email: string; phone?: string | null; photo_url?: string | null };
  onClose: () => void;
  onUpdated: (name: string, email: string, phone?: string, photo_url?: string) => void;
}

export function ProfileModal({ user, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<'info' | 'password' | 'foto'>('info');

  // Aba dados
  const [name, setName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoOk, setInfoOk] = useState(false);

  // Aba senha
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdOk, setPwdOk] = useState(false);

  // Aba foto
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    user.photo_url ? `${user.photo_url}?t=${Date.now()}` : null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoOk, setPhotoOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoError('');
    setInfoOk(false);
    if (!name.trim()) return setInfoError('Nome obrigatório');
    if (!email.trim()) return setInfoError('Email obrigatório');
    setSavingInfo(true);
    const r = await API('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, email, phone }),
    });
    const data = await r.json();
    setSavingInfo(false);
    if (!r.ok) return setInfoError(data.error || 'Erro ao salvar');
    setInfoOk(true);
    onUpdated(data.full_name || name, data.email || email, data.phone || phone, data.photo_url);
    setTimeout(() => setInfoOk(false), 3000);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    setPwdOk(false);
    if (!currentPwd || !newPwd || !confirmPwd) return setPwdError('Preencha todos os campos');
    if (newPwd.length < 6) return setPwdError('Nova senha deve ter no mínimo 6 caracteres');
    if (newPwd !== confirmPwd) return setPwdError('As senhas não coincidem');
    setSavingPwd(true);
    const r = await API('/api/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
    });
    const data = await r.json();
    setSavingPwd(false);
    if (!r.ok) return setPwdError(data.error || 'Erro ao alterar senha');
    setPwdOk(true);
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setTimeout(() => setPwdOk(false), 3000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setPhotoError('');
    setPhotoOk(false);
  }

  async function savePhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) return setPhotoError('Selecione uma foto primeiro');
    setPhotoError('');
    setPhotoOk(false);
    setSavingPhoto(true);
    const form = new FormData();
    form.append('photo', photoFile);
    const r = await API('/api/profile/photo', { method: 'POST', body: form });
    const data = await r.json();
    setSavingPhoto(false);
    if (!r.ok) return setPhotoError(data.error || 'Erro ao enviar foto');
    setPhotoOk(true);
    setPhotoFile(null);
    setPhotoPreview(`${data.photo_url}?t=${Date.now()}`);
    onUpdated(name, email, phone, data.photo_url);
    setTimeout(() => setPhotoOk(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-md animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Meu Perfil</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-1 flex-wrap">
          {([['info', 'Dados', User], ['password', 'Senha', Lock], ['foto', 'Foto', Camera]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === key ? 'btn-cyber' : 'btn-ghost'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Tab: Dados */}
          {tab === 'info' && (
            <form onSubmit={saveInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  <User className="w-3 h-3 inline mr-1" />Nome completo
                </label>
                <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  <Mail className="w-3 h-3 inline mr-1" />Email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  <Phone className="w-3 h-3 inline mr-1" />Telefone / WhatsApp
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="(48) 99999-9999" />
              </div>
              {infoError && <p className="text-xs text-red-400">{infoError}</p>}
              {infoOk && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: '#4ade80' }}>
                  <CheckCircle className="w-3.5 h-3.5" /> Perfil atualizado com sucesso!
                </p>
              )}
              <button type="submit" disabled={savingInfo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber mt-2">
                <Save className="w-4 h-4" />
                {savingInfo ? 'Salvando...' : 'Salvar dados'}
              </button>
            </form>
          )}

          {/* Tab: Senha */}
          {tab === 'password' && (
            <form onSubmit={savePassword} className="space-y-4">
              {[
                { label: 'Senha atual', value: currentPwd, set: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                { label: 'Nova senha', value: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew(v => !v) },
                { label: 'Confirmar nova senha', value: confirmPwd, set: setConfirmPwd, show: showNew, toggle: () => setShowNew(v => !v) },
              ].map(({ label, value, set, show, toggle }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)}
                      className={`${inp} pr-10`} placeholder="••••••••" />
                    <button type="button" onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
              {pwdOk && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: '#4ade80' }}>
                  <CheckCircle className="w-3.5 h-3.5" /> Senha alterada com sucesso!
                </p>
              )}
              <button type="submit" disabled={savingPwd}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber mt-2">
                <Lock className="w-4 h-4" />
                {savingPwd ? 'Alterando...' : 'Alterar senha'}
              </button>
            </form>
          )}

          {/* Tab: Foto */}
          {tab === 'foto' && (
            <form onSubmit={savePhoto} className="space-y-5">
              <div className="flex flex-col items-center gap-4">
                {/* Preview */}
                <div
                  className="relative w-28 h-28 rounded-full overflow-hidden cursor-pointer"
                  style={{ border: '3px solid var(--brand)', background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 opacity-30" style={{ color: 'var(--text-3)' }} /></div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-ghost">
                  <Upload className="w-3.5 h-3.5" /> Selecionar foto
                </button>

                {photoFile && (
                  <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                    {photoFile.name} ({(photoFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              <p className="text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
                Foto aparecerá na proposta gerada para clientes. Formatos: JPG, PNG, WEBP. Máx. 5 MB.
              </p>

              {photoError && <p className="text-xs text-red-400 text-center">{photoError}</p>}
              {photoOk && (
                <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: '#4ade80' }}>
                  <CheckCircle className="w-3.5 h-3.5" /> Foto atualizada com sucesso!
                </p>
              )}

              <button type="submit" disabled={savingPhoto || !photoFile}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-40">
                <Upload className="w-4 h-4" />
                {savingPhoto ? 'Enviando...' : 'Salvar foto'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
