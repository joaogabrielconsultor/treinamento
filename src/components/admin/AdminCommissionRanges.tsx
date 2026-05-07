import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, ChevronDown, Percent, Star, AlertTriangle } from 'lucide-react';
import { CommissionRange, FinancialTable, TableCategory } from '../../types';
import { Modal, btnCancel, btnPrimary, primaryBg } from '../ui/Modal';

const API = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts?.headers || {}) } });

const inp = 'w-full px-3 py-2 border border-gray-200 dark:border-dk-border rounded-xl text-sm bg-white dark:bg-dk-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30';

const EMPTY: Partial<CommissionRange> = {
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
  const mult = range.multiplier ?? catMult;
  return Math.round(pts * mult);
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{text}{required && <span className="text-red-400 ml-0.5">*</span>}</label>;
}

export function AdminCommissionRanges() {
  const [tables, setTables] = useState<FinancialTable[]>([]);
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [ranges, setRanges] = useState<CommissionRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CommissionRange>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      API('/api/financial-tables').then(r => r.json()),
      API('/api/categories').then(r => r.json()),
    ]).then(([t, c]) => {
      setTables(Array.isArray(t) ? t : []);
      setCategories(Array.isArray(c) ? c : []);
    });
  }, []);

  useEffect(() => {
    if (!selectedTable) { setRanges([]); return; }
    setLoading(true);
    API(`/api/commission-ranges?table_id=${selectedTable}`).then(r => r.json()).then(d => {
      setRanges(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, [selectedTable]);

  function openNew() {
    setForm({ ...EMPTY, financial_table_id: selectedTable });
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
    setSaving(true);
    const body = { ...form, financial_table_id: selectedTable };
    const url = editId ? `/api/commission-ranges/${editId}` : '/api/commission-ranges';
    await API(url, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
    setShowForm(false);
    setEditId(null);
    const d = await API(`/api/commission-ranges?table_id=${selectedTable}`).then(r => r.json());
    setRanges(Array.isArray(d) ? d : []);
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm('Excluir esta faixa?')) return;
    await API(`/api/commission-ranges/${id}`, { method: 'DELETE' });
    setRanges(r => r.filter(x => x.id !== id));
  }

  const selectedTableObj = tables.find(t => t.id === selectedTable);
  const preview = calcPreview(form, categories);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faixas de Comissão</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure comissões e pontuação por tabela e faixa de valor</p>
        </div>
        {selectedTable && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e4033' }}>
            <Plus className="w-4 h-4" /> Nova Faixa
          </button>
        )}
      </div>

      {/* Table selector */}
      <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5 mb-6">
        <Label text="Selecione a tabela financeira" required />
        <div className="relative max-w-lg">
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className={`${inp} appearance-none pr-8`}>
            <option value="">Escolha uma tabela...</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.convenio_name ? `· ${t.convenio_name}` : ''} {t.bank_name ? `· ${t.bank_name}` : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedTableObj && (
          <div className="mt-3 flex flex-wrap gap-3">
            {selectedTableObj.convenio_name && <Chip label="Convênio" value={selectedTableObj.convenio_name} />}
            {selectedTableObj.bank_name && <Chip label="Banco" value={selectedTableObj.bank_name} />}
            {selectedTableObj.category_name && <Chip label="Categoria" value={`${selectedTableObj.category_name} ×${selectedTableObj.category_multiplier}`} />}
            <Chip label="Comissão empresa" value={`${selectedTableObj.comissao_empresa}%`} color="blue" />
            <Chip label="Comissão corretor" value={`${selectedTableObj.comissao_corretor}%`} color="green" />
          </div>
        )}
      </div>

      {/* Ranges list */}
      {selectedTable && (
        loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>
        ) : ranges.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border">
            <Percent className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhuma faixa cadastrada para esta tabela</p>
            <p className="text-sm mt-1">Clique em "Nova Faixa" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ranges.map(r => {
              const pts = calcPreview(r, categories);
              return (
                <div key={r.id} className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Faixa de valor</p>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {fmtBRL(Number(r.min_value))} {r.max_value ? `→ ${fmtBRL(Number(r.max_value))}` : 'ou mais'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Comissão</p>
                        <p className="text-sm">
                          <span className="text-blue-600 font-semibold">Empresa: {r.comissao_empresa}%</span>
                          <br />
                          <span className="text-green-600 font-semibold">Corretor: {r.comissao_corretor}%</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Prazo / Juros</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {r.prazo_inicial != null ? `${r.prazo_inicial}` : '—'}{r.prazo_final != null ? ` → ${r.prazo_final}` : ''} parcelas
                          {r.juros_inicial != null && <><br />{r.juros_inicial}{r.juros_final ? ` → ${r.juros_final}` : ''}% a.m.</>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Pontuação</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-bold text-yellow-600">{pts} pts</span>
                          <span className="text-xs text-gray-400">({r.base_points} × {r.multiplier ?? (r.category_multiplier || 1)})</span>
                        </div>
                        {r.category_name && <p className="text-xs text-gray-400 mt-0.5">{r.category_name}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      {r.tipo_proposta && <p className="text-xs bg-gray-100 dark:bg-dk-surface text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{r.tipo_proposta}</p>}
                      {r.parceiro && <p className="text-xs text-gray-400">{r.parceiro}</p>}
                      {r.expires_at && <p className="text-xs text-orange-500">Expira: {new Date(r.expires_at).toLocaleDateString('pt-BR')}</p>}
                      <div className="flex items-center gap-1 justify-end mt-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dk-surface text-gray-400 hover:text-brand transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
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
          {/* Section: Dados da proposta */}
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
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.disponivel_para || 'todos'} onChange={e => setForm(f => ({ ...f, disponivel_para: e.target.value }))} className={`${inp} appearance-none pr-8`}>
                    <option value="todos">Todos</option>
                    <option value="corretor">Apenas corretor</option>
                    <option value="empresa">Apenas empresa</option>
                  </select>
                </div>
              </FormField>
            </div>
          </Section>

          {/* Section: Prazo e Juros */}
          <Section title="Prazo e Juros / Coeficiente">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Prazo inicial (meses)">
                <input type="number" min="0" value={form.prazo_inicial ?? ''} onChange={e => setForm(f => ({ ...f, prazo_inicial: e.target.value ? parseInt(e.target.value) : undefined }))} className={inp} placeholder="12" />
              </FormField>
              <FormField label="Prazo final (meses)">
                <input type="number" min="0" value={form.prazo_final ?? ''} onChange={e => setForm(f => ({ ...f, prazo_final: e.target.value ? parseInt(e.target.value) : undefined }))} className={inp} placeholder="96" />
              </FormField>
              <FormField label="Juros inicial (% a.m.)">
                <input type="number" step="0.0001" min="0" value={form.juros_inicial ?? ''} onChange={e => setForm(f => ({ ...f, juros_inicial: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="1.80" />
              </FormField>
              <FormField label="Juros final (% a.m.)">
                <input type="number" step="0.0001" min="0" value={form.juros_final ?? ''} onChange={e => setForm(f => ({ ...f, juros_final: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="2.14" />
              </FormField>
              <FormField label="Coef. inicial">
                <input type="number" step="0.000001" min="0" value={form.coef_inicial ?? ''} onChange={e => setForm(f => ({ ...f, coef_inicial: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="0.018741" />
              </FormField>
              <FormField label="Coef. final">
                <input type="number" step="0.000001" min="0" value={form.coef_final ?? ''} onChange={e => setForm(f => ({ ...f, coef_final: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inp} placeholder="0.021893" />
              </FormField>
            </div>
          </Section>

          {/* Section: Comissão */}
          <Section title="Comissão">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Comissão Empresa (%)" required>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 w-4 h-4 text-blue-400 pointer-events-none" />
                  <input type="number" step="0.01" min="0" max="100" value={form.comissao_empresa ?? ''} onChange={e => setForm(f => ({ ...f, comissao_empresa: parseFloat(e.target.value) || 0 }))} className={`${inp} pr-9 border-blue-200 focus:ring-blue-300/30`} placeholder="0.00" required />
                </div>
              </FormField>
              <FormField label="Comissão Corretor (%)" required>
                <div className="relative">
                  <Percent className="absolute right-3 top-2.5 w-4 h-4 text-green-400 pointer-events-none" />
                  <input type="number" step="0.01" min="0" max="100" value={form.comissao_corretor ?? ''} onChange={e => setForm(f => ({ ...f, comissao_corretor: parseFloat(e.target.value) || 0 }))} className={`${inp} pr-9 border-green-200 focus:ring-green-300/30`} placeholder="0.00" required />
                </div>
              </FormField>
            </div>
          </Section>

          {/* Section: Ranking */}
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
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.category_id || ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || undefined }))} className={`${inp} appearance-none pr-8`}>
                    <option value="">Sem categoria específica</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} (×{c.multiplier})</option>)}
                  </select>
                </div>
              </FormField>
              {/* Preview */}
              <div className="md:col-span-2 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#dabb3918', border: '1px solid #dabb3940' }}>
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Pontos gerados ao liberar valor nesta faixa</p>
                  <p className="text-lg font-black text-yellow-600">
                    {preview} pontos
                    <span className="text-xs font-normal text-gray-400 ml-2">
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 pb-1 border-b border-gray-100 dark:border-dk-border">{title}</h3>
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
  const colors = {
    gray: 'bg-gray-100 dark:bg-dk-surface text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      <span className="opacity-60">{label}:</span> {value}
    </span>
  );
}
