import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const nomeUsuario = user?.usuario_nome || user?.nome || user?.nome_completo || 'Morador';
  const primeiroNome = nomeUsuario.split(' ')[0];

  const handleKeyDown = (e, path) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">

        <section className="border-b border-line pb-6">
          <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1.5">Portal do morador</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Olá, {primeiroNome}
          </h1>
          <p className="text-muted text-sm mt-1.5">
            O que você deseja fazer hoje?
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div
            className="group relative bg-panel hover:border-blueprint/50 border border-line rounded-lg overflow-hidden transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blueprint-bright"
            onClick={() => navigate('/nova-demanda')}
            onKeyDown={(e) => handleKeyDown(e, '/nova-demanda')}
            role="button"
            tabIndex={0}
          >
            <div className="h-[3px] bg-blueprint" />
            <div className="p-6 sm:p-7 flex flex-col justify-between gap-6 min-h-[180px]">
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-blueprint-bright uppercase tracking-wider">01 — Abrir chamado</span>
                <h2 className="text-lg font-semibold text-ink">
                  Nova demanda
                </h2>
                <p className="text-muted text-sm leading-relaxed">
                  Registre uma solicitação de manutenção para o seu apartamento ou área comum, com foto do problema se preferir.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blueprint-bright group-hover:gap-2.5 transition-all">
                Acessar <span aria-hidden>→</span>
              </span>
            </div>
          </div>

          <div
            className="group relative bg-panel hover:border-line-soft border border-line rounded-lg overflow-hidden transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blueprint-bright"
            onClick={() => navigate('/minhas-demandas')}
            onKeyDown={(e) => handleKeyDown(e, '/minhas-demandas')}
            role="button"
            tabIndex={0}
          >
            <div className="h-[3px] bg-line" />
            <div className="p-6 sm:p-7 flex flex-col justify-between gap-6 min-h-[180px]">
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-muted uppercase tracking-wider">02 — Acompanhar</span>
                <h2 className="text-lg font-semibold text-ink">
                  Minhas demandas
                </h2>
                <p className="text-muted text-sm leading-relaxed">
                  Veja o status, prazo de atendimento e histórico de todas as suas solicitações abertas.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:gap-2.5 transition-all">
                Acessar <span aria-hidden>→</span>
              </span>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
