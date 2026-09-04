import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Loading from '../components/Loading';
import ModalChat from '../components/ModalChat';
import StatusBadge from '../components/StatusBadge';
import SlaTag, { slaAtrasado } from '../components/SlaTag';
import { demandaService } from '../services/demandaService';
import { montarUrlArquivo } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Alerta from '../components/Alerta';
import ModalShell from '../components/ModalShell';
import EmptyState from '../components/EmptyState';

const numeroOS = (id) => `OS-${String(id).padStart(4, '0')}`;

const URGENCIA_COR = {
  ALTA: 'bg-signal',
  MEDIA: 'bg-amber',
  BAIXA: 'bg-blueprint-bright',
};

export default function PainelOperario() {
  const { user } = useAuth();
  const [minhasTarefas, setMinhasTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const [tarefaChat, setTarefaChat] = useState(null);

  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [novoStatus, setNovoStatus] = useState('EM_ANDAMENTO');
  const [observacao, setObservacao] = useState('');

  const exibirMensagem = (texto, tipo = 'sucesso') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 4000);
  };

  const carregarTarefas = async () => {
    const idOperario = user?.usuario_id || user?.id;
    if (!idOperario) return;

    try {
      setLoading(true);
      const tarefas = await demandaService.buscarDemandasOperario(idOperario);
      setMinhasTarefas(Array.isArray(tarefas) ? tarefas : []);
    } catch (err) {
      console.error('Erro ao buscar ordens de serviço:', err);
      exibirMensagem('Erro ao carregar tarefas do operário.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTarefas();
  }, [user]);

  const handleAtualizarStatus = async (e) => {
    e.preventDefault();

    try {
      await demandaService.atualizarStatusOperario(tarefaSelecionada.id, {
        novo_status: novoStatus,
        motivo_impedimento: observacao,
        id_usuario: user?.usuario_id || user?.id,
      });

      exibirMensagem('Status da tarefa atualizado com sucesso!', 'sucesso');
      setTarefaSelecionada(null);
      setObservacao('');
      carregarTarefas();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      exibirMensagem('Erro ao atualizar status da tarefa.', 'erro');
    }
  };

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="border-b border-line pb-6">
          <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1.5">Painel do operário</p>
          <h1 className="text-xl font-semibold text-ink tracking-tight">
            Olá, {user?.nome?.split(' ')[0]}
          </h1>
          <p className="text-muted text-sm mt-1">
            Ordens de serviço atribuídas a você.
          </p>
        </div>

        {mensagem.texto && (
          <Alerta tipo={mensagem.tipo || 'sucesso'} onFechar={() => setMensagem({ texto: '', tipo: '' })}>
            {mensagem.texto}
          </Alerta>
        )}

        {loading ? (
          <Loading mensagem="Carregando suas tarefas..." />
        ) : minhasTarefas.length === 0 ? (
          <EmptyState eyebrow="Fila vazia">
            <p className="text-ink text-sm font-medium">
              Você não possui nenhuma tarefa pendente no momento.
            </p>
          </EmptyState>
        ) : (
          <div className="space-y-3.5">
            {minhasTarefas.map((tarefa) => {
              const urgencia = tarefa.urgencia_real || tarefa.urgencia_morador || 'BAIXA';
              const atrasada = slaAtrasado(tarefa);

              return (
                <article
                  key={tarefa.id}
                  className={`bg-panel border rounded-lg overflow-hidden flex transition-colors ${
                    atrasada ? 'border-signal/40' : 'border-line hover:border-line-soft'
                  }`}
                >
                  <div className={`w-1 shrink-0 ${URGENCIA_COR[urgencia] || 'bg-faint'}`} />

                  <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs text-blueprint-bright">{numeroOS(tarefa.id)}</span>
                        <span className="text-line">·</span>
                        <span className="text-sm font-medium text-ink">{tarefa.setor}</span>
                        {atrasada && (
                          <span className="font-mono text-[10px] text-signal border border-signal/30 bg-signal/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            SLA vencido
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted">
                        <span className="font-mono uppercase tracking-wider text-faint">Morador</span>{' '}
                        <span className="text-ink">{tarefa.morador?.nome || 'N/A'}</span>
                      </p>

                      {tarefa.foto_url && (
                        <a href={montarUrlArquivo(tarefa.foto_url)} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={montarUrlArquivo(tarefa.foto_url)}
                            alt={`Foto do problema - ${numeroOS(tarefa.id)}`}
                            className="w-full max-h-48 object-cover rounded-md border border-line hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}

                      <p className="text-sm text-ink/90 leading-relaxed bg-panel-2/60 p-3 rounded-md border border-line-soft">
                        {tarefa.descricao}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted flex-wrap">
                        <span>Urgência <span className="text-ink">{urgencia}</span></span>
                        <StatusBadge status={tarefa.status} />
                        {tarefa.sla_prazo && <SlaTag demanda={tarefa} />}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-stretch gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setTarefaChat(tarefa)}
                        className="bg-panel-2 hover:bg-line/60 text-ink font-medium text-xs px-4 py-2.5 rounded-md transition-colors border border-line cursor-pointer whitespace-nowrap"
                      >
                        Conversar
                      </button>

                      {tarefa.status !== 'CONCLUIDA' && (
                        <button
                          type="button"
                          className="bg-blueprint hover:bg-blueprint-bright text-white font-medium text-xs px-4 py-2.5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          onClick={() => {
                            setTarefaSelecionada(tarefa);
                            setNovoStatus(
                              tarefa.status === 'PENDENTE' ? 'EM_ANDAMENTO' : 'CONCLUIDA'
                            );
                          }}
                        >
                          Atualizar status
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* MODAL DE ATUALIZAÇÃO DE STATUS */}
        {tarefaSelecionada && (
          <ModalShell onClose={() => setTarefaSelecionada(null)}>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1">
                    {numeroOS(tarefaSelecionada.id)}
                  </p>
                  <h3 className="text-base font-semibold text-ink">Atualizar ordem de serviço</h3>
                  <p className="text-muted text-xs mt-1">{tarefaSelecionada.setor}</p>
                </div>

                <form onSubmit={handleAtualizarStatus} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="novo-status" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                      Novo status *
                    </label>
                    <select
                      id="novo-status"
                      className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors cursor-pointer"
                      value={novoStatus}
                      onChange={(e) => setNovoStatus(e.target.value)}
                      required
                    >
                      <option value="EM_ANDAMENTO">Em andamento</option>
                      <option value="CONCLUIDA">Concluída</option>
                      <option value="IMPEDIMENTO">Impedimento / aguardando material</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="observacao" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                      Observação / laudo técnico
                    </label>
                    <textarea
                      id="observacao"
                      className="w-full px-3.5 py-3 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors resize-y"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Ex: peça trocada com sucesso, ou aguardando compra de novo disjuntor..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink bg-panel-2 hover:bg-line/60 rounded-md transition-colors cursor-pointer"
                      onClick={() => setTarefaSelecionada(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-medium text-white bg-blueprint hover:bg-blueprint-bright rounded-md transition-colors cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
          </ModalShell>
        )}

      </main>

      {tarefaChat && (
        <ModalChat demanda={tarefaChat} onClose={() => setTarefaChat(null)} />
      )}
    </div>
  );
}
