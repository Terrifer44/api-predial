import { useState, useEffect, useRef, useCallback } from 'react';
import { demandaService } from '../services/demandaService';
import { useAuth } from '../hooks/useAuth';

export default function NotificacoesBell() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  const idUsuario = user?.usuario_id || user?.id;
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const carregarNotificacoes = useCallback(async () => {
    if (!idUsuario) return;
    try {
      const dados = await demandaService.buscarNotificacoes(idUsuario);
      setNotificacoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  }, [idUsuario]);

  useEffect(() => {
    carregarNotificacoes();
    const intervalo = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(intervalo);
  }, [carregarNotificacoes]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const handleMarcarTodasLidas = async () => {
    try {
      await demandaService.marcarTodasNotificacoesLidas(idUsuario);
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error('Erro ao marcar notificações como lidas:', err);
    }
  };

  const handleClicarNotificacao = async (notificacao) => {
    if (!notificacao.lida) {
      try {
        await demandaService.marcarNotificacaoLida(notificacao.id);
        setNotificacoes((prev) =>
          prev.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n))
        );
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    }
    setAberto(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center text-muted hover:text-ink hover:bg-panel-2 rounded-md transition-colors cursor-pointer"
        aria-label="Notificações"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 bg-signal text-white text-[9px] font-mono font-semibold rounded-full">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-panel border border-line rounded-lg shadow-2xl z-50 custom-scrollbar">
          <div className="flex items-center justify-between p-3.5 border-b border-line">
            <h4 className="text-xs font-mono font-medium text-muted uppercase tracking-wider">Notificações</h4>
            {naoLidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLidas}
                className="text-[11px] text-blueprint-bright hover:text-ink font-medium cursor-pointer"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notificacoes.length === 0 ? (
            <p className="text-faint text-xs text-center py-8 px-4">
              Nenhuma notificação por aqui ainda.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClicarNotificacao(n)}
                    className={`w-full text-left p-3.5 hover:bg-panel-2/60 transition-colors cursor-pointer ${
                      !n.lida ? 'bg-blueprint/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lida && <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blueprint-bright shrink-0" />}
                      <div className={n.lida ? 'pl-3.5' : ''}>
                        <p className="text-xs font-medium text-ink">{n.titulo}</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.mensagem}</p>
                        <p className="text-[10px] font-mono text-faint mt-1">
                          {new Date(n.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
