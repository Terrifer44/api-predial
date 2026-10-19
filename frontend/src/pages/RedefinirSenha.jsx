import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { demandaService } from '../services/demandaService';
import FormField from '../components/FormField';
import Alerta from '../components/Alerta';
import { useAuth } from '../hooks/useAuth';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!token) {
      setErro('Link inválido. Solicite uma nova recuperação de senha.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas digitadas não conferem.');
      return;
    }
    if (novaSenha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres com letras e números.');
      return;
    }

    try {
      setCarregando(true);
      await demandaService.redefinirSenha(token, novaSenha);
      logout();
      setSucesso('Senha redefinida com sucesso! Redirecionando para o login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Erro ao redefinir senha:', err);
      setErro(err.response?.data?.erro || 'Erro ao redefinir senha. O link pode ter expirado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite bg-blueprint-grid flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center gap-3 mb-7">
          <span className="w-11 h-11 flex items-center justify-center rounded-md border border-line bg-panel text-blueprint-bright font-mono font-semibold text-lg">
            P
          </span>
          <div className="text-center">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Redefinir senha</h1>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mt-0.5">Nova credencial de acesso</p>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
          <div className="h-[3px] bg-blueprint" />

          <div className="p-6 sm:p-7 space-y-5">

            {!token && (
              <Alerta tipo="aviso">
                Link inválido ou incompleto. Solicite novamente em{' '}
                <Link to="/esqueci-senha" className="underline">Esqueci minha senha</Link>.
              </Alerta>
            )}

            {erro && <Alerta tipo="erro">{erro}</Alerta>}
            {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                id="novaSenha"
                label="Nova senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                required
                disabled={carregando || !token}
                autoComplete="new-password"
              />

              <FormField
                id="confirmarSenha"
                label="Confirme a nova senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                required
                disabled={carregando || !token}
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={carregando || !token}
                className="w-full bg-blueprint hover:bg-blueprint-bright text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 mt-1"
              >
                {carregando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>
          </div>

          <div className="ticket-tear px-6 sm:px-7 py-4 text-center text-xs text-muted bg-panel-2/40">
            <Link to="/login" className="font-medium text-blueprint-bright hover:text-blueprint transition-colors">
              ← Voltar ao login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
