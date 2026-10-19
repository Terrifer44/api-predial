export function slaAtrasado(demanda) {
  const status = (demanda.status_atual || demanda.status || '').toUpperCase();
  if (!demanda.sla_prazo || status === 'CONCLUIDA') return false;
  return new Date(demanda.sla_prazo) < new Date();
}

