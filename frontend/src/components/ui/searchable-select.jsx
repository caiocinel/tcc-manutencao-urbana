import { useState, useEffect, useRef, useMemo } from 'react';
import { Check, CaretUpDown, MagnifyingGlass } from '@phosphor-icons/react';

function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Selecione...', label }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const selected = options.find(o => o.value === value);

  const grouped = useMemo(() => {
    const norm = normalize(search);
    const filtered = !norm
      ? options
      : options.filter(o => normalize(o.label).includes(norm) || normalize(o.group).includes(norm));
    const groups = {};
    for (const o of filtered) {
      if (!groups[o.group]) groups[o.group] = [];
      groups[o.group].push(o);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [options, search]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center w-full h-12 px-4 rounded-lg border text-sm outline-none transition-colors bg-[var(--color-bg-input)] text-left"
        style={{ borderColor: open ? 'var(--color-gold-500)' : 'var(--color-border-default)', color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        <span className="flex-1 truncate">{selected ? `${selected.label} - ${selected.group}` : placeholder}</span>
        <CaretUpDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>
      {label && (
        <span className="absolute left-4 -top-2 text-xs px-1"
          style={{ color: value ? 'var(--color-gold-500)' : 'var(--color-text-muted)', background: 'var(--color-bg-surface)' }}>
          {label}
        </span>
      )}

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
            <MagnifyingGlass size={14} style={{ color: 'var(--color-text-muted)' }} />
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar município..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--color-text-primary)' }}
              onKeyDown={e => e.stopPropagation()} />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {grouped.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>Nenhum município encontrado</p>
            ) : grouped.map(([group, items]) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-primary)' }}>
                  {group}
                </div>
                {items.map(item => (
                  <button key={item.value} type="button" onClick={() => { onChange(item.value); setOpen(false); setSearch(''); }}
                    className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                    <span className="flex-1">{item.label}</span>
                    {item.value === value && <Check size={14} weight="bold" style={{ color: 'var(--color-gold-500)' }} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
