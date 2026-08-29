import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import NotificacoesBell from './NotificacoesBell';

const ROTULOS_PERFIL = {
  MORADOR: 'Morador',
  OPERARIO: 'Operário',
  ADMINISTRADOR: 'Administrador',
  ADMIN: 'Administrador',
};

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tipoUsuario = (user?.tipo_usuario || user?.tipo || '').toUpperCase();

  const linkClasse = (path) =>
    `text-[13px] font-medium tracking-wide transition-colors px-3 py-1.5 rounded-md border ${
      location.pathname === path
        ? 'bg-panel-2 text-ink border-line'
        : 'text-muted border-transparent hover:text-ink hover:bg-panel-2/60'
    }`;

  return (
    <header className="bg-panel border-b border-line sticky top-0 z-40 text-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* MARCA */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-8 h-8 flex items-center justify-center rounded-md border border-line bg-panel-2 text-blueprint-bright font-mono font-semibold text-sm group-hover:border-blueprint transition-colors">
              P
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-semibold text-[13px] text-ink tracking-tight">Predial</span>
              <span className="text-[10px] text-faint font-mono uppercase tracking-wider">Gestão de manutenção</span>
            </span>
          </Link>

          {user && (
            <div className="hidden lg:flex items-center gap-2 border-l border-line pl-3 ml-1 text-xs text-muted min-w-0">
              <span className="truncate">
                <strong className="text-ink font-medium">{user.nome}</strong>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-line text-blueprint-bright uppercase tracking-wider shrink-0">
                {ROTULOS_PERFIL[tipoUsuario] || tipoUsuario || '—'}
              </span>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          {tipoUsuario === 'MORADOR' && (
            <>
              <Link to="/minhas-demandas" className={linkClasse('/minhas-demandas')}>
                Minhas demandas
              </Link>
              <Link to="/nova-demanda" className={linkClasse('/nova-demanda')}>
                Nova demanda
              </Link>
              <Link to="/ajuda" className={linkClasse('/ajuda')}>
                Ajuda
              </Link>
            </>
          )}

          {tipoUsuario === 'OPERARIO' && (
            <Link to="/painel-operario" className={linkClasse('/painel-operario')}>
              Minhas tarefas
            </Link>
          )}

          {(tipoUsuario === 'ADMIN' || tipoUsuario === 'ADMINISTRADOR') && (
            <Link to="/painel-admin" className={linkClasse('/painel-admin')}>
              Painel administrativo
            </Link>
          )}

          {user && (
            <div className="flex items-center gap-1.5 pl-1.5 ml-1 border-l border-line">
              <NotificacoesBell />
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-[13px] font-medium text-muted hover:text-signal border border-transparent hover:border-signal/30 hover:bg-signal/5 rounded-md transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          )}
        </nav>

      </div>
    </header>
  );
}
