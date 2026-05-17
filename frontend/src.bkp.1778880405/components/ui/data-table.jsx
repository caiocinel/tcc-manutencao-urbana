import { useState, useMemo } from 'react';
import { CaretUp, CaretDown, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function DataTable({
  columns = [],
  data = [],
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
  className,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? row[col.accessor] : null;
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchable && (
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-9 pr-3 rounded-lg border text-sm outline-none transition-colors"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border-default)'; }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border-default)' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'var(--color-bg-secondary)' }}>
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className={cn(
                    'px-4 py-3 text-left font-semibold whitespace-nowrap select-none',
                    col.sortable !== false && 'cursor-pointer hover:opacity-80'
                  )}
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {sortKey === col.accessor && (
                      sortDir === 'asc'
                        ? <CaretUp size={12} weight="bold" style={{ color: 'var(--color-gold-500)' }} />
                        : <CaretDown size={12} weight="bold" style={{ color: 'var(--color-gold-500)' }} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageData.map((row, i) => (
                  <motion.tr
                    key={row.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors cursor-pointer border-t',
                      i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'
                    )}
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--color-bg-surface)';
                      e.currentTarget.style.borderLeft = '2px solid var(--color-gold-500)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)';
                      e.currentTarget.style.borderLeft = '2px solid transparent';
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.accessor || col.header}
                        className="px-4 py-3 whitespace-nowrap"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {col.cell
                          ? col.cell(row)
                          : col.accessor
                            ? row[col.accessor]
                            : null}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''}
            {search && ` (filtrados)`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center justify-center w-8 h-8 rounded-md text-xs transition-colors disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CaretLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="flex items-center justify-center min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: i === safePage ? 'var(--color-gold-500)' : 'transparent',
                  color: i === safePage ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                }}
                onMouseEnter={e => {
                  if (i !== safePage) e.currentTarget.style.background = 'var(--color-bg-hover)';
                }}
                onMouseLeave={e => {
                  if (i !== safePage) e.currentTarget.style.background = 'transparent';
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex items-center justify-center w-8 h-8 rounded-md text-xs transition-colors disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
