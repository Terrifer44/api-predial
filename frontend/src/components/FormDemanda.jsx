import { useState } from 'react';

export default function FormDemanda({ onSubmit, loading, error }) {
  const [setor, setSetor] = useState('Geral');
  const [urgenciaMorador, setUrgenciaMorador] = useState('MEDIA');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      setor,
      urgencia_morador: urgenciaMorador,
      descricao
    });
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      {error && <div className="error-badge">{error}</div>}

      <div className="form-group">
        <label htmlFor="setor">Setor / Local do Problema</label>
        <select 
          id="setor" 
          value={setor} 
          onChange={(e) => setSetor(e.target.value)}
          disabled={loading}
          className="form-control"
        >
          <option value="Geral">Geral</option>
          <option value="Elétrica">Elétrica</option>
          <option value="Hidráulica">Hidráulica</option>
          <option value="Área Comum">Área Comum</option>
          <option value="Portaria">Portaria / Acesso</option>
          <option value="Elevadores">Elevadores</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="urgencia">Urgência Percebida</label>
        <select 
          id="urgencia" 
          value={urgenciaMorador} 
          onChange={(e) => setUrgenciaMorador(e.target.value)}
          disabled={loading}
          className="form-control"
        >
          <option value="BAIXA">Baixa</option>
          <option value="MEDIA">Média</option>
          <option value="ALTA">Alta</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="descricao">Descrição do Problema</label>
        <textarea
          id="descricao"
          rows="5"
          placeholder="Descreva a solicitação ou defeito com o máximo de detalhes..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          disabled={loading}
          className="form-control"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Cadastrando...' : 'Enviar Demanda'}
      </button>
    </form>
  );
}