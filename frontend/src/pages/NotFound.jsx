import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-graphite bg-blueprint-grid flex flex-col justify-center items-center p-4 sm:p-6">
      <main className="w-full max-w-sm bg-panel border border-line rounded-lg shadow-2xl shadow-black/30 overflow-hidden text-center">
        <div className="h-[3px] bg-signal" />

        <div className="p-8 space-y-5">
          <div className="space-y-1.5">
            <p className="text-4xl font-mono font-semibold text-ink tracking-tight">404</p>
            <h1 className="text-base font-semibold text-ink">Página não encontrada</h1>
          </div>

          <p className="text-muted text-sm leading-relaxed">
            O caminho solicitado não existe ou você não tem permissão para acessá-lo.
          </p>

          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-blueprint hover:bg-blueprint-bright text-white font-medium py-2.5 rounded-md transition-colors text-sm"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
