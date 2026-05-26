import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, User, ChevronDown, ChevronUp,
  AlertCircle, Wifi, WifiOff, Key, CheckCircle2, Building2,
  Calendar, Briefcase, CreditCard,
} from 'lucide-react';
import { api } from '../lib/api';

interface MargemItem { produto: string; valor: string; }

interface Servidor {
  cpf: string | null;
  nome: string | null;
  orgao: string | null;
  identificacao: string | null;
  mesReferencia: string | null;
  proximaFolha: string | null;
  lotacao: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  tipoVinculo: string | null;
}

interface MargemResultado {
  servidor: Servidor;
  margemBruta: MargemItem[];
  margemDisponivel: MargemItem[];
}

interface SessaoStatus {
  ativa: boolean;
  jsessionid: string | null;
  updated_at: string | null;
}

function formatCPF(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

function TabelaMargem({ titulo, itens, cor }: { titulo: string; itens: MargemItem[]; cor: { accent: string; bg: string; border: string } }) {
  if (itens.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cor.border}`, background: cor.bg }}>
      <div className="px-4 py-2.5" style={{ background: `${cor.accent}12`, borderBottom: `1px solid ${cor.border}` }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cor.accent }}>{titulo}</span>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: `1px solid ${cor.border}` }}>
            <th className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Produto</th>
            <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => (
            <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${cor.border}` : undefined }}>
              <td className="px-4 py-2.5 text-xs capitalize" style={{ color: 'var(--text-2)' }}>
                {item.produto.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </td>
              <td className="px-4 py-2.5 text-xs text-right font-bold" style={{ color: cor.accent }}>
                {item.valor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs shrink-0 w-32" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  );
}

function ResultadoCard({ resultado }: { resultado: MargemResultado }) {
  const [showFuncional, setShowFuncional] = useState(false);
  const { servidor, margemBruta, margemDisponivel } = resultado;

  const corBruta = { accent: '#06B6D4', bg: 'rgba(6,182,212,0.04)', border: 'rgba(6,182,212,0.15)' };
  const corDisp  = { accent: '#14B8A6', bg: 'rgba(20,184,166,0.04)', border: 'rgba(20,184,166,0.15)' };

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #14B8A6, #06B6D4)' }} />

      {/* Cabeçalho do servidor */}
      <div className="p-5 pb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <User className="w-5 h-5" style={{ color: '#14B8A6' }} />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{servidor.nome || 'Servidor não identificado'}</h3>
            {servidor.cpf && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>CPF: {servidor.cpf}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Órgão</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text-1)' }}>{servidor.orgao || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Matrícula</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text-1)' }}>{servidor.identificacao || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Ref. Margem</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text-1)' }}>{servidor.mesReferencia || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Próx. Folha</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--text-1)' }}>{servidor.proximaFolha || '—'}</span>
          </div>
        </div>

        {/* Dados funcionais colapsável */}
        {(servidor.lotacao || servidor.tipoVinculo || servidor.dataAdmissao) && (
          <div className="mt-3">
            <button
              onClick={() => setShowFuncional(!showFuncional)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--text-3)' }}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Dados funcionais
              {showFuncional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showFuncional && (
              <div className="mt-2 pl-5 space-y-1.5">
                <InfoRow label="Lotação" value={servidor.lotacao} />
                <InfoRow label="Cargo" value={servidor.cargo} />
                <InfoRow label="Tipo Vínculo" value={servidor.tipoVinculo} />
                <InfoRow label="Data Admissão" value={servidor.dataAdmissao} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabelas de margem */}
      <div className="p-5 space-y-3">
        {margemBruta.length === 0 && margemDisponivel.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>Nenhuma margem encontrada para este servidor.</p>
        ) : (
          <>
            <TabelaMargem titulo="Margem Bruta" itens={margemBruta} cor={corBruta} />
            <TabelaMargem titulo="Margem Disponível" itens={margemDisponivel} cor={corDisp} />
          </>
        )}
      </div>
    </div>
  );
}

function PainelSessao({ onSessaoAtualizada }: { onSessaoAtualizada: (ativa: boolean) => void }) {
  const [sessao, setSessao] = useState<SessaoStatus | null>(null);
  const [novoToken, setNovoToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<SessaoStatus>('/consignado/sessao', true);
      setSessao(data);
      onSessaoAtualizada(data.ativa);
    } catch {
      setSessao({ ativa: false, jsessionid: null, updated_at: null });
      onSessaoAtualizada(false);
    }
  }, [onSessaoAtualizada]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!novoToken.trim()) return;
    setSalvando(true); setErro(''); setSucesso(false);
    try {
      const data = await api.post<{ ok: boolean; ativa: boolean }>('/consignado/sessao', { jsessionid: novoToken.trim() }, true);
      if (!data.ativa) setErro('Token salvo, mas sessão parece inativa. Verifique se o JSESSIONID está correto.');
      else { setSucesso(true); setNovoToken(''); }
      await carregar();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const ativa = sessao?.ativa ?? false;

  return (
    <div className="rounded-2xl p-5 mb-6 animate-fade-up relative overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid ${ativa ? 'rgba(20,184,166,0.3)' : 'rgba(239,68,68,0.25)'}`, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ativa ? 'linear-gradient(90deg, #14B8A6, #06B6D4)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {ativa ? <Wifi className="w-4 h-4" style={{ color: '#14B8A6' }} /> : <WifiOff className="w-4 h-4" style={{ color: '#f87171' }} />}
          <span className="text-sm font-semibold" style={{ color: ativa ? '#14B8A6' : '#f87171' }}>
            {ativa ? 'Sessão ativa' : sessao?.jsessionid ? 'Sessão expirada' : 'Sem sessão configurada'}
          </span>
          {sessao?.updated_at && <span className="text-xs" style={{ color: 'var(--text-3)' }}>— {timeAgo(sessao.updated_at)}</span>}
        </div>
        <button onClick={carregar} className="p-1.5 rounded-lg btn-ghost"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>JSESSIONID do Portal do Consignado</label>
      <p className="text-xs mb-2.5" style={{ color: 'var(--text-3)' }}>
        No portal: F12 → Application → Cookies → <code className="font-mono">portaldoconsignado.com.br</code> → copie o valor de <code className="font-mono">JSESSIONID</code>
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={novoToken}
            onChange={e => setNovoToken(e.target.value)}
            placeholder="0000pGPRa0Ze0TB21qkk..."
            className="input-cyber w-full pl-9 pr-4 py-2.5 text-sm rounded-xl font-mono"
          />
        </div>
        <button onClick={salvar} disabled={salvando || !novoToken.trim()} className="px-4 py-2.5 rounded-xl text-sm font-semibold btn-cyber whitespace-nowrap">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      {erro && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{erro}
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: '#14B8A6' }}>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Sessão configurada com sucesso!
        </div>
      )}
    </div>
  );
}

export function ConsultaMargem({ isAdmin }: { isAdmin: boolean }) {
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [orgao, setOrgao] = useState('');
  const [sessaoAtiva, setSessaoAtiva] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<MargemResultado | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      api.get<SessaoStatus>('/consignado/sessao', true)
        .then(d => setSessaoAtiva(d.ativa))
        .catch(() => setSessaoAtiva(false));
    }
  }, [isAdmin]);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.replace(/\D/g, '').length !== 11) { setErro('CPF inválido — informe os 11 dígitos.'); return; }
    setLoading(true); setErro(''); setResultado(null);
    try {
      const data = await api.post<MargemResultado>('/consignado/margem', {
        cpf, matricula: matricula || undefined, orgao: orgao || undefined,
      }, true);
      setResultado(data);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar margem');
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => { setCpf(''); setMatricula(''); setOrgao(''); setResultado(null); setErro(''); };

  const sessaoInativa = !isAdmin && sessaoAtiva === false;

  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <Search className="w-4 h-4" style={{ color: '#14B8A6' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Consulta de Margem</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Portal do Consignado SP</p>
        </div>
      </div>

      {isAdmin && <PainelSessao onSessaoAtualizada={setSessaoAtiva} />}

      {sessaoInativa && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 text-sm animate-fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          Sessão inativa — aguarde o administrador configurar o acesso ao portal.
        </div>
      )}

      <form onSubmit={consultar} className="rounded-2xl p-6 mb-6 animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '60ms' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>CPF do Servidor *</label>
            <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" required className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Matrícula <span style={{ fontWeight: 400 }}>(opcional)</span></label>
            <input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Número da matrícula" className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Código do Órgão <span style={{ fontWeight: 400 }}>(opcional)</span></label>
            <input type="text" value={orgao} onChange={e => setOrgao(e.target.value)} placeholder="Ex: 102 = SEFAZ, 122 = DETRAN" className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mt-4 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{erro}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          {(resultado || cpf) && (
            <button type="button" onClick={limpar} className="px-4 py-2.5 rounded-xl text-sm font-medium btn-ghost flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />Limpar
            </button>
          )}
          <button type="submit" disabled={loading || sessaoInativa} className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-cyber flex items-center justify-center gap-2">
            {loading
              ? <><div className="spinner-cyber" style={{ width: 16, height: 16 }} />Consultando...</>
              : <><Search className="w-4 h-4" />Consultar Margem</>}
          </button>
        </div>
      </form>

      {resultado && <ResultadoCard resultado={resultado} />}
    </div>
  );
}
