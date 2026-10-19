import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Alerta from '../components/Alerta';
export default function Login() {
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  async function entrar(e) {
    e.preventDefault(); if (ocupado) return; setErro(''); setOcupado(true);
    try { const u = await login(codigo, senha); const tipo = u.tipo_usuario.toUpperCase(); navigate(tipo === 'ADMINISTRADOR' ? '/painel-admin' : tipo === 'OPERARIO' ? '/painel-operario' : '/dashboard'); }
    catch (e) { setErro(e.response?.data?.erro || 'Não foi possível conectar. Confira sua conexão e tente novamente.'); }
    finally { setOcupado(false); }
  }
  return <div className="login-layout"><section className="login-story"><Link className="brand" to="/login"><span className="brand-mark">P<span>•</span></span><span>predial<span className="brand-caption">CUIDAR FAZ PARTE</span></span></Link><div className="story-copy"><span className="eyebrow">GESTÃO DE MANUTENÇÃO PREDIAL</span><h1>Um lugar melhor<br/>{' '}começa com<br/>{' '}<em>cuidado.</em></h1><p>Do primeiro chamado ao último reparo.<br/>Tudo conectado, para você viver melhor.</p></div><div className="building-scene" aria-hidden="true"><div className="building building-back"/><div className="building building-front"/><div className="scene-label"><span className="status-dot"/> Cuidado em cada detalhe</div><div className="scene-ground"/></div><p className="story-footer">Organização para a equipe. Tranquilidade para todos.</p></section><main className="login-main" id="conteudo"><div className="login-form-wrap"><span className="eyebrow text-blueprint">SEU ESPAÇO, BEM CUIDADO</span><h2>Bom ter você aqui.</h2><p className="text-muted">Acesse sua conta para acompanhar o que acontece no seu prédio.</p>{erro && <Alerta tipo="erro">{erro}</Alerta>}<form onSubmit={entrar} className="space-y-5 mt-8"><label className="field-label" htmlFor="codigo">Código de acesso<input className="field-input" id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex.: MOR001" autoComplete="username" maxLength={32} required disabled={ocupado}/></label><label className="field-label" htmlFor="senha">Senha<span className="password-field"><input className="field-input" id="senha" type={visivel ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" placeholder="Sua senha" required disabled={ocupado}/><button type="button" onClick={() => setVisivel(!visivel)} aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}>{visivel ? 'Ocultar' : 'Mostrar'}</button></span></label><div className="text-right"><Link to="/esqueci-senha" className="text-blueprint text-sm font-medium">Esqueci minha senha</Link></div><button type="submit" className="primary-button w-full" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Acessar minha conta'}<span aria-hidden="true">→</span></button></form><div className="signup-note"><span>Ainda não tem acesso?</span><Link to="/cadastro">Cadastre-se com seu código de liberação →</Link></div><p className="login-help">Precisa de um código? Entre em contato com a administração do seu prédio.</p></div><footer className="login-footer">Predial · Manutenção mais próxima de você.</footer></main></div>;
}

