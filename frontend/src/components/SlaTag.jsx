export function slaAtrasado(demanda) {
  const status = (demanda.status_atual || demanda.status || '').toUpperCase();
  if (!demanda.sla_prazo || status === 'CONCLUIDA') return false;
  return new Date(demanda.sla_prazo) < new Date();
}

export default function SlaTag({ demanda, className = '' }) {
  if (!demanda.sla_prazo) return null;
  const atrasada = slaAtrasado(demanda);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-1.5 py-0.5 rounded border ${
        atrasada
          ? 'text-signal border-signal/30 bg-signal/10'
          : 'text-muted border-line bg-panel-2/60'
      } ${className}`}
      title={atrasada ? 'Prazo de SLA excedido' : 'Prazo de atendimento (SLA)'}
    >
      {atrasada ? 'SLA vencido' : new Date(demanda.sla_prazo).toLocaleDateString('pt-BR')}
    </span>
  );
}
