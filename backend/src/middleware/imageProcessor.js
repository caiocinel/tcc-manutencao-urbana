// Middleware de compressão de imagens usando Sharp
// Redimensiona para 800px e converte para WebP (qualidade 80)
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function compressImage(req, res, next) {
  // Se não tem arquivo, pula o middleware
  if (!req.file) return next();

  const inputPath = req.file.path;
  const ext = '.webp';
  const filename = path.parse(req.file.filename).name + ext;
  const outputPath = path.join(req.file.destination, filename);

  try {
    // Redimensiona mantendo proporção, max 800px na maior dimensão
    await sharp(inputPath)
      .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Remove o arquivo original não comprimido
    fs.unlinkSync(inputPath);

    // Atualiza as informações do arquivo para o resto da cadeia
    req.file.filename = filename;
    req.file.path = outputPath;
  } catch (err) {
    console.error('Erro ao comprimir imagem:', err.message);
  }

  next();
}

module.exports = { compressImage };
