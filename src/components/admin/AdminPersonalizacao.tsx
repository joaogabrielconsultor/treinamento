import { useState } from 'react';
import { Palette, Save, ImageIcon, Check, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { LogoComponent } from '../LogoComponent';

export function AdminPersonalizacao() {
  const { logoUrl, setLogoUrl } = useAppContext();
  const [inputUrl, setInputUrl] = useState(logoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await setLogoUrl(inputUrl.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setInputUrl('');
    setSaving(true);
    setError('');
    try {
      await setLogoUrl('');
    } catch {
      setError('Erro ao remover a logo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-100">Personalização</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure a identidade visual da plataforma</p>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logo da plataforma</h2>
        </div>

        {/* Preview */}
        <div className="mb-6 p-5 bg-gray-50 dark:bg-dk-surface rounded-xl border border-dashed border-gray-200 dark:border-dk-border flex items-center justify-center">
          <div className="flex items-center gap-4">
            <LogoComponent size="lg" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview da logo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {logoUrl ? 'Logo personalizada ativa — visível para todos os usuários' : 'Usando logo padrão'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              URL da Logo
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => { setInputUrl(e.target.value); setSaved(false); setError(''); }}
                placeholder="https://exemplo.com/logo.png"
                className="input-cyber w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Formatos suportados: PNG, SVG, JPG, WebP. Fundo transparente recomendado.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {logoUrl && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-xl btn-ghost disabled:opacity-50"
              >
                Remover logo
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${
                saved ? 'bg-emerald-600' : 'bg-brand hover:bg-brand-hover'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
