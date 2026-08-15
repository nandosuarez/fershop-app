"use client";

interface ListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultLabel: string;
}

export function ListSearch({ value, onChange, placeholder, resultLabel }: ListSearchProps) {
  return (
    <div className="ops-list-toolbar">
      <label className="ops-list-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <span className="sr-only">Buscar</span>
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {value ? (
          <button type="button" aria-label="Limpiar busqueda" onClick={() => onChange("")}>
            &times;
          </button>
        ) : null}
      </label>
      <span>{resultLabel}</span>
    </div>
  );
}
