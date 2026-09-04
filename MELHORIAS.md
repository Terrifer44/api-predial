# Melhorias Implementadas

Este documento resume as 8 melhorias adicionadas ao projeto original e como configurar cada uma.

## 0. 🎨 Identidade Visual

O visual foi refeito para se parecer menos com um dashboard SaaS genérico e mais com uma
**ordem de serviço técnica** — o que faz sentido para um sistema de manutenção predial:

- **Paleta**: grafite/carvão em vez de preto puro, com azul de "planta técnica" (blueprint)
  como acento e cores de sinalização industrial (âmbar, vermelho, verde) para status e SLA.
- **Tipografia**: IBM Plex Sans (textos) + IBM Plex Mono (números de OS, códigos, prazos),
  reforçando a leitura de "documento técnico".
- **Cards em formato de ticket**: cada demanda tem um número de ordem de serviço
  (`OS-0042`), uma faixa lateral colorida por status e uma divisória tracejada — como o
  canhoto destacável de uma ordem de serviço física.
- Todos os tokens de cor/fonte ficam centralizados em `frontend/src/index.css`
  (`@theme { ... }`), então dá para ajustar a paleta inteira em um só lugar.

## 1. 📷 Upload de Imagens
O morador pode anexar uma foto do problema ao abrir uma demanda (`NovaDemanda.jsx`).
- Backend: `multer` salva o arquivo em `/uploads` (`lib/upload.js`) e o campo `foto_url` é
  gravado na demanda. Limite de 5MB, apenas JPG/PNG/WEBP.
- A pasta `/uploads` é servida estaticamente em `http://localhost:3000/uploads/...`.
- A foto aparece para o morador (Minhas Demandas), para o operário (Painel Operário) e
  para o admin na tela de triagem.

## 2. 👤 Criação de Novos Administradores
Reaproveita o sistema de "Código de Liberação" já existente: no Painel Admin, ao gerar um
código, agora é possível escolher o perfil **Administrador (síndico/gestor)**, além de
Morador/Operário. Quem se cadastra com esse código vira administrador automaticamente
(antes o cadastro sempre criava um MORADOR, isso foi corrigido em `server.js`).

## 3. 💬 Chat / Comentários na Demanda
Mini-chat dentro de cada chamado (`ComentarioDemanda` no banco, `ModalChat.jsx` no
frontend). Disponível tanto para o morador (Minhas Demandas → "Conversar") quanto para o
operário (Painel Operário → "Conversar"). Atualiza automaticamente a cada 8 segundos
enquanto o modal está aberto.

## 4. 🔔 Sistema de Notificações (E-mail + Interna)
- **E-mail real via SMTP** (`lib/email.js`, usando `nodemailer`). Configure as variáveis
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` no `.env`. Se não configurado, os
  e-mails são apenas exibidos no console (não quebra o sistema).
- **Notificação interna** (sino no cabeçalho, `NotificacoesBell.jsx`): mostra alertas
  mesmo sem checar o e-mail, com contador de não lidas.
- Disparadas quando: a demanda é atribuída a um operário, quando o operário inicia o
  serviço, quando conclui, e quando há impedimento.

## 5. ⏰ SLA (Tempo Limite de Atendimento)
Ao fazer a triagem (definir urgência real + operário), o sistema calcula automaticamente
um prazo (`sla_prazo`):
- **Alta**: 24 horas
- **Média**: 72 horas
- **Baixa**: 168 horas (7 dias)

Se o prazo passar e a demanda não estiver concluída, um alerta vermelho "⏰ Atrasada"
aparece para o morador, o operário e o admin.

## 6. 📊 Relatórios Avançados (Excel / PDF)
No Painel Admin, seção "Relatórios Avançados": filtre por mês/ano e baixe um relatório
completo em **Excel** (`exceljs`) ou **PDF** (`pdfkit`) com todas as manutenções do
período, para prestação de contas.

## 7. 🔑 Recuperação de Senha
Fluxo completo de "Esqueci minha senha":
1. Usuário informa o código de acesso em `/esqueci-senha`.
2. Se houver e-mail cadastrado, um link com token (válido por 30 min) é enviado.
3. O link leva a `/redefinir-senha?token=...`, onde uma nova senha é definida.

## 8. 📱 PWA (Progressive Web App)
Configurado via `vite-plugin-pwa`. Ao acessar o site pelo navegador do celular, é possível
"instalar" como aplicativo (ícone na tela inicial, abre em tela cheia). Ícones gerados em
`frontend/public/pwa-192.png`, `pwa-512.png` e `pwa-maskable-512.png`.

---

## ⚙️ Setup depois de extrair o projeto

### Backend
```bash
cd api-predial
npm install          # instala multer, nodemailer, exceljs, pdfkit, etc.
cp .env.example .env # ajuste DATABASE_URL, SMTP_*, FRONTEND_URL
npx prisma migrate dev --name melhorias   # cria as novas tabelas/campos
npx prisma generate
npm run dev
```

### Frontend
```bash
cd api-predial/frontend
npm install           # instala vite-plugin-pwa
npm run dev
```

### Observações
- Se as variáveis `SMTP_*` ficarem em branco, os e-mails aparecem apenas no console do
  backend (modo simulado) — o restante do sistema funciona normalmente.
- Para Gmail, use uma "Senha de app" (myaccount.google.com/apppasswords), não a senha
  normal da conta.
- A pasta `uploads/` é criada automaticamente na primeira imagem enviada.

---

## 🔧 Correções de segurança e um bug de cadastro (rodada 2)

### 1. Autorização real no backend
Antes, **nenhuma rota da API verificava quem estava chamando** — a proteção existia só no
frontend (React Router), então qualquer requisição feita direto pra API (Postman, curl)
funcionava sem login. Agora:

- O frontend envia o cabeçalho `x-usuario-id` em toda chamada (`services/api.js`), preenchido
  automaticamente a partir do usuário salvo no login.
- O backend (`server.js`) tem os middlewares `exigirAutenticacao` e `exigirPerfil(...)`, que
  verificam se esse ID corresponde a um usuário **ativo** e com o **perfil correto** antes de
  executar a ação — rotas de admin (triagem, exclusão, relatórios, gestão de usuários/códigos)
  agora exigem `ADMINISTRADOR`; atualização de status de tarefa exige que o operário seja o
  **dono** daquela demanda; um morador só acessa as próprias demandas/notificações.
- Campos como `id_admin`/`id_usuario`/`id_morador` que antes vinham (sem checagem) no corpo da
  requisição agora são ignorados — o servidor usa sempre o usuário autenticado pelo cabeçalho.

Isso ainda não é uma sessão/token real (o ID pode ser adivinhado por alguém tecnicamente capaz),
mas fecha a brecha de qualquer requisição sem identificação nenhuma ser aceita.

### 2. Rotas do morador agora exigem o perfil MORADOR
`/dashboard`, `/nova-demanda`, `/minhas-demandas` e `/ajuda` aceitavam qualquer usuário logado
(inclusive Operário/Admin, digitando a URL direto). Criado o guard `RotaMorador` em `App.jsx`,
no mesmo padrão que já existia para `RotaAdmin`/`RotaOperario`.

### 3. Código morto removido
A rota de exclusão de código de liberação (`DELETE /api/codigos-liberacao/:id`) tinha uma
chamada a `prisma.usuario.updateMany({ where: { id_codigo_liberacao: ... } })` referenciando um
campo que nunca existiu no schema — sempre falhava silenciosamente (`.catch(() => {})`). Removida.

### 4. Bug: código de Operário sendo criado como Morador
A causa raiz era um **fallback enganoso na tela**, não no fluxo de criação em si: a lista de
códigos mostrava `{c.tipo_usuario || 'MORADOR'}` — ou seja, qualquer código cujo `tipo_usuario`
chegasse vazio/nulo do backend aparecia como "MORADOR" na tela, independente do que realmente
tinha sido gerado. Corrigido:

- O fallback agora mostra `—` em vez de mentir dizendo "MORADOR".
- O backend agora **valida explicitamente** o `tipo_usuario` recebido (`MORADOR`, `OPERARIO` ou
  `ADMINISTRADOR`) e **recusa** a criação com erro 400 se vier vazio ou um valor desconhecido,
  em vez de deixar o Prisma decidir silenciosamente.
- O aviso de sucesso na tela agora mostra o tipo **que o próprio backend confirmou** ter salvo
  (não mais o que a tela "acha" que enviou), então qualquer divergência fica visível na hora.

Se depois dessa correção o problema ainda persistir no seu ambiente, rode `npx prisma generate`
novamente após atualizar o `schema.prisma` — um Prisma Client desatualizado pode causar sintomas
parecidos.

---

## ☁️ Upload de fotos migrado para o Cloudinary

O upload de imagens (`lib/upload.js`) agora usa o **Cloudinary** como armazenamento
principal, em vez de salvar direto no disco do servidor.

**Por que:** serviços de hospedagem gratuitos como o Render apagam o disco local a cada
novo deploy ou reinício — as fotos anexadas às demandas simplesmente desapareceriam com
o tempo. O Cloudinary guarda os arquivos externamente, então eles sobrevivem a qualquer
redeploy.

**Como configurar:**
1. Crie uma conta grátis em [cloudinary.com](https://cloudinary.com) (não pede cartão).
2. No Dashboard, copie os três valores: `Cloud Name`, `API Key` e `API Secret`.
3. Cole no `.env`:
   ```
   CLOUDINARY_CLOUD_NAME="..."
   CLOUDINARY_API_KEY="..."
   CLOUDINARY_API_SECRET="..."
   ```
4. Rode `npm install` (adicionei `cloudinary` e `multer-storage-cloudinary` ao
   `package.json`).

**Se você não configurar nada:** o sistema detecta a ausência dessas variáveis e cai
automaticamente para salvar em disco local (`/uploads`), exatamente como antes — útil
para testar localmente sem precisar criar uma conta. Só não use esse modo em produção
num serviço com disco efêmero.

---

## 🔒 Restrição: código de Administrador só pelo banco

Por decisão de segurança, a tela "Gerar códigos de acesso" (Painel Admin) não permite
mais escolher o perfil **Administrador** — só Morador ou Operário aparecem no seletor.

- **Backend** (`server.js`): `POST /api/codigos-liberacao` agora recusa (erro 400)
  qualquer tentativa de gerar um código com `tipo_usuario: "ADMINISTRADOR"`, mesmo que a
  chamada venha direto da API (Postman/curl) e não da tela — a restrição não depende do
  frontend esconder a opção.
- **Frontend** (`PainelAdmin.jsx`): a opção "Administrador (síndico/gestor)" foi removida
  do `<select>`.
- Um novo administrador continua possível de criar, só que **diretamente no banco**
  (edite `prisma/seed.js` e rode `node prisma/seed.js`, ou insira manualmente com
  `senha_hash` gerado via `bcryptjs`).

## 📧 Diagnóstico de e-mail (SMTP) na inicialização

Antes, se o SMTP estivesse mal configurado em produção (ex: Render), o único jeito de
descobrir era esperar alguém pedir "esqueci minha senha" e vasculhar os logs. Agora
(`lib/email.js` + `server.js`):

- Ao subir, o servidor testa a conexão SMTP (`transporter.verify()`) e imprime logo no
  log: sucesso, "SMTP não configurado", ou o motivo exato da falha — com uma dica
  específica quando o erro parece ser de autenticação (ex: Gmail sem "Senha de app") ou
  de conexão (host/porta/firewall).
- Toda tentativa de envio (inclusive redefinição de senha) agora loga claramente se foi
  entregue ou não, e por quê — sem mudar a resposta genérica que o usuário final recebe
  (continua sem revelar quais códigos de acesso existem no sistema).
- **Isso não substitui configurar o SMTP de verdade**: se as variáveis `SMTP_HOST` /
  `SMTP_USER` / `SMTP_PASS` no Render estiverem vazias ou erradas, o "esqueci minha
  senha" continua apenas simulando o e-mail no console — mas agora fica óbvio no log
  qual é exatamente o problema, para corrigir com o Gmail (ou outro provedor).

## 🗑️ Bug: excluir código de liberação não excluía o usuário

Confirmado e corrigido. `DELETE /api/codigos-liberacao/:id` agora também localiza o
usuário cadastrado com aquele código (`usuario.codigo_acesso === codigo.codigo`) e:

- Exclui o usuário junto, se ele nunca teve nenhuma demanda/comentário/histórico
  vinculado (nesse caso o banco permite excluir sem quebrar nada).
- Se o usuário já tiver histórico (o banco recusa a exclusão por integridade
  referencial — erro `P2003`), ele é **desativado** em vez de excluído, para não perder
  esse histórico. O admin recebe uma mensagem explicando qual dos dois aconteceu.

Não existe hoje uma rota para excluir um usuário diretamente (só bloquear/desbloquear
em `PUT /api/usuarios/:id/status`) — então o outro sentido ("excluir usuário exclui o
código") não se aplica ainda; se um dia isso for adicionado, o mesmo cuidado (excluir
ou desativar dependendo do histórico) deve valer.

## 🎨 Frontend: componentes compartilhados + limpeza

Três padrões de UI que apareciam copiados em várias páginas (com pequenas diferenças
entre cada cópia) viraram componentes únicos em `frontend/src/components/`:

- **`Alerta.jsx`** — a faixa colorida de erro/sucesso/aviso, que estava reimplementada
  em 8 arquivos com pequenas variações (algumas com botão de fechar, outras sem;
  tamanhos de texto e espaçamento levemente diferentes). Agora é um componente só,
  com um visual único e mais polido (ícone + botão de fechar disponível em todo lugar).
- **`ModalShell.jsx`** — a moldura de modal (fundo escurecido + painel + faixa azul no
  topo), que estava copiada em `ModalChat`, `PainelAdmin` e `PainelOperario`. Ganhou de
  brinde um comportamento que não existia antes: clicar fora do painel fecha o modal.
- **`EmptyState.jsx`** — o cartão tracejado de "lista vazia", usado em
  `MinhasDemandas` e `PainelOperario`.

Aplicados nas 8 páginas/componentes que tinham esses padrões:
`Login`, `Cadastro`, `EsqueciSenha`, `RedefinirSenha`, `NovaDemanda`, `MinhasDemandas`,
`PainelAdmin`, `PainelOperario`, `ModalChat`.

**Limpeza de código morto encontrada nesse processo:**
- `components/ModalHistorico.jsx` — removido. Usava classes CSS (`.modal-overlay`,
  `.btn-close`, `.timeline-item` etc.) que não existiam em nenhum lugar do projeto
  (sobra de uma versão anterior do design) e não era importado por nenhuma página —
  se algum dia fosse chamado, renderizaria completamente sem estilo.
- `routes/AppRoutes.jsx` — removido. Era uma definição de rotas duplicada e não usada
  (o app inteiro roda a partir de `App.jsx`); tinha inclusive caminhos desatualizados
  (`/admin`/`/operario` em vez de `/painel-admin`/`/painel-operario`) que não batiam
  com o resto do app — se algum dia alguém trocasse `main.jsx` para usar esse arquivo
  por engano, o login quebraria.
