import { useState } from 'react';
import Header from '../components/Header';
import { demandaService } from '../services/demandaService';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Alerta from '../components/Alerta';

const selectClasse =
  'w-full px-3.5 py-2.5 rounded-md bg-panel-2 border border-line text-ink focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors disabled:opacity-50 cursor-pointer';

const labelClasse = 'block text-[11px] font-mono font-medium text-muted uppercase tracking-wider';

export default function NovaDemanda() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [foto, setFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);

  const [formData, setFormData] = useState({
    setor: 'GERAL',
    descricao: '',
    urgencia_morador: 'MEDIA',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFotoChange = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) {
      setFoto(null);
      setPreviewFoto(null);
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5MB.');
      e.target.value = '';
      return;
    }

    setErro('');
    setFoto(arquivo);
    setPreviewFoto(URL.createObjectURL(arquivo));
  };

  const removerFoto = () => {
    setFoto(null);
    setPreviewFoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.descricao.trim()) {
      setErro('Por favor, descreva o problema.');
      return;
    }

    try {
      setLoading(true);
      const idMorador = user?.usuario_id || user?.id;

      let payload;
      if (foto) {
        payload = new FormData();
        payload.append('id_morador', idMorador);
        payload.append('setor', formData.setor);
        payload.append('descricao', formData.descricao);
        payload.append('urgencia_morador', formData.urgencia_morador);
        payload.append('foto', foto);
      } else {
        payload = { id_morador: idMorador, ...formData };
      }

      await demandaService.criarDemanda(payload);
      navigate('/minhas-demandas');
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      setErro(error.response?.data?.erro || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1.5">Novo registro</p>
            <h1 className="text-xl font-semibold text-ink tracking-tight">Abrir demanda de manutenção</h1>
            <p className="text-muted text-sm mt-1">
              Descreva o problema com o máximo de detalhes para agilizar o atendimento.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="self-start sm:self-center px-3.5 py-2 text-xs font-medium text-muted bg-panel hover:bg-panel-2 border border-line rounded-md transition-colors cursor-pointer shrink-0"
          >
            ← Voltar
          </button>
        </div>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-lg overflow-hidden">
          <div className="h-[3px] bg-blueprint" />

          <div className="p-6 sm:p-7 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="setor" className={labelClasse}>Setor do problema *</label>
                <select
                  id="setor"
                  name="setor"
                  className={selectClasse}
                  value={formData.setor}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="GERAL">Geral (áreas comuns, portas...)</option>
                  <option value="ELETRICA">Elétrica</option>
                  <option value="HIDRAULICA">Hidráulica</option>
                  <option value="ALVENARIA">Alvenaria / pintura</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="urgencia_morador" className={labelClasse}>Urgência percebida *</label>
                <select
                  id="urgencia_morador"
                  name="urgencia_morador"
                  className={selectClasse}
                  value={formData.urgencia_morador}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="BAIXA">Baixa — pode aguardar</option>
                  <option value="MEDIA">Média — incomoda, não é crítico</option>
                  <option value="ALTA">Alta — risco de dano, vazamento, sem luz</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="descricao" className={labelClasse}>Descrição detalhada *</label>
              <textarea
                id="descricao"
                name="descricao"
                className="w-full px-3.5 py-3 rounded-md bg-panel-2 border border-line text-ink placeholder-faint focus:outline-none focus:ring-1 focus:ring-blueprint-bright focus:border-blueprint-bright text-sm transition-colors disabled:opacity-50 resize-y"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Ex: a torneira da pia da churrasqueira está vazando água constantemente, mesmo fechada."
                rows={5}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="foto" className={labelClasse}>Foto do problema (opcional)</label>
              <p className="text-[11px] text-faint -mt-0.5 mb-1">
                Ajuda o operário a saber quais ferramentas levar antes de ir até o local.
              </p>

              {previewFoto ? (
                <div className="relative inline-block w-full">
                  <img
                    src={previewFoto}
                    alt="Pré-visualização do problema"
                    className="w-full max-h-56 object-cover rounded-md border border-line"
                  />
                  <button
                    type="button"
                    onClick={removerFoto}
                    disabled={loading}
                    className="absolute top-2 right-2 bg-graphite/90 hover:bg-signal text-ink hover:text-white text-xs font-bold w-7 h-7 rounded-md border border-line flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Remover foto"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="foto"
                  className="flex flex-col items-center justify-center gap-1.5 w-full py-7 rounded-md bg-panel-2/40 border border-dashed border-line hover:border-blueprint-bright/60 text-muted hover:text-blueprint-bright text-sm transition-colors cursor-pointer"
                >
                  <span className="font-mono text-xs uppercase tracking-wider">Anexar imagem</span>
                  <span className="text-[11px] text-faint">JPG, PNG ou WEBP · até 5MB</span>
                </label>
              )}

              <input
                id="foto"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFotoChange}
                disabled={loading}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blueprint hover:bg-blueprint-bright text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                'Enviar solicitação'
              )}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}
