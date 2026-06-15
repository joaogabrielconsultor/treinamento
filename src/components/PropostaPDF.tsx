import { useRef, useState } from 'react';
import { X, Download, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.***.****-${d.slice(9, 11)}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const GREEN = '#1b5e20';
const GREEN_MID = '#2e7d32';

export function PropostaPDF({ proposta, corretor, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const cpfMasked = maskCPF(proposta.cpfCliente);
  const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
  const photoUrl = corretor.photo_url ? `${apiBase}${corretor.photo_url}` : null;
  const logoUrl = `${window.location.origin}/logo.png`;

  async function downloadPDF() {
    if (!sheetRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 10000,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      const nomeArq = `Proposta_${proposta.nomeCliente.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      pdf.save(nomeArq);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-3xl animate-fade-up flex flex-col"
        style={{ maxHeight: '92vh' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>
            Pré-visualização da Proposta
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable preview */}
        <div className="overflow-y-auto flex-1 p-4 flex justify-center" style={{ background: '#e5e7eb' }}>
          {/* ── A4 SHEET ── */}
          <div
            ref={sheetRef}
            style={{
              width: 794,
              minHeight: 1000,
              background: '#fff',
              fontFamily: 'Arial, Helvetica, sans-serif',
              flexShrink: 0,
            }}
          >
            {/* ═══ HEADER ═══ */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '28px 36px 0', position: 'relative' }}>
              {/* Logo */}
              <img src={logoUrl} alt="AprovaMais" style={{ height: 56, objectFit: 'contain' }}
                onError={e => (e.currentTarget.style.display = 'none')} />

              {/* Corretor photo — centered */}
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Corretor"
                  crossOrigin="anonymous"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: -10,
                    height: 160,
                    objectFit: 'contain',
                    zIndex: 10,
                  }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}

              {/* Title block */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GREEN_MID, letterSpacing: 4, textTransform: 'uppercase' }}>
                  Formalização de
                </div>
                <div style={{ fontSize: 52, fontWeight: 900, color: GREEN_MID, fontStyle: 'italic', lineHeight: 1, marginTop: 2 }}>
                  PROPOSTA
                </div>
              </div>
            </div>

            {/* ═══ BANNER ═══ */}
            <div style={{
              margin: '14px 36px 0',
              borderRadius: 14,
              background: GREEN_MID,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 88,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Left: client */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>👤</div>
                <div>
                  <div style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 700, color: '#fff' }}>
                    {proposta.nomeCliente || 'Cliente'}
                  </div>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>
                    {cpfMasked}
                  </div>
                </div>
              </div>

              {/* Center spacer for photo */}
              <div style={{ flex: 1 }} />

              {/* Right: corretor */}
              <div style={{ textAlign: 'right', padding: '18px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{corretor.nome}</div>
                {corretor.email && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                    ✉ {corretor.email}
                  </div>
                )}
                {corretor.phone && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                    📱 {corretor.phone}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ BOXES GRID ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, margin: '24px 36px 0' }}>

              {/* Box 1 — Valor líquido liberado */}
              <div style={{ border: `2.5px solid ${GREEN_MID}`, borderRadius: 16, padding: '20px 18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>💰</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                    Valor líquido liberado:
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: GREEN, lineHeight: 1.05 }}>
                    {fmtBRL(proposta.valorLiquido)}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {[
                      'Valor líquido liberado diretamente em sua conta.',
                      'Valor disponível após averbação da parcela no contracheque.',
                      'Margem de 5% atualmente utilizada, liberada após a quitação do contrato.',
                    ].map(t => (
                      <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 3 }}>
                        <span style={{ color: GREEN, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 10, color: '#444', lineHeight: 1.4 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Box 2 — Parcela utilizada */}
              <div style={{ border: `2.5px solid ${GREEN_MID}`, borderRadius: 16, padding: '20px 18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>📊</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                    Parcela utilizada:
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: GREEN, lineHeight: 1.05 }}>
                    {fmtBRL(proposta.parcela)}
                  </div>
                </div>
              </div>

              {/* Box 3 — Dívida quitada */}
              <div style={{ border: `2.5px solid ${GREEN_MID}`, borderRadius: 16, padding: '20px 18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                    Dívida quitada – {proposta.bancoNomeDivida.toUpperCase() || '—'}:
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, color: GREEN, lineHeight: 1.05 }}>
                    {fmtBRL(proposta.valorDivida)}
                  </div>
                </div>
              </div>

              {/* Box 4 — Banco responsável */}
              <div style={{ border: `2.5px solid ${GREEN_MID}`, borderRadius: 16, padding: '20px 18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>🏦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: GREEN, marginBottom: 4 }}>
                    Banco responsável:
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: GREEN, lineHeight: 1.1 }}>
                    {proposta.bancoResponsavel || '—'}
                  </div>
                </div>
              </div>

            </div>

            {/* ═══ FOOTER ═══ */}
            <div style={{ margin: '32px 36px 0', borderTop: '1.5px solid #bbb', paddingTop: 14 }}>
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, fontStyle: 'italic', textDecoration: 'underline', color: '#111' }}>
                AprovaMais Soluções Financeiras - CNPJ 55.886.747/0001-80
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 10, lineHeight: 1.8 }}>
                Proposta sujeita à análise de crédito e averbação do órgão pagador.<br />
                O saldo devedor considera a fatura encaminhada pelo cliente e pode sofrer alterações em decorrência de juros e encargos.<br />
                Condições válidas por 48 horas após o envio desta proposta.
              </div>
              <div style={{ textAlign: 'right', marginTop: 20, paddingBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: '#111' }}>Página 1 de 1</div>
                <div style={{ fontSize: 13, color: '#333', marginTop: 2 }}>Documento gerado por AprovaMais Soluções Financeiras.</div>
              </div>
            </div>

          </div>{/* end sheet */}
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--card-border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold btn-ghost">
            Fechar
          </button>
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-60"
          >
            {generating
              ? <><Loader className="w-4 h-4 animate-spin" /> Gerando PDF...</>
              : <><Download className="w-4 h-4" /> Baixar PDF</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
