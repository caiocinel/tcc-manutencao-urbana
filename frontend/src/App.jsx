// Componente raiz - Configura autenticação e rotas da aplicação
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import MapPage from './pages/MapPage';
import CreateDefect from './pages/CreateDefect';
import DefectList from './pages/DefectList';

function App() {
  return (
    // AuthProvider gerencia o estado de login em toda a árvore
    <AuthProvider>
      {/* BrowserRouter habilita navegação SPA com histórico */}
      <BrowserRouter>
        <Routes>
          {/* Páginas da aplicação */}
          <Route path="/" element={<MapPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/criar" element={<CreateDefect />} />
          <Route path="/lista" element={<DefectList />} />
          {/* Rota curinga: redireciona para o mapa */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
