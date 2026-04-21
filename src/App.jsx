import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context.jsx';
import { Layout } from './components/layout/Layout.jsx';
import { RequireAuth } from './components/layout/RequireAuth.jsx';
import { RequireAdmin } from './components/layout/RequireAdmin.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CambiarPinPage from './pages/CambiarPinPage.jsx';
import ScanPage from './pages/ScanPage.jsx';
import ConferenciasPage from './pages/ConferenciasPage.jsx';
import ConferenciaDetailPage from './pages/ConferenciaDetailPage.jsx';
import AdminUsuariosPage from './pages/AdminUsuariosPage.jsx';
import AbrirSesionPage from './components/sesion/AbrirSesionPage.jsx';
import UploadPlanillaPage from './components/sesion/UploadPlanillaPage.jsx';
import IdentificarSinBotonPage from './components/sesion/IdentificarSinBotonPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/cambiar-pin"
          element={
            <RequireAuth>
              <CambiarPinPage />
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route index element={<HomePage />} />
                  <Route path="scan" element={<ScanPage />} />
                  <Route path="conferencias" element={<ConferenciasPage />} />
                  <Route path="conferencias/:guia_nro" element={<ConferenciaDetailPage />} />
                  <Route path="guias/:guia_nro/abrir" element={<AbrirSesionPage />} />
                  <Route path="guias/:guia_nro/upload" element={<UploadPlanillaPage />} />
                  <Route path="guias/:guia_nro/sin-boton" element={<IdentificarSinBotonPage />} />
                  <Route
                    path="admin/usuarios"
                    element={
                      <RequireAdmin>
                        <AdminUsuariosPage />
                      </RequireAdmin>
                    }
                  />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
