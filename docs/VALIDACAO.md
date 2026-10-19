# Validação e continuidade — 18/10/2026

## Evidências executadas

| Verificação | Resultado | Limite da evidência |
|---|---|---|
| `npm test` | **29 testes passaram, zero falhas** | API HTTP local com adaptador de banco em memória |
| `npm run check` | Sintaxe do app/servidor e Prisma schema válidos | Não aplica migrations nem conecta ao MySQL |
| `prisma generate` | Cliente 6.19.3 gerado | Não comprova compatibilidade com o banco hospedado |
| Frontend `npm run build` | Passou; aplicativo e PWA gerados | Não publica na Vercel |
| Frontend `npm run lint` | Passou sem erros/avisos | Não substitui teste de acessibilidade completo |
| `npm audit` backend | Zero vulnerabilidades reportadas na execução | Resultado dos avisos conhecidos nessa data; não é garantia de segurança |
| `npm audit` frontend | Zero vulnerabilidades reportadas na execução | Mesma ressalva |
| Navegador, dados fictícios | Login de morador/admin, painel, perfil, busca, detalhes e chat concluído observados | Nenhum usuário real utilizado |
| Layout mobile | Login e painel a 390 × 844, menu expansível verificado | Não é matriz completa de aparelhos/navegadores |

Na retomada após a interrupção, uma execução falhou por `EACCES` nas conexões locais e a auditoria por bloqueio de rede. Após restabelecer a permissão do ambiente, a suíte e as duas auditorias passaram novamente. Isso não foi tratado como sucesso de teste antes de repetir.

Os testes verificam: autenticação por token, rejeição do ID antigo, senha incorreta, permissões dos perfis, dados públicos do usuário, perfil sem elevação de privilégio, revogação de sessão, recuperação com hash e uso único, limites de login, códigos administrativos e reutilização, exclusão com/sem histórico, criação/triagem/transições, acesso a chat/histórico/fotos, chat concluído, paginação de conversa longa, upload HTML disfarçado, assinatura dos arquivos PDF/Excel, CORS e erros internos.

## Checklist priorizado

| ID | Problema / funcionalidade | Prioridade | Arquivos | Alterações | Testes | Resultado | Pendências |
|---|---|---|---|---|---|---|---|
| 01 | Autenticação por ID falsificável | P0 | app, server, lib/auth, lib/token, frontend/services | Token assinado e versão de sessão; integração cliente/servidor | HTTP, login, revogação | Passou local | Homologar nova autenticação nos três perfis reais |
| 02 | Dados sensíveis nas respostas | P0 | routes/admin, routes/auth | Seleção explícita, erros genéricos | Listagem e perfil | Passou local | Revisão externa recomendada antes de produção |
| 03 | Recuperação e senha fixa de seed | P1 | routes/auth, lib/email, prisma/seed | Hash, expiração, uso único, limites; seed manual sem senha padrão | HTTP + fluxo de token | Passou local | Entrega SMTP real e políticas do provedor |
| 04 | Rotas recuperadas sem integração | P1 | app, routes/* | Integração das quatro rotas recuperadas e relatórios | API e build | Passou local | Banco real |
| 05 | Chat/estado final | P1 | routes/demandas, ModalChat | Autorização, bloqueio condicional em transação, modo leitura e paginação | HTTP + navegador | Passou local | Concorrência real no MySQL |
| 06 | Upload e acesso a fotos | P1 | lib/upload, FotoDemanda | Assinatura de arquivo, nomes aleatórios, rota protegida, Cloudinary autenticado | Arquivo inválido e permissões | Parcial | Testar upload/entrega no Cloudinary real; migrar recursos antigos públicos |
| 07 | Remoção de foto | P1 | routes/demandas | Desvinculação condicional, sem deixar referência quebrada por apagar primeiro | API | Parcial | Limpeza física manual; automatização bloqueada pela revisão de aprovação |
| 08 | Exclusão de usuários/códigos | P1 | routes/admin | Rotas recuperadas; transação e recusa quando existe histórico | HTTP | Passou no adaptador | Verificar FKs reais; novo botão de exclusão bloqueado pela revisão de aprovação |
| 09 | Perfil e troca de senha | P2 | Perfil, AuthContext, Header | Edição de dados e credenciais, revogação de outras sessões | HTTP, build, tela no navegador | Passou local | Teste completo com banco real |
| 10 | Interface | P2 | Login, Dashboard, Header, index.css, painéis | Tema claro/escuro, menu mobile, resumo, busca, histórico, modais nativos | Build, lint, navegador | Passou local | Testes completos de teclado, leitor de tela e aparelhos |
| 11 | Dependências | P1 | manifests e locks | Atualizações de segurança, remoção de dependências sem uso, overrides focados | Audit, Prisma, build, testes PDF/Excel | Zero avisos conhecidos | Monitorar advisories e testar SMTP/Cloudinary com as versões atualizadas |
| 12 | Implantação segura | P1 | scripts, env.example, vercel.json, docs | Sem migrations/seed no start; CORS, CSP, health/readiness e roteiro | Schema/build | Preparado para homologação | Publicação, configuração e migrations não executadas |

## Decisões e limites técnicos

- Tokens ficam em `sessionStorage`, não no armazenamento persistente antigo. Isso limita persistência, mas não impede roubo por JavaScript malicioso; a CSP é uma camada adicional. Uma evolução para cookies HttpOnly exige planejar os domínios e a política cross-site. Logout remove a sessão do navegador; troca de senha/bloqueio revogam tokens no servidor.
- Limites de tentativas ficam na memória de uma instância. Em múltiplas réplicas ou necessidade de persistência, usar um armazenamento compartilhado; não há Redis nesta entrega.
- A interface carrega páginas de demandas para preservar o resumo completo e depois filtra localmente. Para grande volume, mover também os resumos/filtros para consultas agregadas e paginação sob demanda. Usuários/códigos têm limite de 500 na API recebida; notificações exibem as últimas 30.
- O histórico persistente implementado é o de mudanças de status. Ações administrativas geram logs, mas não há tabela de auditoria administrativa imutável. Essa evolução ficou no backlog.
- Fotos antigas públicas do Cloudinary não se tornam privadas retroativamente. A remoção da referência não equivale a eliminação física do arquivo.
- Não há fila durável de e-mail. Falhas de entrega não revertem a alteração do chamado. Para produção com exigência de entrega, implementar fila/retry e monitoramento.
- Prisma 6.19.3 foi preservado. Foram aplicados overrides `deepmerge-ts@8.0.0` e `exceljs → uuid@11.1.1` para avisos de segurança. Geração/validação do Prisma e geração de PDF/Excel passaram; manter esse cuidado ao atualizar os locks.
- As migrations foram inspecionadas e o schema validado, mas não houve MySQL disponível para aplicá-las. Não foi confirmado que o banco de produção corresponde ao histórico do pacote.
- O código do GitHub não foi baixado nem comparado. A fonte desta revisão é o pacote e os textos fornecidos.

## Próximo lote recomendado após homologação

1. Testes de integração reais em MySQL para concorrência, transações e chaves estrangeiras.
2. Política de retenção e limpeza física aprovada para imagens; inventário e migração de fotos legadas.
3. Auditoria administrativa persistente e observabilidade, sem informações sensíveis nos logs.
4. Filtros totalmente paginados no servidor e métricas agregadas para volume maior.
5. Somente depois: avaliação do atendimento, materiais, categorias e manutenção preventiva. Essas ideias não foram implementadas indiscriminadamente.
