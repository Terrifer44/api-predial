/* ==========================================
   VALIDAÇÃO DE ENTRADA — retornam { ok, valor } ou { ok:false, erro }
========================================== */

const ok = (valor) => ({ ok: true, valor });
const falha = (erro) => ({ ok: false, erro });

function texto(valor, { campo, min = 1, max = 255, opcional = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    return opcional ? ok(null) : falha(`${campo} é obrigatório.`);
  }
  if (typeof valor !== 'string') return falha(`${campo} inválido.`);
  const v = valor.trim();
  if (!v && opcional) return ok(null);
  if (v.length < min) return falha(`${campo} deve ter pelo menos ${min} caractere(s).`);
  if (v.length > max) return falha(`${campo} deve ter no máximo ${max} caracteres.`);
  return ok(v);
}

function enumerado(valor, permitidos, campo) {
  const v = typeof valor === 'string' ? valor.trim().toUpperCase() : '';
  return permitidos.includes(v) ? ok(v) : falha(`${campo} inválido. Use: ${permitidos.join(', ')}.`);
}

function email(valor, { opcional = true } = {}) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return opcional ? ok(null) : falha('E-mail é obrigatório.');
  }
  const v = String(valor).trim().toLowerCase();
  if (v.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return falha('E-mail inválido.');
  return ok(v);
}

function telefone(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return ok(null);
  const v = String(valor).trim();
  if (v.length > 30 || !/^[0-9()+\-.\s]{8,30}$/.test(v)) return falha('Telefone inválido.');
  return ok(v);
}

// Política de senha: 8–72 bytes (limite do bcrypt), com letra e número.
function senha(valor, campo = 'Senha') {
  if (typeof valor !== 'string') return falha(`${campo} é obrigatória.`);
  if (valor.length < 8) return falha(`${campo} deve ter pelo menos 8 caracteres.`);
  if (Buffer.byteLength(valor, 'utf8') > 72) return falha(`${campo} deve ter no máximo 72 caracteres.`);
  if (!/[A-Za-z]/.test(valor) || !/[0-9]/.test(valor)) return falha(`${campo} deve conter letras e números.`);
  return ok(valor);
}

function idPositivo(valor, campo = 'ID') {
  if (!['number','string'].includes(typeof valor) || (typeof valor === 'string' && !/^\d+$/.test(valor))) return falha(`${campo} inválido.`);
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n < 2_147_483_647 ? ok(n) : falha(`${campo} inválido.`);
}

function codigoAcesso(valor) {
  const v = typeof valor === 'string' ? valor.trim().toUpperCase() : '';
  return /^[A-Z0-9_-]{3,32}$/.test(v) ? ok(v) : falha('Código inválido: use de 3 a 32 letras, números, "-" ou "_".');
}

const booleano = (valor, campo) => (typeof valor === 'boolean' ? ok(valor) : falha(`${campo} deve ser verdadeiro ou falso.`));

module.exports = { texto, enumerado, email, telefone, senha, idPositivo, codigoAcesso, booleano };
