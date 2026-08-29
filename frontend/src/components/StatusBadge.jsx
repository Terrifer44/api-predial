const ESTILOS = {
  PENDENTE: { dot: 'bg-amber', text: 'text-amber', label: 'Pendente' },
  ATRIBUIDA: { dot: 'bg-blueprint-bright', text: 'text-blueprint-bright', label: 'Atribuída' },
  EM_ANDAMENTO: { dot: 'bg-blueprint-bright', text: 'text-blueprint-bright', label: 'Em andamento' },
  CONCLUIDA: { dot: 'bg-moss', text: 'text-moss', label: 'Concluída' },
  IMPEDIMENTO: { dot: 'bg-signal', text: 'text-signal', label: 'Impedimento' },
};

export function statusEstilo(status) {
  return ESTILOS[(status || '').toUpperCase()] || { dot: 'bg-faint', text: 'text-muted', label: status || '—' };
}

export default function StatusBadge({ status, className = '' }) {
  const s = statusEstilo(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-medium uppercase tracking-wider ${s.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
