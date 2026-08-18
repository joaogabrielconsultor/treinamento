import { useState } from 'react';
import { ArrowRight, ShieldCheck, Lock, Mail, Check, Pencil, MessageCircle } from 'lucide-react';
import { buildCheckoutLink, PLAN_PRICE } from '../lib/config';
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
   suspensa/cancelada. Pede/guarda o e-mail de cobrança e deixa claro que o
   pagamento tem que ser com ESSE e-mail pra liberar. Sem WhatsApp — suporte no
   chat interno. */
export function RenewOverlay({ status, loginEmail, caktoEmail, firstPayment }: Props) {
  const { companyName } = useAppContext();
  const cancelado = status === 'cancelado';

  const [email, setEmail] = useState(caktoEmail || loginEmail || '');
  const [bound, setBound] = useState(!!caktoEmail);
  // RENOVAR só é liberado depois de salvar/confirmar o e-mail — então começa sempre editando.
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

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
      if (r.ok) { setBound(true); setEditing(false); }
      else { const d = await r.json().catch(() => ({})); setErr(d.error || 'Não foi possível salvar.'); }
    } catch { setErr('Erro de conexão.'); }
    setSaving(false);
  };

  const openChat = () => window.dispatchEvent(new Event('open-support-chat'));

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

        <h1 className="mt-6" style={{ fontFamily: ANTON, fontSize: 'clamp(34px, 6vw, 60px)', lineHeight: 0.92, letterSpacing: '0.01em', color: '#F4F4F4', textTransform: 'uppercase' }}>
          RENOVE E<br /><span style={{ color: VOLT }}>VOLTE A OPERAR</span>
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed mx-auto max-w-md" style={{ color: '#A3A3A3' }}>
          {cancelado ? 'Sua assinatura foi cancelada, mas ' : 'Sua mensalidade está pendente, mas '}
          <strong style={{ color: '#E5E5E5' }}>seus dados continuam salvos</strong>. Regularize e o {companyName} volta na hora.
        </p>

        {/* preço */}
        <div className="mt-6 inline-flex flex-col items-center">
          <div style={{ fontFamily: ANTON, fontSize: 46, lineHeight: 1, color: '#F4F4F4' }}>
            {PLAN_PRICE}<span style={{ fontSize: 18, opacity: 0.7 }}>/mês</span>
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO, color: '#6B6B6B' }}>
            Assinatura mensal · Cancele quando quiser
          </div>
        </div>

        {/* ── E-MAIL DE COBRANÇA ── */}
        {editing ? (
          <div className="mt-6 mx-auto max-w-md rounded-2xl p-5 text-left" style={{ background: 'rgba(198,255,0,0.06)', border: '2px solid rgba(198,255,0,0.4)', boxShadow: '0 0 30px rgba(198,255,0,0.12)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: VOLT }}>
              <Mail className="w-4 h-4" />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ fontFamily: MONO }}>{firstPayment ? 'Seu primeiro pagamento' : 'E-mail de pagamento'}</span>
            </div>
            <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#CBD5E1' }}>
              Confirme o <strong style={{ color: '#fff' }}>e-mail que você vai usar no pagamento</strong> pra vincular à sua conta.
            </p>
            <p className="text-[12px] leading-relaxed mb-3 rounded-lg px-3 py-2" style={{ color: '#E9D8A6', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)' }}>
              ⚠️ <strong>Importante:</strong> pague na Cakto com <u>exatamente este mesmo e-mail</u>. É por ele que o sistema reconhece o pagamento e <strong>libera a sua conta</strong>. Com outro e-mail, não libera automático.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none mb-2"
              style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.16)', color: '#f4f4f4', fontFamily: MONO }}
            />
            {err && <p className="text-[12px] mb-2" style={{ color: '#f87171' }}>{err}</p>}
            <button onClick={saveEmail} disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14px] font-bold disabled:opacity-60"
              style={{ fontFamily: MONO, background: VOLT, color: '#0a0a0a' }}>
              {saving ? 'Salvando...' : <>Salvar e liberar renovação <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2.6} /></>}
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: '#6B6B6B' }}>o botão de renovar aparece após confirmar o e-mail</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            {bound && (
              <div className="w-full max-w-md rounded-2xl px-4 py-4" style={{ background: 'rgba(198,255,0,0.08)', border: '2px solid rgba(198,255,0,0.45)', boxShadow: '0 0 30px rgba(198,255,0,0.12)' }}>
                <div className="flex items-center justify-center gap-2" style={{ color: VOLT }}>
                  <Check className="w-4 h-4" strokeWidth={3} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>E-mail vinculado</span>
                </div>
                <div className="text-center text-[17px] font-bold mt-1 break-all" style={{ color: '#F4F4F4', fontFamily: MONO }}>{caktoEmail || email}</div>
                <p className="text-center text-[12px] mt-2 leading-snug" style={{ color: '#c7d38f' }}>
                  Pague na Cakto com <strong style={{ color: '#fff' }}>este mesmo e-mail</strong> — é por ele que o sistema <strong style={{ color: '#fff' }}>libera a sua conta</strong>.
                </p>
                <button onClick={() => setEditing(true)} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: VOLT }}>
                  <Pencil className="w-3 h-3" /> trocar e-mail
                </button>
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
            {!bound && !firstPayment && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-[12px]" style={{ color: '#9A9A9A' }}>
                <Mail className="w-3.5 h-3.5" /> vincular o e-mail do meu pagamento
              </button>
            )}
            <button onClick={openChat} className="flex items-center gap-1.5 text-[13px]" style={{ color: '#9A9A9A' }}>
              <MessageCircle className="w-3.5 h-3.5" /> já paguei? falar com o suporte
            </button>
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
