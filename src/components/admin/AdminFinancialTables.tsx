import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, Save, Settings, Upload, Download } from 'lucide-react';
import { FinancialTable, TableCategory, ScoringRule, Bank, Convenio } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const CSV_HEADERS_FT = ['nome', 'banco', 'convenio', 'categoria', 'comissao_empresa', 'comissao_corretor', 'coeficiente', 'ativo'];

function downloadTemplateFT() {
  const example = ['APROVAMAIS_001 - INSS', 'Banco do Brasil', 'INSS', 'Alta Comissão', '3.50', '2.00', '0.0409485', 'true'];
  const csv = [CSV_HEADERS_FT.join(','), example.join(',')].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_importacao_tabelas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVFT(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, '').replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'input-cyber w-full px-3 py-2.5 text-sm rounded-xl';

const EMPTY_TABLE = { name: '', bank_id: '', convenio_id: '', category_id: '', active: true, comissao_empresa: '', comissao_corretor: '', coeficiente: '' };

export function AdminFinancialTables() {
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TABLE);
  const [rulesTableId, setRulesTableId] = useState<string | null>(null);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [newRule, setNewRule] = useState({ min_value: '', max_value: '', points: '' });
  const [filterConvenio, setFilterConvenio] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [t, c, b, cv] = await Promise.all([
      API('/api/financial-tables').then(r => r.json()),
      API('/api/categories').then(r => r.json()),
      API('/api/banks').then(r => r.json()),
      API('/api/convenios').then(r => r.json()),
    ]);
    setTables(Array.isArray(t) ? t : []);
    setCategories(Array.isArray(c) ? c : []);
    setBanks(Array.isArray(b) ? b : []);
    setConvenios(Array.isArray(cv) ? cv : []);
    setLoading(false);
  }

  async function loadRules(tableId: string) {
    const r = await API(`/api/scoring-rules/${tableId}`);
    const data = await r.json();
    setRules(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function saveTable(e: React.FormEvent) {
    e.preventDefault();
    if (!form.convenio_id) { alert('Selecione o convênio'); return; }
    if (!form.bank_id)     { alert('Selecione o banco'); return; }
    if (!form.category_id) { alert('Selecione a categoria'); return; }
    const body = {
      name: form.name,
      bank_id: form.bank_id,
      convenio_id: form.convenio_id,
      category_id: form.category_id,
      active: form.active,
      comissao_empresa: parseFloat(form.comissao_empresa as string) || 0,
      comissao_corretor: parseFloat(form.comissao_corretor as string) || 0,
      coeficiente: parseFloat(form.coeficiente as string) || 0,
    };
    const url = editId ? `/api/financial-tables/${editId}` : '/api/financial-tables';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
    setShowForm(false);
    setEditId(null);
    await load();
  }

  async function deleteTable(id: string) {
    if (!confirm('Excluir esta tabela? As regras de pontuação serão removidas.')) return;
    await API(`/api/financial-tables/${id}`, { method: 'DELETE' });
    await load();
  }

  async function openRules(t: FinancialTable) {
    setRulesTableId(t.id);
    await loadRules(t.id);
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    await API('/api/scoring-rules', {
      method: 'POST',
      body: JSON.stringify({
        table_id: rulesTableId,
        min_value: parseFloat(newRule.min_value) || 0,
        max_value: newRule.max_value ? parseFloat(newRule.max_value) : null,
        points: parseInt(newRule.points) || 0,
      }),
    });
    setNewRule({ min_value: '', max_value: '', points: '' });
    await loadRules(rulesTableId!);
  }

  async function deleteRule(id: string) {
    await API(`/api/scoring-rules/${id}`, { method: 'DELETE' });
    await loadRules(rulesTableId!);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImportRows(parseCSVFT(ev.target?.result as string));
      setImportErrors([]);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function doImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    const items = importRows.map(row => ({
      nome: row.nome,
      name: row.nome,
      banco: row.banco,
      convenio: row.convenio,
      categoria: row.categoria,
      bank_id: banks.find(b => b.name.toLowerCase() === (row.banco || '').toLowerCase())?.id || null,
      convenio_id: convenios.find(c => c.name.toLowerCase() === (row.convenio || '').toLowerCase())?.id || null,
      category_id: categories.find(c => c.name.toLowerCase() === (row.categoria || '').toLowerCase())?.id || null,
      comissao_empresa: row.comissao_empresa,
      comissao_corretor: row.comissao_corretor,
      coeficiente: row.coeficiente,
      active: row.ativo,
    }));
    const result = await API('/api/financial-tables/import', {
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
      alert(`${result.imported} tabela(s) importada(s) com sucesso!`);
    }
    setImporting(false);
  }

  function closeImport() {
    setShowImport(false);
    setImportRows([]);
    setImportErrors([]);
  }

  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const rulesTable = tables.find(t => t.id === rulesTableId);

  const filtered = filterConvenio
    ? tables.filter(t => t.convenio_id === filterConvenio)
    : tables;

  useEffect(() => { setPage(1); }, [filterConvenio]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Tabelas Financeiras</h1>
          <p className="text-xs text-slate-500 mt-0.5">{tables.length} tabelas cadastradas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button onClick={downloadTemplateFT}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)', background: 'var(--card-bg)' }}>
            <Download className="w-4 h-4" /> Baixar Modelo
          </button>
          <button onClick={() => { setForm(EMPTY_TABLE); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold">
            <Plus className="w-4 h-4" /> Nova Tabela
          </button>
        </div>
      </div>

      {/* Filter by convenio */}
      {convenios.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilterConvenio('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${!filterConvenio ? 'text-white' : 'bg-gray-100 dark:bg-dk-surface text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}
            style={!filterConvenio ? { backgroundColor: '#1e4033' } : {}}>
            Todos
          </button>
          {convenios.map(cv => (
            <button key={cv.id} onClick={() => setFilterConvenio(cv.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterConvenio === cv.id ? 'text-white' : 'bg-gray-100 dark:bg-dk-surface text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}
              style={filterConvenio === cv.id ? { backgroundColor: '#1e4033' } : {}}>
              {cv.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Nome da Tabela', 'Convênio', 'Banco', 'Categoria', 'Coeficiente', 'Comissão Emp.', 'Comissão Cor.', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhuma tabela cadastrada</td></tr>
              ) : paginated.map(t => (
                <tr key={t.id} className="table-row-cyber">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.convenio_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.bank_name || '—'}</td>
                  <td className="px-4 py-3">
                    {t.category_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">
                        {t.category_name} <span className="opacity-60">×{t.category_multiplier}</span>
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#a78bfa' }}>
                    {t.coeficiente ? Number(t.coeficiente).toFixed(7) : '—'}
                  </td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium text-xs">{t.comissao_empresa != null ? `${Number(t.comissao_empresa).toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium text-xs">{t.comissao_corretor != null ? `${Number(t.comissao_corretor).toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-dk-surface text-gray-500'}`}>
                      {t.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openRules(t)} title="Regras de pontuação"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-brand transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setForm({ name: t.name, bank_id: t.bank_id || '', convenio_id: t.convenio_id || '', category_id: t.category_id || '', active: t.active, comissao_empresa: String(t.comissao_empresa ?? ''), comissao_corretor: String(t.comissao_corretor ?? ''), coeficiente: String(t.coeficiente ?? '') }); setEditId(t.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTable(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </div>
      )}

      {/* Table form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Editar Tabela' : 'Nova Tabela'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className={btnCancel}>Cancelar</button>
            <button type="submit" form="modal-financial-table" className={btnPrimary} style={primaryBg}>
              <Save className="w-4 h-4 inline mr-1" />{editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        }
      >
        <form id="modal-financial-table" onSubmit={saveTable} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Nome da Tabela *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} required placeholder="Ex: APROVAMAIS NEO_096-299_318661 - CC-CB" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Convênio <span className="text-red-400">*</span></label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className={`${inp} appearance-none pr-8 ${!form.convenio_id ? 'border-red-200' : ''}`}>
                <option value="">Selecione o convênio</option>
                {convenios.map(cv => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
              </select>
            </div>
            {convenios.length === 0 && <p className="text-xs text-orange-500 mt-1">Nenhum convênio cadastrado. Cadastre em <strong>Convênios</strong> primeiro.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Banco <span className="text-red-400">*</span></label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))} className={`${inp} appearance-none pr-8 ${!form.bank_id ? 'border-red-200' : ''}`}>
                <option value="">Selecione o banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {banks.length === 0 && <p className="text-xs text-orange-500 mt-1">Nenhum banco cadastrado. Cadastre em <strong>Bancos</strong> primeiro.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Categoria <span className="text-red-400">*</span></label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={`${inp} appearance-none pr-8 ${!form.category_id ? 'border-red-200' : ''}`}>
                <option value="">Selecione a categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}
              </select>
            </div>
            {categories.length === 0 && <p className="text-xs text-orange-500 mt-1">Nenhuma categoria cadastrada. Cadastre em <strong>Categorias</strong> primeiro.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Comissão Empresa (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.comissao_empresa} onChange={e => setForm(f => ({ ...f, comissao_empresa: e.target.value }))} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Comissão Corretor (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.comissao_corretor} onChange={e => setForm(f => ({ ...f, comissao_corretor: e.target.value }))} className={inp} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              Coeficiente
              <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--text-3)' }}>— peso/rentabilidade da tabela (ex: 0.0409485)</span>
            </label>
            <input type="number" step="any" min="0" value={form.coeficiente} onChange={e => setForm(f => ({ ...f, coeficiente: e.target.value }))} className={`${inp} font-mono`} placeholder="0.0000000" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Tabela ativa</span>
          </label>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImport}
        onClose={closeImport}
        title="Importar Tabelas Financeiras"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={closeImport} className={btnCancel}>Cancelar</button>
            <button onClick={doImport} disabled={importRows.length === 0 || importing} className={btnPrimary} style={primaryBg}>
              <Upload className="w-4 h-4 inline mr-1" />
              {importing ? 'Importando...' : `Importar ${importRows.length} tabela(s)`}
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
                Os campos <strong>banco</strong>, <strong>convenio</strong> e <strong>categoria</strong> devem corresponder exatamente aos nomes já cadastrados no sistema.
              </p>
              <button onClick={downloadTemplateFT}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)' }}>
                <Download className="w-3.5 h-3.5" /> Baixar Modelo CSV
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Selecione o arquivo CSV</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImportFile}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer" />
          </div>

          {importRows.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>{importRows.length} linha(s) detectada(s)</p>
              <div className="max-h-52 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                      {['Nome', 'Banco', 'Convênio', 'Categoria', 'Com. Emp.', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, i) => {
                      const bankOk = banks.find(b => b.name.toLowerCase() === (row.banco || '').toLowerCase());
                      const convOk = convenios.find(c => c.name.toLowerCase() === (row.convenio || '').toLowerCase());
                      const catOk = categories.find(c => c.name.toLowerCase() === (row.categoria || '').toLowerCase());
                      const ok = !!(bankOk && convOk && catOk && row.nome);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--text-1)' }}>{row.nome || '—'}</td>
                          <td className="px-3 py-2" style={{ color: bankOk ? 'var(--text-2)' : '#f87171' }}>{row.banco || '—'}{!bankOk && ' ⚠'}</td>
                          <td className="px-3 py-2" style={{ color: convOk ? 'var(--text-2)' : '#f87171' }}>{row.convenio || '—'}{!convOk && ' ⚠'}</td>
                          <td className="px-3 py-2" style={{ color: catOk ? 'var(--text-2)' : '#f87171' }}>{row.categoria || '—'}{!catOk && ' ⚠'}</td>
                          <td className="px-3 py-2 num" style={{ color: 'var(--text-2)' }}>{row.comissao_empresa ? `${row.comissao_empresa}%` : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ok ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                              {ok ? 'OK' : 'Erro'}
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

      {/* Scoring rules modal */}
      <Modal
        open={!!rulesTableId && !!rulesTable}
        onClose={() => setRulesTableId(null)}
        title="Regras de Pontuação"
        subtitle={rulesTable?.name}
        size="lg"
      >
        <div className="space-y-4">
          {rulesTable?.convenio_name && (
            <p className="text-xs text-gray-400">{rulesTable.convenio_name} · {rulesTable.bank_name}</p>
          )}
          {rules.length > 0 && (
            <div className="space-y-2">
              {rules.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dk-surface rounded-xl">
                  <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {fmtBRL(Number(r.min_value))} {r.max_value ? `→ ${fmtBRL(Number(r.max_value))}` : 'ou mais'} = <span className="font-bold text-brand">{r.points} pontos</span>
                    {rulesTable?.category_multiplier && rulesTable.category_multiplier !== 1 && (
                      <span className="text-xs text-gray-400 ml-2">(×{rulesTable.category_multiplier} = {Math.round(r.points * Number(rulesTable.category_multiplier))} pts)</span>
                    )}
                  </div>
                  <button onClick={() => deleteRule(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addRule} className="border border-dashed border-gray-200 dark:border-dk-border rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Adicionar faixa</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mínimo (R$) *</label>
                <input type="number" step="0.01" min="0" value={newRule.min_value} onChange={e => setNewRule(r => ({ ...r, min_value: e.target.value }))} className={inp} placeholder="0" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Máximo (R$)</label>
                <input type="number" step="0.01" min="0" value={newRule.max_value} onChange={e => setNewRule(r => ({ ...r, max_value: e.target.value }))} className={inp} placeholder="Sem limite" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pontos base *</label>
                <input type="number" min="0" value={newRule.points} onChange={e => setNewRule(r => ({ ...r, points: e.target.value }))} className={inp} placeholder="10" required />
              </div>
            </div>
            <button type="submit" className="mt-3 w-full py-2 rounded-xl text-sm btn-cyber font-semibold">
              <Plus className="w-4 h-4 inline mr-1" />Adicionar faixa
            </button>
          </form>
          {rulesTable?.category_name && (
            <p className="text-xs text-gray-400 text-center">
              Categoria: <strong>{rulesTable.category_name}</strong> (multiplicador ×{rulesTable.category_multiplier})
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
