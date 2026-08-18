import { useState } from 'react';
import { ArrowRight, ShieldCheck, Lock, Mail, Check } from 'lucide-react';
import { buildCheckoutLink, buildWhatsappLink, PLAN_PRICE } from '../lib/config';
import { useAppContext } from '../context/AppContext';

const MONO = "'Space Mono', ui-monospace, monospace";
const ANTON = "'Anton', Impact, sans-serif";
const VOLT = '#C6FF00';

const token = () => localStorage.getItem('token') ?? '';

interface Props {
  status?: string;
  loginEmail: string;
  caktoEmail: string | null;
  firstPayment: boolean;
}

/* Tela de renovação — mostrada no lugar do conteúdo quando a assinatura está
   suspensa/cancelada. No PRIMEIRO pagamento, pede o e-mail original do cliente
   pra vincular à conta (aí o pagamento reativa a conta certa). */
export function RenewOverlay({ status, loginEmail, caktoEmail, firstPayment }: Props) {
  const { companyName } = useAppContext();
  const cancelado = status === 'cancelado';

  const [email, setEmail] = useState(caktoEmail || loginEmail || '');
  const [bound, setBound] = useState(!!caktoEmail);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Precisa confirmar o e-mail antes de pagar? Só no 1º pagamento e se ainda não vinculou.
  const needEmail = firstPayment && !bound;

  const saveEmail = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr('Digite um e-mail válido.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch('/api/billing/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ email: e }),
      });
      if (r.ok) setBound(true);
      else { const d = await r.json().catch(() => ({})); setErr(d.error || 'Não foi possível salvar.'); }
    } catch { setErr('Erro de conexão.'); }
    setSaving(false);
  };

  return (
    <div
      className="min-h-full w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #0C0C0C 0%, #000 65%)', minHeight: 'calc(100vh - 64px)' }}
    >
      <div className="absolute pointer-events-none" style={{ width: 620, height: 620, top: -120, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse, rgba(198,255,0,0.10) 0%, transparent 70%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

      <div className="relative z-10 w-full max-w-xl text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold" style={{ fontFamily: MONO, letterSpacing: '0.14em', background: 'rgba(198,255,0,0.1)', border: `1px solid rgba(198,255,0,0.3)`, color: VOLT }}>
          <Lock className="w-3.5 h-3.5" /> ASSINATURA {cancelado ? 'CANCELADA' : 'SUSPENSA'}
        </span>

        <h1 className="mt-6" style={{ fontFamily: ANTON, fontSize: 'clamp(36px, 6.5vw, 64px)', lineHeight: 0.92, letterSpacing: '0.01em', color: '#F4F4F4', textTransform: 'uppercase' }}>
          RENOVE E<br /><span style={{ color: VOLT }}>VOLTE A OPERAR</span>
        </h1>

        <p className="mt-5 text-[15px] leading-relaxed mx-auto max-w-md" style={{ color: '#A3A3A3' }}>
          {cancelado ? 'Sua assinatura foi cancelada, mas ' : 'Sua mensalidade está pendente, mas '}
          <strong style={{ color: '#E5E5E5' }}>todos os seus dados continuam salvos e seguros</strong>.
          Regularize o pagamento e o {companyName} volta a funcionar na hora.
        </p>

        {/* preço */}
        <div className="mt-7 inline-flex flex-col items-center">
          <div style={{ fontFamily: ANTON, fontSize: 48, lineHeight: 1, color: '#F4F4F4' }}>
            {PLAN_PRICE}<span style={{ fontSize: 18, opacity: 0.7 }}>/mês</span>
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO, color: '#6B6B6B' }}>
            Assinatura mensal · Cancele quando quiser
          </div>
        </div>

        {/* PASSO DO E-MAIL (1º pagamento) */}
        {needEmail ? (
          <div className="mt-7 mx-auto max-w-md rounded-2xl p-5 text-left" style={{ background: 'rgba(198,255,0,0.05)', border: '1px solid rgba(198,255,0,0.28)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: VOLT }}>
              <Mail className="w-4 h-4" />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ fontFamily: MONO }}>Seu primeiro pagamento</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#CBD5E1' }}>
              Notamos que é a primeira vez. Confirme o <strong style={{ color: '#fff' }}>e-mail que você vai usar no pagamento</strong> pra
              gente vincular à sua conta — assim ela reativa sozinha assim que o pagamento cair.
            </p>
            <p className="text-[12px] leading-relaxed mb-3 rounded-lg px-3 py-2" style={{ color: '#E9D8A6', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)' }}>
              ⚠️ <strong>Importante:</strong> use <u>exatamente este mesmo e-mail</u> na hora de pagar na Cakto. É por ele que o sistema
              reconhece o pagamento e libera a sua conta. Com um e-mail diferente, a liberação não acontece automaticamente.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none mb-2"
              style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.14)', color: '#f4f4f4', fontFamily: MONO }}
            />
            {err && <p className="text-[12px] mb-2" style={{ color: '#f87171' }}>{err}</p>}
            <button
              onClick={saveEmail}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14px] font-bold disabled:opacity-60"
              style={{ fontFamily: MONO, background: VOLT, color: '#0a0a0a' }}
            >
              {saving ? 'Salvando...' : <>Salvar e continuar <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2.6} /></>}
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            {bound && (
              <div className="text-center max-w-md mx-auto rounded-xl px-4 py-2.5 mb-1" style={{ background: 'rgba(198,255,0,0.06)', border: '1px solid rgba(198,255,0,0.22)' }}>
                <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold" style={{ color: '#a9e000', fontFamily: MONO }}>
                  <Check className="w-3.5 h-3.5" /> E-MAIL VINCULADO: {caktoEmail || email}
                </div>
                <p className="text-[11px] mt-1" style={{ color: '#9aa77a' }}>
                  Pague na Cakto com <u>este mesmo e-mail</u> — é por ele que o sistema libera sua conta.
                </p>
              </div>
            )}
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
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-[11px]" style={{ color: '#555', fontFamily: MONO }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#4a5a2a' }} />
          SEUS DADOS ESTÃO PRESERVADOS · NADA FOI APAGADO
        </div>
      </div>
    </div>
  );
}
