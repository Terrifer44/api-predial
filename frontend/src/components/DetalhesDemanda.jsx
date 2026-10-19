import { useEffect, useState } from 'react';
import ModalShell from './ModalShell';
import FotoDemanda from './FotoDemanda';
import StatusBadge from './StatusBadge';
import { demandaService } from '../services/demandaService';
export default function DetalhesDemanda({demanda,onClose,podeRemover=false,onRemovida}) {
 const [historico,setHistorico]=useState(null),[erro,setErro]=useState('');
 useEffect(()=>{let ativo=true;demandaService.buscarHistorico(demanda.id).then(d=>{if(ativo)setHistorico(d);}).catch(()=>{if(ativo)setErro('Não foi possível carregar o histórico.');});return()=>{ativo=false;};},[demanda.id]);
 return <ModalShell onClose={onClose} maxWidth="max-w-xl" titulo={`Histórico da demanda ${demanda.id}`}><div className="p-6 space-y-5"><div className="flex justify-between items-start gap-4"><div><p className="eyebrow text-blueprint">OS-{String(demanda.id).padStart(4,'0')}</p><h2 className="text-xl font-semibold mt-2">Detalhes e histórico</h2></div><button aria-label="Fechar detalhes" className="icon-button" onClick={onClose}>×</button></div><StatusBadge status={demanda.status}/><p className="text-sm text-muted whitespace-pre-line">{demanda.descricao}</p>{demanda.foto_url && <FotoDemanda demanda={demanda} podeRemover={podeRemover} onRemovida={onRemovida}/>}<h3 className="font-semibold border-t border-line pt-5">Etapas do atendimento</h3>{erro?<p role="alert" className="text-signal text-sm">{erro}</p>:historico===null?<p className="text-muted text-sm">Carregando histórico…</p>:historico.length===0?<p className="text-muted text-sm">Nenhuma alteração registrada.</p>:<ol className="space-y-5 border-l-2 border-line pl-5">{historico.map(h=><li key={h.id}><StatusBadge status={h.status_novo}/><p className="text-sm mt-2 whitespace-pre-line">{h.comentario}</p><p className="text-xs text-muted mt-2">{h.usuario?.nome || 'Equipe'} · {new Date(h.criado_em).toLocaleString('pt-BR')}</p></li>)}</ol>}</div></ModalShell>;
}
