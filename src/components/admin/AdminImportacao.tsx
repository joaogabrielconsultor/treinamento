import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, RefreshCw, Info } from 'lucide-react';

const token = () => localStorage.getItem('token') ?? '';

interface ParsedRow {
  id?: string;
  proposta?: string;
  nome_cliente?: string;
  cpf?: string;
  convenio?: string;
  banco?: string;
  tabela?: string;
  corretor?: string;
  valor?: string;
  tipo?: string;
  esteira?: string;
  data_digitacao?: string;
  data_status?: string;
}

interface ParseResult {
  rows: ParsedRow[];
  unknownBrokers: string[];
  statusSummary: Record<string, number>;
  total: number;
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: Array<{ row: string; error: string }>;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Paga':       { bg: '#14532d22', text: '#22c55e' },
  'Aprovada':   { bg: '#581c8722', text: '#a855f7' },
  'Em análise': { bg: '#78350f22', text: '#f59e0b' },
  'Digitada':   { bg: '#1e3a5f22', text: '#60a5fa' },
  'Cancelada':  { bg: '#450a0a22', text: '#f87171' },
};

function fmtVal(v: string) {
  return v ? `R$ ${v}` : '-';
}

export function AdminImportacao() {
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 25;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/proposals/import/parse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar arquivo');
      setParseResult(data);
      setPage(0);
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!parseResult) return;
    setStep('importing');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/proposals/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parseResult.rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar');
      setImportResult(data);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const rows = parseResult?.rows ?? [];
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paidCount = Object.entries(parseResult?.statusSummary ?? {})
    .filter(([k]) => k === 'Paga')
    .reduce((s, [, v]) => s + v, 0);

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="w-6 h-6" style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Importação CRM</h1>
      </div>

      {/* Step: upload */}
      {step === 'upload' && (
        <div className="max-w-lg">
          <div
            className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
              Selecione o arquivo CSV
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Formato: separado por ponto-e-vírgula (;)<br />
              Colunas: ID · Proposta · Cliente · CPF · Convênio · Banco · Tabela · Corretor · Vl.Proposta · Produto · Status · Dt. Digit. · Dt. Status
            </p>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="mt-4 p-4 rounded-xl text-xs" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            <p className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
              <span>
                <strong style={{ color: 'var(--text-2)' }}>Data de competência:</strong>{' '}
                propostas usam a coluna <em>Dt. Status</em> para determinar o mês de referência nas contas (conta corrente e conta empresa).
                A coluna <em>Dt. Digit.</em> fica salva como data de cadastro.
              </span>
            </p>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processando arquivo...
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#450a0a33', color: '#f87171', border: '1px solid #f8717155' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step: preview */}
      {(step === 'preview' || step === 'importing') && parseResult && (
        <div>
          {/* Summary cards */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
              {parseResult.total} propostas encontradas
            </div>
            {paidCount > 0 && (
              <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#14532d22', border: '1px solid #22c55e44', color: '#22c55e' }}>
                {paidCount} Pagas → comissão marcada como recebida
              </div>
            )}
            {Object.entries(parseResult.statusSummary)
              .filter(([k]) => k !== 'Paga')
              .map(([status, count]) => {
                const c = STATUS_COLORS[status] ?? { bg: 'var(--card)', text: 'var(--text-3)' };
                return (
                  <div key={status} className="px-3 py-2 rounded-xl text-xs" style={{ background: c.bg, border: `1px solid ${c.text}44`, color: c.text }}>
                    {count}× {status}
                  </div>
                );
              })
            }
          </div>

          {/* Unknown brokers warning */}
          {parseResult.unknownBrokers.length > 0 && (
            <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: '#78350f22', border: '1px solid #f59e0b44', color: '#f59e0b' }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Corretores não encontrados no sistema</strong> — serão importados em nome do administrador:{' '}
                {parseResult.unknownBrokers.join(', ')}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#450a0a33', color: '#f87171', border: '1px solid #f8717155' }}>
              {error}
            </div>
          )}

          {/* Preview table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--card-2)', color: 'var(--text-3)' }}>
                    <th className="px-3 py-2 text-left font-semibold">Proposta</th>
                    <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                    <th className="px-3 py-2 text-left font-semibold">Corretor</th>
                    <th className="px-3 py-2 text-left font-semibold">Banco</th>
                    <th className="px-3 py-2 text-left font-semibold">Tabela</th>
                    <th className="px-3 py-2 text-right font-semibold">Valor</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Dt. Digit.</th>
                    <th className="px-3 py-2 text-left font-semibold">Dt. Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const sc = STATUS_COLORS[row.esteira ?? ''] ?? { bg: 'transparent', text: 'var(--text-3)' };
                    const brokerUnknown = parseResult.unknownBrokers.includes(row.corretor ?? '');
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-2)' }}>{row.proposta || <span style={{ color: 'var(--text-3)' }}>gerado</span>}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-1)' }}>{row.nome_cliente}</td>
                        <td className="px-3 py-2" style={{ color: brokerUnknown ? '#f59e0b' : 'var(--text-2)' }}>
                          {row.corretor}{brokerUnknown && ' ⚠'}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-3)' }}>{row.banco}</td>
                        <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--text-3)' }} title={row.tabela}>{row.tabela}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-1)' }}>{fmtVal(row.valor ?? '')}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>
                            {row.esteira || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-3)' }}>{row.data_digitacao}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-3)' }}>{row.data_status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} de {rows.length}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg text-xs disabled:opacity-40" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  ← Anterior
                </button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs disabled:opacity-40" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-5">
            <button onClick={reset} disabled={step === 'importing'}
              className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <X className="w-4 h-4 inline mr-1" />Cancelar
            </button>
            <button onClick={handleImport} disabled={step === 'importing'}
              className="px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ background: 'var(--accent)', color: '#fff' }}>
              {step === 'importing'
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importando...</>
                : <><Upload className="w-4 h-4" /> Importar {parseResult.total} propostas</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && importResult && (
        <div className="max-w-lg">
          <div className="p-6 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8" style={{ color: '#22c55e' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Importação concluída</h2>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Propostas novas</span>
                <span className="font-semibold" style={{ color: '#22c55e' }}>{importResult.imported}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Propostas atualizadas</span>
                <span className="font-semibold" style={{ color: '#60a5fa' }}>{importResult.updated}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-3)' }}>Erros</span>
                  <span className="font-semibold" style={{ color: '#f87171' }}>{importResult.errors.length}</span>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-5 p-3 rounded-xl text-xs" style={{ background: '#450a0a22', border: '1px solid #f8717144', color: '#f87171' }}>
                <p className="font-semibold mb-2">Linhas com erro:</p>
                {importResult.errors.map((e, i) => (
                  <p key={i}><strong>{e.row || '?'}</strong>: {e.error}</p>
                ))}
              </div>
            )}

            <button onClick={reset}
              className="w-full py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
              Nova importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
