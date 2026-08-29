import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NovaDemanda from '../pages/NovaDemanda';
import MinhasDemandas from '../pages/MinhasDemandas';
import PainelAdmin from '../pages/PainelAdmin';
import PainelOperario from '../pages/PainelOperario';
import NotFound from '../pages/NotFound';
import PrivateRoute from '../components/PrivateRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota Pública */}
      <Route path="/" element={<Login />} />

      {/* Rotas de Moradores */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute allowedRoles={['morador']}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/nova-demanda"
        element={
          <PrivateRoute allowedRoles={['morador']}>
            <NovaDemanda />
          </PrivateRoute>
        }
      />
      <Route
        path="/minhas-demandas"
        element={
          <PrivateRoute allowedRoles={['morador']}>
            <MinhasDemandas />
          </PrivateRoute>
        }
      />

      {/* Rota do Operário */}
      <Route
        path="/operario"
        element={
          <PrivateRoute allowedRoles={['operario']}>
            <PainelOperario />
          </PrivateRoute>
        }
      />

      {/* Rota do Administrador */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['administrador']}>
            <PainelAdmin />
          </PrivateRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}