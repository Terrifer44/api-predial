// Placeholder padrão para listas vazias ("nenhuma demanda", "fila vazia"
// etc.). Unifica o mesmo cartão tracejado que estava copiado em
// MinhasDemandas e PainelOperario.
export default function EmptyState({ eyebrow, titulo, children, className = '' }) {
  return (
    <div className={`bg-panel border border-dashed border-line rounded-lg p-12 text-center space-y-3 ${className}`}>
      {eyebrow && (
        <p className="font-mono text-xs text-faint uppercase tracking-wider">{eyebrow}</p>
      )}
      {titulo && <h3 className="text-base font-semibold text-ink">{titulo}</h3>}
      {children}
    </div>
  );
}
