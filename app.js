const express = require('express');
const cors = require('cors');
const { criarAuth } = require('./lib/auth');
const { obterSegredo } = require('./lib/token');
const { criarLimitadoresPadrao } = require('./lib/rateLimit');
const { criarRotasAuth } = require('./routes/auth');
const { criarRotasAdmin } = require('./routes/admin');
const { criarRotasDemandas } = require('./routes/demandas');
const { criarRotasNotificacoes } = require('./routes/notificacoes');
const { criarRotasRelatorios } = require('./routes/relatorios');

function criarApp({ prisma, env = process.env, email = require('./lib/email'), armazenamento = require('./lib/upload') }) {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(env.TRUST_PROXY_HOPS));
  const frontendUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const origens = (env.CORS_ORIGINS || frontendUrl).split(',').map((v) => v.trim());
  const config = { segredo: obterSegredo(env), frontendUrl, sessaoSegundos: 8 * 3600, limitadores: criarLimitadoresPadrao() };
  const auth = criarAuth({ prisma, segredo: config.segredo });
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
    if (env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.use(cors({ origin(origin, cb) { cb(null, !origin || origens.includes(origin)); }, exposedHeaders: ['X-Total-Count', 'X-Demanda-Status'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/ready', async (req, res) => { try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'indisponivel' }); } });
  app.use(auth.identificarUsuario);
  const dependencias = { prisma, auth, config, email, armazenamento };
  app.use(criarRotasAuth(dependencias), criarRotasAdmin(dependencias), criarRotasDemandas(dependencias), criarRotasNotificacoes(dependencias), criarRotasRelatorios(dependencias));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.expose) return res.status(err.status).json({ erro: err.message, ...err.extra });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
    if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ erro: 'Arquivo ou conteúdo maior que o limite permitido.' });
    if (err.name === 'MulterError') return res.status(400).json({ erro: 'Envie somente uma foto JPG, PNG ou WEBP de até 5 MB.' });
    if (err.code === 'P2002') return res.status(409).json({ erro: 'Este registro já existe.' });
    if (err.code === 'P2003') return res.status(409).json({ erro: 'Existem registros relacionados. Preserve o histórico e bloqueie o acesso, se necessário.' });
    if (err.code === 'P2025') return res.status(404).json({ erro: 'Registro não encontrado.' });
    if (err.code === 'P2034') return res.status(409).json({ erro: 'Outra alteração ocorreu ao mesmo tempo. Atualize e tente novamente.' });
    console.error('[API] Falha interna:', err.code || err.name || 'Error');
    res.status(500).json({ erro: 'Não foi possível concluir a operação. Tente novamente.' });
  });
  return app;
}
module.exports = { criarApp };
