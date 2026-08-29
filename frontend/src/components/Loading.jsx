export default function Loading({ mensagem = 'Carregando dados...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blueprint-bright animate-spin" />
      </div>
      <p className="text-xs font-mono text-muted uppercase tracking-wider">{mensagem}</p>
    </div>
  );
}
