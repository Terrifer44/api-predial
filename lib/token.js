const crypto = require('crypto');

/* ==========================================
   TOKENS DE SESSÃO (JWT HS256, sem dependências externas)

   Substitui o antigo cabeçalho "x-usuario-id", que permitia a qualquer
   pessoa se passar por qualquer usuário (inclusive o administrador)
   bastando enviar um número. Agora o servidor só aceita um token
   ASSINADO por ele mesmo; sem o segredo (JWT_SECRET) é impossível forjar.
========================================== */

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const fromB64url = (str) => Buffer.from(str, 'base64url');
const hmac = (dados, segredo) => crypto.createHmac('sha256', segredo).update(dados).digest();

/**
 * Descobre o segredo de assinatura.
 * 1) JWT_SECRET (recomendado — defina no Render);
 * 2) fallback estável derivado da DATABASE_URL (já secreta), para o login não quebrar
 *    se a variável for esquecida — com aviso no log;
 * 3) segredo aleatório (testes/desenvolvimento sem banco).
 */
function obterSegredo(env = process.env) {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres aleatórios.');
  if (env.JWT_SECRET) console.warn('[AUTH] JWT_SECRET definido, mas curto demais (mín. 32 caracteres). Ignorando no desenvolvimento.');
  if (env.DATABASE_URL) {
    console.warn('[AUTH] JWT_SECRET não definido — usando segredo derivado da DATABASE_URL. Defina JWT_SECRET (32+ caracteres aleatórios) no Render.');
    return crypto.createHash('sha256').update(`api-predial-sessao|${env.DATABASE_URL}`).digest('hex');
  }
  console.warn('[AUTH] Sem JWT_SECRET nem DATABASE_URL — usando segredo aleatório (sessões somem ao reiniciar).');
  return crypto.randomBytes(32).toString('hex');
}

function assinarToken(payload, segredo, expiraEmSegundos = 24 * 3600, agora = Date.now()) {
  const iat = Math.floor(agora / 1000);
  const corpo = { ...payload, iat, exp: iat + expiraEmSegundos };
  const cabecalho = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const dados = `${cabecalho}.${b64url(JSON.stringify(corpo))}`;
  return `${dados}.${b64url(hmac(dados, segredo))}`;
}

/** Retorna o payload se o token for íntegro e não expirado; senão, null. */
function verificarToken(token, segredo, agora = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const cabecalho = JSON.parse(fromB64url(partes[0]).toString('utf8'));
    if (cabecalho.alg !== 'HS256') return null; // bloqueia "alg: none" e afins
    const esperado = hmac(`${partes[0]}.${partes[1]}`, segredo);
    const recebido = fromB64url(partes[2]);
    if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) return null;
    const payload = JSON.parse(fromB64url(partes[1]).toString('utf8'));
    if (!Number.isInteger(payload.exp) || !Number.isInteger(payload.iat) || payload.iat > Math.floor(agora / 1000) || Math.floor(agora / 1000) >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

module.exports = { obterSegredo, assinarToken, verificarToken, sha256 };
