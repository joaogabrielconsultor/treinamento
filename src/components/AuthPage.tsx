import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, FileText, Calculator, Trophy, ShieldCheck, TrendingUp, Lock as LockIcon } from 'lucide-react';
import { LogoComponent } from './LogoComponent';
import { useAppContext } from '../context/AppContext';
import { buildCheckoutLink, SUPPORT_WHATSAPP } from '../lib/config';

interface AuthPageProps {
  onSuccess: () => void;
  signIn: (email: string, password: string) => Promise<void>;
}

const FEATURES = [
  { icon: FileText,   title: 'Gestão de propostas e produção', desc: 'Acompanhe cada negócio do envio ao pagamento.' },
  { icon: Calculator, title: 'Simulador e tabelas de comissão', desc: 'Cálculo de coeficientes e comissões em segundos.' },
  { icon: Trophy,     title: 'Ranking e treinamentos', desc: 'Engaje a equipe e forme novos vendedores.' },
];

export function AuthPage({ onSuccess, signIn }: AuthPageProps) {
  const { companyName } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paywall, setPaywall] = useState<{ message: string; status: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPaywall(null);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      const payload = (err as { payload?: { paywall?: boolean; error?: string; status?: string } })?.payload;
      if (payload?.paywall) {
        setPaywall({ message: payload.error || 'Assinatura inativa.', status: payload.status || 'inativo' });
      } else {
        setError(err instanceof Error ? err.message : 'Credenciais inválidas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" style={{ background: 'var(--bg-base)' }}>
      {/* ── Vitrine (somente desktop) ── */}
      <aside
        className="hidden lg:flex flex-col justify-between px-12 py-10"
        style={{ background: 'var(--bg-deep)', borderRight: '1px solid var(--border-1)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-2)' }}
          >
            <LogoComponent size="sm" />
          </div>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>{companyName}</span>
        </div>

        <div className="max-w-md">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Plataforma para crédito consignado
          </p>
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight mt-4" style={{ color: 'var(--text-1)' }}>
            Toda a operação da sua empresa de consignado em um só lugar.
          </h2>
          <p className="text-[15px] mt-4 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Do primeiro contato ao pagamento da comissão — gestão, produção e treinamento da sua equipe de vendas.
          </p>

          <ul className="mt-10" style={{ borderTop: '1px solid var(--border-1)' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
                <Icon className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{title}</p>
                  <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-4)' }}>
          <TrendingUp className="w-3.5 h-3.5" /> Mais produtividade, mais propostas aprovadas.
        </p>
      </aside>

      {/* ── Formulário ── */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm mx-auto view-enter">
          {/* Marca (mobile — no desktop aparece na vitrine) */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-2)' }}
            >
              <LogoComponent size="sm" />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>{companyName}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Plataforma para crédito consignado</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Entrar</h1>
          <p className="text-sm mt-1.5 mb-8" style={{ color: 'var(--text-3)' }}>Bem-vindo de volta. Acesse sua conta para continuar.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="field-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-4)' }} />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="input-cyber w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="field-label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-4)' }} />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-cyber w-full pl-10 pr-11 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-icon"
                  style={{ width: 30, height: 30, color: 'var(--text-3)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg px-3.5 py-3 text-sm animate-fade-up"
                style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}
              >
                {error}
              </div>
            )}

            {paywall && (
              <div
                className="rounded-lg p-4 text-sm animate-fade-up"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)' }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--warn)' }}>
                  <LockIcon className="w-4 h-4" />
                  <span className="font-medium text-[13px]">Assinatura {paywall.status}</span>
                </div>
                <p className="leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{paywall.message}</p>
                <a
                  href={buildCheckoutLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary w-full no-underline"
                >
                  Regularizar pagamento <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso reativar minha assinatura do GS CRED.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-xs mt-3 no-underline hover:underline"
                  style={{ color: 'var(--text-2)' }}
                >
                  Já paguei / falar com o suporte
                </a>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full !h-11 mt-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(11,13,15,0.25)', borderTopColor: 'var(--accent-ink)' }} />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-5 text-xs space-y-1.5" style={{ borderTop: '1px solid var(--border-1)', color: 'var(--text-4)' }}>
            <p>Acesso restrito — solicite credenciais ao administrador.</p>
            <p>Desenvolvido por <span style={{ color: 'var(--text-3)' }}>GS CRED</span></p>
          </div>
        </div>
      </main>
    </div>
  );
}
