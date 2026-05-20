import { useState, useEffect, useMemo } from 'react';
import { Calculator, ChevronDown, ArrowRight, TrendingUp, Zap, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { FinancialTable, Bank, Convenio } from '../types';

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
  troco_liquido?: number;
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
  usuario_banco_id?: string;
}

interface SimulatorProps {
  onSendProposal: (data: SimPrefill) => void;
  isAdmin?: boolean;
}

export function Simulator({ onSendProposal, isAdmin = false }: SimulatorProps) {
  const [mode, setMode] = useState<'parcela' | 'credito' | 'compra-divida'>('parcela');
  const [inputVal, setInputVal] = useState('');
  const [dividaVal, setDividaVal] = useState('');

  // Required filters
  const [filterConvenio, setFilterConvenio] = useState('');
  const [filterTipoProposta, setFilterTipoProposta] = useState('');

  // Optional filters
  const [filterConvenioDesc, setFilterConvenioDesc] = useState('');
  const [filterBanco, setFilterBanco] = useState('');
  const [filterParceiro, setFilterParceiro] = useState('');
  const [filterUsuarioBanco, setFilterUsuarioBanco] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const [allTables, setAllTables] = useState<FinancialTable[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [usuariosBanco, setUsuariosBanco] = useState<{ id: string; nome: string }[]>([]);
  const [results, setResults] = useState<SimResult[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      const [tables, bks, cvs, ubs] = await Promise.all([
        API('/api/financial-tables').then(r => r.json()),
        API('/api/banks').then(r => r.json()),
        API('/api/convenios').then(r => r.json()),
        API('/api/usuarios-banco').then(r => r.json()),
      ]);
      if (Array.isArray(tables)) setAllTables(tables as FinancialTable[]);
      if (Array.isArray(bks)) setBanks(bks);
      if (Array.isArray(cvs)) setConvenios(cvs);
      if (Array.isArray(ubs)) setUsuariosBanco(ubs);
      setDataLoading(false);
    }
    loadData();
  }, []);

  const availableTipos = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTables) {
      if (filterConvenio && t.convenio_id !== filterConvenio) continue;
      if (t.tipo_proposta) set.add(t.tipo_proposta);
    }
    return Array.from(set).sort();
  }, [allTables, filterConvenio]);

  const availableConvenioDescs = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTables) {
      if (filterConvenio && t.convenio_id !== filterConvenio) continue;
      if (filterTipoProposta && t.tipo_proposta !== filterTipoProposta) continue;
      if (t.convenio_descricao) set.add(t.convenio_descricao);
    }
    return Array.from(set).sort();
  }, [allTables, filterConvenio, filterTipoProposta]);

  const availableParceiros = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTables) {
      if (filterConvenio && t.convenio_id !== filterConvenio) continue;
      if (filterTipoProposta && t.tipo_proposta !== filterTipoProposta) continue;
      if (t.parceiro) set.add(t.parceiro);
    }
    return Array.from(set).sort();
  }, [allTables, filterConvenio, filterTipoProposta]);

  function resetResults() { setResults([]); setSimulated(false); }

  function simulate() {
    const raw = inputVal.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(raw);
    if (!val || val <= 0) return;

    let divida = 0;
    if (mode === 'compra-divida') {
      const rawD = dividaVal.replace(/\./g, '').replace(',', '.');
      divida = parseFloat(rawD);
      if (!divida || divida <= 0) return;
    }

    const res: SimResult[] = [];

    for (const t of allTables) {
      if (!t.active) continue;

      const coef = Number(t.coef_final ?? t.coef_inicial ?? t.coeficiente) || 0;
      if (!coef) continue;

      if (filterConvenio && t.convenio_id !== filterConvenio) continue;
      if (filterTipoProposta && t.tipo_proposta !== filterTipoProposta) continue;
      if (filterConvenioDesc && t.convenio_descricao !== filterConvenioDesc) continue;
      if (filterBanco && t.bank_id !== filterBanco) continue;
      if (filterParceiro && t.parceiro !== filterParceiro) continue;

      // Compra de dívida: somente tabelas RFN / PORTABILIDADE
      if (mode === 'compra-divida') {
        const tipo = (t.tipo_proposta || '').toUpperCase();
        if (!tipo.includes('PORTABILIDADE') && !tipo.includes('RFN')) continue;
      }

      const valor_liberado = mode === 'credito' ? val : val / coef;
      const parcela        = mode === 'credito' ? val * coef : val;
      const troco_liquido  = mode === 'compra-divida' ? valor_liberado - divida : undefined;

      const empPct = Number(t.comissao_empresa) || 0;
      const corPct = Number(t.comissao_corretor) || 0;

      res.push({
        key: t.id,
        table_id: t.id,
        table_name: t.name || '',
        bank_id: t.bank_id || '',
        bank_name: t.bank_name || '',
        convenio_id: t.convenio_id || '',
        convenio_name: t.convenio_name || '',
        tipo_proposta: t.tipo_proposta || '',
        prazo: Number(t.prazo_final ?? t.prazo_inicial) || 0,
        coef,
        valor_liberado,
        parcela,
        troco_liquido,
        comissao_empresa_pct: empPct,
        comissao_corretor_pct: corPct,
        comissao_empresa_val: valor_liberado * empPct / 100,
        comissao_corretor_val: valor_liberado * corPct / 100,
        rentabilidade: empPct - corPct,
      });
    }

    if (mode === 'compra-divida') {
      res.sort((a, b) => (b.troco_liquido ?? -Infinity) - (a.troco_liquido ?? -Infinity));
    } else {
      res.sort((a, b) => b.comissao_corretor_val - a.comissao_corretor_val);
    }
    setResults(res);
    setSimulated(true);
  }

  const inpCls = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl appearance-none';
  const canSimulate = !!inputVal.trim() && !!filterConvenio && !dataLoading
    && (mode === 'compra-divida' || !!filterTipoProposta)
    && (mode !== 'compra-divida' || !!dividaVal.trim());

  const optionalActiveCount = [filterConvenioDesc, filterBanco, filterParceiro, filterUsuarioBanco].filter(Boolean).length;

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
          {([
            { key: 'parcela',       label: 'Por Parcela',      icon: <Zap className="w-3.5 h-3.5" /> },
            { key: 'credito',       label: 'Por Crédito',      icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { key: 'compra-divida', label: 'Compra de Dívida', icon: <RefreshCw className="w-3.5 h-3.5" /> },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setDividaVal(''); resetResults(); }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={mode === m.key
                ? { background: m.key === 'compra-divida'
                    ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
                    : 'linear-gradient(135deg,#14B8A6,#06B6D4)',
                    color: '#fff',
                    boxShadow: m.key === 'compra-divida'
                      ? '0 2px 10px rgba(139,92,246,0.35)'
                      : '0 2px 10px rgba(20,184,166,0.35)' }
                : { color: 'var(--text-3)' }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Required fields label */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
          Campos obrigatórios
        </p>

        {/* Required row */}
        <div className={`grid grid-cols-1 gap-3 mb-4 ${mode === 'compra-divida' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {/* Valor da Parcela */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
              {mode === 'credito' ? 'Valor de Crédito (R$)' : 'Valor da Parcela (R$)'}
              <span className="ml-1 text-[10px]" style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); resetResults(); }}
              onKeyDown={e => e.key === 'Enter' && canSimulate && simulate()}
              className="input-cyber w-full px-3 py-3 text-base font-bold rounded-xl"
              placeholder={mode === 'credito' ? 'Ex: 10.000,00' : 'Ex: 400,00'}
              inputMode="decimal"
            />
          </div>

          {/* Valor da Dívida — apenas no modo compra-divida */}
          {mode === 'compra-divida' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a78bfa' }}>
                Valor da Dívida do Cliente (R$)
                <span className="ml-1 text-[10px]" style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                value={dividaVal}
                onChange={e => { setDividaVal(e.target.value); resetResults(); }}
                onKeyDown={e => e.key === 'Enter' && canSimulate && simulate()}
                className="input-cyber w-full px-3 py-3 text-base font-bold rounded-xl"
                placeholder="Ex: 10.000,00"
                inputMode="decimal"
                style={{ borderColor: 'rgba(139,92,246,0.4)' }}
              />
            </div>
          )}

          {/* Convênio */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
              Convênio
              <span className="ml-1 text-[10px]" style={{ color: '#f87171' }}>*</span>
            </label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select
                value={filterConvenio}
                onChange={e => { setFilterConvenio(e.target.value); setFilterTipoProposta(''); setFilterConvenioDesc(''); resetResults(); }}
                className={`${inpCls} py-3 pr-7`}
              >
                <option value="">Selecione o convênio</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo de Proposta — opcional no modo compra-divida */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
              Tipo de Proposta
              {mode !== 'compra-divida' && <span className="ml-1 text-[10px]" style={{ color: '#f87171' }}>*</span>}
              {mode === 'compra-divida' && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-3)' }}>(opcional)</span>}
            </label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select
                value={filterTipoProposta}
                onChange={e => { setFilterTipoProposta(e.target.value); setFilterConvenioDesc(''); resetResults(); }}
                className={`${inpCls} py-3 pr-7`}
                disabled={!filterConvenio}
              >
                <option value="">{filterConvenio ? (mode === 'compra-divida' ? 'Todos (RFN/Portabilidade)' : 'Selecione o tipo') : 'Selecione o convênio primeiro'}</option>
                {availableTipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Optional filters toggle */}
        <button
          onClick={() => setShowOptional(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold mb-3 transition-all"
          style={{ color: optionalActiveCount > 0 ? '#14B8A6' : 'var(--text-3)' }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros opcionais
          {optionalActiveCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>
              {optionalActiveCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
        </button>

        {showOptional && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Desc. Convênio */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Desc. Convênio</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select
                  value={filterConvenioDesc}
                  onChange={e => { setFilterConvenioDesc(e.target.value); resetResults(); }}
                  className={`${inpCls} pr-7`}
                  disabled={availableConvenioDescs.length === 0}
                >
                  <option value="">Todos</option>
                  {availableConvenioDescs.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Banco */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Banco</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select value={filterBanco} onChange={e => { setFilterBanco(e.target.value); resetResults(); }} className={`${inpCls} pr-7`}>
                  <option value="">Todos</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Parceiro */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Parceiro</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                <select
                  value={filterParceiro}
                  onChange={e => { setFilterParceiro(e.target.value); resetResults(); }}
                  className={`${inpCls} pr-7`}
                  disabled={availableParceiros.length === 0}
                >
                  <option value="">Todos</option>
                  {availableParceiros.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Usuário banco */}
            {usuariosBanco.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Usuário banco</label>
                <div className="relative">
                  <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  <select
                    value={filterUsuarioBanco}
                    onChange={e => { setFilterUsuarioBanco(e.target.value); resetResults(); }}
                    className={`${inpCls} pr-7`}
                  >
                    <option value="">Nenhum</option>
                    {usuariosBanco.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulate button */}
        <div className="flex items-center gap-3">
          <button
            onClick={simulate}
            disabled={!canSimulate}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm btn-cyber font-semibold disabled:opacity-40 transition-all"
          >
            <Calculator className="w-4 h-4" />
            {dataLoading ? 'Carregando dados...' : 'Simular'}
          </button>
          {!filterConvenio && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Selecione o convênio para continuar</p>
          )}
          {filterConvenio && !filterTipoProposta && mode !== 'compra-divida' && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Selecione o tipo de proposta para continuar</p>
          )}
          {filterConvenio && !inputVal.trim() && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Informe o valor da {mode === 'credito' ? 'crédito' : 'parcela'}
            </p>
          )}
          {mode === 'compra-divida' && inputVal.trim() && !dividaVal.trim() && (
            <p className="text-xs" style={{ color: '#a78bfa' }}>Informe o valor da dívida do cliente</p>
          )}
        </div>

        {/* Mode hint */}
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
          {mode === 'parcela'
            ? 'Informe quanto o cliente pode pagar por mês → o sistema calcula o valor liberado em cada tabela.'
            : mode === 'credito'
            ? 'Informe quanto o cliente quer receber → o sistema calcula a parcela em cada tabela.'
            : 'Informe a parcela e a dívida atual do cliente → o sistema mostra o troco líquido (quanto sobra após quitar a dívida) em cada tabela RFN / Portabilidade.'}
        </p>
      </div>

      {/* Empty state */}
      {!simulated && (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-3)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>
            Preencha os campos obrigatórios e clique em Simular
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
            Todas as tabelas correspondentes serão comparadas automaticamente
          </p>
        </div>
      )}

      {/* No results */}
      {simulated && results.length === 0 && (
        <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Nenhuma tabela disponível para os critérios informados</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>Tente remover filtros opcionais ou verifique se há tabelas com coeficiente cadastrado</p>
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
                    {[
                      'Banco','Convênio','Tabela','Tipo','Prazo','Coeficiente',
                      'Valor Liberado',
                      ...(mode === 'compra-divida' ? ['Troco Líquido'] : []),
                      'Parcela',
                      ...(isAdmin ? ['Emp %'] : []),
                      'Cor %',
                      ...(isAdmin ? ['Com. Empresa'] : []),
                      'Com. Corretor',
                      ...(isAdmin ? ['Rentab.'] : []),
                      ''
                    ].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr
                      key={r.key}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        background: mode === 'compra-divida' && (r.troco_liquido ?? 0) < 0
                          ? 'rgba(248,113,113,0.04)'
                          : idx === 0 ? 'rgba(20,184,166,0.04)' : undefined,
                        opacity: mode === 'compra-divida' && (r.troco_liquido ?? 0) < 0 ? 0.75 : 1,
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background =
                        mode === 'compra-divida' && (r.troco_liquido ?? 0) < 0
                          ? 'rgba(248,113,113,0.04)'
                          : idx === 0 ? 'rgba(20,184,166,0.04)' : 'transparent'}
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
                      {mode === 'compra-divida' && (
                        <td className="px-3 py-3 text-xs num font-black whitespace-nowrap"
                          style={{ color: (r.troco_liquido ?? 0) >= 0 ? '#4ade80' : '#f87171',
                                   background: (r.troco_liquido ?? 0) >= 0 ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)' }}>
                          {(r.troco_liquido ?? 0) >= 0 ? '+' : ''}{fmtBRL(r.troco_liquido ?? 0)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-xs num font-semibold" style={{ color: '#fbbf24' }}>{fmtBRL(r.parcela)}</td>
                      {isAdmin && <td className="px-3 py-3 text-xs num" style={{ color: '#60a5fa' }}>{fmtPct(r.comissao_empresa_pct)}</td>}
                      <td className="px-3 py-3 text-xs num" style={{ color: '#4ade80' }}>{fmtPct(r.comissao_corretor_pct)}</td>
                      {isAdmin && <td className="px-3 py-3 text-xs num font-semibold" style={{ color: '#60a5fa' }}>{fmtBRL(r.comissao_empresa_val)}</td>}
                      <td className="px-3 py-3 text-xs num font-bold" style={{ color: '#4ade80' }}>{fmtBRL(r.comissao_corretor_val)}</td>
                      {isAdmin && <td className="px-3 py-3 text-xs num" style={{ color: r.rentabilidade > 0 ? '#f59e0b' : 'var(--text-3)' }}>{fmtPct(r.rentabilidade)}</td>}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => onSendProposal({
                            convenio_id: r.convenio_id,
                            bank_id: r.bank_id,
                            table_id: r.table_id,
                            value: r.valor_liberado.toFixed(2),
                            usuario_banco_id: filterUsuarioBanco || undefined,
                          })}
                          disabled={mode === 'compra-divida' && (r.troco_liquido ?? 0) < 0}
                          title={mode === 'compra-divida' && (r.troco_liquido ?? 0) < 0 ? 'Valor liberado não cobre a dívida do cliente' : undefined}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold btn-cyber whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
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
