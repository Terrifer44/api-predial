import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import { demandaService } from '../services/demandaService';
import { montarUrlArquivo } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const numeroOS = (id) => `OS-${String(id).padStart(4, '0')}`;

export default function PainelAdmin() {
  const { user } = useAuth();
  const [demandas, setDemandas] = useState([]);
  const [operarios, setOperarios] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const [novoCodigo, setNovoCodigo] = useState('');
  const [tipoPerfil, setTipoPerfil] = useState('MORADOR');

  const [gerandoRelatorio, setGerandoRelatorio] = useState('');
  const hoje = new Date();
  const [filtroMes, setFiltroMes] = useState(String(hoje.getMonth() + 1));
  const [filtroAno, setFiltroAno] = useState(String(hoje.getFullYear()));

  const [demandaSelecionada, setDemandaSelecionada] = useState(null);
  const [idOperario, setIdOperario] = useState('');
  const [urgenciaReal, setUrgenciaReal] = useState('MEDIA');

  const exibirMensagem = (texto, tipo = 'sucesso') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 4000);
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaDemandas, listaOperarios, listaCodigos, listaUsuarios] = await Promise.all([
        demandaService.buscarDemandas(),
        demandaService.buscarOperarios(),
        demandaService.buscarCodigosLiberacao(),
        demandaService.buscarUsuarios(),
      ]);
      setDemandas(Array.isArray(listaDemandas) ? listaDemandas : []);
      setOperarios(Array.isArray(listaOperarios) ? listaOperarios : []);
      setCodigos(Array.isArray(listaCodigos) ? listaCodigos : []);
      setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
    } catch (err) {
      console.error('Erro ao carregar painel:', err);
      exibirMensagem('Erro ao carregar dados do painel.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const totalPendentes = demandas.filter((d) => d.status === 'PENDENTE').length;
  const totalAndamento = demandas.filter(
    (d) => d.status === 'EM_ANDAMENTO' || d.status === 'ATRIBUIDA'
  ).length;
  const totalConcluidas = demandas.filter((d) => d.status === 'CONCLUIDA').length;
  const totalImpedidas = demandas.filter((d) => d.status === 'IMPEDIMENTO').length;

  const ROTULO_PERFIL = { MORADOR: 'Morador', OPERARIO: 'Operário', ADMINISTRADOR: 'Administrador' };

  const handleGerarCodigo = async (e) => {
    e.preventDefault();
    if (!novoCodigo.trim()) return;

    try {
      const criado = await demandaService.gerarCodigoLiberacao(novoCodigo, tipoPerfil);
      const perfilCriado = ROTULO_PERFIL[criado?.tipo_usuario] || criado?.tipo_usuario || tipoPerfil;
      exibirMensagem(`Código "${criado?.codigo || novoCodigo.toUpperCase()}" (${perfilCriado}) gerado com sucesso.`, 'sucesso');
      setNovoCodigo('');
      carregarDados();
    } catch (err) {
      console.error(err);
      exibirMensagem(err.response?.data?.erro || 'Erro ao gerar código. Verifique se ele já não existe.', 'erro');
    }
  };

  const handleExcluirCodigo = async (id, usado) => {
    const confirmacao = usado
      ? 'Este código já foi utilizado. Tem certeza que deseja excluí-lo?'
      : 'Tem certeza que deseja excluir este código de liberação?';

    if (!window.confirm(confirmacao)) return;

    try {
      await demandaService.excluirCodigoLiberacao(id);
      exibirMensagem('Código excluído com sucesso.', 'sucesso');
      carregarDados();
    } catch (err) {
      console.error(err);
      exibirMensagem('Erro ao excluir código.', 'erro');
    }
  };

  const handleExcluirDemanda = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação permanentemente?')) return;

    try {
      await demandaService.excluirDemanda(id);
      exibirMensagem('Solicitação excluída com sucesso.', 'sucesso');
      carregarDados();
    } catch (err) {
      console.error(err);
      exibirMensagem('Erro ao excluir solicitação.', 'erro');
    }
  };

  const handleAtribuir = async (e) => {
    e.preventDefault();
    if (!idOperario) {
      exibirMensagem('Por favor, selecione um operário.', 'erro');
      return;
    }

    try {
      await demandaService.atribuirDemanda(demandaSelecionada.id, {
        id_operario: idOperario,
        urgencia_real: urgenciaReal,
        id_admin: user?.usuario_id || user?.id,
      });

      exibirMensagem('Triagem concluída com sucesso.', 'sucesso');
      setDemandaSelecionada(null);
      setIdOperario('');
      carregarDados();
    } catch (err) {
      console.error(err);
      exibirMensagem('Erro ao atribuir solicitação.', 'erro');
    }
  };

  const handleToggleStatusUsuario = async (id, statusAtual) => {
    const acao = statusAtual ? 'bloquear' : 'desbloquear';
    if (!window.confirm(`Tem certeza que deseja ${acao} o acesso deste usuário?`)) return;

    try {
      await demandaService.alterarStatusUsuario(id, !statusAtual);
      exibirMensagem(`Usuário ${statusAtual ? 'bloqueado' : 'desbloqueado'} com sucesso.`, 'sucesso');
      carregarDados();
    } catch (error) {
      console.error(error);
      exibirMensagem('Erro ao alterar status do usuário.', 'erro');
    }
  };

  const handleBaixarRelatorio = async (formato) => {
    try {
      setGerandoRelatorio(formato);
      const filtros = {};
      if (filtroMes) filtros.mes = filtroMes;
      if (filtroAno) filtros.ano = filtroAno;
      await demandaService.baixarRelatorio(formato, filtros);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      exibirMensagem('Erro ao gerar relatório. Tente novamente.', 'erro');
    } finally {
      setGerandoRelatorio('');
    }
  };

  const estaAtrasada = (demanda) => {
    if (!demanda.sla_prazo || demanda.status === 'CONCLUIDA') return false;
    return new Date(demanda.sla_prazo) < new Date();
  };

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">

        {mensagem.texto && (
          <div
            className={`p-3.5 rounded-md border text-sm font-medium flex items-center justify-between transition-all ${
              mensagem.tipo === 'erro'
                ? 'bg-signal/10 border-signal/30 text-signal'
                : 'bg-moss/10 border-moss/30 text-moss'
            }`}
            role="alert"
          >
            <span>{mensagem.texto}</span>
            <button
              onClick={() => setMensagem({ texto: '', tipo: '' })}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* CABEÇALHO */}
        <div className="border-b border-line pb-6">
          <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1.5">Administração</p>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Painel de controle</h1>
        </div>

        {/* PAINEL GERAL */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono text-faint uppercase tracking-wider">Visão geral</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-panel border border-line rounded-lg p-5">
              <p className="text-2xl font-mono font-semibold text-amber">{totalPendentes}</p>
              <p className="text-muted text-xs font-medium mt-1">Pendentes</p>
            </div>
            <div className="bg-panel border border-line rounded-lg p-5">
              <p className="text-2xl font-mono font-semibold text-blueprint-bright">{totalAndamento}</p>
              <p className="text-muted text-xs font-medium mt-1">Em andamento</p>
            </div>
            <div className="bg-panel border border-line rounded-lg p-5">
              <p className="text-2xl font-mono font-semibold text-moss">{totalConcluidas}</p>
              <p className="text-muted text-xs font-medium mt-1">Concluídas</p>
            </div>
            <div className="bg-panel border border-line rounded-lg p-5">
              <p className="text-2xl font-mono font-semibold text-signal">{totalImpedidas}</p>
              <p className="text-muted text-xs font-medium mt-1">Impedidas</p>
            </div>
          </div>
        </section>

        {/* CONTROLE DE ACESSOS E CÓDIGOS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <div className="bg-panel border border-line rounded-lg p-6 flex flex-col space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Gerar códigos de acesso</h3>
              <p className="text-muted text-xs mt-0.5">
                Crie acessos para novos moradores, operários ou administradores.
              </p>
            </div>

            <form onSubmit={handleGerarCodigo} className="space-y-3">
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink font-mono uppercase placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors"
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                placeholder="EX: MOR102"
                required
              />
              <div className="flex gap-2.5">
                <select
                  className="flex-1 px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors cursor-pointer"
                  value={tipoPerfil}
                  onChange={(e) => setTipoPerfil(e.target.value)}
                >
                  <option value="MORADOR">Morador</option>
                  <option value="OPERARIO">Operário</option>
                  <option value="ADMINISTRADOR">Administrador (síndico/gestor)</option>
                </select>

                <button
                  type="submit"
                  className="bg-blueprint hover:bg-blueprint-bright text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Criar código
                </button>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar pt-3 border-t border-line">
              {codigos.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 bg-panel-2/60 border border-line-soft rounded-md text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-ink font-medium shrink-0">{c.codigo}</span>
                    <span className="text-faint shrink-0">{c.tipo_usuario || '—'}</span>
                    {c.usado ? (
                      <span className="text-signal font-medium shrink-0">· usado</span>
                    ) : (
                      <span className="text-moss font-medium shrink-0">· livre</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="p-1.5 text-faint hover:text-signal hover:bg-signal/10 rounded transition-colors shrink-0"
                    onClick={() => handleExcluirCodigo(c.id, c.usado)}
                    title="Excluir código"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-line rounded-lg p-6 flex flex-col space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Gerenciar usuários</h3>
              <p className="text-muted text-xs mt-0.5">
                Bloqueie acessos de moradores ou operários inativos.
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto custom-scrollbar border border-line-soft rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-faint font-mono uppercase tracking-wider">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Perfil</th>
                    <th className="p-3 text-center font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className={`p-3 font-medium ${!u.ativo ? 'line-through text-faint' : 'text-ink'}`}>
                        {u.nome}
                      </td>
                      <td className={`p-3 font-mono ${!u.ativo ? 'text-faint' : 'text-muted'}`}>
                        {u.tipo_usuario}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatusUsuario(u.id, u.ativo)}
                          className={`px-3 py-1 rounded font-medium text-[11px] transition-colors cursor-pointer border ${
                            u.ativo
                              ? 'bg-signal/10 text-signal hover:bg-signal/20 border-signal/30'
                              : 'bg-moss/10 text-moss hover:bg-moss/20 border-moss/30'
                          }`}
                        >
                          {u.ativo ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RELATÓRIOS AVANÇADOS */}
        <section className="bg-panel border border-line rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Relatórios avançados</h3>
            <p className="text-muted text-xs mt-0.5">
              Baixe uma planilha ou PDF com as manutenções do período para prestação de contas.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="filtro-mes" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                Mês
              </label>
              <select
                id="filtro-mes"
                className="px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors cursor-pointer"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
              >
                <option value="">Todos</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filtro-ano" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                Ano
              </label>
              <input
                id="filtro-ano"
                type="number"
                className="w-24 px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors"
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
              />
            </div>

            <button
              type="button"
              disabled={gerandoRelatorio === 'excel'}
              onClick={() => handleBaixarRelatorio('excel')}
              className="bg-moss/15 hover:bg-moss/25 border border-moss/30 disabled:opacity-50 text-moss text-sm font-medium px-4 py-2.5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {gerandoRelatorio === 'excel' ? 'Gerando...' : 'Baixar Excel'}
            </button>

            <button
              type="button"
              disabled={gerandoRelatorio === 'pdf'}
              onClick={() => handleBaixarRelatorio('pdf')}
              className="bg-signal/15 hover:bg-signal/25 border border-signal/30 disabled:opacity-50 text-signal text-sm font-medium px-4 py-2.5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {gerandoRelatorio === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
            </button>
          </div>
        </section>

        {/* CENTRAL DE SOLICITAÇÕES */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-mono text-faint uppercase tracking-wider">Central de triagem</h2>
            <p className="text-muted text-xs mt-1">
              Gerencie e direcione as demandas abertas.
            </p>
          </div>

          {loading ? (
            <Loading mensagem="Carregando solicitações..." />
          ) : demandas.length === 0 ? (
            <div className="bg-panel border border-dashed border-line rounded-lg p-8 text-center text-muted text-sm">
              Nenhuma solicitação encontrada no momento.
            </div>
          ) : (
            <div className="bg-panel border border-line rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-panel-2/40 text-faint font-mono uppercase tracking-wider">
                      <th className="p-3.5 font-medium">OS</th>
                      <th className="p-3.5 font-medium">Setor</th>
                      <th className="p-3.5 font-medium">Morador</th>
                      <th className="p-3.5 font-medium">Descrição</th>
                      <th className="p-3.5 font-medium">Status</th>
                      <th className="p-3.5 font-medium">SLA</th>
                      <th className="p-3.5 font-medium">Operário</th>
                      <th className="p-3.5 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {demandas.map((item) => (
                      <tr key={item.id} className="hover:bg-panel-2/40 transition-colors">
                        <td className="p-3.5 font-mono text-blueprint-bright">{numeroOS(item.id)}</td>
                        <td className="p-3.5 text-ink font-medium">{item.setor}</td>
                        <td className="p-3.5 text-muted">{item.morador?.nome || 'N/A'}</td>
                        <td className="p-3.5 text-muted max-w-xs truncate" title={item.descricao}>
                          {item.descricao}
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="p-3.5">
                          {estaAtrasada(item) ? (
                            <span className="font-mono text-[10px] text-signal border border-signal/30 bg-signal/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Vencido
                            </span>
                          ) : item.sla_prazo ? (
                            <span className="text-muted font-mono text-[11px]">
                              {new Date(item.sla_prazo).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-faint text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {item.operario?.nome ? (
                            <span className="text-ink">{item.operario.nome}</span>
                          ) : (
                            <span className="text-faint italic">Pendente</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.status === 'PENDENTE' && (
                              <button
                                type="button"
                                className="bg-blueprint/15 hover:bg-blueprint/25 border border-blueprint/30 text-blueprint-bright font-medium px-3 py-1.5 rounded text-xs cursor-pointer"
                                onClick={() => {
                                  setDemandaSelecionada(item);
                                  setUrgenciaReal(item.urgencia_morador);
                                }}
                              >
                                Triagem
                              </button>
                            )}
                            <button
                              type="button"
                              className="p-1.5 text-faint hover:text-signal hover:bg-signal/10 rounded transition-colors"
                              onClick={() => handleExcluirDemanda(item.id)}
                              title="Excluir demanda"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* MODAL DE TRIAGEM */}
        {demandaSelecionada && (
          <div className="fixed inset-0 z-50 bg-graphite/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-panel border border-line rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
              <div className="h-[3px] bg-blueprint" />

              <div className="p-6 space-y-5">
                <div>
                  <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1">
                    {numeroOS(demandaSelecionada.id)}
                  </p>
                  <h3 className="text-base font-semibold text-ink">Triagem da demanda</h3>

                  <div className="mt-3 p-3 bg-panel-2/60 rounded-md text-xs space-y-1 text-muted border border-line-soft">
                    <p><span className="text-ink font-medium">Solicitante:</span> {demandaSelecionada.morador?.nome}</p>
                    <p><span className="text-ink font-medium">Descrição:</span> {demandaSelecionada.descricao}</p>
                  </div>

                  {demandaSelecionada.foto_url && (
                    <a href={montarUrlArquivo(demandaSelecionada.foto_url)} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <img
                        src={montarUrlArquivo(demandaSelecionada.foto_url)}
                        alt="Foto anexada pelo morador"
                        className="w-full max-h-48 object-cover rounded-md border border-line hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}
                </div>

                <form onSubmit={handleAtribuir} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="operario-select" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                      Atribuir operário *
                    </label>
                    <select
                      id="operario-select"
                      className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors cursor-pointer"
                      value={idOperario}
                      onChange={(e) => setIdOperario(e.target.value)}
                      required
                    >
                      <option value="">— Selecione o operário —</option>
                      {operarios.map((op) => (
                        <option key={op.id} value={op.id}>{op.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="urgencia-select" className="block text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                      Urgência real *
                    </label>
                    <select
                      id="urgencia-select"
                      className="w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors cursor-pointer"
                      value={urgenciaReal}
                      onChange={(e) => setUrgenciaReal(e.target.value)}
                      required
                    >
                      <option value="BAIXA">Baixa — SLA 7 dias</option>
                      <option value="MEDIA">Média — SLA 72h</option>
                      <option value="ALTA">Alta — SLA 24h</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink bg-panel-2 hover:bg-line/60 rounded-md transition-colors cursor-pointer"
                      onClick={() => setDemandaSelecionada(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-medium text-white bg-blueprint hover:bg-blueprint-bright rounded-md transition-colors cursor-pointer"
                    >
                      Salvar e enviar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
