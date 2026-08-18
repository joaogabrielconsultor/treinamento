import { ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { buildCheckoutLink, buildWhatsappLink, PLAN_PRICE } from '../lib/config';
import { useAppContext } from '../context/AppContext';

const MONO = "'Space Mono', ui-monospace, monospace";
const ANTON = "'Anton', Impact, sans-serif";
const VOLT = '#C6FF00';

/* Tela de renovação — mostrada no lugar do conteúdo quando a assinatura da conta
   está suspensa/cancelada. Cliente continua logado (sidebar navegável); aqui ele
   renova a mensalidade. Estética da /planos (preto + volt, Anton + Space Mono). */
export function RenewOverlay({ status }: { status?: string }) {
  const { companyName } = useAppContext();
  const cancelado = status === 'cancelado';

  return (
    <div
      className="min-h-full w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #0C0C0C 0%, #000 65%)', minHeight: 'calc(100vh - 64px)' }}
    >
      {/* glow volt */}
      <div
        className="absolute pointer-events-none"
        style={{ width: 620, height: 620, top: -120, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse, rgba(198,255,0,0.10) 0%, transparent 70%)' }}
      />
      {/* grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
      />

      <div className="relative z-10 w-full max-w-xl text-center">
        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold"
          style={{ fontFamily: MONO, letterSpacing: '0.14em', background: 'rgba(198,255,0,0.1)', border: `1px solid rgba(198,255,0,0.3)`, color: VOLT }}
        >
          <Lock className="w-3.5 h-3.5" /> ASSINATURA {cancelado ? 'CANCELADA' : 'SUSPENSA'}
        </span>

        <h1
          className="mt-6"
          style={{ fontFamily: ANTON, fontSize: 'clamp(38px, 7vw, 68px)', lineHeight: 0.92, letterSpacing: '0.01em', color: '#F4F4F4', textTransform: 'uppercase' }}
        >
          RENOVE E<br />
          <span style={{ color: VOLT }}>VOLTE A OPERAR</span>
        </h1>

        <p className="mt-5 text-[15px] leading-relaxed mx-auto max-w-md" style={{ color: '#A3A3A3' }}>
          {cancelado
            ? 'Sua assinatura foi cancelada, mas '
            : 'Sua mensalidade está pendente, mas '}
          <strong style={{ color: '#E5E5E5' }}>todos os seus dados continuam salvos e seguros</strong>.
          Regularize o pagamento e o {companyName} volta a funcionar na hora — do jeitinho que você deixou.
        </p>

        {/* preço */}
        <div className="mt-8 inline-flex flex-col items-center">
          <div style={{ fontFamily: ANTON, fontSize: 52, lineHeight: 1, color: '#F4F4F4' }}>
            {PLAN_PRICE}<span style={{ fontSize: 20, opacity: 0.7 }}>/mês</span>
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO, color: '#6B6B6B' }}>
            Assinatura mensal · Cancele quando quiser
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href={buildCheckoutLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-[15px] font-bold no-underline transition-transform"
            style={{ fontFamily: MONO, background: VOLT, color: '#0A0A0A', boxShadow: '0 0 34px rgba(198,255,0,0.35)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            RENOVAR AGORA <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.6} />
          </a>
          <a
            href={buildWhatsappLink('Olá! Já paguei a mensalidade do GS CRED / preciso reativar minha conta.')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] no-underline"
            style={{ color: '#9A9A9A' }}
          >
            já paguei? → falar no whatsapp
          </a>
        </div>

        <div className="mt-9 flex items-center justify-center gap-2 text-[11px]" style={{ color: '#555', fontFamily: MONO }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#4a5a2a' }} />
          SEUS DADOS ESTÃO PRESERVADOS · NADA FOI APAGADO
        </div>
      </div>
    </div>
  );
}
