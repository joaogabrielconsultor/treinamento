import { useState, useEffect } from 'react';
import { Calculator, ChevronDown, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { CommissionRange, FinancialTable, Bank, Convenio } from '../types';

const API = (p: string) =>
  fetch(p, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${Number(v).toFixed(2)}%`;

interface SimResult {
  key: string;
  table_id: string;
  table_name: string;
  bank_id: string;
  bank_name: string;
  convenio_id: string;
  convenio_name: string;
  tipo_proposta: string;
  prazo: number;
  coef: number;
  valor_liberado: number;
  parcela: number;
  comissao_empresa_pct: number;
  comissao_corretor_pct: number;
  comissao_empresa_val: number;
  comissao_corretor_val: number;
  rentabilidade: number;
}

export interface SimPrefill {
  convenio_id: string;
  bank_id: string;
  table_id: string;
  value: string;
}

interface SimulatorProps {
  onSendProposal: (data: SimPrefill) => void;
}

export function Simulator({ onSendProposal }: SimulatorProps) {
  const [mode, setMode] = useState<'parcela' | 'credito'>('parcela');
  const [inputVal, setInputVal] = useState('');
  const [filterConvenio, setFilterConvenio] = useState('');
  const [filterBanco, setFilterBanco] = useState('');

  const [allRanges, setAllRanges] = useState<CommissionRange[]>([]);
  const [tableMap, setTableMap] = useState<Record<string, FinancialTable>>({});
  const [banks, setBanks] = useState<Bank[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [results, setResults] = useState<SimResult[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      const [ranges, tables, bks, cvs] = await Promise.all([
        API('/api/commission-ranges').then(r => r.json()),
        API('/api/financial-tables').then(r => r.json()),
        API('/api/banks').then(r => r.json()),
        API('/api/convenios').then(r => r.json()),
      ]);
      if (Array.isArray(ranges)) setAllRanges(ranges);
      if (Array.isArray(tables)) {
        const map: Record<string, FinancialTable> = {};
        (tables as FinancialTable[]).forEach(t => { map[t.id] = t; });
        setTableMap(map);
      }
      if (Array.isArray(bks)) setBanks(bks);
      if (Array.isArray(cvs)) setConvenios(cvs);
      setDataLoading(false);
    }
    loadData();
  }, []);

  function simulate() {
    const raw = inputVal.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(raw);
    if (!val || val <= 0) return;

    const res: SimResult[] = [];

    for (const range of allRanges) {
      const table = tableMap[range.financial_table_id];
      if (!table) continue;

      const coef = Number(range.coef_final ?? range.coef_inicial ?? table.coeficiente) || 0;
      if (!coef) continue;

      if (filterConvenio && table.convenio_id !== filterConvenio) continue;
      if (filterBanco && table.bank_id !== filterBanco) continue;

      const valor_liberado = mode === 'parcela' ? val / coef : val;
      const parcela       = mode === 'parcela' ? val       : val * coef;

      const empPct = Number(range.comissao_empresa || table.comissao_empresa) || 0;
      const corPct = Number(range.comissao_corretor || table.comissao_corretor) || 0;

      res.push({
        key: range.id,
        table_id: range.financial_table_id,
        table_name: range.table_name || table.name || '',
        bank_id: table.bank_id || '',
        bank_name: range.bank_name || table.bank_name || '',
        convenio_id: table.convenio_id || '',
        convenio_name: range.convenio_name || table.convenio_name || '',
        tipo_proposta: range.tipo_proposta || '',
        prazo: Number(range.prazo_final ?? range.prazo_inicial) || 0,
        coef,
        valor_liberado,
        parcela,
        comissao_empresa_pct: empPct,
        comissao_corretor_pct: corPct,
        comissao_empresa_val: valor_liberado * empPct / 100,
        comissao_corretor_val: valor_liberado * corPct / 100,
        rentabilidade: empPct - corPct,
      });
    }

    res.sort((a, b) => b.comissao_corretor_val - a.comissao_corretor_val);
    setResults(res);
    setSimulated(true);
  }

  const inpCls = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl appearance-none';

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Simulador Financeiro</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          Simule operações em segundos e converta em proposta com um clique
        </p>
      </div>

      {/* Input card */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        {/* Mode toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['parcela', 'credito'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setResults([]); setSimulated(false); }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={mode === m
                ? { background: 'linear-gradient(135deg,#14B8A6,#06B6D4)', color: '#fff', boxShadow: '0 2px 10px rgba(20,184,166,0.35)' }
                : { color: 'var(--text-3)' }}
            >
              {m === 'parcela' ? <><Zap className="w-3.5 h-3.5" /> Por Parcela</> : <><TrendingUp className="w-3.5 h-3.5" /> Por Crédito</>}
            </button>
          ))}
        </div>

        {/* Fields row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
              {mode === 'parcela' ? 'Valor da parcela / margem (R$)' : 'Valor de crédito desejado (R$)'}
            </label>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && simulate()}
              className="input-cyber w-full px-3 py-3 text-base font-bold rounded-xl"
              placeholder={mode === 'parcela' ? 'Ex: 200,00' : 'Ex: 10.000,00'}
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Convênio</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterConvenio} onChange={e => setFilterConvenio(e.target.value)} className={`${inpCls} pr-7`}>
                <option value="">Todos</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Banco</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterBanco} onChange={e => setFilterBanco(e.target.value)} className={`${inpCls} pr-7`}>
                <option value="">Todos</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={simulate}
            disabled={!inputVal.trim() || dataLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm btn-cyber font-semibold disabled:opacity-50 transition-all"
          >
            <Calculator className="w-4 h-4" />
            {dataLoading ? 'Carregando...' : 'Simular'}
          </button>
        </div>

        {/* Mode hint */}
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
          {mode === 'parcela'
            ? 'Informe quanto o cliente pode pagar por mês → o sistema calcula o valor liberado em cada tabela.'
            : 'Informe quanto o cliente quer receber → o sistema calcula a parcela em cada tabela.'}
        </p>
      </div>

      {/* Empty state */}
      {!simulated && (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-3)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>
            {mode === 'parcela'
              ? 'Informe o valor da parcela e clique em Simular'
              : 'Informe o valor desejado e clique em Simular'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
            Todas as tabelas ativas serão comparadas automaticamente
          </p>
        </div>
      )}

      {/* No results */}
      {simulated && results.length === 0 && (
        <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Nenhuma tabela disponível para os critérios informados</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>Tente remover os filtros ou verifique se há tabelas com coeficiente cadastrado</p>
        </div>
      )}

      {/* Results */}
      {simulated && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
              <span className="text-brand">{results.length}</span> opções disponíveis
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-3)' }}>
                — ordenadas por maior comissão do corretor
              </span>
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.12)' }}>
                    {['Banco','Convênio','Tabela','Tipo','Prazo','Coeficiente','Valor Liberado','Parcela','Emp %','Cor %','Com. Empresa','Com. Corretor','Rentab.',''].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr
                      key={r.key}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--card-border)', background: idx === 0 ? 'rgba(20,184,166,0.04)' : undefined }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx === 0 ? 'rgba(20,184,166,0.04)' : 'transparent'}
                    >
                      <td className="px-3 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-1)' }}>
                        {idx === 0 && <span className="mr-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>TOP</span>}
                        {r.bank_name || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{r.convenio_name || '—'}</td>
                      <td className="px-3 py-3 text-xs max-w-[140px] truncate" style={{ color: 'var(--text-2)' }} title={r.table_name}>{r.table_name || '—'}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{r.tipo_proposta || '—'}</td>
                      <td className="px-3 py-3 text-xs num text-center font-semibold" style={{ color: 'var(--text-2)' }}>{r.prazo > 0 ? `${r.prazo}x` : '—'}</td>
                      <td className="px-3 py-3 text-[11px] num font-mono" style={{ color: '#a78bfa' }}>{r.coef.toFixed(7)}</td>
                      <td className="px-3 py-3 text-xs num font-bold" style={{ color: 'var(--text-1)' }}>{fmtBRL(r.valor_liberado)}</td>
                      <td className="px-3 py-3 text-xs num font-semibold" style={{ color: '#fbbf24' }}>{fmtBRL(r.parcela)}</td>
                      <td className="px-3 py-3 text-xs num" style={{ color: '#60a5fa' }}>{fmtPct(r.comissao_empresa_pct)}</td>
                      <td className="px-3 py-3 text-xs num" style={{ color: '#4ade80' }}>{fmtPct(r.comissao_corretor_pct)}</td>
                      <td className="px-3 py-3 text-xs num font-semibold" style={{ color: '#60a5fa' }}>{fmtBRL(r.comissao_empresa_val)}</td>
                      <td className="px-3 py-3 text-xs num font-bold" style={{ color: '#4ade80' }}>{fmtBRL(r.comissao_corretor_val)}</td>
                      <td className="px-3 py-3 text-xs num" style={{ color: r.rentabilidade > 0 ? '#f59e0b' : 'var(--text-3)' }}>{fmtPct(r.rentabilidade)}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => onSendProposal({
                            convenio_id: r.convenio_id,
                            bank_id: r.bank_id,
                            table_id: r.table_id,
                            value: r.valor_liberado.toFixed(2),
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold btn-cyber whitespace-nowrap"
                        >
                          <ArrowRight className="w-3 h-3" /> Enviar Proposta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
