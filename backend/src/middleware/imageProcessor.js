const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../services/logger');

async function compressImage(req, res, next) {
  if (!req.file) return next();

  const inputPath = req.file.path;
  const ext = '.webp';
  const filename = path.parse(req.file.filename).name + ext;
  const outputPath = path.join(req.file.destination, filename);

  try {
    await sharp(inputPath)
      .resize(1200, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    await fs.promises.unlink(inputPath);

    req.file.filename = filename;
    req.file.path = outputPath;

    const thumbnailBuf = await sharp(outputPath)
      .resize(200, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();

    req.file.thumbnailBlob = thumbnailBuf;
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao comprimir imagem');
  }

  next();
}

module.exports = { compressImage };
