import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carrega o usuário salvo ao abrir/recarregar a página
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo && localStorage.getItem('token')) {
      try {
        setUser(JSON.parse(usuarioSalvo));
      } catch (e) {
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = async (codigo_acesso, senha) => {
    // 1. Faz o login no backend
    const dadosUsuario = await authService.login(codigo_acesso, senha);

    // 2. Token retornado pelo servidor e dados públicos do usuário.
    if (!dadosUsuario?.token) throw new Error('A API não retornou uma sessão válida.');
    localStorage.setItem('token', dadosUsuario.token);
    setUser(dadosUsuario);
    localStorage.setItem('usuario', JSON.stringify(dadosUsuario));

    // 3. RETORNO OBRIGATÓRIO para o Login.jsx conseguir ler o tipo_usuario
    return dadosUsuario;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}