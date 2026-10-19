# API e permissões

Envie `Authorization: Bearer <token>` nas rotas protegidas. `x-usuario-id` é ignorado. Senhas, tokens de recuperação e hashes nunca são retornados nas listagens. Sessões expiram em oito horas; o perfil e o estado ativo são relidos do banco a cada chamada.

| Método e caminho | Quem usa | Contrato principal |
|---|---|---|
| POST `/api/login` | Público, limitado | `codigo_acesso`, `senha`; retorna token e dados públicos |
| POST `/api/cadastro` | Público, limitado | `codigo_liberacao`, `nome`, `senha`, `telefone?`, `email?` |
| POST `/api/esqueci-senha` | Público, limitado | `codigo_acesso`; resposta genérica |
| POST `/api/redefinir-senha` | Público, limitado | `token`, `nova_senha` |
| GET / PUT `/api/perfil` | Qualquer usuário ativo | Editáveis somente nome, telefone e e-mail |
| PUT `/api/perfil/senha` | Qualquer usuário ativo | `senha_atual`, `nova_senha`; retorna novo token |
| GET `/api/usuarios` | Administrador | Campos públicos de moradores/operários; filtros `busca`, `tipo`, `ativo` |
| PUT `/api/usuarios/:id/status` | Administrador | `ativo` booleano; não bloqueia admin nem a própria conta |
| DELETE `/api/usuarios/:id` | Administrador | Recusa registros com histórico; remove código associado |
| GET / POST `/api/codigos-liberacao` | Administrador | Criação: `tipo_usuario`, `codigo?`, `validade_dias?` (1–90, padrão 7) |
| DELETE `/api/codigos-liberacao/:id` | Administrador | Regra herdada: pode excluir conta vinculada sem histórico; confirmar impacto |
| GET `/api/operarios` | Administrador | Operários ativos para triagem |
| POST `/api/demandas` | Morador | `setor`, `descricao` (5–2000), `urgencia_morador`, `foto?`; JSON ou multipart |
| GET `/api/demandas` | Administrador | Filtros e paginação abaixo |
| GET `/api/demandas/morador/:id` | Próprio morador ou admin | Não aceita morador consultando outro |
| GET `/api/demandas/operario/:id` | Próprio operário ou admin | Somente tarefas atribuídas |
| PUT `/api/demandas/:id/atribuir` | Administrador | `id_operario`, `urgencia_real`; concluídas são finais |
| PUT `/api/demandas/:id/status-operario` | Operário atribuído | `novo_status`, `motivo_impedimento?` (obrigatório em impedimento) |
| GET `/api/demandas/:id/historico` | Participante ou admin | Histórico de mudanças de status |
| GET / POST `/api/demandas/:id/comentarios` | Participante ou admin | Envio: `mensagem` até 1000 caracteres; concluída somente leitura |
| GET `/api/demandas/:id/foto` | Participante ou admin | Binário da imagem com autorização |
| DELETE `/api/demandas/:id/foto` | Admin ou dono pendente | Desvincula; limpeza física manual |
| DELETE `/api/demandas/:id` | Administrador | Exclusão definitiva de demanda e cascatas do schema |
| GET `/api/notificacoes/:idUsuario` | Próprio usuário ou admin | Últimas 30 notificações |
| PUT `/api/notificacoes/:id/lida` | Dono ou admin | Marca uma como lida |
| PUT `/api/notificacoes/:idUsuario/marcar-todas` | Dono ou admin | Marca todas |
| GET `/api/relatorios/excel` ou `/pdf` | Administrador | `mes`, `ano`, `status`, `operario`; máximo 5000 registros |
| GET `/health`, `/ready` | Público | Serviço vivo / banco acessível, sem detalhes internos |

Listagens de demandas: `pagina` a partir de 1, `limite` até 500 (padrão 200), `status`, `urgencia`, `busca`, `de`, `ate`, `atrasadas`; administrador também pode usar `operario`. Cabeçalho `X-Total-Count` informa o total. A interface atual carrega as páginas e filtra localmente; para grandes volumes, evoluir os filtros e a paginação da tela para consultas sob demanda.

SLA: urgência ALTA = 24h, MEDIA = 72h, BAIXA = 168h a partir da primeira triagem. Reatribuição preserva um prazo já definido. Não há reabertura de demandas concluídas nesta versão.

Falhas esperadas: 400 validação, 401 sessão inválida, 403 sem permissão, 404 ausente, 409 conflito/histórico, 413 tamanho excessivo, 429 excesso de tentativas, 502/503 indisponibilidade. Erros internos não retornam stack/consulta. Não exiba conteúdo técnico de erro ao usuário.
