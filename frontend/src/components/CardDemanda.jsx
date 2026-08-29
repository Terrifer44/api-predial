export default function CardDemanda({ demanda }) {
  if (!demanda) return null;

  const getStatusClass = (status) => {
    const st = (status || 'PENDENTE').toUpperCase();
    if (st === 'PENDENTE') return 'status-pendente';
    if (st.includes('ANDAMENTO') || st === 'EM_ANDAMENTO') return 'status-andamento';
    if (st === 'CONCLUIDO' || st === 'RESOLVIDO') return 'status-concluido';
    return 'status-default';
  };

  const formatStatus = (status) => {
    return (status || 'PENDENTE').replace('_', ' ');
  };

  return (
    <div className="card-demanda">
      <div className="card-header">
        <div className="card-header-info">
          <span className="sector-tag">{demanda.setor || 'Geral'}</span>
          <h3 className="card-title">Demanda #{demanda.id}</h3>
        </div>
        <span className={`badge ${getStatusClass(demanda.status_atual)}`}>
          {formatStatus(demanda.status_atual)}
        </span>
      </div>

      <p className="card-description">{demanda.descricao}</p>

      <div className="card-footer flex-between">
        <small className="urgency-label">
          Urgência: <strong>{demanda.urgencia_morador || 'MÉDIA'}</strong>
        </small>
      </div>
    </div>
  );
}