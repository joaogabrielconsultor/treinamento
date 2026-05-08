import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}

export function Pagination({ total, page, perPage, onPage, onPerPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 flex-wrap gap-2"
      style={{ borderTop: '1px solid var(--card-border)' }}
    >
      <p className="text-xs num" style={{ color: 'var(--text-3)' }}>
        {total === 0 ? 'Sem resultados' : `${from}–${to} de ${total}`}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--text-2)', opacity: page <= 1 ? 0.3 : 1 }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-xs" style={{ color: 'var(--text-3)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
              style={
                p === page
                  ? { background: 'linear-gradient(135deg,#14B8A6,#06B6D4)', color: '#fff' }
                  : { color: 'var(--text-2)' }
              }
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--text-2)', opacity: page >= totalPages ? 0.3 : 1 }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Por página</span>
        <select
          value={perPage}
          onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
          className="input-cyber text-xs rounded-lg px-2 py-1"
          style={{ minWidth: '58px' }}
        >
          {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
