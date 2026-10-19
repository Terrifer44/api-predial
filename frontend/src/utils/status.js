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

