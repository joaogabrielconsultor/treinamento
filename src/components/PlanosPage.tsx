import {
  FileText, Calculator, Trophy, Wallet, ScanSearch, GraduationCap,
  Building2, BarChart3, ArrowUpRight, ArrowRight,
} from 'lucide-react';
import { buildCheckoutLink, buildWhatsappLink, PLAN_PRICE, PLAN_PERIOD } from '../lib/config';

/* ═══════════════════════════════════════════════════════════════
   PÁGINA DE VENDAS — GS CRED  (rota pública /planos)
   Direção: preto absoluto + verde volt, tipografia poster (Anton),
   mono estilo terminal (Space Mono), letreiro rolando. "Nova geração".
═══════════════════════════════════════════════════════════════ */

const ACID = '#C6FF00';
const INK = '#F4F4F4';
const MUTED = '#7C7C7C';

const FEATURES = [
  { icon: FileText,      title: 'Propostas',          desc: 'Do envio ao pagamento, cada negócio no controle.' },
  { icon: Calculator,    title: 'Simulador',          desc: 'Coeficiente, prazo e comissão na hora.' },
  { icon: Building2,     title: 'Tabelas & convênios',desc: 'Bancos, produtos e faixas num lugar só.' },
  { icon: Wallet,        title: 'Conta corrente',     desc: 'Comissão e saque de cada vendedor.' },
  { icon: BarChart3,     title: 'Produção',           desc: 'Painéis e relatórios pra decidir com dado.' },
  { icon: Trophy,        title: 'Ranking',            desc: 'Time no jogo, meta na cara.' },
  { icon: ScanSearch,    title: 'Consulta de margem', desc: 'Margem verificada dentro do fluxo.' },
  { icon: GraduationCap, title: 'Treinamentos',       desc: 'Forma vendedor novo sem depender de você.' },
];

const INCLUDED = [
  'Plataforma completa, sem limite de acessos',
  'Perfis de vendedor e administrador',
  'Propostas, produção e simulador',
  'Tabelas de comissão e convênios',
  'Conta corrente e relatórios',
  'Ranking, treinamentos e roteiros',
  'Consulta de margem e login de bancos',
  'Suporte no WhatsApp',
];

const TICKER = ['PROPOSTAS', 'SIMULADOR', 'COMISSÕES', 'RANKING', 'CONTA CORRENTE', 'MARGEM', 'TREINAMENTOS', 'PRODUÇÃO'];

export function PlanosPage() {
  const checkout = buildCheckoutLink();

  return (
    <div className="gsp-root">
      <style>{css}</style>

      {/* Header */}
      <header className="gsp-header">
        <span className="gsp-logo">GS<span style={{ color: ACID }}>.</span></span>
        <span className="gsp-tagline">CRÉDITO CONSIGNADO — PARA A NOVA GERAÇÃO</span>
        <a href={checkout} target="_blank" rel="noopener noreferrer" className="gsp-pill gsp-pill-solid">Assinar</a>
      </header>

      {/* Hero */}
      <section className="gsp-hero">
        <div className="gsp-eyebrow">// GS.SISTEMA — GESTÃO DE CONSIGNADO</div>
        <h1 className="gsp-display">
          GESTÃO DE<br />
          <span style={{ color: ACID }}>CONSIGNADO</span><br />
          SEM ENROLAÇÃO
        </h1>
        <p className="gsp-lead">
          Propostas, comissões, produção e time de vendas numa plataforma só.
          Feita pra quem vende consignado de verdade.
        </p>
        <div className="gsp-cta-row">
          <a href={checkout} target="_blank" rel="noopener noreferrer" className="gsp-pill gsp-pill-solid gsp-pill-lg">
            Quero agora <ArrowUpRight size={18} strokeWidth={2.5} />
          </a>
          <a href="#planos" className="gsp-pill gsp-pill-ghost gsp-pill-lg">Ver o que inclui</a>
        </div>
        <div className="gsp-micro">PAGAMENTO ÚNICO · SEM MENSALIDADE · ACESSO NA HORA</div>
      </section>

      {/* Marquee — assinatura */}
      <div className="gsp-marquee" aria-hidden="true">
        <div className="gsp-marquee-track">
          {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="gsp-marquee-item">{t}<span className="gsp-star">✦</span></span>
          ))}
        </div>
      </div>

      {/* Funcionalidades */}
      <section className="gsp-section">
        <div className="gsp-kicker">// O QUE VOCÊ GANHA</div>
        <div className="gsp-grid">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="gsp-card">
              <div className="gsp-card-top">
                <span className="gsp-index">{String(i + 1).padStart(2, '0')}</span>
                <Icon size={20} style={{ color: ACID }} strokeWidth={2} />
              </div>
              <h3 className="gsp-card-title">{title}</h3>
              <p className="gsp-card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="gsp-section gsp-pricing">
        <div className="gsp-kicker" style={{ textAlign: 'center' }}>// PLANO ÚNICO</div>
        <h2 className="gsp-h2">UM PLANO. TUDO DENTRO.</h2>
        <div className="gsp-price-card">
          <div className="gsp-price-head">
            <span className="gsp-badge">PLANO COMPLETO</span>
            <div className="gsp-price">{PLAN_PRICE}</div>
            <div className="gsp-period">{PLAN_PERIOD.toUpperCase()} · SEM MENSALIDADE</div>
          </div>
          <ul className="gsp-list">
            {INCLUDED.map((item) => (
              <li key={item}><span className="gsp-check">✓</span>{item}</li>
            ))}
          </ul>
          <a href={checkout} target="_blank" rel="noopener noreferrer" className="gsp-pill gsp-pill-solid gsp-pill-block">
            Assinar agora <ArrowRight size={18} strokeWidth={2.5} />
          </a>
          <a href={buildWhatsappLink('Olá! Tenho dúvidas sobre o GS CRED antes de assinar.')} target="_blank" rel="noopener noreferrer" className="gsp-doubt">
            tenho dúvidas → falar no whatsapp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="gsp-footer">
        <div className="gsp-footer-mark">GS CRED</div>
        <div className="gsp-footer-row">
          <span className="gsp-logo">GS<span style={{ color: ACID }}>.</span></span>
          <span className="gsp-footer-legal">© {new Date().getFullYear()} GS CRED — Plataforma de gestão para crédito consignado.</span>
        </div>
      </footer>
    </div>
  );
}

const css = `
.gsp-root {
  --acid: ${ACID};
  --ink: ${INK};
  --muted: ${MUTED};
  background: #000;
  color: var(--ink);
  min-height: 100vh;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}
.gsp-root a { text-decoration: none; }
.gsp-root ::selection { background: var(--acid); color: #000; }

/* Header */
.gsp-header {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 16px 24px;
  background: rgba(0,0,0,0.72); backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.gsp-logo { font-family: 'Anton', Impact, sans-serif; font-size: 22px; letter-spacing: 0.02em; color: #fff; text-transform: uppercase; }
.gsp-tagline { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.22em; color: var(--muted); }
@media (max-width: 760px) { .gsp-tagline { display: none; } }

/* Pills */
.gsp-pill {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: 'Space Mono', monospace; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; font-size: 13px; border-radius: 999px;
  padding: 10px 18px; transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
}
.gsp-pill-lg { font-size: 14px; padding: 15px 26px; }
.gsp-pill-block { display: flex; width: 100%; padding: 16px; margin-top: 22px; }
.gsp-pill-solid { background: var(--acid); color: #000; box-shadow: 0 0 0 rgba(198,255,0,0); }
.gsp-pill-solid:hover { transform: translateY(-2px); box-shadow: 0 10px 34px rgba(198,255,0,0.35); }
.gsp-pill-ghost { background: transparent; color: var(--ink); border: 1px solid rgba(255,255,255,0.18); }
.gsp-pill-ghost:hover { border-color: var(--acid); color: var(--acid); }
.gsp-root a:focus-visible { outline: 2px solid var(--acid); outline-offset: 3px; }

/* Hero */
.gsp-hero { max-width: 1080px; margin: 0 auto; padding: 84px 24px 64px; text-align: center; }
.gsp-eyebrow { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; color: var(--acid); margin-bottom: 24px; }
.gsp-display {
  font-family: 'Anton', Impact, sans-serif; font-weight: 400; text-transform: uppercase;
  line-height: 0.92; letter-spacing: 0.005em; color: #fff;
  font-size: clamp(52px, 12vw, 132px); margin: 0;
}
.gsp-lead { max-width: 540px; margin: 28px auto 0; font-size: clamp(15px, 2.2vw, 18px); line-height: 1.55; color: #B4B4B4; }
.gsp-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 34px; }
.gsp-micro { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.14em; color: var(--muted); margin-top: 20px; }

/* Marquee */
.gsp-marquee { background: var(--acid); overflow: hidden; padding: 13px 0; transform: rotate(-1.2deg) scale(1.04); }
.gsp-marquee-track { display: inline-flex; white-space: nowrap; animation: gsp-scroll 26s linear infinite; }
.gsp-marquee-item { font-family: 'Anton', Impact, sans-serif; font-size: 20px; letter-spacing: 0.04em; color: #000; text-transform: uppercase; display: inline-flex; align-items: center; padding: 0 4px; }
.gsp-star { margin: 0 22px; font-size: 13px; }
@keyframes gsp-scroll { from { transform: translateX(0); } to { transform: translateX(-33.33%); } }

/* Sections */
.gsp-section { max-width: 1120px; margin: 0 auto; padding: 84px 24px; }
.gsp-kicker { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; color: var(--acid); margin-bottom: 30px; }

/* Feature grid */
.gsp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 980px) { .gsp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .gsp-grid { grid-template-columns: 1fr; } }
.gsp-card {
  background: #0B0B0B; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px;
  padding: 22px; transition: transform .18s ease, border-color .2s ease, box-shadow .2s ease;
}
.gsp-card:hover { transform: translateY(-4px); border-color: rgba(198,255,0,0.55); box-shadow: 0 14px 40px rgba(198,255,0,0.08); }
.gsp-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.gsp-index { font-family: 'Space Mono', monospace; font-weight: 700; font-size: 13px; color: var(--muted); }
.gsp-card-title { font-family: 'Anton', Impact, sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; font-size: 19px; color: #fff; margin: 0 0 6px; }
.gsp-card-desc { font-size: 13.5px; line-height: 1.5; color: #8E8E8E; margin: 0; }

/* Pricing */
.gsp-pricing { max-width: 560px; text-align: center; }
.gsp-h2 { font-family: 'Anton', Impact, sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(30px, 6vw, 48px); line-height: 1; color: #fff; margin: 0 0 34px; }
.gsp-price-card { background: #0B0B0B; border: 1px solid rgba(198,255,0,0.35); border-radius: 26px; padding: 34px 28px; text-align: left; box-shadow: 0 0 60px rgba(198,255,0,0.06); }
.gsp-price-head { text-align: center; }
.gsp-badge { display: inline-block; font-family: 'Space Mono', monospace; font-weight: 700; font-size: 11px; letter-spacing: 0.14em; color: var(--acid); border: 1px solid rgba(198,255,0,0.4); border-radius: 999px; padding: 5px 14px; }
.gsp-price { font-family: 'Anton', Impact, sans-serif; font-size: clamp(64px, 16vw, 96px); line-height: 1; color: var(--acid); margin: 18px 0 6px; }
.gsp-period { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.12em; color: var(--muted); }
.gsp-list { list-style: none; padding: 0; margin: 30px 0 0; display: grid; gap: 13px; }
.gsp-list li { display: flex; align-items: flex-start; gap: 11px; font-size: 14.5px; color: #D2D2D2; }
.gsp-check { flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px; background: rgba(198,255,0,0.14); color: var(--acid); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px; }
.gsp-doubt { display: block; text-align: center; margin-top: 16px; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.05em; color: var(--muted); }
.gsp-doubt:hover { color: var(--acid); }

/* Footer */
.gsp-footer { position: relative; border-top: 1px solid rgba(255,255,255,0.08); padding: 46px 24px 40px; overflow: hidden; }
.gsp-footer-mark {
  font-family: 'Anton', Impact, sans-serif; text-transform: uppercase; text-align: center;
  font-size: clamp(60px, 20vw, 200px); line-height: 0.8; letter-spacing: 0.02em;
  color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.08); user-select: none; margin-bottom: 24px;
}
.gsp-footer-row { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.gsp-footer-legal { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.06em; color: var(--muted); }

@media (prefers-reduced-motion: reduce) {
  .gsp-marquee-track { animation: none; }
  .gsp-pill, .gsp-card { transition: none; }
}
`;
