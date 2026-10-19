/** Erro de negócio/validação com status HTTP — tratado pelo handler global (sem vazar detalhes internos). */
class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
    this.expose = true;
  }
}

/** Lança ErroHttp 400 se uma validação falhar; senão devolve o valor. */
function exigir(resultado) {
  if (!resultado.ok) throw new ErroHttp(400, resultado.erro);
  return resultado.valor;
}

module.exports = { ErroHttp, exigir };
