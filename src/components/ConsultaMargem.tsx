import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, User, ChevronDown, ChevronUp, AlertCircle, Wifi, WifiOff, Key, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

interface MargemResultado {
  servidor: string | null;
  cpf: string | null;
  orgaos: {
    id: string;
    tipo: 'margem' | 'orgao' | 'dados';
    linhas: string[][];
  }[];
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

function TabelaMargem({ linhas, tipo }: { linhas: string[][]; tipo: string }) {
  if (linhas.length < 2) return null;
  const [header, ...body] = linhas;
  const cor = tipo === 'margem'
    ? { accent: '#14B8A6', bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.2)' }
    : { accent: '#06B6D4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.2)' };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cor.border}`, background: cor.bg }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: `${cor.accent}15` }}>
            {header.map((col, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: cor.accent }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ borderTop: `1px solid ${cor.border}` }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-xs" style={{ color: ci === 0 ? 'var(--text-2)' : 'var(--text-1)', fontWeight: ci > 0 ? 600 : 400 }}>
                  {cell || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultadoCard({ resultado }: { resultado: MargemResultado }) {
  const [expandido, setExpandido] = useState(true);

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #14B8A6, #06B6D4)' }} />
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <User className="w-5 h-5" style={{ color: '#14B8A6' }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>
                {resultado.servidor || 'Servidor não identificado'}
              </h3>
              {resultado.cpf && (
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>CPF: {resultado.cpf}</p>
              )}
            </div>
          </div>
          <button onClick={() => setExpandido(!expandido)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-3)', background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expandido && (
        <div className="px-5 pb-5 space-y-3">
          {resultado.orgaos.length === 0
            ? <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>Nenhuma margem encontrada para este servidor.</p>
            : resultado.orgaos.map((t, i) => <TabelaMargem key={i} linhas={t.linhas} tipo={t.tipo} />)
          }
        </div>
      )}
    </div>
  );
}

function PainelSessao({ onSessaoAtualizada }: { onSessaoAtualizada: () => void }) {
  const [sessao, setSessao] = useState<SessaoStatus | null>(null);
  const [novoToken, setNovoToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const carregarSessao = useCallback(async () => {
    try {
      const data = await api.get<SessaoStatus>('/consignado/sessao', true);
      setSessao(data);
    } catch {
      setSessao({ ativa: false, jsessionid: null, updated_at: null });
    }
  }, []);

  useEffect(() => { carregarSessao(); }, [carregarSessao]);

  const salvar = async () => {
    if (!novoToken.trim()) return;
    setSalvando(true);
    setErro('');
    setSucesso(false);
    try {
      const data = await api.post<{ ok: boolean; ativa: boolean }>('/consignado/sessao', { jsessionid: novoToken.trim() }, true);
      if (!data.ativa) setErro('Token salvo, mas a sessão parece inativa. Verifique se o JSESSIONID está correto e não expirou.');
      else setSucesso(true);
      setNovoToken('');
      await carregarSessao();
      onSessaoAtualizada();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const ativa = sessao?.ativa ?? false;

  return (
    <div className="rounded-2xl p-5 mb-6 animate-fade-up" style={{ background: 'var(--card-bg)', border: `1px solid ${ativa ? 'rgba(20,184,166,0.3)' : 'rgba(239,68,68,0.25)'}`, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ height: '2px', background: ativa ? 'linear-gradient(90deg, #14B8A6, #06B6D4)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: '16px 16px 0 0', marginTop: '-20px', marginLeft: '-20px', marginRight: '-20px', marginBottom: '16px' }} />

      {/* Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {ativa
            ? <Wifi className="w-4 h-4" style={{ color: '#14B8A6' }} />
            : <WifiOff className="w-4 h-4" style={{ color: '#f87171' }} />
          }
          <span className="text-sm font-semibold" style={{ color: ativa ? '#14B8A6' : '#f87171' }}>
            {ativa ? 'Sessão ativa' : sessao?.jsessionid ? 'Sessão expirada' : 'Sem sessão configurada'}
          </span>
          {sessao?.updated_at && (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>— atualizada {timeAgo(sessao.updated_at)}</span>
          )}
        </div>
        <button onClick={carregarSessao} className="p-1.5 rounded-lg btn-ghost" title="Verificar sessão">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Campo para colar o token */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
          Cole o JSESSIONID do Portal do Consignado
        </label>
        <p className="text-xs mb-2.5" style={{ color: 'var(--text-3)' }}>
          No portal, abra o DevTools (F12) → Application → Cookies → portaldoconsignado.com.br → copie o valor de <code className="font-mono">JSESSIONID</code>
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
          <button
            onClick={salvar}
            disabled={salvando || !novoToken.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold btn-cyber whitespace-nowrap"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        {erro && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{erro}
          </div>
        )}
        {sucesso && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: '#14B8A6' }}>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />Sessão configurada com sucesso!
          </div>
        )}
      </div>
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

  const verificarSessao = useCallback(async () => {
    try {
      const data = await api.get<{ ativa: boolean }>('/consignado/sessao', true);
      setSessaoAtiva(data.ativa);
    } catch {
      setSessaoAtiva(false);
    }
  }, []);

  useEffect(() => { verificarSessao(); }, [verificarSessao]);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.replace(/\D/g, '').length !== 11) { setErro('CPF inválido — informe os 11 dígitos.'); return; }
    setLoading(true);
    setErro('');
    setResultado(null);
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

  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <Search className="w-4 h-4" style={{ color: '#14B8A6' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Consulta de Margem</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Portal do Consignado SP</p>
        </div>
      </div>

      {/* Painel de sessão — só admin vê */}
      {isAdmin && <PainelSessao onSessaoAtualizada={verificarSessao} />}

      {/* Aviso de sessão inativa para não-admins */}
      {!isAdmin && sessaoAtiva === false && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 text-sm animate-fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Sessão inativa — aguarde o administrador configurar o acesso ao portal.
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={consultar} className="rounded-2xl p-6 mb-6 animate-fade-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)', animationDelay: '60ms' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>CPF do Servidor *</label>
            <input
              type="text"
              value={cpf}
              onChange={e => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              required
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl font-mono"
            />
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
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{erro}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          {(resultado || cpf) && (
            <button type="button" onClick={() => { setCpf(''); setMatricula(''); setOrgao(''); setResultado(null); setErro(''); }} className="px-4 py-2.5 rounded-xl text-sm font-medium btn-ghost flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />Limpar
            </button>
          )}
          <button
            type="submit"
            disabled={loading || sessaoAtiva === false}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-cyber flex items-center justify-center gap-2"
          >
            {loading
              ? <><div className="spinner-cyber" style={{ width: 16, height: 16 }} />Consultando...</>
              : <><Search className="w-4 h-4" />Consultar Margem</>
            }
          </button>
        </div>
      </form>

      {resultado && <ResultadoCard resultado={resultado} />}
    </div>
  );
}
