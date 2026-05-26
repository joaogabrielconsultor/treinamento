import { useState, useEffect } from 'react';
import { Search, RefreshCw, User, Building2, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { LoginBanco } from '../types';

interface MargemResultado {
  servidor: string | null;
  cpf: string | null;
  orgaos: {
    id: string;
    tipo: 'margem' | 'orgao' | 'dados';
    linhas: string[][];
  }[];
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function TabelaMargem({ linhas, tipo }: { linhas: string[][]; tipo: string }) {
  if (linhas.length < 2) return null;
  const header = linhas[0];
  const body = linhas.slice(1);

  const corTipo = tipo === 'margem'
    ? { accent: '#14B8A6', bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.2)' }
    : { accent: '#06B6D4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.2)' };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${corTipo.border}`, background: corTipo.bg }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: `${corTipo.accent}15` }}>
            {header.map((col, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider"
                style={{ color: corTipo.accent }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              style={{ borderTop: `1px solid ${corTipo.border}` }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-2.5 text-xs"
                  style={{ color: ci === 0 ? 'var(--text-2)' : 'var(--text-1)', fontWeight: ci > 0 ? 600 : 400 }}
                >
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
    <div
      className="rounded-2xl overflow-hidden animate-fade-up"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Linha accent topo */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #14B8A6, #06B6D4)' }} />

      {/* Cabeçalho do resultado */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
            >
              <User className="w-5 h-5" style={{ color: '#14B8A6' }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>
                {resultado.servidor || 'Servidor não identificado'}
              </h3>
              {resultado.cpf && (
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>
                  CPF: {resultado.cpf}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-3)', background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabelas */}
      {expandido && (
        <div className="px-5 pb-5 space-y-3">
          {resultado.orgaos.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>
              Nenhuma margem encontrada para este servidor.
            </p>
          ) : (
            resultado.orgaos.map((tabela, i) => (
              <TabelaMargem key={i} linhas={tabela.linhas} tipo={tabela.tipo} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ConsultaMargem() {
  const [bancos, setBancos] = useState<LoginBanco[]>([]);
  const [loadingBancos, setLoadingBancos] = useState(true);

  const [loginBancoId, setLoginBancoId] = useState('');
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [orgao, setOrgao] = useState('');

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<MargemResultado | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get<LoginBanco[]>('/login-bancos', true)
      .then(setBancos)
      .catch(() => setBancos([]))
      .finally(() => setLoadingBancos(false));
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) { setErro('CPF inválido — informe os 11 dígitos.'); return; }
    if (!loginBancoId) { setErro('Selecione uma credencial de banco.'); return; }

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const data = await api.post<MargemResultado>('/consignado/margem', {
        login_banco_id: loginBancoId,
        cpf,
        matricula: matricula || undefined,
        orgao: orgao || undefined,
      }, true);
      setResultado(data);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar margem. Verifique as credenciais e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => {
    setCpf('');
    setMatricula('');
    setOrgao('');
    setResultado(null);
    setErro('');
  };

  if (loadingBancos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-cyber" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
        >
          <Search className="w-4.5 h-4.5" style={{ color: '#14B8A6' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Consulta de Margem</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Portal do Consignado SP</p>
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={consultar}
        className="rounded-2xl p-6 mb-6 animate-fade-up"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-card)',
          animationDelay: '60ms',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.4), transparent)',
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credencial do banco */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              Credencial do Banco *
            </label>
            <div className="relative">
              <Building2
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-3)' }}
              />
              <select
                value={loginBancoId}
                onChange={(e) => setLoginBancoId(e.target.value)}
                required
                className="input-cyber w-full pl-9 pr-4 py-2.5 text-sm rounded-xl appearance-none"
              >
                <option value="">Selecione o banco para consulta...</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
            {bancos.length === 0 && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                Nenhum banco cadastrado. Adicione em Login Bancos primeiro.
              </p>
            )}
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              CPF do Servidor *
            </label>
            <input
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              required
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl font-mono"
            />
          </div>

          {/* Matrícula (opcional) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              Matrícula <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Número da matrícula"
              className="input-cyber w-full px-3 py-2.5 text-sm rounded-xl"
            />
          </div>

          {/* Órgão (opcional) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
              Código do Órgão <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-3)' }}
              />
              <input
                type="text"
                value={orgao}
                onChange={(e) => setOrgao(e.target.value)}
                placeholder="Ex: 102 = SEFAZ, 122 = DETRAN"
                className="input-cyber w-full pl-9 pr-4 py-2.5 text-sm rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 mt-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 mt-5">
          {(resultado || cpf) && (
            <button
              type="button"
              onClick={limpar}
              className="px-4 py-2.5 rounded-xl text-sm font-medium btn-ghost flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-cyber flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner-cyber" style={{ width: 16, height: 16 }} />
                Consultando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Consultar Margem
              </>
            )}
          </button>
        </div>
      </form>

      {/* Resultado */}
      {resultado && <ResultadoCard resultado={resultado} />}
    </div>
  );
}
