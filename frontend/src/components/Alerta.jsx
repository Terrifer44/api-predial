// Banner de aviso reutilizável (erro / sucesso / aviso).
// Antes, cada página reimplementava essa mesma faixa colorida na mão, com
// pequenas diferenças (ícone, padding, se tinha botão de fechar ou não).
// Centralizado aqui para ficar sempre igual e mais fácil de ajustar.
//
// As classes de cada variante ficam escritas por extenso (nunca montadas via
// template string tipo `bg-${cor}`) de propósito: o Tailwind só gera a classe
// no CSS final se o nome completo aparecer literalmente em algum arquivo.
const ESTILOS = {
  erro: {
    classe: 'bg-signal/10 border-signal/30 text-signal',
    icone: '!',
    role: 'alert',
  },
  sucesso: {
    classe: 'bg-moss/10 border-moss/30 text-moss',
    icone: '✓',
    role: 'status',
  },
  aviso: {
    classe: 'bg-amber/10 border-amber/30 text-amber',
    icone: '!',
    role: 'alert',
  },
};

export default function Alerta({ tipo = 'erro', children, onFechar, className = '' }) {
  const estilo = ESTILOS[tipo] || ESTILOS.erro;

  return (
    <div
      className={`${estilo.classe} border text-xs p-3 rounded-md font-medium flex items-start gap-2 ${className}`}
      role={estilo.role}
    >
      <span className="font-mono font-bold shrink-0">{estilo.icone}</span>
      <span className="flex-1">{children}</span>
      {onFechar && (
        <button
          type="button"
          onClick={onFechar}
          className="text-xs opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          aria-label="Fechar aviso"
        >
          ✕
        </button>
      )}
    </div>
  );
}
