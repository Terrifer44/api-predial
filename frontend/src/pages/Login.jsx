import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Alerta from '../components/Alerta';

export default function Login() {
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const user = await login(codigoAcesso, senha);
      const tipo = (user?.tipo_usuario || user?.tipo || '').toLowerCase();

      if (tipo === 'administrador' || tipo === 'admin') {
        navigate('/painel-admin');
      } else if (tipo === 'operario') {
        navigate('/painel-operario');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Erro ao tentar logar:', err);
      setErro(err.response?.data?.erro || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite bg-blueprint-grid flex flex-col justify-center items-center p-4 sm:p-6">

      <div className="w-full max-w-sm">

        {/* MARCA */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <span className="w-11 h-11 flex items-center justify-center rounded-md border border-line bg-panel text-blueprint-bright font-mono font-semibold text-lg">
            P
          </span>
          <div className="text-center">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Sistema de Manutenção Predial</h1>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mt-0.5">Acesso operacional</p>
          </div>
        </div>

        {/* CARD DE AUTENTICAÇÃO */}
        <div className="bg-panel border border-line rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
          <div className="h-[3px] bg-blueprint" />

          <div className="p-6 sm:p-7 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-ink">Entrar</h2>
              <p className="text-xs text-muted mt-0.5">Informe seu código de acesso e senha.</p>
            </div>

            {erro && <Alerta tipo="erro">{erro}</Alerta>}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1.5">
                <label htmlFor="codigoAcesso" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                  Código de acesso
                </label>
                <input
                  id="codigoAcesso"
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm font-mono transition-colors uppercase disabled:opacity-50"
                  value={codigoAcesso}
                  onChange={(e) => setCodigoAcesso(e.target.value.toUpperCase())}
                  placeholder="MOR123"
                  required
                  disabled={carregando}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="senha" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors disabled:opacity-50"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={carregando}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-blueprint hover:bg-blueprint-bright text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 mt-1"
              >
                {carregando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  'Entrar'
                )}
              </button>

              <div className="text-center">
                <Link to="/esqueci-senha" className="text-xs text-muted hover:text-blueprint-bright transition-colors">
                  Esqueci minha senha
                </Link>
              </div>
            </form>
          </div>

          <div className="ticket-tear px-6 sm:px-7 py-4 text-center text-xs text-muted bg-panel-2/40">
            É um novo morador?{' '}
            <Link to="/cadastro" className="font-medium text-blueprint-bright hover:text-blueprint transition-colors">
              Cadastrar-se com código
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
