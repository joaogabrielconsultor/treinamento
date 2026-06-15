import { X, Printer } from 'lucide-react';

interface PropostaData {
  nomeCliente: string;
  cpfCliente: string;
  bancoNomeDivida: string;
  valorLiquido: number;
  parcela: number;
  valorDivida: number;
  bancoResponsavel: string;
}

interface CorretorData {
  nome: string;
  email: string;
  phone?: string | null;
  photo_url?: string | null;
}

interface Props {
  proposta: PropostaData;
  corretor: CorretorData;
  onClose: () => void;
}

function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.****-${digits.slice(9, 11)}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PropostaPDF({ proposta, corretor, onClose }: Props) {
  const cpfMasked = maskCPF(proposta.cpfCliente);
  const apiBase = window.location.origin.includes('localhost')
    ? 'http://localhost:3001'
    : window.location.origin;
  const logoUrl = `${window.location.origin}/logo.png`;
  const photoUrl = corretor.photo_url
    ? `${apiBase}${corretor.photo_url}?t=${Date.now()}`
    : null;

  function imprimir() {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Proposta – ${proposta.nomeCliente}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background:#fff; color:#1a1a1a; }
  .page { width:794px; min-height:1123px; margin:0 auto; background:#fff; padding:0; position:relative; }

  /* ── HEADER ── */
  .header { display:flex; align-items:center; justify-content:space-between; padding:24px 32px 0; position:relative; }
  .logo { height:54px; }
  .title-block { text-align:right; }
  .title-block .sub { font-size:11px; font-weight:700; color:#2e7d32; letter-spacing:3px; text-transform:uppercase; }
  .title-block .main { font-size:48px; font-weight:900; color:#2e7d32; font-style:italic; line-height:1; }

  /* ── BANNER ── */
  .banner { margin:0 32px; margin-top:-10px; border-radius:14px; background:#2e7d32; display:flex; align-items:center; justify-content:space-between; overflow:hidden; position:relative; min-height:90px; }
  .banner-left { padding:16px 20px; display:flex; align-items:center; gap:14px; flex:1; }
  .banner-icon { color:rgba(255,255,255,0.7); font-size:28px; }
  .client-info .client-name { font-size:22px; font-style:italic; font-weight:700; color:#fff; }
  .client-info .client-cpf { font-size:15px; color:rgba(255,255,255,0.85); margin-top:2px; }
  .banner-right { padding:16px 20px 16px 0; text-align:right; }
  .corretor-name { font-size:22px; font-weight:700; color:#fff; }
  .corretor-email { font-size:12px; color:rgba(255,255,255,0.85); margin-top:4px; }
  .corretor-phone { font-size:12px; color:rgba(255,255,255,0.85); margin-top:2px; }
  .corretor-photo { position:absolute; left:50%; transform:translateX(-50%); bottom:0; height:130px; object-fit:contain; }

  /* ── BOXES GRID ── */
  .boxes { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:28px 32px 0; }
  .box { border:2px solid #2e7d32; border-radius:16px; padding:20px 20px 18px; display:flex; gap:14px; align-items:flex-start; }
  .box-icon { font-size:32px; flex-shrink:0; line-height:1; }
  .box-content { flex:1; }
  .box-label { font-size:13px; font-weight:700; color:#2e7d32; }
  .box-value { font-size:36px; font-weight:700; color:#2e7d32; line-height:1.1; margin-top:4px; }
  .box-value.large { font-size:42px; }
  .box-notes { margin-top:10px; }
  .box-notes p { font-size:10px; color:#444; margin-top:3px; }
  .box-notes p::before { content:"✓ "; }

  /* ── FOOTER ── */
  .footer { margin:32px 32px 0; border-top:1.5px solid #ccc; padding-top:12px; }
  .footer-title { font-size:15px; font-weight:700; font-style:italic; text-decoration:underline; color:#1a1a1a; text-align:center; }
  .footer-legal { font-size:11px; color:#444; text-align:center; margin-top:8px; line-height:1.7; }
  .footer-page { text-align:right; margin-top:16px; }
  .footer-page .pg { font-size:13px; font-weight:700; font-style:italic; }
  .footer-page .doc { font-size:13px; color:#333; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { width:100%; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- HEADER -->
  <div class="header">
    <img src="${logoUrl}" class="logo" alt="AprovaMais" onerror="this.style.display='none'"/>
    <div class="title-block">
      <div class="sub">Formalização de</div>
      <div class="main">PROPOSTA</div>
    </div>
  </div>

  <!-- BANNER -->
  <div class="banner">
    <div class="banner-left">
      <div class="banner-icon">👤</div>
      <div class="client-info">
        <div class="client-name">${proposta.nomeCliente}</div>
        <div class="client-cpf">${cpfMasked}</div>
      </div>
    </div>
    ${photoUrl ? `<img src="${photoUrl}" class="corretor-photo" alt="Corretor" onerror="this.style.display='none'"/>` : ''}
    <div class="banner-right">
      <div class="corretor-name">${corretor.nome}</div>
      ${corretor.email ? `<div class="corretor-email">✉ ${corretor.email}</div>` : ''}
      ${corretor.phone ? `<div class="corretor-phone">📱 ${corretor.phone}</div>` : ''}
    </div>
  </div>

  <!-- BOXES -->
  <div class="boxes">
    <!-- Valor líquido liberado -->
    <div class="box">
      <div class="box-icon">💰</div>
      <div class="box-content">
        <div class="box-label">Valor líquido liberado:</div>
        <div class="box-value large">${fmtBRL(proposta.valorLiquido)}</div>
        <div class="box-notes">
          <p>Valor líquido liberado diretamente em sua conta.</p>
          <p>Valor disponível após averbação da parcela no contracheque.</p>
          <p>Margem de 5% atualmente utilizada, liberada após a quitação do contrato.</p>
        </div>
      </div>
    </div>

    <!-- Parcela utilizada -->
    <div class="box">
      <div class="box-icon">📊</div>
      <div class="box-content">
        <div class="box-label">Parcela utilizada:</div>
        <div class="box-value large">${fmtBRL(proposta.parcela)}</div>
      </div>
    </div>

    <!-- Dívida quitada -->
    <div class="box">
      <div class="box-icon">📋</div>
      <div class="box-content">
        <div class="box-label">Dívida quitada – ${proposta.bancoNomeDivida.toUpperCase()}:</div>
        <div class="box-value">${fmtBRL(proposta.valorDivida)}</div>
      </div>
    </div>

    <!-- Banco responsável -->
    <div class="box">
      <div class="box-icon">🏦</div>
      <div class="box-content">
        <div class="box-label">Banco responsável:</div>
        <div class="box-value" style="font-size:28px">${proposta.bancoResponsavel}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-title">AprovaMais Soluções Financeiras - CNPJ 55.886.747/0001-80</div>
    <div class="footer-legal">
      Proposta sujeita à análise de crédito e averbação do órgão pagador.<br/>
      O saldo devedor considera a fatura encaminhada pelo cliente e pode sofrer alterações em decorrência de juros e encargos.<br/>
      Condições válidas por 48 horas após o envio desta proposta.
    </div>
    <div class="footer-page">
      <div class="pg">Página 1 de 1</div>
      <div class="doc">Documento gerado por AprovaMais Soluções Financeiras.</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Permita pop-ups para gerar o PDF.'); return; }
    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-2xl animate-fade-up overflow-hidden">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Pré-visualização da Proposta</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* Preview simplificado */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Simulação visual da proposta */}
          <div className="rounded-xl overflow-hidden text-sm" style={{ border: '2px solid #2e7d32', background: '#fff', color: '#1a1a1a' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ background: '#f9f9f9' }}>
              <img src={logoUrl} alt="Logo" className="h-10" onError={e => (e.currentTarget.style.display = 'none')} />
              <div className="text-right">
                <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#2e7d32' }}>Formalização de</div>
                <div className="text-2xl font-black italic" style={{ color: '#2e7d32' }}>PROPOSTA</div>
              </div>
            </div>

            {/* Banner */}
            <div className="flex items-center justify-between px-5 py-4 relative" style={{ background: '#2e7d32', minHeight: 72 }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <div className="font-bold italic text-white">{proposta.nomeCliente || '—'}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{cpfMasked}</div>
                </div>
              </div>
              {photoUrl && (
                <img src={photoUrl} alt="Corretor" className="absolute left-1/2 -translate-x-1/2 bottom-0 h-20 object-contain"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <div className="text-right">
                <div className="font-bold text-white">{corretor.nome}</div>
                {corretor.email && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>✉ {corretor.email}</div>}
                {corretor.phone && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>📱 {corretor.phone}</div>}
              </div>
            </div>

            {/* Boxes */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                { icon: '💰', label: 'Valor líquido liberado:', value: fmtBRL(proposta.valorLiquido), big: true },
                { icon: '📊', label: 'Parcela utilizada:', value: fmtBRL(proposta.parcela), big: true },
                { icon: '📋', label: `Dívida quitada – ${proposta.bancoNomeDivida.toUpperCase()}:`, value: fmtBRL(proposta.valorDivida), big: false },
                { icon: '🏦', label: 'Banco responsável:', value: proposta.bancoResponsavel, big: false },
              ].map(b => (
                <div key={b.label} className="rounded-xl p-3" style={{ border: '2px solid #2e7d32' }}>
                  <div className="flex gap-2 items-start">
                    <span className="text-xl">{b.icon}</span>
                    <div>
                      <div className="text-xs font-bold" style={{ color: '#2e7d32' }}>{b.label}</div>
                      <div className={`font-bold mt-1 ${b.big ? 'text-xl' : 'text-lg'}`} style={{ color: '#2e7d32' }}>{b.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: '#ccc' }}>
              <div className="text-center text-xs font-bold italic underline" style={{ color: '#1a1a1a' }}>
                AprovaMais Soluções Financeiras - CNPJ 55.886.747/0001-80
              </div>
              <div className="text-center text-[10px] mt-1" style={{ color: '#555', lineHeight: 1.7 }}>
                Proposta sujeita à análise de crédito e averbação do órgão pagador.<br/>
                Condições válidas por 48 horas após o envio desta proposta.
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold btn-ghost">Fechar</button>
          <button
            onClick={imprimir}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-cyber"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
