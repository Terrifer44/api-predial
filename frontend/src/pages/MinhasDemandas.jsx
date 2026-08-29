import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Loading from '../components/Loading';
import ModalChat from '../components/ModalChat';
import StatusBadge from '../components/StatusBadge';
import SlaTag, { slaAtrasado } from '../components/SlaTag';
import { demandaService } from '../services/demandaService';
import { montarUrlArquivo } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

const numeroOS = (id) => `OS-${String(id).padStart(4, '0')}`;

export default function MinhasDemandas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [demandaChat, setDemandaChat] = useState(null);

  useEffect(() => {
    const carregarDemandas = async () => {
      try {
        setErro('');
        const idMorador = user?.usuario_id || user?.id;
        const dados = await demandaService.buscarDemandasMorador(idMorador);
        setDemandas(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error('Erro ao buscar demandas do morador:', error);
        setErro('Erro ao carregar o histórico de solicitações.');
      } finally {
        setLoading(false);
      }
    };

    if (user) carregarDemandas();
  }, [user]);

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-3.5 py-2 text-xs font-medium text-muted bg-panel hover:bg-panel-2 border border-line rounded-md transition-colors cursor-pointer shrink-0"
            >
              ← Voltar
            </button>
            <div>
              <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-0.5">Histórico</p>
              <h1 className="text-xl font-semibold text-ink tracking-tight">Minhas solicitações</h1>
            </div>
          </div>

          <Link
            to="/nova-demanda"
            className="inline-flex items-center justify-center gap-1.5 bg-blueprint hover:bg-blueprint-bright text-white font-medium px-4 py-2.5 rounded-md transition-colors text-sm shrink-0"
          >
            + Nova demanda
          </Link>
        </div>

        {erro && (
          <div className="bg-signal/10 border border-signal/30 text-signal text-sm p-3.5 rounded-md font-medium flex items-center gap-2.5" role="alert">
            <span className="font-mono font-bold">!</span>
            <span>{erro}</span>
          </div>
        )}

        {loading ? (
          <Loading mensagem="Carregando suas solicitações..." />
        ) : demandas.length === 0 ? (
          <div className="bg-panel border border-dashed border-line rounded-lg p-12 text-center space-y-3">
            <p className="font-mono text-xs text-faint uppercase tracking-wider">Nenhum registro</p>
            <h3 className="text-base font-semibold text-ink">Nenhuma solicitação encontrada</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              Você ainda não fez nenhuma solicitação de manutenção. Se precisar de reparos, abra um novo chamado.
            </p>
            <div className="pt-2">
              <Link
                to="/nova-demanda"
                className="inline-block bg-panel-2 hover:bg-line text-ink text-xs font-medium px-4 py-2 rounded-md transition-colors border border-line"
              >
                Criar primeira demanda
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {demandas.map((demanda) => {
              const statusAtual = demanda.status_atual || demanda.status || 'PENDENTE';
              const atrasada = slaAtrasado(demanda);

              return (
                <article
                  key={demanda.id}
                  className={`bg-panel border rounded-lg overflow-hidden flex transition-colors ${
                    atrasada ? 'border-signal/40' : 'border-line hover:border-line-soft'
                  }`}
                >
                  {/* faixa lateral de status, como uma aba de pasta física */}
                  <div className={`w-1 shrink-0 ${statusAtual === 'CONCLUIDA' ? 'bg-moss' : atrasada ? 'bg-signal' : statusAtual === 'PENDENTE' ? 'bg-amber' : 'bg-blueprint-bright'}`} />

                  <div className="flex-1 min-w-0 p-5 sm:p-6 space-y-4">

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-blueprint-bright">{numeroOS(demanda.id)}</span>
                        <span className="text-line">·</span>
                        <span className="text-sm font-medium text-ink">{demanda.setor}</span>
                      </div>
                      <StatusBadge status={statusAtual} />
                    </div>

                    {demanda.foto_url && (
                      <a href={montarUrlArquivo(demanda.foto_url)} target="_blank" rel="noopener noreferrer">
                        <img
                          src={montarUrlArquivo(demanda.foto_url)}
                          alt={`Foto anexada à demanda ${numeroOS(demanda.id)}`}
                          className="w-full max-h-56 object-cover rounded-md border border-line hover:opacity-90 transition-opacity"
                        />
                      </a>
                    )}

                    <p className="text-ink/90 text-sm leading-relaxed whitespace-pre-line">
                      {demanda.descricao}
                    </p>

                    {demanda.observacao_operario && (
                      <div className="bg-amber/10 border border-amber/20 text-amber p-3 rounded-md space-y-1">
                        <span className="font-mono font-semibold block text-[10px] uppercase tracking-wider">
                          Observação técnica do operário
                        </span>
                        <p className="text-xs leading-relaxed text-amber/90">
                          {demanda.observacao_operario}
                        </p>
                      </div>
                    )}

                    <div className="ticket-tear pt-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
                        <span>Urgência <span className="text-ink">{demanda.urgencia_morador || 'MEDIA'}</span></span>
                        {demanda.sla_prazo && <SlaTag demanda={demanda} />}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDemandaChat(demanda)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blueprint-bright hover:text-ink bg-panel-2 hover:bg-line/60 border border-line px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                      >
                        Conversar sobre esta demanda
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </main>

      {demandaChat && (
        <ModalChat demanda={demandaChat} onClose={() => setDemandaChat(null)} />
      )}
    </div>
  );
}
