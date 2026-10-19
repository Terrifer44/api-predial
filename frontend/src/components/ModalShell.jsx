import { useEffect, useRef } from 'react';
export default function ModalShell({ children, onClose, maxWidth = 'max-w-md', className = '', titulo = 'Detalhes da demanda' }) {
  const dialog = useRef(null);
  useEffect(() => {
    const elemento = dialog.current;
    elemento.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { elemento.close(); document.body.style.overflow = anterior; };
  }, []);
  return <dialog ref={dialog} aria-label={titulo} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className={`m-auto p-0 bg-panel text-ink border border-line rounded-2xl w-[calc(100%-2rem)] ${maxWidth} shadow-2xl backdrop:bg-black/50 ${className}`}><div className="h-1 bg-blueprint" />{children}</dialog>;
}
