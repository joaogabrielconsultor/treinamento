import { useState } from 'react';
import { ArrowRight, ShieldCheck, Lock, Mail, Check, Pencil, MessageCircle } from 'lucide-react';
import { buildCheckoutLink, PLAN_PRICE } from '../lib/config';
import { useAppContext } from '../context/AppContext';

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
    <div className="w-full flex items-center justify-center px-5 py-10" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="w-full max-w-lg">
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ background: cancelado ? 'var(--neg-soft)' : 'var(--warn-soft)', color: cancelado ? 'var(--neg)' : 'var(--warn)' }}
        >
          <Lock className="w-3.5 h-3.5" /> Assinatura {cancelado ? 'cancelada' : 'suspensa'}
        </span>

        <h1 className="mt-4 text-[30px] sm:text-[34px] font-semibold leading-[1.1] tracking-tight" style={{ color: 'var(--text-1)' }}>
          Renove e volte a operar
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {cancelado ? 'Sua assinatura foi cancelada, mas ' : 'Sua mensalidade está pendente, mas '}
          <strong className="font-medium" style={{ color: 'var(--text-1)' }}>seus dados continuam salvos</strong>. Regularize e o {companyName} volta na hora.
        </p>

        <div className="card mt-8">
          {/* preço */}
          <div className="card-header">
            <div>
              <p className="kpi-label">Plano mensal</p>
              <p className="mt-1 text-[28px] font-semibold leading-none num" style={{ color: 'var(--text-1)' }}>
                {PLAN_PRICE}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-3)' }}>/mês</span>
              </p>
            </div>
            <p className="text-xs text-right" style={{ color: 'var(--text-3)' }}>Cancele quando<br />quiser</p>
          </div>

          <div className="card-pad">
            {/* ── E-MAIL DE COBRANÇA ── */}
            {editing ? (
              <div className="animate-fade-up">
                <label htmlFor="renew-email" className="field-label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {firstPayment ? 'E-mail do seu primeiro pagamento' : 'E-mail de pagamento'}
                </label>
                <input
                  id="renew-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-cyber w-full px-3.5 py-2.5 text-sm"
                />
                {err && <p className="text-xs mt-2" style={{ color: 'var(--neg)' }}>{err}</p>}

                <div className="mt-3 rounded-lg px-3.5 py-3 text-[13px] leading-relaxed" style={{ background: 'var(--warn-soft)', color: 'var(--text-2)' }}>
                  <strong className="font-medium" style={{ color: 'var(--warn)' }}>Importante:</strong> pague na Cakto com
                  {' '}<strong className="font-medium" style={{ color: 'var(--text-1)' }}>exatamente este mesmo e-mail</strong>. É por ele que o sistema reconhece o pagamento e libera a sua conta — com outro e-mail, não libera automático.
                </div>

                <button onClick={saveEmail} disabled={saving} className="btn btn-primary w-full !h-11 mt-4">
                  {saving ? 'Salvando...' : <>Salvar e liberar renovação <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="field-hint text-center mt-2">O botão de renovar aparece depois de confirmar o e-mail.</p>
              </div>
            ) : (
              <div className="animate-fade-up">
                {bound && (
                  <div className="rounded-lg px-4 py-3.5 mb-4 flex items-start gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-2)' }}>
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--pos)' }} strokeWidth={2.5} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>E-mail vinculado</p>
                      <p className="text-[15px] font-medium mt-0.5 break-all" style={{ color: 'var(--text-1)' }}>{caktoEmail || email}</p>
                      <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                        Pague na Cakto com este mesmo e-mail — é por ele que o sistema libera a sua conta.
                      </p>
                    </div>
                    <button onClick={() => setEditing(true)} className="btn btn-sm btn-secondary flex-shrink-0">
                      <Pencil className="w-3 h-3" /> Trocar
                    </button>
                  </div>
                )}

                <a
                  href={buildCheckoutLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full !h-11 no-underline"
                >
                  Renovar agora <ArrowRight className="w-4 h-4" />
                </a>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  {!bound && !firstPayment && (
                    <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-[13px] hover:underline" style={{ color: 'var(--text-2)' }}>
                      <Mail className="w-3.5 h-3.5" /> Vincular o e-mail do meu pagamento
                    </button>
                  )}
                  <button onClick={openChat} className="inline-flex items-center gap-1.5 text-[13px] hover:underline" style={{ color: 'var(--text-2)' }}>
                    <MessageCircle className="w-3.5 h-3.5" /> Já paguei? Falar com o suporte
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--pos)' }} />
          Seus dados estão preservados — nada foi apagado.
        </p>
      </div>
    </div>
  );
}
