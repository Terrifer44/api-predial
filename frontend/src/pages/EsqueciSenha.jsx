import { useState } from 'react';
import { Link } from 'react-router-dom';
import { demandaService } from '../services/demandaService';
import FormField from '../components/FormField';
import Alerta from '../components/Alerta';

export default function EsqueciSenha() {
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      setCarregando(true);
      await demandaService.esqueciSenha(codigoAcesso.toUpperCase().trim());
      setEnviado(true);
    } catch (err) {
      console.error('Erro ao solicitar recuperação de senha:', err);
      setErro(err.response?.data?.erro || 'Erro ao solicitar recuperação de senha.');
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
            <h1 className="text-sm font-semibold text-ink tracking-tight">Recuperação de senha</h1>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mt-0.5">Redefinição por e-mail</p>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
          <div className="h-[3px] bg-blueprint" />

          <div className="p-6 sm:p-7 space-y-5">
            <p className="text-xs text-muted -mt-1">
              Informe seu código de acesso. Se houver um e-mail cadastrado, enviaremos um link para redefinir sua senha.
            </p>

            {erro && <Alerta tipo="erro">{erro}</Alerta>}

            {enviado ? (
              <Alerta tipo="sucesso">
                Se o código existir e tiver um e-mail cadastrado, um link de redefinição foi enviado. Verifique sua caixa de entrada.
              </Alerta>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  id="codigoAcesso"
                  label="Código de acesso"
                  mono
                  value={codigoAcesso}
                  onChange={(e) => setCodigoAcesso(e.target.value.toUpperCase())}
                  placeholder="MOR123"
                  required
                  disabled={carregando}
                />

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full bg-blueprint hover:bg-blueprint-bright text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 mt-1"
                >
                  {carregando ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </button>
              </form>
            )}
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
