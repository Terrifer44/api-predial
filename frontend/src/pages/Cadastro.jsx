import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { demandaService } from '../services/demandaService';
import FormField from '../components/FormField';

export default function Cadastro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    codigo_liberacao: '',
    nome: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const valorProcessado = name === 'codigo_liberacao' ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: valorProcessado }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (formData.senha !== formData.confirmarSenha) {
      setErro('As senhas digitadas não conferem.');
      return;
    }

    if (formData.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setCarregando(true);
      await demandaService.cadastrarMorador({
        codigo_liberacao: formData.codigo_liberacao,
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        senha: formData.senha,
      });

      setSucesso('Conta criada com sucesso! Redirecionando para o login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao realizar cadastro.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite bg-blueprint-grid flex flex-col justify-center items-center p-4 sm:p-6 py-12">

      <div className="w-full max-w-md">

        <div className="flex flex-col items-center gap-3 mb-7">
          <span className="w-11 h-11 flex items-center justify-center rounded-md border border-line bg-panel text-blueprint-bright font-mono font-semibold text-lg">
            P
          </span>
          <div className="text-center">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Cadastro de morador</h1>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mt-0.5">Requer código de liberação</p>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
          <div className="h-[3px] bg-blueprint" />

          <div className="p-6 sm:p-7 space-y-5">
            <p className="text-xs text-muted -mt-1">
              Insira o código fornecido pela administração para criar sua conta.
            </p>

            {erro && (
              <div className="bg-signal/10 border border-signal/30 text-signal text-xs p-3 rounded-md font-medium flex items-start gap-2" role="alert">
                <span className="font-mono font-bold shrink-0">!</span>
                <span className="flex-1">{erro}</span>
              </div>
            )}

            {sucesso && (
              <div className="bg-moss/10 border border-moss/30 text-moss text-xs p-3 rounded-md font-medium flex items-start gap-2" role="status">
                <span className="font-mono font-bold shrink-0">✓</span>
                <span className="flex-1">{sucesso}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                id="codigo_liberacao"
                label="Código de liberação *"
                mono
                value={formData.codigo_liberacao}
                onChange={handleChange}
                placeholder="LIB123"
                required
                disabled={carregando}
              />

              <FormField
                id="nome"
                label="Nome completo *"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
                disabled={carregando}
                autoComplete="name"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="telefone"
                  label="Telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(79) 99999-9999"
                  disabled={carregando}
                  autoComplete="tel"
                />

                <FormField
                  id="email"
                  label="E-mail"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="voce@exemplo.com"
                  disabled={carregando}
                  autoComplete="email"
                />
              </div>
              <p className="text-[11px] text-faint -mt-3">
                O e-mail é usado para notificações de atendimento e recuperação de senha.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="senha"
                  label="Senha *"
                  type="password"
                  value={formData.senha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={carregando}
                  autoComplete="new-password"
                />

                <FormField
                  id="confirmarSenha"
                  label="Confirmar senha *"
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={carregando}
                  autoComplete="new-password"
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
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  'Criar minha conta'
                )}
              </button>
            </form>
          </div>

          <div className="ticket-tear px-6 sm:px-7 py-4 text-center text-xs text-muted bg-panel-2/40">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-blueprint-bright hover:text-blueprint transition-colors">
              Fazer login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
