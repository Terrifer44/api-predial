import { useState, useEffect, useRef, useCallback } from 'react';
import { demandaService } from '../services/demandaService';
import { useAuth } from '../hooks/useAuth';

export default function ModalChat({ demanda, onClose }) {
  const { user } = useAuth();
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimListaRef = useRef(null);

  const idUsuarioAtual = user?.usuario_id || user?.id;

  const carregarMensagens = useCallback(async () => {
    try {
      const dados = await demandaService.buscarComentarios(demanda.id);
      setMensagens(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setErro('Não foi possível carregar as mensagens.');
    } finally {
      setCarregando(false);
    }
  }, [demanda.id]);

  useEffect(() => {
    carregarMensagens();
    const intervalo = setInterval(carregarMensagens, 8000);
    return () => clearInterval(intervalo);
  }, [carregarMensagens]);

  useEffect(() => {
    fimListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    try {
      setEnviando(true);
      setErro('');
      const nova = await demandaService.enviarComentario(demanda.id, {
        id_usuario: idUsuarioAtual,
        mensagem: texto.trim(),
      });
      setMensagens((prev) => [...prev, nova]);
      setTexto('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setErro('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-graphite/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

        <div className="h-[3px] bg-blueprint shrink-0" />

        <div className="flex items-center justify-between p-5 border-b border-line shrink-0">
          <div>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-0.5">
              OS-{String(demanda.id).padStart(4, '0')}
            </p>
            <h3 className="text-sm font-semibold text-ink">{demanda.setor}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink text-sm leading-none cursor-pointer w-7 h-7 flex items-center justify-center rounded-md hover:bg-panel-2 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] custom-scrollbar">
          {carregando ? (
            <p className="text-muted text-sm text-center py-8 font-mono text-xs uppercase tracking-wider">Carregando...</p>
          ) : mensagens.length === 0 ? (
            <p className="text-faint text-sm text-center py-8">
              Nenhuma mensagem ainda. Envie a primeira.
            </p>
          ) : (
            mensagens.map((msg) => {
              const propria = msg.id_usuario === idUsuarioAtual;
              return (
                <div key={msg.id} className={`flex ${propria ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-md px-3.5 py-2.5 text-sm border ${
                      propria
                        ? 'bg-blueprint/15 border-blueprint/30 text-ink'
                        : 'bg-panel-2 border-line-soft text-ink'
                    }`}
                  >
                    {!propria && (
                      <p className="text-[10px] font-mono font-medium uppercase tracking-wider mb-1 text-blueprint-bright">
                        {msg.usuario?.nome || 'Usuário'}
                      </p>
                    )}
                    <p className="leading-relaxed whitespace-pre-line">{msg.mensagem}</p>
                    <p className="text-[10px] font-mono mt-1.5 text-faint">
                      {new Date(msg.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={fimListaRef} />
        </div>

        {erro && (
          <div className="px-4 pb-1 shrink-0">
            <p className="text-signal text-xs">{erro}</p>
          </div>
        )}

        <form onSubmit={handleEnviar} className="p-4 border-t border-line flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: Posso ir às 14h?"
            className="flex-1 px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="bg-blueprint hover:bg-blueprint-bright disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-md transition-colors text-sm cursor-pointer whitespace-nowrap"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
