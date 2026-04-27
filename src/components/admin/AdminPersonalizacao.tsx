import { useState } from 'react';
import { Palette, Save, ImageIcon, Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { LogoComponent } from '../LogoComponent';

export function AdminPersonalizacao() {
  const { logoUrl, setLogoUrl } = useAppContext();
  const [inputUrl, setInputUrl] = useState(logoUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setLogoUrl(inputUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRemove = () => {
    setInputUrl('');
    setLogoUrl('');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personalização</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure a identidade visual da plataforma</p>
      </div>

      <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-6">
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
                {logoUrl ? 'Logo personalizada ativa' : 'Usando logo padrão'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              URL da Logo
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => { setInputUrl(e.target.value); setSaved(false); }}
                placeholder="https://exemplo.com/logo.png"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-dk-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand bg-white dark:bg-dk-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Formatos suportados: PNG, SVG, JPG, WebP. Fundo transparente recomendado.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            {logoUrl && (
              <button
                onClick={handleRemove}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dk-surface rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Remover logo
              </button>
            )}
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors ${
                saved ? 'bg-emerald-600' : 'bg-brand hover:bg-brand-hover'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
