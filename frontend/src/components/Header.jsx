import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificacoesBell from './NotificacoesBell';
const perfis = { MORADOR: 'Morador', OPERARIO: 'Operário', ADMINISTRADOR: 'Administrador' };
export default function Header() {
  const { user, logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [escuro, setEscuro] = useState(() => document.documentElement.dataset.theme === 'dark');
  const tipo = user?.tipo_usuario?.toUpperCase();
  const links = tipo === 'MORADOR' ? [['/dashboard','Visão geral'],['/minhas-demandas','Minhas demandas'],['/nova-demanda','Nova demanda'],['/ajuda','Ajuda']] : tipo === 'OPERARIO' ? [['/painel-operario','Minhas tarefas']] : [['/painel-admin','Visão geral']];
  function tema() { const novo = !escuro; setEscuro(novo); document.documentElement.dataset.theme = novo ? 'dark' : 'light'; localStorage.setItem('predial.tema', novo ? 'dark' : 'light'); }
  return <header className="app-header"><a href="#conteudo" className="skip-link">Pular para o conteúdo</a><div className="header-inner"><Link to="/" className="brand"><span className="brand-mark" aria-hidden="true">P<span>•</span></span><span>predial<span className="brand-caption">CUIDAR FAZ PARTE</span></span></Link><nav aria-label="Navegação principal" className={`main-nav ${aberto ? 'is-open' : ''}`}>{links.map(([to,label]) => <NavLink key={to} to={to} onClick={() => setAberto(false)} className={({isActive}) => isActive ? 'active' : ''}>{label}</NavLink>)}<NavLink to="/perfil" onClick={() => setAberto(false)}>Meu perfil</NavLink></nav><div className="header-actions"><button onClick={tema} className="icon-button" aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title="Alternar tema">{escuro ? '☀' : '☾'}</button><NotificacoesBell /><Link to="/perfil" className="user-chip"><span className="avatar">{user?.nome?.slice(0,1)}</span><span className="user-caption">{user?.nome?.split(' ')[0]}<small>{perfis[tipo]}</small></span></Link><button onClick={logout} className="logout-button">Sair</button><button className="icon-button menu-toggle" aria-label="Abrir navegação" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>☰</button></div></div>{user?.trocar_senha && <div className="password-notice">Sua conta utiliza uma senha conhecida. <Link to="/perfil">Crie uma senha exclusiva no seu perfil.</Link></div>}</header>;
}
