import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function CardDemandaAdmin({ demanda, onAtualizarStatus, onExcluir, onAbrirHistorico }) {
  const { user } = useAuth();
  const [novoStatus, setNovoStatus] = useState(demanda?.status_atual || 'PENDENTE');
  const [processando, setProcessando] = useState(false);

  if (!demanda) return null;

  const handleStatusChange = async (e) => {
    const valor = e.target.value;
    setNovoStatus(valor);
    setProcessando(true);

    await onAtualizarStatus(demanda.id, {
      id_usuario_modificador: user.usuario_id,
      status_novo: valor,
      comentario: `Status alterado para ${valor.replace('_', ' ')} pelo administrador.`
    });

    setProcessando(false);
  };

  return (
    <div className="card-demanda-admin">
      <div className="card-header flex-between">
        <div className="card-header-info">
          <h3 className="card-title">
            Demanda #{demanda.id} - <span className="text-muted">{demanda.setor}</span>
          </h3>
          <p className="card-meta">
            Morador ID: {demanda.id_morador} | Urgência: {demanda.urgencia_morador}
          </p>
        </div>
        
        <select 
          value={novoStatus} 
          onChange={handleStatusChange} 
          disabled={processando}
          className="select-status"
        >
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANDAMENTO">Em Andamento</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <p className="card-description">{demanda.descricao}</p>

      <div className="admin-actions flex-between action-group">
        <button 
          className="btn-secondary" 
          onClick={() => onAbrirHistorico(demanda.id)}
          disabled={processando}
        >
          Ver Histórico
        </button>
        <button 
          className="btn-danger" 
          onClick={() => onExcluir(demanda.id)}
          disabled={processando}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}