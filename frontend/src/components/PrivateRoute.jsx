import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from './Loading';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading mensagem="Verificando permissões..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Normaliza o tipo de usuário para Caixa Alta para bater com allowedRoles
  const tipoUsuario = (user?.tipo_usuario || user?.tipo || '').toUpperCase();

  // Se houver restrição de roles e o tipo do usuário não estiver incluído
  if (allowedRoles && allowedRoles.length > 0) {
    const rolesFormatadas = allowedRoles.map((role) => role.toUpperCase());

    if (!rolesFormatadas.includes(tipoUsuario)) {
      // Redireciona de acordo com o perfil
      const eAdmin = tipoUsuario === 'ADMIN' || tipoUsuario === 'ADMINISTRADOR';
      const eOperario = tipoUsuario === 'OPERARIO';

      if (eAdmin) return <Navigate to="/painel-admin" replace />;
      if (eOperario) return <Navigate to="/painel-operario" replace />;
      
      return <Navigate to="/minhas-demandas" replace />;
    }
  }

  return children;
}