/* ==========================================
   LIMITADOR DE TENTATIVAS (em memória, sem dependências)
   Janela fixa por chave (IP, código de acesso...). Suficiente para uma única
   instância (Render). Com várias instâncias, trocar por armazenamento compartilhado (Redis).
========================================== */

function criarLimitador({ janelaMs, max, chave, mensagem }) {
  const registros = new Map();
  const limpeza = setInterval(() => {
    const agora = Date.now();
    for (const [k, v] of registros) if (v.expira <= agora) registros.delete(k);
  }, Math.min(janelaMs, 60_000));
  limpeza.unref?.();

  /** Conta uma tentativa para a chave `k`. Se estourou o limite, responde 429 e retorna true. */
  function verificar(res, k) {
    if (!k) return false;
    const agora = Date.now();
    let r = registros.get(k);
    if (!r || r.expira <= agora) {
      r = { total: 0, expira: agora + janelaMs };
      registros.set(k, r);
    }
    r.total += 1;
    if (r.total > max) {
      res.set('Retry-After', String(Math.ceil((r.expira - agora) / 1000)));
      res.status(429).json({ erro: mensagem || 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
      return true;
    }
    return false;
  }

  function middleware(req, res, next) {
    if (verificar(res, chave ? chave(req) : null)) return;
    next();
  }
  middleware.verificar = verificar;
  middleware.reset = () => registros.clear();
  return middleware;
}

const MIN = 60 * 1000;
const HORA = 60 * MIN;

/** Conjunto de limitadores usados pela API (por IP, por conta ou por usuário). */
function criarLimitadoresPadrao() {
  const porIp = (req) => req.ip || req.socket?.remoteAddress || 'ip-desconhecido';
  const l = {
    loginIp: criarLimitador({ janelaMs: 15 * MIN, max: 50, chave: porIp, mensagem: 'Muitas tentativas de login. Aguarde alguns minutos.' }),
    loginCodigo: criarLimitador({ janelaMs: 15 * MIN, max: 8, mensagem: 'Muitas tentativas para este código de acesso. Aguarde 15 minutos ou use "Esqueci minha senha".' }),
    cadastroIp: criarLimitador({ janelaMs: HORA, max: 30, chave: porIp, mensagem: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }),
    esqueciIp: criarLimitador({ janelaMs: HORA, max: 10, chave: porIp, mensagem: 'Muitos pedidos de recuperação de senha. Tente novamente mais tarde.' }),
    esqueciCodigo: criarLimitador({ janelaMs: HORA, max: 3, mensagem: 'Muitos pedidos para este código de acesso. Tente novamente em 1 hora.' }),
    redefinirIp: criarLimitador({ janelaMs: HORA, max: 20, chave: porIp, mensagem: 'Muitas tentativas. Tente novamente mais tarde.' }),
    trocaSenhaUsuario: criarLimitador({ janelaMs: 15 * MIN, max: 10, chave: (req) => req.usuarioAutenticado && `u${req.usuarioAutenticado.id}`, mensagem: 'Muitas tentativas de troca de senha. Aguarde alguns minutos.' }),
  };
  Object.defineProperty(l, 'resetTodos', { value: () => Object.values(l).forEach((x) => x.reset()), enumerable: false });
  return l;
}

module.exports = { criarLimitador, criarLimitadoresPadrao };
