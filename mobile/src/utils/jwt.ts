/**
 * Decodificação do payload de um JWT.
 *
 * O React Native não expõe `atob`/`btoa` como globais (ao contrário do
 * navegador, onde o web usa `atob` direto), então o base64url é decodificado
 * aqui — sem dependência extra, já que só precisamos ler o payload.
 */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlParaBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of base64) {
    const valor = ALFABETO.indexOf(char);
    if (valor === -1) continue;
    buffer = (buffer << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

function bytesParaTexto(bytes: Uint8Array): string {
  // O payload do JWT é UTF-8; decodificamos manualmente porque o TextDecoder
  // não está garantido em todos os runtimes do Hermes.
  let resultado = '';
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    let codePoint: number;
    let tamanho: number;

    if (byte < 0x80) {
      codePoint = byte;
      tamanho = 1;
    } else if ((byte & 0xe0) === 0xc0) {
      codePoint = byte & 0x1f;
      tamanho = 2;
    } else if ((byte & 0xf0) === 0xe0) {
      codePoint = byte & 0x0f;
      tamanho = 3;
    } else {
      codePoint = byte & 0x07;
      tamanho = 4;
    }

    for (let j = 1; j < tamanho && i + j < bytes.length; j++) {
      codePoint = (codePoint << 6) | (bytes[i + j] & 0x3f);
    }

    resultado += String.fromCodePoint(codePoint);
    i += tamanho;
  }
  return resultado;
}

export type JwtPayload = {
  user_id?: number;
  email?: string;
  exp?: number;
  [key: string]: unknown;
};

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length < 2) return null;
  try {
    return JSON.parse(bytesParaTexto(base64UrlParaBytes(partes[1])));
  } catch {
    return null;
  }
}
