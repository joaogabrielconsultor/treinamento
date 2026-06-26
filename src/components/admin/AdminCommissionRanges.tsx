import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, ChevronDown, Percent, Star, AlertTriangle, Upload, Download, Filter, X } from 'lucide-react';
import { CommissionRange, FinancialTable, TableCategory, Bank, Convenio } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';
const inpSm = 'input-cyber w-full px-3 py-2 text-xs rounded-xl';

const EMPTY: Partial<CommissionRange> = {
  financial_table_id: '',
  tipo_proposta: '', expires_at: null, convenio_descricao: '', parceiro: '',
  prazo_inicial: undefined, prazo_final: undefined,
  juros_inicial: undefined, juros_final: undefined,
  coef_inicial: undefined, coef_final: undefined,
  comissao_empresa: 0, comissao_corretor: 0, disponivel_para: 'todos',
  category_id: undefined, min_value: 0, max_value: undefined, base_points: 0, multiplier: undefined,
};

const fmtBRL = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

function calcPreview(range: Partial<CommissionRange>, categories: TableCategory[]) {
  const pts = range.base_points || 0;
  const catMult = categories.find(c => c.id === range.category_id)?.multiplier || 1;
  return Math.round(pts * (range.multiplier ?? catMult));
}

const CSV_HEADERS = [
  'tabela_nome', 'tipo_proposta', 'prazo_inicial', 'prazo_final',
  'juros_inicial', 'juros_final', 'coef_inicial', 'coef_final',
  'comissao_empresa', 'comissao_corretor', 'disponivel_para',
  'min_value', 'max_value', 'base_points', 'multiplier',
  'parceiro', 'expires_at', 'convenio_descricao',
];

function downloadTemplate() {
  const example = [
    'NOME_DA_TABELA_EXATO', 'Refinanciamento', '12', '96', '1.80', '2.14',
    '0.018741', '0.021893', '3.50', '2.00', 'todos',
    '1000', '50000', '60', '', '', '', '',
  ];
  const csv = [CSV_HEADERS.join(','), example.join(',')].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_importacao_faixas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, '').replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
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
  return (
    <div className={className}>
      <Label text={label} required={required} />
      {children}
    </div>
  );
}

function Chip({ label, value, color = 'gray' }: { label: string; value: string; color?: 'gray' | 'blue' | 'green' }) {
  const styles = {
    gray: { background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-2)' },
    blue: { background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' },
    green: { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' },
  };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={styles[color]}>
      <span style={{ opacity: 0.6 }}>{label}:</span> {value}
    </span>
  );
}

export function AdminCommissionRanges({ isMaster = false }: { isMaster?: boolean }) {
  const [ranges, setRanges] = useState<CommissionRange[]>([]);
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CommissionRange>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filters
  const [filterTable, setFilterTable] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBanco, setFilterBanco] = useState('');
  const [filterConvenio, setFilterConvenio] = useState('');
  const [filterTipoProposta, setFilterTipoProposta] = useState('');
  const [filterDisponivelPara, setFilterDisponivelPara] = useState('');

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [r, t, c, b, cv] = await Promise.all([
      API('/api/commission-ranges').then(x => x.json()),
      API('/api/financial-tables').then(x => x.json()),
      API('/api/categories').then(x => x.json()),
      API('/api/banks').then(x => x.json()),
      API('/api/convenios').then(x => x.json()),
    ]);
    setRanges(Array.isArray(r) ? r : []);
    setTables(Array.isArray(t) ? t : []);
    setCategories(Array.isArray(c) ? c : []);
    setBanks(Array.isArray(b) ? b : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = ranges.filter(r => {
    if (filterTable && r.financial_table_id !== filterTable) return false;
    if (filterBanco) {
      const tIds = tables.filter(t => t.bank_id === filterBanco).map(t => t.id);
      if (!tIds.includes(r.financial_table_id)) return false;
    }
    if (filterConvenio) {
      const tIds = tables.filter(t => t.convenio_id === filterConvenio).map(t => t.id);
      if (!tIds.includes(r.financial_table_id)) return false;
    }
    if (filterDateFrom && r.created_at.split('T')[0] < filterDateFrom) return false;
    if (filterDateTo && r.created_at.split('T')[0] > filterDateTo) return false;
    if (filterTipoProposta && !r.tipo_proposta?.toLowerCase().includes(filterTipoProposta.toLowerCase())) return false;
    if (filterDisponivelPara && r.disponivel_para !== filterDisponivelPara) return false;
    return true;
  });

  const hasFilters = !!(filterTable || filterDateFrom || filterDateTo || filterBanco || filterConvenio || filterTipoProposta || filterDisponivelPara);

  useEffect(() => { setPage(1); }, [filterTable, filterDateFrom, filterDateTo, filterBanco, filterConvenio, filterTipoProposta, filterDisponivelPara]);

  function clearFilters() {
    setFilterTable(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterBanco(''); setFilterConvenio('');
    setFilterTipoProposta(''); setFilterDisponivelPara('');
  }

  function openNew() {
    setForm({ ...EMPTY, financial_table_id: filterTable || '' });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(r: CommissionRange) {
    setForm({ ...r });
    setEditId(r.id);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.financial_table_id) { alert('Selecione a tabela financeira'); return; }
    setSaving(true);
    const url = editId ? `/api/commission-ranges/${editId}` : '/api/commission-ranges';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) });
    setShowForm(false);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm('Excluir esta faixa?')) return;
    await API(`/api/commission-ranges/${id}`, { method: 'DELETE' });
    setRanges(prev => prev.filter(x => x.id !== id));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      setImportRows(rows);
      setImportErrors([]);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function doImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    const items = importRows.map(row => ({
      ...row,
      financial_table_id: tables.find(t => t.name.toLowerCase() === (row.tabela_nome || '').toLowerCase())?.id || null,
    }));
    const result = await API('/api/commission-ranges/import', {
      method: 'POST',
      body: JSON.stringify({ rows: items }),
    }).then(r => r.json());
    if (result.errors?.length > 0) {
      setImportErrors(result.errors.map((e: { row: string; error: string }) => `${e.row}: ${e.error}`));
    }
    if (result.imported > 0) {
      setShowImport(false);
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = '';
      await load();
      alert(`${result.imported} faixa(s) importada(s) com sucesso!`);
    }
    setImporting(false);
  }

  function closeImport() {
    setShowImport(false);
    setImportRows([]);
    setImportErrors([]);
  }

  const selectedTableObj = tables.find(t => t.id === (form.financial_table_id || ''));
  const preview = calcPreview(form, categories);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Faixas de Comissão</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {hasFilters ? `${filtered.length} de ${ranges.length} faixas` : `${ranges.length} faixas cadastradas`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Download className="w-4 h-4" /> Baixar Modelo
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
            <Plus className="w-4 h-4" /> Nova Faixa
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: '#f87171' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Tipo Proposta</label>
            <input value={filterTipoProposta} onChange={e => setFilterTipoProposta(e.target.value)}
              className={inpSm} placeholder="Buscar tipo..." />
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Disponível para</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterDisponivelPara} onChange={e => setFilterDisponivelPara(e.target.value)} className={`${inpSm} appearance-none pr-7`}>
                <option value="">Todos</option>
                <option value="todos">Todos</option>
                <option value="corretor">Apenas corretor</option>
                <option value="empresa">Apenas empresa</option>
              </select>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Tabela Financeira</label>
            <div className="relative">
              <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select value={filterTable} onChange={e => setFilterTable(e.target.value)} className={`${inpSm} appearance-none pr-7`}>
                <option value="">Todas as tabelas</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
          <Percent className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">{hasFilters ? 'Nenhuma faixa encontrada para os filtros aplicados' : 'Nenhuma faixa cadastrada'}</p>
          {!hasFilters && <p className="text-sm mt-1">Clique em "Nova Faixa" para começar</p>}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="space-y-2 p-3">
            {paginated.map(r => {
              const pts = calcPreview(r, categories);
              const tbl = tables.find(t => t.id === r.financial_table_id);
              return (
                <div key={r.id} className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
                  {/* Row header: table + tags + actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                        {tbl?.name || r.table_name || r.financial_table_id}
                      </span>
                      {(tbl?.bank_name || r.bank_name) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {tbl?.bank_name || r.bank_name}
                        </span>
                      )}
                      {(tbl?.convenio_name || r.convenio_name) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          {tbl?.convenio_name || r.convenio_name}
                        </span>
                      )}
                      {r.tipo_proposta && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-2)' }}>
                          {r.tipo_proposta}
                        </span>
                      )}
                      {r.disponivel_para && r.disponivel_para !== 'todos' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          {r.disponivel_para === 'corretor' ? 'Apenas Corretor' : 'Apenas Empresa'}
                        </span>
                      )}
                      {r.expires_at && (
                        <span className="text-[10px] font-medium" style={{ color: '#fb923c' }}>
                          Expira: {new Date(r.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isMaster && (
                        <button onClick={() => del(r.id)}
                          className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Data grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Faixa de Valor</p>
                      <p className="font-semibold text-sm num" style={{ color: 'var(--text-1)' }}>
                        {fmtBRL(Number(r.min_value))}{r.max_value ? ` → ${fmtBRL(Number(r.max_value))}` : ' ou mais'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Prazo</p>
                      <p className="font-semibold text-sm num" style={{ color: 'var(--text-1)' }}>
                        {r.prazo_inicial != null
                          ? r.prazo_final != null
                            ? `${r.prazo_inicial} → ${r.prazo_final} meses`
                            : `${r.prazo_inicial} meses`
                          : '—'}
                      </p>
                      {r.juros_inicial != null && (
                        <p className="text-[11px] num mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {r.juros_inicial}{r.juros_final != null ? ` → ${r.juros_final}` : ''}% a.m.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Comissão</p>
                      <p className="font-semibold num text-xs" style={{ color: '#60a5fa' }}>Empresa: {r.comissao_empresa}%</p>
                      <p className="font-semibold num text-xs" style={{ color: '#4ade80' }}>Corretor: {r.comissao_corretor}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Pontuação</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="font-bold num" style={{ color: '#fbbf24' }}>{pts} pts</span>
                        <span className="text-xs num" style={{ color: 'var(--text-3)' }}>({r.base_points} × {r.multiplier ?? (r.category_multiplier || 1)})</span>
                      </div>
                      {r.category_name && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{r.category_name}</p>}
                    </div>
                  </div>
                  {r.parceiro && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>Parceiro: {r.parceiro}</p>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Faixa' : 'Nova Faixa de Comissão'}
        subtitle={selectedTableObj?.name}
        size="2xl"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-commission" disabled={saving} className={btnPrimary} style={primaryBg}>
              <Save className="w-4 h-4 inline mr-1" />{saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Criar faixa'}
            </button>
          </div>
        }
      >
        <form id="modal-commission" onSubmit={save} className="space-y-6">
          <Section title="Tabela Financeira">
            <div className="relative">
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <select
                value={form.financial_table_id || ''}
                onChange={e => setForm(f => ({ ...f, financial_table_id: e.target.value }))}
                className={`${inp} appearance-none pr-8`}
                required>
                <option value="">Selecione a tabela financeira...</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.convenio_name ? ` · ${t.convenio_name}` : ''}{t.bank_name ? ` · ${t.bank_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedTableObj && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTableObj.convenio_name && <Chip label="Convênio" value={selectedTableObj.convenio_name} />}
                {selectedTableObj.bank_name && <Chip label="Banco" value={selectedTableObj.bank_name} color="blue" />}
                {selectedTableObj.category_name && <Chip label="Categoria" value={`${selectedTableObj.category_name} ×${selectedTableObj.category_multiplier}`} color="green" />}
              </div>
            )}
          </Section>

          <Section title="Dados da Proposta">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Tipo de proposta">
                <input value={form.tipo_proposta || ''} onChange={e => setForm(f => ({ ...f, tipo_proposta: e.target.value }))} className={inp} placeholder="Ex: Refinanciamento, Novo..." />
              </FormField>
              <FormField label="Parceiro">
                <input value={form.parceiro || ''} onChange={e => setForm(f => ({ ...f, parceiro: e.target.value }))} className={inp} placeholder="Ex: Correspondente X" />
              </FormField>
              <FormField label="Data de expiração">
                <input type="date" value={form.expires_at || ''} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value || null }))} className={inp} />
              </FormField>
              <FormField label="Descrição do convênio" className="md:col-span-2">
                <input value={form.convenio_descricao || ''} onChange={e => setForm(f => ({ ...f, convenio_descricao: e.target.value }))} className={inp} />
              </FormField>
              <FormField label="Disponível para">
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  <select value={form.disponivel_para || 'todos'} onChange={e => setForm(f => ({ ...f, disponivel_para: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="todos">Todos</option>
                    <option value="corretor">Apenas corretor</option>
                    <option value="empresa">Apenas empresa</option>
                  </select>
                </div>
              </FormField>
            </div>
          </Section>

          <Section title="Prazo e Juros / Coeficiente">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Prazo inicial (meses)">
                <input type="number" min="0" value={form.prazo_inicial ?? ''} onChange={e => setForm(f => ({ ...f, prazo_inicial: e.target.value ? parseInt(e.target.value) : undefined }))} className={inp} placeholder="12" />
              </FormField>
              <FormField label="Prazo final (meses)">
                <input type="number" min="0" value={form.prazo_final ?? ''} onChange={e => setForm(f => ({ ...f, prazo_final: e.target.value ? parseInt(e.target.value) : undefined }))} className={inp} placeholder="96" />
              </FormField>
              <FormField label="Juros inicial (% a.m.)">
                <input type="number" step="any" min="0" value={form.juros_inicial ?? ''} onChange={e => setForm(f => ({ ...f, juros_inicial: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="1.80" />
              </FormField>
              <FormField label="Juros final (% a.m.)">
                <input type="number" step="any" min="0" value={form.juros_final ?? ''} onChange={e => setForm(f => ({ ...f, juros_final: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="2.14" />
              </FormField>
              <FormField label="Coef. inicial">
                <input type="number" step="any" min="0" value={form.coef_inicial ?? ''} onChange={e => setForm(f => ({ ...f, coef_inicial: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="0.018741" />
              </FormField>
              <FormField label="Coef. final">
                <input type="number" step="any" min="0" value={form.coef_final ?? ''} onChange={e => setForm(f => ({ ...f, coef_final: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="0.021893" />
              </FormField>
            </div>
          </Section>

          <Section title="Comissão">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Comissão Empresa (%)" required>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 w-4 h-4 text-blue-400 pointer-events-none" />
                  <input type="number" step="0.01" min="0" max="100" value={form.comissao_empresa ?? ''} onChange={e => setForm(f => ({ ...f, comissao_empresa: parseFloat(e.target.value) || 0 }))} className={`${inp} pr-9`} placeholder="0.00" required />
                </div>
              </FormField>
              <FormField label="Comissão Corretor (%)" required>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 w-4 h-4 text-green-400 pointer-events-none" />
                  <input type="number" step="0.01" min="0" max="100" value={form.comissao_corretor ?? ''} onChange={e => setForm(f => ({ ...f, comissao_corretor: parseFloat(e.target.value) || 0 }))} className={`${inp} pr-9`} placeholder="0.00" required />
                </div>
              </FormField>
            </div>
          </Section>

          <Section title="Pontuação no Ranking">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Valor mínimo (R$)" required>
                <input type="number" step="0.01" min="0" value={form.min_value ?? ''} onChange={e => setForm(f => ({ ...f, min_value: parseFloat(e.target.value) || 0 }))} className={inp} placeholder="1000" required />
              </FormField>
              <FormField label="Valor máximo (R$)">
                <input type="number" step="0.01" min="0" value={form.max_value ?? ''} onChange={e => setForm(f => ({ ...f, max_value: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="Sem limite" />
              </FormField>
              <FormField label="Pontuação base" required>
                <input type="number" min="0" value={form.base_points ?? ''} onChange={e => setForm(f => ({ ...f, base_points: parseInt(e.target.value) || 0 }))} className={inp} placeholder="60" required />
              </FormField>
              <FormField label="Multiplicador">
                <input type="number" step="0.01" min="0.1" value={form.multiplier ?? ''} onChange={e => setForm(f => ({ ...f, multiplier: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="Auto (da categoria)" />
              </FormField>
              <FormField label="Categoria" className="md:col-span-2">
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                  <select value={form.category_id || ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || undefined }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Sem categoria específica</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}
                  </select>
                </div>
              </FormField>
              <div className="md:col-span-2 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#dabb3918', border: '1px solid #dabb3940' }}>
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Pontos gerados ao liberar valor nesta faixa</p>
                  <p className="text-lg font-black" style={{ color: '#fbbf24' }}>
                    {preview} pontos
                    <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-3)' }}>
                      ({form.base_points || 0} pts × {form.multiplier ?? (categories.find(c => c.id === form.category_id)?.multiplier || 1)})
                    </span>
                  </p>
                </div>
              </div>
            </div>
            {!form.base_points && (
              <div className="mt-2 flex items-center gap-2 text-xs text-orange-500">
                <AlertTriangle className="w-3 h-3" />
                Pontuação base = 0 significa que esta faixa não gera pontos no ranking.
              </div>
            )}
          </Section>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImport}
        onClose={closeImport}
        title="Importar Faixas de Comissão"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={closeImport} className={btnCancel}>Cancelar</button>
            <button onClick={doImport} disabled={importRows.length === 0 || importing} className={btnPrimary} style={primaryBg}>
              <Upload className="w-4 h-4 inline mr-1" />
              {importing ? 'Importando...' : `Importar ${importRows.length} faixa(s)`}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <Download className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#14B8A6' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Baixe o modelo antes de importar</p>
              <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-3)' }}>
                A coluna <strong>tabela_nome</strong> deve corresponder exatamente ao nome da tabela financeira cadastrada.
              </p>
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
                <Download className="w-3.5 h-3.5" /> Baixar Modelo CSV
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Selecione o arquivo CSV</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer" />
          </div>

          {importRows.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>{importRows.length} linha(s) detectada(s)</p>
              <div className="max-h-52 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                      {['Tabela', 'Tipo Proposta', 'Prazo', 'Comissão Emp./Cor.', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, i) => {
                      const found = tables.find(t => t.name.toLowerCase() === (row.tabela_nome || '').toLowerCase());
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td className="px-3 py-2" style={{ color: found ? 'var(--text-1)' : '#f87171' }}>
                            {row.tabela_nome || '—'}{!found && ' ⚠'}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-2)' }}>{row.tipo_proposta || '—'}</td>
                          <td className="px-3 py-2 num" style={{ color: 'var(--text-2)' }}>
                            {row.prazo_inicial && row.prazo_final ? `${row.prazo_inicial} → ${row.prazo_final}` : row.prazo_inicial || '—'}
                          </td>
                          <td className="px-3 py-2 num" style={{ color: 'var(--text-2)' }}>
                            {row.comissao_empresa ? `E:${row.comissao_empresa}%` : ''}{row.comissao_corretor ? ` C:${row.comissao_corretor}%` : ''}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${found ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                              {found ? 'OK' : 'Erro'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold text-red-500 mb-1">Erros na importação:</p>
              {importErrors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
