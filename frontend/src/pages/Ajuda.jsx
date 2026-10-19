import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const FAQ = [
  {
    pergunta: 'Como faço para relatar um problema na minha unidade?',
    resposta: (
      <>
        Acesse <strong className="text-ink font-medium">"Nova demanda"</strong> no menu superior,
        escolha o setor correspondente, indique o nível de urgência, descreva o problema e, se quiser,
        anexe uma foto para o operário já saber quais ferramentas levar.
      </>
    ),
  },
  {
    pergunta: 'Posso anexar uma foto do problema?',
    resposta: (
      <>
        Sim. Ao abrir uma nova demanda há um campo opcional para anexar uma imagem
        (JPG, PNG ou WEBP, até 5MB). Isso ajuda o operário a se preparar antes da visita.
      </>
    ),
  },
  {
    pergunta: 'O status da minha demanda está como "Impedimento". O que significa?',
    resposta: (
      <>
        Significa que o operário encontrou um obstáculo para a execução (ex.: falta de peças ou
        morador ausente no momento da visita). Você recebe uma notificação e um e-mail com o motivo
        relatado — confira também a conversa dentro da demanda.
      </>
    ),
  },
  {
    pergunta: 'Como falo com o operário sobre um horário específico?',
    resposta: (
      <>
        Cada demanda tem uma conversa própria. Toque em{' '}
        <strong className="text-ink font-medium">"Conversar sobre esta demanda"</strong> na tela
        "Minhas demandas" para enviar uma mensagem direta ao operário responsável.
      </>
    ),
  },
];

export default function Ajuda() {
  const navigate = useNavigate();
  const wppNumero = '5511999999999'; // Substitua pelo número real
  const mensagemWpp = 'Olá, sou morador e preciso de ajuda com o sistema de demandas.';

  return (
    <div className="min-h-screen bg-graphite text-ink flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="text-[11px] font-mono text-faint uppercase tracking-wider mb-1.5">Suporte</p>
            <h1 className="text-xl font-semibold text-ink tracking-tight">Central de ajuda</h1>
            <p className="text-muted text-sm mt-1">
              Tire suas dúvidas ou fale diretamente com a administração.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="self-start sm:self-center px-3.5 py-2 text-xs font-medium text-muted bg-panel hover:bg-panel-2 border border-line rounded-md transition-colors cursor-pointer"
          >
            ← Voltar
          </button>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-mono text-faint uppercase tracking-wider">Perguntas frequentes</h2>

          <div className="space-y-2.5">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-panel border border-line rounded-lg p-5 flex gap-4">
                <span className="font-mono text-xs text-blueprint-bright shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="space-y-1.5">
                  <h3 className="font-medium text-ink text-sm">{item.pergunta}</h3>
                  <p className="text-muted text-sm leading-relaxed">{item.resposta}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-panel border border-line rounded-lg p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink">Ainda precisa de ajuda?</h3>
            <p className="text-muted text-sm">
              Fale direto com a portaria ou administração pelo WhatsApp.
            </p>
          </div>

          <a
            href={`https://wa.me/${wppNumero}?text=${encodeURIComponent(mensagemWpp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-moss hover:brightness-110 text-white font-medium px-4 py-2.5 rounded-md transition-all text-sm cursor-pointer shrink-0"
          >
            Falar no WhatsApp
          </a>
        </section>

      </main>
    </div>
  );
}
