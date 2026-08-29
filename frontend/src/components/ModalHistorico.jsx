export default function ModalHistorico({ historico = [], onClose, loading }) {
  const formatStatus = (status) => {
    return status ? status.replace('_', ' ') : '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex-between">
          <h3 className="modal-title">Histórico de Alterações</h3>
          <button className="btn-close" onClick={onClose} aria-label="Fechar modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="loading-message">Carregando histórico...</p>
          ) : !historico || historico.length === 0 ? (
            <p className="empty-message">Nenhum registro no histórico.</p>
          ) : (
            <ul className="timeline">
              {historico.map((item) => (
                <li key={item.id} className="timeline-item">
                  <div className="timeline-content">
                    <p className="status-transition">
                      <strong>
                        {item.status_anterior ? `${formatStatus(item.status_anterior)} → ` : ''}
                        {formatStatus(item.status_novo)}
                      </strong>
                    </p>
                    <small className="timeline-date">
                      {new Date(item.data_mudanca).toLocaleString('pt-BR')}
                    </small>
                    {item.comentario && <p className="comment">"{item.comentario}"</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}