import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder, groupBy }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const selected = options.find(o => o.codigo === value);

  const filtered = options.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    o.uf_sigla.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, o) => {
    const key = groupBy ? o[groupBy] : '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(option) {
    onChange(option.codigo);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="searchable-select" ref={wrapperRef} role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <input
        ref={inputRef}
        type="text"
        placeholder={selected ? `${selected.nome} (${selected.uf_sigla})` : placeholder}
        value={open ? search : (selected ? `${selected.nome} (${selected.uf_sigla})` : '')}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="ss-input"
        aria-label={placeholder || 'Selecione um município'}
        aria-autocomplete="list"
        aria-controls="municipio-listbox"
      />
      {open && (
        <div className="ss-dropdown" id="municipio-listbox" role="listbox">
          {Object.keys(grouped).length === 0 ? (
            <div className="ss-empty">Nenhum município encontrado</div>
          ) : (
            Object.entries(grouped).map(([uf, lista]) => (
              <div key={uf}>
                <div className="ss-group-label">{uf}</div>
                {lista.map(o => (
                  <div
                    key={o.codigo}
                    className={`ss-option${o.codigo === value ? ' ss-selected' : ''}`}
                    onClick={() => handleSelect(o)}
                    role="option"
                    aria-selected={o.codigo === value}
                  >
                    {o.nome}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
