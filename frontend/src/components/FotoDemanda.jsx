import { useEffect, useState } from 'react';
import api from '../services/api';
export default function FotoDemanda({ demanda, podeRemover = false, onRemovida }) {
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let ativo = true, objeto;
    api.get(`/api/demandas/${demanda.id}/foto`, { responseType: 'blob' }).then(({ data }) => {
      objeto = URL.createObjectURL(data); if (ativo) setUrl(objeto);
    }).catch(() => { if (ativo) setErro('Não foi possível carregar a foto.'); });
    return () => { ativo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [demanda.id, demanda.foto_url]);
  async function remover() {
    if (!window.confirm('Remover a foto desta demanda?')) return;
    setOcupado(true);
    try { await api.delete(`/api/demandas/${demanda.id}/foto`); onRemovida?.(); }
    catch (e) { setErro(e.response?.data?.erro || 'Não foi possível remover a foto.'); }
    finally { setOcupado(false); }
  }
  return <div className="space-y-2">{url && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto da demanda #${demanda.id}`} className="w-full max-h-56 object-cover rounded-lg border border-line" loading="lazy" /></a>}{erro && <p role="alert" className="text-signal text-sm">{erro}</p>}{podeRemover && <button type="button" disabled={ocupado} onClick={remover} className="text-signal text-sm underline">{ocupado ? 'Removendo…' : 'Remover foto'}</button>}</div>;
}
