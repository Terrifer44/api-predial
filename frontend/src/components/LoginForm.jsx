import { useState } from 'react';

export default function LoginForm({ onSubmit, loading, error }) {
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(codigoAcesso, senha);
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Acesso ao Sistema</h2>
      <p className="subtitle">Digite suas credenciais para continuar</p>

      {error && (
        <div className="error-badge" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="codigo">Código de Acesso</label>
        <input
          id="codigo"
          type="text"
          className="form-control"
          placeholder="Ex: MOR123 ou ADM001"
          value={codigoAcesso}
          onChange={(e) => setCodigoAcesso(e.target.value)}
          required
          disabled={loading}
          autoComplete="username"
        />
      </div>

      <div className="form-group">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          className="form-control"
          placeholder="••••••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Autenticando...' : 'Entrar'}
      </button>
    </form>
  );
}