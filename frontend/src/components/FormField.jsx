export default function FormField({ id, label, mono = false, className = '', ...inputProps }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={`w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors disabled:opacity-50 ${
          mono ? 'font-mono uppercase' : ''
        }`}
        {...inputProps}
      />
    </div>
  );
}
