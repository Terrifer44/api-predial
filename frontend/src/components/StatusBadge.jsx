import { statusEstilo } from '../utils/status';
export default function StatusBadge({ status, className = '' }) {
  const s = statusEstilo(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-medium uppercase tracking-wider ${s.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
