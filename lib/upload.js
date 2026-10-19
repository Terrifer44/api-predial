const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { ErroHttp } = require('./erros');
const PASTA_UPLOADS = path.resolve(__dirname, '../uploads');
const cloudinaryConfigurado = Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
if (cloudinaryConfigurado && !process.env.CLOUDINARY_URL) cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 10000 } }).single('foto');
function formatoImagem(b) {
  if (b?.length >= 12 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (b?.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpg';
  if (b?.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function uploadFoto(req, res, next) {
  upload(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next();
    try {
      const formato = formatoImagem(req.file.buffer);
      if (!formato) throw new ErroHttp(400, 'O conteúdo do arquivo não é uma imagem JPG, PNG ou WEBP válida.');
      if (cloudinaryConfigurado) {
        const resultado = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: 'manutencao-predial/demandas', type: 'authenticated', resource_type: 'image', allowed_formats: ['jpg','png','webp'], transformation: [{ width: 1600, height: 1600, crop: 'limit' }] }, (erro, valor) => erro ? reject(erro) : resolve(valor));
          stream.end(req.file.buffer);
        });
        req.file.dados = { url: resultado.secure_url, publicId: resultado.public_id };
      } else {
        if (process.env.NODE_ENV === 'production') throw new ErroHttp(503, 'Armazenamento de imagens indisponível.');
        await fs.mkdir(PASTA_UPLOADS, { recursive: true });
        const nome = `${crypto.randomUUID()}.${formato}`;
        await fs.writeFile(path.join(PASTA_UPLOADS, nome), req.file.buffer, { flag: 'wx' });
        req.file.dados = { url: `/uploads/${nome}`, publicId: nome };
      }
      delete req.file.buffer;
      next();
    } catch (erro) { next(erro); }
  });
}
const obterDadosArquivoEnviado = (file) => file?.dados || { url: null, publicId: null };
async function removerArquivo({ url, publicId }) {
  if (!url) return;
  if (url.startsWith('/uploads/')) {
    const nome = url.slice('/uploads/'.length);
    if (!/^[a-zA-Z0-9_.-]+$/.test(nome) || nome.includes('..')) throw new Error('Caminho inválido');
    await fs.unlink(path.join(PASTA_UPLOADS, nome)).catch((e) => { if (e.code !== 'ENOENT') throw e; });
    return;
  }
  const parsed = new URL(url);
  const cloudName = cloudinary.config().cloud_name;
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || !cloudName || !parsed.pathname.startsWith(`/${cloudName}/image/`)) throw new Error('Recurso externo não reconhecido');
  const legado = parsed.pathname.match(/\/image\/upload\/(?:v\d+\/)?(manutencao-predial\/demandas\/[^.]+)\.[a-z]+$/i);
  const id = publicId || (legado && decodeURIComponent(legado[1]));
  if (!id || !id.startsWith('manutencao-predial/demandas/') || id.includes('..')) throw new Error('Identificador de imagem inválido');
  const resultado = await cloudinary.uploader.destroy(id, { resource_type: 'image', type: parsed.pathname.includes('/authenticated/') ? 'authenticated' : 'upload', invalidate: true });
  if (!['ok', 'not found'].includes(resultado.result)) throw new Error('Falha no armazenamento');
}
async function enviarArquivo(res, demanda) {
  const url = demanda.foto_url;
  if (url.startsWith('/uploads/')) {
    const nome = url.slice('/uploads/'.length);
    if (!/^[a-zA-Z0-9_.-]+$/.test(nome) || nome.includes('..')) throw new ErroHttp(404, 'Imagem indisponível.');
    return res.sendFile(nome, { root: PASTA_UPLOADS, headers: { 'Cache-Control': 'no-store' } });
  }
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || !parsed.pathname.startsWith(`/${cloudinary.config().cloud_name}/image/`)) throw new ErroHttp(404, 'Imagem indisponível.');
  const privada = parsed.pathname.includes('/authenticated/');
  const origem = privada ? cloudinary.url(demanda.foto_public_id, { type: 'authenticated', sign_url: true, secure: true }) : url;
  const resposta = await fetch(origem, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!resposta.ok || !/^image\/(jpeg|png|webp)/.test(resposta.headers.get('content-type') || '')) throw new ErroHttp(502, 'Imagem indisponível no armazenamento.');
  res.type(resposta.headers.get('content-type')).send(Buffer.from(await resposta.arrayBuffer()));
}
module.exports = { uploadFoto, obterDadosArquivoEnviado, removerArquivo, enviarArquivo, PASTA_UPLOADS, formatoImagem };
