<div align="center">

# 🏢 API-Predial

**Sistema web de gestão de manutenção predial**

Projeto Integrador desenvolvido no **SENAI**, com fluxo completo de abertura, triagem, acompanhamento e conclusão de solicitações de manutenção.

[**Acessar a aplicação**](https://api-predial.vercel.app) · [**Código-fonte**](https://github.com/joaogabrielgois/api-predial) · [**Melhorias implementadas**](./MELHORIAS.md)

</div>

---

## Sobre o projeto

O **API-Predial** centraliza a comunicação entre moradores, equipe de manutenção e administradores. O sistema organiza demandas, registra o andamento dos serviços e facilita o acompanhamento de prazos e ocorrências.

O projeto foi criado para colocar em prática desenvolvimento **full-stack**, consumo de APIs, modelagem de banco de dados e publicação de aplicações web.

## Funcionalidades

| Perfil | O que pode fazer |
| --- | --- |
| **Morador** | Registrar demandas com foto opcional, acompanhar status e prazo (SLA), conversar no chamado e recuperar a senha. |
| **Operário** | Visualizar demandas atribuídas, atualizar o andamento, registrar impedimentos e concluir serviços. |
| **Administrador** | Fazer triagem, definir prioridade, atribuir responsáveis, gerenciar usuários e códigos de liberação, acompanhar relatórios. |

**Recursos adicionais:** notificações internas e por e-mail, histórico de mudanças de status, relatórios Excel/PDF, interface responsiva e suporte a PWA.

## Tecnologias

| Camada | Ferramentas |
| --- | --- |
| Frontend | React, Vite, React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express |
| Banco de dados | MySQL, Prisma ORM |
| Armazenamento de imagens | Cloudinary (produção) e pasta local (desenvolvimento) |
| Relatórios e comunicação | ExcelJS, PDFKit, Nodemailer |
| Hospedagem utilizada | Vercel (frontend), Render (backend), Aiven (MySQL) |

## Organização do repositório

```text
api-predial/
├── frontend/
│   ├── public/          # Arquivos estáticos e PWA
│   └── src/
│       ├── components/  # Componentes reutilizáveis
│       ├── context/     # Contextos React
│       ├── pages/       # Telas da aplicação
│       └── services/    # Comunicação com a API
├── lib/                 # Upload, notificações, e-mail e relatórios
├── prisma/
│   ├── migrations/      # Migrações versionadas
│   ├── schema.prisma    # Modelagem do banco de dados
│   └── seed.js          # Dados iniciais de desenvolvimento
├── uploads/             # Diretório local (arquivos não versionados)
├── server.js            # API Express
├── .env.example         # Modelo de variáveis do backend
└── package.json
```

## Como executar localmente

### Pré-requisitos
- Node.js e npm compatíveis com as versões de Vite e Express do projeto.
- Servidor MySQL acessível e um banco de dados criado.
- Configurações locais do backend e frontend (sem compartilhar credenciais).

### 1. Clonar e instalar as dependências

```bash
git clone https://github.com/joaogabrielgois/api-predial.git
cd api-predial
npm install
cd frontend
npm install
cd ..
```

### 2. Configurar o ambiente

Crie **`.env`** na raiz a partir de **`.env.example`** e **`frontend/.env`** a partir de **`frontend/.env.example`**. Preencha os valores somente em seu ambiente local ou no gerenciador de variáveis da hospedagem.

Principais variáveis:

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Conexão MySQL utilizada pelo Prisma |
| `PORT` | Porta local da API |
| `FRONTEND_URL` | URL do frontend, usada em links de recuperação |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio opcional de e-mails |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Armazenamento de imagens |
| `VITE_API_URL` | URL da API acessada pelo frontend |

**Nunca envie arquivos `.env`, senhas, chaves, fotos reais de chamados ou dados de usuários para um repositório público.** No Vite, variáveis com prefixo `VITE_` são expostas no bundle do navegador e não devem conter segredos.

### 3. Preparar o banco de dados

Depois de configurar `DATABASE_URL`:

```bash
npx prisma generate
npx prisma migrate deploy
```

O repositório também tem um *seed* para inicialização de ambiente. **Revise e substitua credenciais padrão antes de utilizá-lo**; não execute seeds em ambientes compartilhados ou de produção sem compreender os efeitos.

### 4. Iniciar a aplicação

Em um terminal, na raiz:

```bash
npm run dev
```

Em outro terminal:

```bash
cd frontend
npm run dev
```

Use o endereço mostrado pelo Vite para acessar o frontend. A configuração padrão do frontend aponta para `http://localhost:3000` quando `VITE_API_URL` não é definida.

## Fluxo principal

1. O morador registra uma solicitação, com descrição e foto opcional.
2. O administrador classifica a urgência e atribui um operário.
3. O operário registra andamento, eventual impedimento e conclusão.
4. O sistema mantém histórico, notificações e acompanhamento do prazo.

## Publicação

A aplicação foi estruturada para deploy com **frontend na Vercel**, **API no Render** e **MySQL no Aiven**. Cada ambiente deve receber suas próprias variáveis de configuração.

Antes de implantar uma versão pública, revise especialmente **autenticação e autorização**, **credenciais iniciais do seed**, **acesso a imagens e dados pessoais**, políticas de CORS, migrations e backups. O script `npm run deploy` do repositório executa migrações e seed; avalie seu uso antes de configurar inicializações automáticas em produção.

## Segurança e privacidade

- Mantenha senhas, tokens e credenciais apenas em variáveis de ambiente seguras.
- Não publique capturas com informações pessoais, códigos de acesso ou links de redefinição de senha.
- Use **dados fictícios** em demonstrações e testes.
- Se uma credencial já tiver sido enviada ao Git, ela deve ser revogada/rotacionada; apenas apagá-la de um commit futuro não elimina o histórico.

## Contexto

Projeto Integrador do **SENAI**, desenvolvido para fins educacionais e de portfólio.

**Desenvolvedor:** João Gabriel dos Santos Gois.

---

<div align="center">
  <sub>Desenvolvido como projeto de aprendizagem em desenvolvimento de sistemas.</sub>
</div>
