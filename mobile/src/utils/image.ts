/**
 * Seleção de imagens (galeria ou câmera).
 *
 * O web usava `<input type="file">`; aqui usamos o expo-image-picker e
 * normalizamos o resultado para o formato que o FormData do React Native
 * espera (`{ uri, name, type }`).
 */

import * as ImagePicker from 'expo-image-picker';

import type { PickedImage } from '@/types';

/** O backend aceita JPEG, PNG e WebP. */
const MIME_PADRAO = 'image/jpeg';
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

export class ImagemMuitoGrandeError extends Error {
  constructor() {
    super('Arquivo muito grande. Máximo 5MB.');
    this.name = 'ImagemMuitoGrandeError';
  }
}

function normalizar(asset: ImagePicker.ImagePickerAsset): PickedImage {
  const type = asset.mimeType ?? MIME_PADRAO;
  const extensao = type.split('/')[1] ?? 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `foto-${Date.now()}.${extensao}`,
    type,
  };
}

function validarTamanho(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize > TAMANHO_MAXIMO_BYTES) throw new ImagemMuitoGrandeError();
}

/** Abre a galeria. Devolve `null` se o usuário cancelar ou negar a permissão. */
export async function escolherDaGaleria(): Promise<PickedImage | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return null;

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;

  validarTamanho(resultado.assets[0]);
  return normalizar(resultado.assets[0]);
}

/** Abre a câmera. Devolve `null` se o usuário cancelar ou negar a permissão. */
export async function tirarFoto(): Promise<PickedImage | null> {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissao.granted) return null;

  const resultado = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;

  validarTamanho(resultado.assets[0]);
  return normalizar(resultado.assets[0]);
}
