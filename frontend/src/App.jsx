import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import Loading from './components/Loading';
import Perfil from './pages/Perfil';
import NotFound from './pages/NotFound';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovaDemanda from './pages/NovaDemanda';
import MinhasDemandas from './pages/MinhasDemandas';
import PainelAdmin from './pages/PainelAdmin';
import PainelOperario from './pages/PainelOperario';
import Ajuda from './pages/Ajuda';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';

/**
 * Função utilitária para capturar o perfil do usuário independente de onde ele venha
 */
const obterTipoUsuario = (user) => {
  return (user?.tipo_usuario || user?.tipo || '').toUpperCase();
};

/**
 * Redireciona o usuário autenticado para a sua tela principal padrão de acordo com o perfil.
 * Sem usuário válido (ex.: logo após logout), manda para o login — nunca para uma rota
 * protegida, senão o guard daquela rota tentaria redirecionar de novo, em loop.
 */
const obterRotaInicial = (user) => {
  const tipo = obterTipoUsuario(user);
  if (tipo === 'ADMINISTRADOR' || tipo === 'ADMIN') return '/painel-admin';
  if (tipo === 'OPERARIO') return '/painel-operario';
  if (tipo === 'MORADOR') return '/dashboard';
  return '/login';
};

// ==========================================
// PROTETORES DE ROTAS
// ==========================================

function RotaPublica({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading mensagem="Carregando aplicação..." />;
  if (user) return <Navigate to={obterRotaInicial(user)} replace />;
  return children;
}

function RotaMorador({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading mensagem="Verificando credenciais..." />;

  const tipo = obterTipoUsuario(user);
  if (!user || tipo !== 'MORADOR') {
    return <Navigate to={obterRotaInicial(user)} replace />;
  }
  return children;
}

function RotaAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading mensagem="Verificando credenciais..." />;

  const tipo = obterTipoUsuario(user);
  if (!user || (tipo !== 'ADMINISTRADOR' && tipo !== 'ADMIN')) {
    return <Navigate to={obterRotaInicial(user)} replace />;
  }
  return children;
}

function RotaOperario({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading mensagem="Verificando credenciais..." />;

  const tipo = obterTipoUsuario(user);
  if (!user || tipo !== 'OPERARIO') {
    return <Navigate to={obterRotaInicial(user)} replace />;
  }
  return children;
}

// ==========================================
// ROTEAMENTO PRINCIPAL
// ==========================================

function RotaAutenticada({ children }) { const {user,loading}=useAuth(); if(loading)return <Loading/>; return user ? children : <Navigate to="/login" replace/>; }
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/perfil" element={<RotaAutenticada><Perfil/></RotaAutenticada>}/>
          {/* Rotas Públicas */}
          <Route
            path="/login"
            element={
              <RotaPublica>
                <Login />
              </RotaPublica>
            }
          />
          <Route
            path="/cadastro"
            element={
              <RotaPublica>
                <Cadastro />
              </RotaPublica>
            }
          />
          <Route
            path="/esqueci-senha"
            element={
              <RotaPublica>
                <EsqueciSenha />
              </RotaPublica>
            }
          />
          {/* Redefinir senha fica acessível mesmo logado, pois o link vem do e-mail */}
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          {/* Redirecionamento da Raiz */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rotas de Morador (exigem tipo_usuario === MORADOR, não apenas estar logado) */}
          <Route
            path="/dashboard"
            element={
              <RotaMorador>
                <Dashboard />
              </RotaMorador>
            }
          />
          <Route
            path="/nova-demanda"
            element={
              <RotaMorador>
                <NovaDemanda />
              </RotaMorador>
            }
          />
          <Route
            path="/minhas-demandas"
            element={
              <RotaMorador>
                <MinhasDemandas />
              </RotaMorador>
            }
          />
          <Route
            path="/ajuda"
            element={
              <RotaMorador>
                <Ajuda />
              </RotaMorador>
            }
          />

          {/* Rota do Operário */}
          <Route
            path="/painel-operario"
            element={
              <RotaOperario>
                <PainelOperario />
              </RotaOperario>
            }
          />

          {/* Rota do Administrador */}
          <Route
            path="/painel-admin"
            element={
              <RotaAdmin>
                <PainelAdmin />
              </RotaAdmin>
            }
          />

          {/* Rota Not Found (404 / Desconhecida) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}