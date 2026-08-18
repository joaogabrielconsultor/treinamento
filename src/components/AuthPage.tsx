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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 0%, #0A0A0A 0%, #000000 60%)' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '700px', height: '700px',
          left: '30%', top: '50%',
          transform: 'translate(-50%, -55%)',
          background: 'radial-gradient(ellipse, rgba(198,255,0,0.07) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: '400px', height: '400px',
          left: '8%', bottom: '8%',
          background: 'radial-gradient(ellipse, rgba(169,224,0,0.05) 0%, transparent 70%)',
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className="w-full max-w-4xl relative z-10 grid lg:grid-cols-2 rounded-3xl overflow-hidden"
        style={{ animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        {/* ── Showcase (somente desktop) ── */}
        <div
          className="hidden lg:flex flex-col justify-between p-9 relative"
          style={{
            background: 'linear-gradient(160deg, rgba(18,18,18,0.7) 0%, rgba(8,8,8,0.4) 100%)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 20% 10%, rgba(198,255,0,0.10), transparent 55%)' }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
                style={{ background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.2)', boxShadow: '0 0 24px rgba(198,255,0,0.12)' }}
              >
                <LogoComponent size="sm" />
              </div>
              <span
                className="text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #C6FF00 0%, #A9E000 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {companyName}
              </span>
            </div>

            <span
              className="inline-flex items-center gap-1.5 mt-5 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.22)', color: '#C6FF00' }}
            >
              <ShieldCheck className="w-3 h-3" /> Plataforma para crédito consignado
            </span>

            <h2 className="text-[26px] font-bold leading-tight mt-4" style={{ color: '#E2E8F0' }}>
              Toda a operação da sua<br />
              <span className="text-gradient-teal">empresa de consignado</span><br />
              em um só lugar.
            </h2>
            <p className="text-sm mt-3 max-w-xs leading-relaxed" style={{ color: '#94A3B8' }}>
              Do primeiro contato ao pagamento da comissão — gestão, produção e treinamento da sua equipe de vendas.
            </p>
          </div>

          <div className="relative space-y-4 mt-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg mt-0.5"
                  style={{ background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.18)', color: '#C6FF00' }}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: '#CBD5E1' }}>{title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: '#64748B' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex items-center gap-2 mt-8 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#C6FF00' }} />
            <span className="text-[12px]" style={{ color: '#64748B' }}>Mais produtividade, mais propostas aprovadas.</span>
          </div>
        </div>

        {/* ── Formulário ── */}
        <div
          className="flex flex-col justify-center p-8 sm:p-10"
          style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        >
          {/* Brand (mobile only — no desktop já aparece na vitrine) */}
          <div className="text-center mb-7 lg:hidden">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'rgba(198,255,0,0.1)', border: '1px solid rgba(198,255,0,0.2)', boxShadow: '0 0 30px rgba(198,255,0,0.12)' }}
            >
              <LogoComponent size="md" />
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {companyName}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              Plataforma para crédito consignado
            </p>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Bem-vindo de volta 👋</h2>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-3)' }}>Acesse sua conta para continuar</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--text-3)' }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="input-cyber w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--text-3)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input-cyber w-full pl-10 pr-11 py-2.5 text-sm rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171',
                  }}
                >
                  <span className="mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {paywall && (
                <div
                  className="rounded-xl px-4 py-4 text-sm"
                  style={{
                    background: 'rgba(198,255,0,0.06)',
                    border: '1px solid rgba(198,255,0,0.28)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: '#C6FF00' }}>
                    <LockIcon className="w-4 h-4" />
                    <span className="font-semibold uppercase tracking-wide text-[12px]" style={{ fontFamily: "'Space Mono', ui-monospace, monospace" }}>
                      Assinatura {paywall.status}
                    </span>
                  </div>
                  <p className="leading-relaxed mb-3" style={{ color: '#CBD5E1' }}>{paywall.message}</p>
                  <a
                    href={buildCheckoutLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-cyber w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 no-underline"
                  >
                    Regularizar pagamento <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso reativar minha assinatura do GS CRED.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-[12px] mt-3 no-underline"
                    style={{ color: '#94A3B8' }}
                  >
                    Já paguei / falar com o suporte
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-cyber w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

            <p className="text-center text-xs mt-6" style={{ color: '#334155' }}>
              Acesso restrito — solicite credenciais ao administrador
            </p>
            <p className="text-center text-[10px] mt-3 uppercase tracking-widest" style={{ fontFamily: "'Space Mono', ui-monospace, monospace", color: '#3a3a3a' }}>
              Desenvolvido por <span style={{ color: '#7a8a3a' }}>GS CRED</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
