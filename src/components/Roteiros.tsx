import { useState, useEffect } from 'react';
import { BookOpen, Building2, FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

interface Roteiro {
  id: string;
  bank_id: string | null;
  bank_name: string | null;
  title: string;
  description: string;
  file_url: string;
  original_name: string;
}

const token = () => localStorage.getItem('token') ?? '';

export function Roteiros() {
  const [items, setItems] = useState<Roteiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/roteiros', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        const data: Roteiro[] = Array.isArray(d) ? d : [];
        setItems(data);
        setExpanded(new Set(data.map(r => r.bank_id ?? '__none__')));
        setLoading(false);
      });
  }, []);

  const grouped = items.reduce<Record<string, { bankName: string; roteiros: Roteiro[] }>>((acc, r) => {
    const key = r.bank_id ?? '__none__';
    if (!acc[key]) acc[key] = { bankName: r.bank_name ?? 'Sem banco', roteiros: [] };
    acc[key].roteiros.push(r);
    return acc;
  }, {});

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner-cyber" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)' }}
        >
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Roteiros Operacionais</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>PDFs dos roteiros por banco</p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p style={{ color: 'var(--text-3)' }}>Nenhum roteiro disponível ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([key, { bankName, roteiros }]) => {
            const open = expanded.has(key);
            return (
              <div
                key={key}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}
              >
                <button
                  onClick={() => toggle(key)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-all"
                  style={{ background: open ? 'rgba(20,184,166,0.05)' : 'transparent' }}
                >
                  <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: '#2DD4BF' }} />
                  <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{bankName}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full mr-2"
                    style={{ background: 'rgba(45,212,191,0.1)', color: '#2DD4BF' }}
                  >
                    {roteiros.length} roteiro{roteiros.length !== 1 ? 's' : ''}
                  </span>
                  {open
                    ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                    : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                  }
                </button>

                {open && (
                  <div style={{ borderTop: '1px solid var(--card-border)' }}>
                    {roteiros.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={i < roteiros.length - 1 ? { borderBottom: '1px solid var(--border-1)' } : undefined}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{r.title}</p>
                          {r.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{r.description}</p>
                          )}
                        </div>
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-80"
                          style={{
                            background: 'rgba(45,212,191,0.1)',
                            color: '#2DD4BF',
                            border: '1px solid rgba(45,212,191,0.2)',
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir PDF
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
