// Serialização de FormData para payload offline (IndexedDB) e reconstrução.
// Resolve o bug onde File/Blob eram serializados como `{}` e as imagens se perdiam.
//
// Formato de payload serializável:
//   - Strings/valores simples: armazenados como estão
//   - File/Blob: { __type: 'file', name, type, data: <dataURL base64> }

export function isFileLike(value) {
  return value instanceof File || value instanceof Blob;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function base64ToFile(dataUrl, name, type) {
  const [header, base64] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const mime = type || (header && header.match(/data:([^;]+)/)?.[1]) || 'application/octet-stream';
  return new File([bytes], name || 'arquivo', { type: mime });
}

export async function formDataToOfflinePayload(formData) {
  const obj = {};
  for (const [key, value] of formData.entries()) {
    if (isFileLike(value)) {
      obj[key] = {
        __type: 'file',
        name: value.name || '',
        type: value.type || '',
        data: await fileToBase64(value),
      };
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

export function payloadToFormData(payload) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === 'object' && value.__type === 'file') {
      formData.append(key, base64ToFile(value.data, value.name, value.type));
    } else {
      formData.append(key, value);
    }
  }
  return formData;
}
