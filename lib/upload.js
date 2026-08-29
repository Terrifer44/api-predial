const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/* ==========================================
   UPLOAD DE IMAGENS
   Permite que o morador anexe uma foto do problema
   (ex: cano vazando) para o operário já saber quais
   ferramentas levar antes mesmo de ver o local.

   Em produção, usa o Cloudinary (armazenamento externo e
   persistente) — necessário porque serviços como o Render, no
   plano gratuito, apagam o disco local a cada novo deploy/reinício,
   o que faria as fotos enviadas desaparecerem.

   Se as variáveis do Cloudinary não estiverem configuradas (ex: em
   desenvolvimento local sem conta criada), o sistema cai automaticamente
   para salvar os arquivos em disco, na pasta /uploads — só não
   sobrevive a redeploys num serviço com disco efêmero.
========================================== */

const cloudinaryConfigurado = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (cloudinaryConfigurado && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function filtroArquivo(req, file, cb) {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagem não suportado. Envie um arquivo JPG, PNG ou WEBP.'));
  }
}

let storage;

if (cloudinaryConfigurado) {
  console.log('[UPLOAD] Cloudinary configurado — fotos serão armazenadas na nuvem.');
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'manutencao-predial/demandas',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      // Limita o tamanho da imagem já no upload, evitando arquivos gigantes.
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    },
  });
} else {
  console.log('[UPLOAD] Cloudinary não configurado — usando disco local (/uploads). Não recomendado em produção.');
  const PASTA_UPLOADS = path.join(__dirname, '..', 'uploads');

  if (!fs.existsSync(PASTA_UPLOADS)) {
    fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_UPLOADS),
    filename: (req, file, cb) => {
      const sufixo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extensao = path.extname(file.originalname).toLowerCase();
      cb(null, `demanda-${sufixo}${extensao}`);
    },
  });
}

const upload = multer({
  storage,
  fileFilter: filtroArquivo,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * Retorna a URL pública do arquivo enviado, seja ele armazenado no
 * Cloudinary (URL absoluta) ou em disco local (caminho relativo /uploads/...).
 */
function obterUrlArquivoEnviado(file) {
  if (!file) return null;

  // Cloudinary: multer-storage-cloudinary já preenche `file.path` com a
  // secure_url pública (ex: https://res.cloudinary.com/...).
  if (file.path && /^https?:\/\//.test(file.path)) {
    return file.path;
  }

  // Disco local (fallback): servido estaticamente pelo próprio backend.
  return `/uploads/${file.filename}`;
}

module.exports = {
  upload,
  obterUrlArquivoEnviado,
  cloudinaryConfigurado,
  PASTA_UPLOADS: path.join(__dirname, '..', 'uploads'),
};
