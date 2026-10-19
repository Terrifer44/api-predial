import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import api, { lerSessao, salvarSessao } from '../services/api';
import { AuthContext } from './auth';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(lerSessao);
  const [loading, setLoading] = useState(() => Boolean(lerSessao()?.token));
  useEffect(() => {
    let ativo = true;
    const expirar = () => setUser(null);
    window.addEventListener('predial:sessao-expirada', expirar);
    const salvo = lerSessao();
    if (salvo?.token) api.get('/api/perfil').then(({ data }) => {
      if (ativo) { const atualizado = { ...salvo, ...data, usuario_id: data.id }; salvarSessao(atualizado); setUser(atualizado); }
    }).catch(() => { if (ativo) { salvarSessao(null); setUser(null); } }).finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; window.removeEventListener('predial:sessao-expirada', expirar); };
  }, []);
  const atualizarUser = (dados) => setUser((atual) => { const novo = { ...atual, ...dados }; salvarSessao(novo); return novo; });
  const login = async (codigo, senha) => { const dados = await authService.login(codigo, senha); salvarSessao(dados); setUser(dados); return dados; };
  const logout = () => { salvarSessao(null); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout, loading, atualizarUser }}>{children}</AuthContext.Provider>;
}
