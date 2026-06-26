import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Save, Settings, Upload, Download, Filter, X, Star, Percent, AlertTriangle } from 'lucide-react';
import { FinancialTable, TableCategory, CommissionRange, ScoringRule, Bank, Convenio, Product } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';
const inpSm = 'input-cyber w-full px-3 py-2 text-xs rounded-xl';

const EMPTY_TABLE = {
  name: '', bank_id: '', convenio_id: '', category_id: '', active: true,
  comissao_empresa: '', comissao_corretor: '', coeficiente: '',
  range_tipo_proposta: '', range_parceiro: '', range_expires_at: '',
  range_convenio_descricao: '', range_disponivel_para: 'todos',
  range_prazo_inicial: '', range_prazo_final: '',
  range_juros_inicial: '', range_juros_final: '',
  range_coef_inicial: '', range_coef_final: '',
};
const EMPTY_RANGE: Partial<CommissionRange> = {
  financial_table_id: '', tipo_proposta: '', expires_at: null, convenio_descricao: '', parceiro: '',
  prazo_inicial: undefined, prazo_final: undefined, juros_inicial: undefined, juros_final: undefined,
  coef_inicial: undefined, coef_final: undefined, comissao_empresa: 0, comissao_corretor: 0,
  disponivel_para: 'todos', category_id: undefined, min_value: 0, max_value: undefined, base_points: 0, multiplier: undefined,
};

const fmtBRL = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';
const fmtPct = (v: number | null | undefined) => v != null ? `${Number(v).toFixed(2)}%` : '—';

function calcPreview(range: Partial<CommissionRange>, categories: TableCategory[]) {
  const pts = range.base_points || 0;
  const catMult = categories.find(c => c.id === range.category_id)?.multiplier || 1;
  return Math.round(pts * (range.multiplier ?? catMult));
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplateTabelas() {
  const sep = ';';
  downloadCSV(
    [
      ['nome','banco','convenio','categoria','comissao_empresa','comissao_corretor','coeficiente','ativo',
       'tipo_proposta','parceiro','expires_at','convenio_descricao','disponivel_para',
       'prazo_inicial','prazo_final','juros_inicial','juros_final','coef_inicial','coef_final',
       'faixa_comissao_empresa','faixa_comissao_corretor'].join(sep),
      ['APROVAMAIS_001 - INSS','Banco do Brasil','INSS','Alta Comissão','3.50','2.00','0.0409485','true',
       'Refinanciamento','','','','todos',
       '12','96','1.80','2.14','0.018741','0.021893',
       '3.50','2.00'].join(sep),
    ].join('\r\n'),
    'modelo_tabelas.csv'
  );
}

function downloadTemplateFaixas(tableName = '') {
  const sep = ';';
  downloadCSV(
    [
      ['tipo_proposta','prazo_inicial','prazo_final','juros_inicial','juros_final',
       'coef_inicial','coef_final','comissao_empresa','comissao_corretor',
       'disponivel_para','min_value','max_value','base_points','multiplier','parceiro','expires_at'].join(sep),
      ['Refinanciamento','12','96','1.80','2.14','0.018741','0.021893','3.50','2.00',
       'todos','1000','50000','60','','',''].join(sep),
    ].join('\r\n'),
    `modelo_faixas${tableName ? '_' + tableName.replace(/[^a-z0-9]/gi, '_') : ''}.csv`
  );
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawFirst = lines[0].replace(/^﻿/, '');
  const sep = rawFirst.includes(';') ? ';' : ',';
  const headers = rawFirst.split(sep).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>{text}{required && <span className="text-red-400 ml-0.5">*</span>}</label>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3 pb-1" style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--card-border)' }}>{title}</h3>
      {children}
    </div>
  );
}
function FormField({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return <div className={className}><Label text={label} required={required} />{children}</div>;
}

export function AdminTables({ isMaster = false }: { isMaster?: boolean }) {
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rangesCache, setRangesCache] = useState<Record<string, CommissionRange[]>>({});
  const [rangesLoadingId, setRangesLoadingId] = useState<string | null>(null);

  const [filterBanco, setFilterBanco] = useState('');
  const [filterConvenio, setFilterConvenio] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [showTableForm, setShowTableForm] = useState(false);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [editTableRangeId, setEditTableRangeId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState(EMPTY_TABLE);

  const [showRangeForm, setShowRangeForm] = useState(false);
  const [editRangeId, setEditRangeId] = useState<string | null>(null);
  const [rangeForm, setRangeForm] = useState<Partial<CommissionRange>>(EMPTY_RANGE);
  const [savingRange, setSavingRange] = useState(false);

  const [rulesTableId, setRulesTableId] = useState<string | null>(null);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [newRule, setNewRule] = useState({ min_value: '', max_value: '', points: '' });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [showImportTables, setShowImportTables] = useState(false);
  const [importTableRows, setImportTableRows] = useState<Record<string, string>[]>([]);
  const [importTableErrors, setImportTableErrors] = useState<string[]>([]);
  const [importingTables, setImportingTables] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(0);
  const fileTablesRef = useRef<HTMLInputElement>(null);

  const [showImportRanges, setShowImportRanges] = useState(false);
  const [importRangesForTableId, setImportRangesForTableId] = useState('');
  const [importRangeRows, setImportRangeRows] = useState<Record<string, string>[]>([]);
  const [importRangeErrors, setImportRangeErrors] = useState<string[]>([]);
  const [importingRanges, setImportingRanges] = useState(false);
  const fileRangesRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [t, c, b, cv, pr] = await Promise.all([
      API('/api/financial-tables').then(r => r.json()),
      API('/api/categories').then(r => r.json()),
      API('/api/banks').then(r => r.json()),
      API('/api/convenios').then(r => r.json()),
      API('/api/products').then(r => r.json()),
    ]);
    setTables(Array.isArray(t) ? t : []);
    setCategories(Array.isArray(c) ? c : []);
    setBanks(Array.isArray(b) ? b : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setProducts(Array.isArray(pr) ? pr : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function loadRanges(tableId: string) {
    setRangesLoadingId(tableId);
    const data = await API(`/api/commission-ranges?table_id=${tableId}`).then(r => r.json());
    setRangesCache(prev => ({ ...prev, [tableId]: Array.isArray(data) ? data : [] }));
    setRangesLoadingId(null);
  }

  async function loadRules(tableId: string) {
    const data = await API(`/api/scoring-rules/${tableId}`).then(r => r.json());
    setRules(Array.isArray(data) ? data : []);
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!rangesCache[id]) loadRanges(id);
  }

  async function doSaveTable() {
    if (!tableForm.name.trim()) { alert('Informe o nome da tabela'); return; }
    if (!tableForm.convenio_id) { alert('Selecione o convênio'); return; }
    if (!tableForm.bank_id) { alert('Selecione o banco'); return; }
    if (!tableForm.category_id) { alert('Selecione a categoria'); return; }
    try {
      const body = {
        name: tableForm.name,
        bank_id: tableForm.bank_id,
        convenio_id: tableForm.convenio_id,
        category_id: tableForm.category_id,
        active: tableForm.active,
        comissao_empresa: parseFloat(tableForm.comissao_empresa as string) || 0,
        comissao_corretor: parseFloat(tableForm.comissao_corretor as string) || 0,
        coeficiente: parseFloat(tableForm.coeficiente as string) || 0,
        tipo_proposta: tableForm.range_tipo_proposta || null,
        parceiro: tableForm.range_parceiro || null,
        expires_at: tableForm.range_expires_at || null,
        convenio_descricao: tableForm.range_convenio_descricao || null,
        disponivel_para: tableForm.range_disponivel_para || 'todos',
        prazo_inicial: tableForm.range_prazo_inicial ? parseInt(tableForm.range_prazo_inicial) : null,
        prazo_final: tableForm.range_prazo_final ? parseInt(tableForm.range_prazo_final) : null,
        juros_inicial: tableForm.range_juros_inicial ? parseFloat(tableForm.range_juros_inicial) : null,
        juros_final: tableForm.range_juros_final ? parseFloat(tableForm.range_juros_final) : null,
        coef_inicial: tableForm.range_coef_inicial ? parseFloat(tableForm.range_coef_inicial) : null,
        coef_final: tableForm.range_coef_final ? parseFloat(tableForm.range_coef_final) : null,
      };
      const url = editTableId ? `/api/financial-tables/${editTableId}` : '/api/financial-tables';
      const res = await API(url, { method: editTableId ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.text(); alert(`Erro ao salvar tabela: ${err}`); return; }
      await res.json();
      setShowTableForm(false); setEditTableId(null); await load();
    } catch (err) {
      alert(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function saveTable(e: React.FormEvent) { e.preventDefault(); doSaveTable(); }

  async function deleteTable(id: string) {
    if (!confirm('Excluir esta tabela? As faixas e regras serão removidas.')) return;
    await API(`/api/financial-tables/${id}`, { method: 'DELETE' });
    setRangesCache(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (expandedId === id) setExpandedId(null);
    await load();
  }

  function openNewRange(tableId: string) {
    setRangeForm({ ...EMPTY_RANGE, financial_table_id: tableId });
    setEditRangeId(null); setShowRangeForm(true);
  }

  function openEditRange(r: CommissionRange) {
    setRangeForm({ ...r }); setEditRangeId(r.id); setShowRangeForm(true);
  }

  async function saveRange(e: React.FormEvent) {
    e.preventDefault();
    if (!rangeForm.financial_table_id) { alert('Tabela não definida'); return; }
    setSavingRange(true);
    const url = editRangeId ? `/api/commission-ranges/${editRangeId}` : '/api/commission-ranges';
    await API(url, { method: editRangeId ? 'PUT' : 'POST', body: JSON.stringify(rangeForm) });
    setShowRangeForm(false); setEditRangeId(null);
    await loadRanges(rangeForm.financial_table_id!);
    setSavingRange(false);
  }

  async function deleteRange(id: string, tableId: string) {
    if (!confirm('Excluir esta faixa?')) return;
    await API(`/api/commission-ranges/${id}`, { method: 'DELETE' });
    setRangesCache(prev => ({ ...prev, [tableId]: (prev[tableId] || []).filter(r => r.id !== id) }));
  }

  async function openRules(t: FinancialTable) { setRulesTableId(t.id); await loadRules(t.id); }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    await API('/api/scoring-rules', { method: 'POST', body: JSON.stringify({ table_id: rulesTableId, min_value: parseFloat(newRule.min_value) || 0, max_value: newRule.max_value ? parseFloat(newRule.max_value) : null, points: parseInt(newRule.points) || 0 }) });
    setNewRule({ min_value: '', max_value: '', points: '' }); await loadRules(rulesTableId!);
  }

  async function deleteRule(id: string) {
    await API(`/api/scoring-rules/${id}`, { method: 'DELETE' }); await loadRules(rulesTableId!);
  }

  const hasFilters = !!(filterBanco || filterConvenio || filterDateFrom || filterDateTo);
  const filtered = tables.filter(t => {
    if (filterBanco && t.bank_id !== filterBanco) return false;
    if (filterConvenio && t.convenio_id !== filterConvenio) return false;
    if (filterDateFrom && t.created_at?.split('T')[0] < filterDateFrom) return false;
    if (filterDateTo && t.created_at?.split('T')[0] > filterDateTo) return false;
    return true;
  });
  useEffect(() => { setPage(1); }, [filterBanco, filterConvenio, filterDateFrom, filterDateTo]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  async function doImportTables() {
    if (!importTableRows.length) return;
    setImportingTables(true);
    setImportProgress(0);
    setImportDone(0);
    setImportTableErrors([]);
    const items = importTableRows.map(row => ({
      ...row,
      name: row.nome,
      bank_id: banks.find(b => b.name.toLowerCase() === (row.banco || '').toLowerCase())?.id || null,
      convenio_id: convenios.find(c => c.name.toLowerCase() === (row.convenio || '').toLowerCase())?.id || null,
      category_id: categories.find(c => c.name.toLowerCase() === (row.categoria || '').toLowerCase())?.id || null,
      active: row.ativo,
      range_tipo_proposta: row.tipo_proposta || '',
      range_parceiro: row.parceiro || '',
      range_expires_at: row.expires_at || null,
      range_convenio_descricao: row.convenio_descricao || '',
      range_disponivel_para: row.disponivel_para || 'todos',
      range_prazo_inicial: row.prazo_inicial || null,
      range_prazo_final: row.prazo_final || null,
      range_juros_inicial: row.juros_inicial || null,
      range_juros_final: row.juros_final || null,
      range_coef_inicial: row.coef_inicial || null,
      range_coef_final: row.coef_final || null,
      range_comissao_empresa: row.faixa_comissao_empresa || row.comissao_empresa || null,
      range_comissao_corretor: row.faixa_comissao_corretor || row.comissao_corretor || null,
    }));
    const total = items.length;
    let totalImported = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const result = await API('/api/financial-tables/import', { method: 'POST', body: JSON.stringify({ rows: [items[i]] }) }).then(r => r.json());
      if (result.errors?.length) allErrors.push(...result.errors.map((e: { row: string; error: string }) => `${e.row}: ${e.error}`));
      totalImported += result.imported ?? 0;
      totalUpdated += result.updated ?? 0;
      setImportDone(i + 1);
      setImportProgress(Math.round(((i + 1) / total) * 100));
    }
    if (allErrors.length) setImportTableErrors(allErrors);
    if (totalImported > 0 || totalUpdated > 0) {
      setShowImportTables(false);
      setImportTableRows([]);
      if (fileTablesRef.current) fileTablesRef.current.value = '';
      setRangesCache({});
      await load();
      const parts = [];
      if (totalImported > 0) parts.push(`${totalImported} nova(s) adicionada(s)`);
      if (totalUpdated > 0) parts.push(`${totalUpdated} atualizada(s)`);
      alert(parts.join(', ') + '!');
    }
    setImportingTables(false);
    setImportProgress(0);
    setImportDone(0);
  }

  function openImportRanges(tableId: string) {
    setImportRangesForTableId(tableId); setImportRangeRows([]); setImportRangeErrors([]);
    setShowImportRanges(true); if (fileRangesRef.current) fileRangesRef.current.value = '';
  }

  async function doImportRanges() {
    if (!importRangeRows.length || !importRangesForTableId) return;
    setImportingRanges(true);
    const items = importRangeRows.map(row => ({ ...row, financial_table_id: importRangesForTableId }));
    const result = await API('/api/commission-ranges/import', { method: 'POST', body: JSON.stringify({ rows: items }) }).then(r => r.json());
    if (result.errors?.length) setImportRangeErrors(result.errors.map((e: { row: string; error: string }) => `${e.row}: ${e.error}`));
    if (result.imported > 0) { setShowImportRanges(false); setImportRangeRows([]); await loadRanges(importRangesForTableId); alert(`${result.imported} faixa(s) importada(s)!`); }
    setImportingRanges(false);
  }

  const rulesTable = tables.find(t => t.id === rulesTableId);
  const rangeTableObj = tables.find(t => t.id === rangeForm.financial_table_id);
  const importRangesTable = tables.find(t => t.id === importRangesForTableId);
  const preview = calcPreview(rangeForm, categories);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Tabelas Financeiras</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {hasFilters ? `${filtered.length} de ${tables.length} tabelas` : `${tables.length} tabelas cadastradas`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowImportTables(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80" style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button onClick={downloadTemplateTabelas} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80" style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Download className="w-4 h-4" /> Baixar Modelo
          </button>
          <button onClick={() => { setTableForm(EMPTY_TABLE); setEditTableId(null); setShowTableForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
            <Plus className="w-4 h-4" /> Nova Tabela
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Filtros</span>
          {hasFilters && (
            <button onClick={() => { setFilterBanco(''); setFilterConvenio(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors" style={{ color: '#f87171' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Data Cadastro — De</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={inpSm} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Data Cadastro — Até</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={inpSm} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Banco</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterBanco} onChange={e => setFilterBanco(e.target.value)} className={`${inpSm} appearance-none pr-7`}>
                <option value="">Todos</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Convênio</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterConvenio} onChange={e => setFilterConvenio(e.target.value)} className={`${inpSm} appearance-none pr-7`}>
                <option value="">Todos</option>
                {convenios.map(cv => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ color: 'var(--text-3)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="font-medium">{hasFilters ? 'Nenhuma tabela encontrada para os filtros aplicados' : 'Nenhuma tabela cadastrada'}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(t => {
              const isExpanded = expandedId === t.id;
              const ranges = rangesCache[t.id] || [];
              const isLoadingRanges = rangesLoadingId === t.id;
              return (
                <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
                  {/* Table row */}
                  <div className="p-4 flex items-start gap-3">
                    <button onClick={() => toggleExpand(t.id)} className="mt-0.5 flex-shrink-0 p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: '#14B8A6' }} /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{t.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-dk-surface text-gray-500'}`}>
                          {t.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        {t.bank_name && <span style={{ color: 'var(--text-3)' }}>Banco: <span style={{ color: 'var(--text-2)' }}>{t.bank_name}</span></span>}
                        {t.convenio_name && <span style={{ color: 'var(--text-3)' }}>Convênio: <span style={{ color: 'var(--text-2)' }}>{t.convenio_name}</span></span>}
                        {t.category_name && <span style={{ color: 'var(--text-3)' }}>Categoria: <span className="text-brand">{t.category_name} ×{t.category_multiplier}</span></span>}
                        {!!t.coeficiente && <span style={{ color: 'var(--text-3)' }}>Coef: <span className="font-mono num" style={{ color: '#a78bfa' }}>{Number(t.coeficiente).toFixed(7)}</span></span>}
                        <span style={{ color: 'var(--text-3)' }}>Emp: <span className="num font-semibold" style={{ color: '#60a5fa' }}>{fmtPct(t.comissao_empresa)}</span></span>
                        <span style={{ color: 'var(--text-3)' }}>Cor: <span className="num font-semibold" style={{ color: '#4ade80' }}>{fmtPct(t.comissao_corretor)}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openRules(t)} title="Regras de pontuação" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async () => {
                        setEditTableRangeId(null);
                        setTableForm({
                          ...EMPTY_TABLE,
                          name: t.name, bank_id: t.bank_id || '', convenio_id: t.convenio_id || '',
                          category_id: t.category_id || '', active: t.active,
                          comissao_empresa: String(t.comissao_empresa ?? ''),
                          comissao_corretor: String(t.comissao_corretor ?? ''),
                          coeficiente: String(t.coeficiente ?? ''),
                          range_tipo_proposta: t.tipo_proposta || '',
                          range_parceiro: t.parceiro || '',
                          range_expires_at: t.expires_at || '',
                          range_convenio_descricao: t.convenio_descricao || '',
                          range_disponivel_para: t.disponivel_para || 'todos',
                          range_prazo_inicial: t.prazo_inicial != null ? String(t.prazo_inicial) : '',
                          range_prazo_final: t.prazo_final != null ? String(t.prazo_final) : '',
                          range_juros_inicial: t.juros_inicial != null ? String(t.juros_inicial) : '',
                          range_juros_final: t.juros_final != null ? String(t.juros_final) : '',
                          range_coef_inicial: t.coef_inicial != null ? String(t.coef_inicial) : '',
                          range_coef_final: t.coef_final != null ? String(t.coef_final) : '',
                        });
                        setEditTableId(t.id); setShowTableForm(true);
                      }}
                        className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isMaster && (
                        <button onClick={() => deleteTable(t.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded ranges */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.04)' }}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                            Faixas de Comissão {!isLoadingRanges && `(${ranges.length})`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => downloadTemplateFaixas(t.name)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors hover:opacity-80" style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
                              <Download className="w-3 h-3" /> Modelo Faixas
                            </button>
                            <button onClick={() => openImportRanges(t.id)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors hover:opacity-80" style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
                              <Upload className="w-3 h-3" /> Importar Faixas
                            </button>
                            <button onClick={() => openNewRange(t.id)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold btn-cyber">
                              <Plus className="w-3 h-3" /> Nova Faixa
                            </button>
                          </div>
                        </div>

                        {isLoadingRanges ? (
                          <div className="flex justify-center py-6"><div className="spinner-cyber" /></div>
                        ) : ranges.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>Nenhuma faixa — clique em "Nova Faixa" para adicionar</p>
                        ) : (
                          <div className="space-y-2">
                            {ranges.map(r => {
                              const pts = calcPreview(r, categories);
                              return (
                                <div key={r.id} className="rounded-xl p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 text-xs">
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Faixa de Valor</p>
                                        <p className="font-semibold num" style={{ color: 'var(--text-1)' }}>{fmtBRL(Number(r.min_value))}{r.max_value ? ` → ${fmtBRL(Number(r.max_value))}` : ' ou mais'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Prazo</p>
                                        <p className="font-semibold num" style={{ color: 'var(--text-1)' }}>
                                          {r.prazo_inicial != null ? (r.prazo_final != null ? `${r.prazo_inicial} → ${r.prazo_final} meses` : `${r.prazo_inicial} meses`) : '—'}
                                        </p>
                                        {r.juros_inicial != null && <p className="text-[10px] num mt-0.5" style={{ color: 'var(--text-3)' }}>{r.juros_inicial}{r.juros_final != null ? ` → ${r.juros_final}` : ''}% a.m.</p>}
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Comissão</p>
                                        <p className="num font-semibold" style={{ color: '#60a5fa' }}>Emp: {r.comissao_empresa}%</p>
                                        <p className="num font-semibold" style={{ color: '#4ade80' }}>Cor: {r.comissao_corretor}%</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Pontuação</p>
                                        <div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /><span className="font-bold num" style={{ color: '#fbbf24' }}>{pts} pts</span></div>
                                        {r.tipo_proposta && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{r.tipo_proposta}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {r.disponivel_para && r.disponivel_para !== 'todos' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{r.disponivel_para === 'corretor' ? 'Só Cor.' : 'Só Emp.'}</span>
                                      )}
                                      <button onClick={() => openEditRange(r)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      {isMaster && (
                                        <button onClick={() => deleteRange(r.id, t.id)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
                                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
          </div>
        </>
      )}

      {/* Table form modal */}
      <Modal open={showTableForm} onClose={() => setShowTableForm(false)} title={editTableId ? 'Editar Tabela' : 'Nova Tabela'} size="2xl"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowTableForm(false)} className={btnCancel}>Cancelar</button><button type="button" onClick={doSaveTable} className={btnPrimary} style={primaryBg}><Save className="w-4 h-4 inline mr-1" />{editTableId ? 'Salvar' : 'Criar'}</button></div>}>
        <form id="modal-table-form" onSubmit={saveTable} className="space-y-5">
          <Section title="Dados da Tabela">
            <div className="space-y-4">
              <div><Label text="Nome da Tabela" required /><input value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))} className={inp} required placeholder="Ex: APROVAMAIS NEO_096-299_318661 - CC-CB" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label text="Convênio" required /><div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" /><select value={tableForm.convenio_id} onChange={e => setTableForm(f => ({ ...f, convenio_id: e.target.value }))} className={`${inp} appearance-none pr-8`}><option value="">Selecione o convênio</option>{convenios.map(cv => <option key={cv.id} value={cv.id}>{cv.name}</option>)}</select></div></div>
                <div><Label text="Banco" required /><div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" /><select value={tableForm.bank_id} onChange={e => setTableForm(f => ({ ...f, bank_id: e.target.value }))} className={`${inp} appearance-none pr-8`}><option value="">Selecione o banco</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div></div>
              </div>
              <div><Label text="Categoria" required /><div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" /><select value={tableForm.category_id} onChange={e => setTableForm(f => ({ ...f, category_id: e.target.value }))} className={`${inp} appearance-none pr-8`}><option value="">Selecione a categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label text="Comissão Empresa (%)" /><input type="number" step="0.01" min="0" max="100" value={tableForm.comissao_empresa} onChange={e => setTableForm(f => ({ ...f, comissao_empresa: e.target.value }))} className={inp} placeholder="0.00" /></div>
                <div><Label text="Comissão Corretor (%)" /><input type="number" step="0.01" min="0" max="100" value={tableForm.comissao_corretor} onChange={e => setTableForm(f => ({ ...f, comissao_corretor: e.target.value }))} className={inp} placeholder="0.00" /></div>
              </div>
              <div><Label text="Coeficiente" /><input type="number" step="any" min="0" value={tableForm.coeficiente} onChange={e => setTableForm(f => ({ ...f, coeficiente: e.target.value }))} className={`${inp} font-mono`} placeholder="0.0000000" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={tableForm.active} onChange={e => setTableForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm" style={{ color: 'var(--text-2)' }}>Tabela ativa</span></label>
            </div>
          </Section>

          <>
              <Section title={editTableId ? 'Dados da Proposta (faixa vinculada)' : 'Dados da Proposta (faixa inicial)'}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField label="Produto / Tipo de proposta">
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                      <select value={tableForm.range_tipo_proposta} onChange={e => setTableForm(f => ({ ...f, range_tipo_proposta: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="">Selecione o produto</option>
                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </FormField>
                  <FormField label="Parceiro"><input value={tableForm.range_parceiro} onChange={e => setTableForm(f => ({ ...f, range_parceiro: e.target.value }))} className={inp} /></FormField>
                  <FormField label="Data de expiração"><input type="date" value={tableForm.range_expires_at} onChange={e => setTableForm(f => ({ ...f, range_expires_at: e.target.value }))} className={inp} /></FormField>
                  <FormField label="Descrição do convênio" className="md:col-span-2"><input value={tableForm.range_convenio_descricao} onChange={e => setTableForm(f => ({ ...f, range_convenio_descricao: e.target.value }))} className={inp} /></FormField>
                  <FormField label="Disponível para">
                    <div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                      <select value={tableForm.range_disponivel_para} onChange={e => setTableForm(f => ({ ...f, range_disponivel_para: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                        <option value="todos">Todos</option><option value="corretor">Apenas corretor</option><option value="empresa">Apenas empresa</option>
                      </select></div>
                  </FormField>
                </div>
              </Section>

              <Section title="Prazo e Juros / Coeficiente">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Prazo inicial (meses)"><input type="number" min="0" value={tableForm.range_prazo_inicial} onChange={e => setTableForm(f => ({ ...f, range_prazo_inicial: e.target.value }))} className={inp} placeholder="12" /></FormField>
                  <FormField label="Prazo final (meses)"><input type="number" min="0" value={tableForm.range_prazo_final} onChange={e => setTableForm(f => ({ ...f, range_prazo_final: e.target.value }))} className={inp} placeholder="96" /></FormField>
                  <FormField label="Juros inicial (% a.m.)"><input type="number" step="any" min="0" value={tableForm.range_juros_inicial} onChange={e => setTableForm(f => ({ ...f, range_juros_inicial: e.target.value }))} className={inp} placeholder="1.80" /></FormField>
                  <FormField label="Juros final (% a.m.)"><input type="number" step="any" min="0" value={tableForm.range_juros_final} onChange={e => setTableForm(f => ({ ...f, range_juros_final: e.target.value }))} className={inp} placeholder="2.14" /></FormField>
                  <FormField label="Coef. inicial"><input type="number" step="any" min="0" value={tableForm.range_coef_inicial} onChange={e => setTableForm(f => ({ ...f, range_coef_inicial: e.target.value }))} className={inp} placeholder="0.018741" /></FormField>
                  <FormField label="Coef. final"><input type="number" step="any" min="0" value={tableForm.range_coef_final} onChange={e => setTableForm(f => ({ ...f, range_coef_final: e.target.value }))} className={inp} placeholder="0.021893" /></FormField>
                </div>
              </Section>

            </>
        </form>
      </Modal>

      {/* Range form modal — apenas Pontuação no Ranking */}
      <Modal open={showRangeForm} onClose={() => setShowRangeForm(false)} title="Pontuação no Ranking" subtitle={rangeTableObj?.name} size="lg"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowRangeForm(false)} className={btnCancel}>Cancelar</button><button type="submit" form="modal-range-form" disabled={savingRange} className={btnPrimary} style={primaryBg}><Save className="w-4 h-4 inline mr-1" />{savingRange ? 'Salvando...' : 'Salvar'}</button></div>}>
        <form id="modal-range-form" onSubmit={saveRange} className="space-y-6">
          <Section title="Pontuação no Ranking">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Valor mínimo (R$)" required><input type="number" step="0.01" min="0" value={rangeForm.min_value ?? ''} onChange={e => setRangeForm(f => ({ ...f, min_value: parseFloat(e.target.value) || 0 }))} className={inp} placeholder="1000" required /></FormField>
              <FormField label="Valor máximo (R$)"><input type="number" step="0.01" min="0" value={rangeForm.max_value ?? ''} onChange={e => setRangeForm(f => ({ ...f, max_value: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="Sem limite" /></FormField>
              <FormField label="Pontuação base" required><input type="number" min="0" value={rangeForm.base_points ?? ''} onChange={e => setRangeForm(f => ({ ...f, base_points: parseInt(e.target.value) || 0 }))} className={inp} placeholder="60" required /></FormField>
              <FormField label="Multiplicador"><input type="number" step="0.01" min="0.1" value={rangeForm.multiplier ?? ''} onChange={e => setRangeForm(f => ({ ...f, multiplier: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="Auto" /></FormField>
              <FormField label="Categoria" className="md:col-span-2"><div className="relative"><ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} /><select value={rangeForm.category_id || ''} onChange={e => setRangeForm(f => ({ ...f, category_id: e.target.value || undefined }))} className={`${inp} appearance-none pr-8`}><option value="">Sem categoria específica</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}</select></div></FormField>
              <div className="md:col-span-2 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#dabb3918', border: '1px solid #dabb3940' }}>
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Pontos gerados</p>
                  <p className="text-lg font-black" style={{ color: '#fbbf24' }}>{preview} pontos <span className="text-xs font-normal" style={{ color: 'var(--text-3)' }}>({rangeForm.base_points || 0} × {rangeForm.multiplier ?? (categories.find(c => c.id === rangeForm.category_id)?.multiplier || 1)})</span></p>
                </div>
              </div>
            </div>
            {!rangeForm.base_points && <div className="mt-2 flex items-center gap-2 text-xs text-orange-500"><AlertTriangle className="w-3 h-3" /> Pontuação base = 0 não gera pontos no ranking.</div>}
          </Section>
        </form>
      </Modal>

      {/* Scoring rules modal */}
      <Modal open={!!rulesTableId && !!rulesTable} onClose={() => setRulesTableId(null)} title="Regras de Pontuação" subtitle={rulesTable?.name} size="lg">
        <div className="space-y-4">
          {rulesTable?.convenio_name && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{rulesTable.convenio_name} · {rulesTable.bank_name}</p>}
          {rules.length > 0 && <div className="space-y-2">{rules.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}>
              <div className="flex-1 text-sm" style={{ color: 'var(--text-2)' }}>{fmtBRL(Number(r.min_value))} {r.max_value ? `→ ${fmtBRL(Number(r.max_value))}` : 'ou mais'} = <span className="font-bold text-brand">{r.points} pontos</span>{rulesTable?.category_multiplier && rulesTable.category_multiplier !== 1 && <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>(×{rulesTable.category_multiplier} = {Math.round(r.points * Number(rulesTable.category_multiplier))} pts)</span>}</div>
              {isMaster && <button onClick={() => deleteRule(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          ))}</div>}
          <form onSubmit={addRule} className="border border-dashed rounded-xl p-4" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Adicionar faixa</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Mínimo (R$) *</label><input type="number" step="0.01" min="0" value={newRule.min_value} onChange={e => setNewRule(r => ({ ...r, min_value: e.target.value }))} className={inp} placeholder="0" required /></div>
              <div><label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Máximo (R$)</label><input type="number" step="0.01" min="0" value={newRule.max_value} onChange={e => setNewRule(r => ({ ...r, max_value: e.target.value }))} className={inp} placeholder="Sem limite" /></div>
              <div><label className="block text-xs mb-1" style={{ color: 'var(--text-3)' }}>Pontos base *</label><input type="number" min="0" value={newRule.points} onChange={e => setNewRule(r => ({ ...r, points: e.target.value }))} className={inp} placeholder="10" required /></div>
            </div>
            <button type="submit" className="mt-3 w-full py-2 rounded-xl text-sm btn-cyber font-semibold"><Plus className="w-4 h-4 inline mr-1" />Adicionar faixa</button>
          </form>
        </div>
      </Modal>

      {/* Import tables modal */}
      <Modal open={showImportTables} onClose={() => { if (importingTables) return; setShowImportTables(false); setImportTableRows([]); setImportTableErrors([]); }} title="Importar Tabelas Financeiras" size="lg"
        footer={<div className="flex gap-3"><button type="button" onClick={() => { setShowImportTables(false); setImportTableRows([]); setImportTableErrors([]); }} disabled={importingTables} className={btnCancel}>Cancelar</button><button onClick={doImportTables} disabled={!importTableRows.length || importingTables} className={btnPrimary} style={primaryBg}><Upload className="w-4 h-4 inline mr-1" />{importingTables ? `Importando ${importDone}/${importTableRows.length}...` : `Importar ${importTableRows.length} tabela(s)`}</button></div>}>
        <div className="space-y-4">
          {importingTables && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: '#14B8A6' }}>Importando tabelas...</span>
                <span className="text-xs font-bold" style={{ color: '#14B8A6' }}>{importProgress}%</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: 'rgba(20,184,166,0.15)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${importProgress}%`, background: 'linear-gradient(90deg, #14B8A6, #0EA5E9)' }} />
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>{importDone} de {importTableRows.length} tabela(s) processada(s)</p>
            </div>
          )}
          {!importingTables && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <Download className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#14B8A6' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Baixe o modelo antes de importar</p>
                <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-3)' }}>Banco, convênio e categoria devem corresponder exatamente aos nomes já cadastrados.</p>
                <button onClick={downloadTemplateTabelas} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}><Download className="w-3.5 h-3.5" /> Baixar Modelo CSV</button>
              </div>
            </div>
          )}
          {!importingTables && (
            <div><label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Selecione o arquivo CSV</label>
              <input ref={fileTablesRef} type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { setImportTableRows(parseCSV(ev.target?.result as string)); setImportTableErrors([]); }; r.readAsText(f, 'UTF-8'); }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer" /></div>
          )}
          {!importingTables && importTableRows.length > 0 && (
            <div><p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>{importTableRows.length} linha(s) detectada(s)</p>
              <div className="max-h-52 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
                <table className="w-full text-xs"><thead><tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>{['Nome','Banco','Convênio','Categoria','Status'].map(h => <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</th>)}</tr></thead>
                  <tbody>{importTableRows.map((row, i) => { const bOk = banks.find(b => b.name.toLowerCase() === (row.banco||'').toLowerCase()); const cvOk = convenios.find(c => c.name.toLowerCase() === (row.convenio||'').toLowerCase()); const catOk = categories.find(c => c.name.toLowerCase() === (row.categoria||'').toLowerCase()); const ok = !!(bOk && cvOk && catOk && row.nome); return (<tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}><td className="px-3 py-2 max-w-[140px] truncate" style={{ color: 'var(--text-1)' }}>{row.nome||'—'}</td><td className="px-3 py-2" style={{ color: bOk ? 'var(--text-2)' : '#f87171' }}>{row.banco||'—'}{!bOk&&' ⚠'}</td><td className="px-3 py-2" style={{ color: cvOk ? 'var(--text-2)' : '#f87171' }}>{row.convenio||'—'}{!cvOk&&' ⚠'}</td><td className="px-3 py-2" style={{ color: catOk ? 'var(--text-2)' : '#f87171' }}>{row.categoria||'—'}{!catOk&&' ⚠'}</td><td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ok ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>{ok ? 'OK' : 'Erro'}</span></td></tr>); })}</tbody>
                </table>
              </div>
            </div>
          )}
          {importTableErrors.length > 0 && <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><p className="text-xs font-semibold text-red-500 mb-1">Erros:</p>{importTableErrors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}</div>}
        </div>
      </Modal>

      {/* Import ranges modal */}
      <Modal open={showImportRanges} onClose={() => { setShowImportRanges(false); setImportRangeRows([]); setImportRangeErrors([]); }} title="Importar Faixas de Comissão" subtitle={importRangesTable?.name} size="lg"
        footer={<div className="flex gap-3"><button type="button" onClick={() => { setShowImportRanges(false); setImportRangeRows([]); setImportRangeErrors([]); }} className={btnCancel}>Cancelar</button><button onClick={doImportRanges} disabled={!importRangeRows.length || importingRanges} className={btnPrimary} style={primaryBg}><Upload className="w-4 h-4 inline mr-1" />{importingRanges ? 'Importando...' : `Importar ${importRangeRows.length} faixa(s)`}</button></div>}>
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <Download className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#14B8A6' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>As faixas serão vinculadas a <strong>{importRangesTable?.name}</strong></p>
              <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-3)' }}>Baixe o modelo para ver os campos disponíveis.</p>
              <button onClick={() => downloadTemplateFaixas(importRangesTable?.name)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}><Download className="w-3.5 h-3.5" /> Baixar Modelo CSV</button>
            </div>
          </div>
          <div><label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Selecione o arquivo CSV</label>
            <input ref={fileRangesRef} type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { setImportRangeRows(parseCSV(ev.target?.result as string)); setImportRangeErrors([]); }; r.readAsText(f, 'UTF-8'); }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer" /></div>
          {importRangeRows.length > 0 && (
            <div><p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>{importRangeRows.length} linha(s) detectada(s)</p>
              <div className="max-h-48 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
                <table className="w-full text-xs"><thead><tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>{['Tipo Proposta','Prazo','Comissão','Pts'].map(h => <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</th>)}</tr></thead>
                  <tbody>{importRangeRows.map((row, i) => (<tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}><td className="px-3 py-2" style={{ color: 'var(--text-2)' }}>{row.tipo_proposta||'—'}</td><td className="px-3 py-2 num" style={{ color: 'var(--text-2)' }}>{row.prazo_inicial && row.prazo_final ? `${row.prazo_inicial}→${row.prazo_final}` : row.prazo_inicial||'—'}</td><td className="px-3 py-2 num" style={{ color: 'var(--text-2)' }}>{row.comissao_empresa ? `E:${row.comissao_empresa}%` : ''}{row.comissao_corretor ? ` C:${row.comissao_corretor}%` : ''}</td><td className="px-3 py-2 num" style={{ color: '#fbbf24' }}>{row.base_points||'—'}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
          {importRangeErrors.length > 0 && <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><p className="text-xs font-semibold text-red-500 mb-1">Erros:</p>{importRangeErrors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}</div>}
        </div>
      </Modal>
    </div>
  );
}
