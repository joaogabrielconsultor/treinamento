import { useState } from 'react';
import { X, Download, Loader } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
  const photoUrl = corretor.photo_url ? `${apiBase}${corretor.photo_url}` : null;
  const logoUrl = `${window.location.origin}/logo.png`;
  const cpfMasked = maskCPF(proposta.cpfCliente);

  async function downloadPDF() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/proposta/gerar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          nomeCliente: proposta.nomeCliente,
          cpfCliente: proposta.cpfCliente,
          bancoNomeDivida: proposta.bancoNomeDivida,
          valorLiquido: proposta.valorLiquido,
          parcela: proposta.parcela,
          valorDivida: proposta.valorDivida,
          bancoResponsavel: proposta.bancoResponsavel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(data.error || 'Erro ao gerar PDF');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_${proposta.nomeCliente.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Falha na conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-panel rounded-2xl w-full max-w-2xl animate-fade-up flex flex-col"
        style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Pré-visualização da Proposta</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto flex-1 p-4 flex justify-center" style={{ background: '#e5e7eb' }}>
          <div style={{ width: 540, background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', flexShrink: 0, borderRadius: 4, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 24px 0', position: 'relative', background: '#fff' }}>
              <img src={logoUrl} alt="Logo" style={{ height: 40 }} onError={e => (e.currentTarget.style.display = 'none')} />
              {photoUrl && (
                <img src={photoUrl} alt="Corretor" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -8, height: 155, objectFit: 'contain' }}
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: GREEN_MID, letterSpacing: 3, textTransform: 'uppercase' }}>Formalização de</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: GREEN_MID, fontStyle: 'italic', lineHeight: 1 }}>PROPOSTA</div>
              </div>
            </div>

            {/* Banner */}
            <div style={{ background: GREEN_MID, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', minHeight: 68, margin: '10px 24px 0', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>👤</span>
                <div>
                  <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#fff', fontSize: 14 }}>{proposta.nomeCliente || 'Nome do cliente'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{cpfMasked}</div>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{corretor.nome}</div>
                {corretor.email && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 3 }}>✉ {corretor.email}</div>}
                {corretor.phone && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2 }}>📱 {corretor.phone}</div>}
              </div>
            </div>

            {/* Boxes 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 24px 0' }}>
              {[
                { icon: '💰', label: 'Valor líquido liberado:', value: fmtBRL(proposta.valorLiquido), notes: true },
                { icon: '📊', label: 'Parcela utilizada:', value: fmtBRL(proposta.parcela), notes: false },
                { icon: '📋', label: `Dívida quitada – ${proposta.bancoNomeDivida.toUpperCase() || '—'}:`, value: fmtBRL(proposta.valorDivida), notes: false },
                { icon: '🏦', label: 'Banco responsável:', value: proposta.bancoResponsavel || '—', notes: false },
              ].map(b => (
                <div key={b.label} style={{ border: `2px solid ${GREEN_MID}`, borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 24 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>{b.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: GREEN, marginTop: 3 }}>{b.value}</div>
                      {b.notes && (
                        <div style={{ marginTop: 8 }}>
                          {['Valor líquido liberado diretamente em sua conta.', 'Valor disponível após averbação da parcela no contracheque.', 'Margem de 5% liberada após a quitação do contrato.'].map(t => (
                            <div key={t} style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                              <span style={{ color: GREEN, fontWeight: 700, fontSize: 8 }}>✓</span>
                              <span style={{ fontSize: 8, color: '#555' }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ margin: '14px 24px 16px', borderTop: '1px solid #bbb', paddingTop: 10 }}>
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, fontStyle: 'italic', textDecoration: 'underline', color: '#111' }}>
                AprovaMais Soluções Financeiras - CNPJ 55.886.747/0001-80
              </div>
              <div style={{ textAlign: 'center', fontSize: 9, color: '#555', marginTop: 6, lineHeight: 1.7 }}>
                Proposta sujeita à análise de crédito e averbação do órgão pagador.<br />
                Condições válidas por 48 horas após o envio desta proposta.
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontStyle: 'italic' }}>Página 1 de 1</div>
                <div style={{ fontSize: 9, color: '#444' }}>Documento gerado por AprovaMais Soluções Financeiras.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--card-border)' }}>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold btn-ghost">Fechar</button>
            <button
              onClick={downloadPDF}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-cyber disabled:opacity-60"
            >
              {loading
                ? <><Loader className="w-4 h-4 animate-spin" /> Gerando PDF...</>
                : <><Download className="w-4 h-4" /> Baixar PDF Oficial</>
              }
            </button>
          </div>
          <p className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
            O PDF gerado usa o template oficial da AprovaMais com a foto e dados do corretor
          </p>
        </div>
      </div>
    </div>
  );
}
