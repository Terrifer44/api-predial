// Moldura padrão de modal: fundo escurecido + painel com a faixa azul no
// topo. Antes essa estrutura estava copiada em 3 lugares (ModalChat,
// PainelAdmin e PainelOperario) com o mesmo texto, cada um podendo divergir
// sem querer. Agora é um componente só.
//
// Fechar clicando fora do painel é um comportamento novo (nenhum dos modais
// tinha isso antes) — clicar dentro do painel não fecha, só o fundo.
export default function ModalShell({ children, onClose, maxWidth = 'max-w-md', className = '' }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-graphite/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-panel border border-line rounded-lg w-full ${maxWidth} shadow-2xl overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] bg-blueprint shrink-0" />
        {children}
      </div>
    </div>
  );
}
