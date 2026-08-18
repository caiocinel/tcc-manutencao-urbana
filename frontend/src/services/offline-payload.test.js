import { describe, it, expect } from 'vitest';
import {
  formDataToOfflinePayload,
  payloadToFormData,
  fileToBase64,
  base64ToFile,
  isFileLike,
} from './offline-payload';

function makeFormData(entries) {
  const fd = new FormData();
  entries.forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function makeTestFile(name = 'foto.jpg', type = 'image/jpeg', content = 'fake-image-bytes') {
  return new File([content], name, { type });
}

describe('fileToBase64 / base64ToFile', () => {
  it('converte File para data URL base64 e reconstrói File equivalente', async () => {
    const file = makeTestFile('foto.jpg', 'image/jpeg', 'conteudo-teste');
    const dataUrl = await fileToBase64(file);
    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);

    const restored = base64ToFile(dataUrl, 'foto.jpg', 'image/jpeg');
    expect(restored).toBeInstanceOf(File);
    expect(restored.name).toBe('foto.jpg');
    expect(restored.type).toBe('image/jpeg');
    await expect(restored.text()).resolves.toBe('conteudo-teste');
  });

  it('preserva conteúdo binário ao round-trip', async () => {
    const bytes = new Uint8Array([0, 255, 128, 42, 7]);
    const file = new File([bytes], 'binario.bin', { type: 'application/octet-stream' });
    const dataUrl = await fileToBase64(file);
    const restored = base64ToFile(dataUrl, 'binario.bin', 'application/octet-stream');
    const restoredBytes = new Uint8Array(await restored.arrayBuffer());
    expect(Array.from(restoredBytes)).toEqual(Array.from(bytes));
  });
});

describe('isFileLike', () => {
  it('retorna true para File e Blob', () => {
    expect(isFileLike(new File(['x'], 'a.txt'))).toBe(true);
    expect(isFileLike(new Blob(['x']))).toBe(true);
  });

  it('retorna false para strings, números e objetos comuns', () => {
    expect(isFileLike('texto')).toBe(false);
    expect(isFileLike(123)).toBe(false);
    expect(isFileLike({ a: 1 })).toBe(false);
    expect(isFileLike(null)).toBe(false);
    expect(isFileLike(undefined)).toBe(false);
  });
});

describe('formDataToOfflinePayload', () => {
  it('converte FormData simples (strings) em objeto plano', async () => {
    const fd = makeFormData([
      ['titulo', 'Buraco na rua'],
      ['descricao', 'Buraco enorme perto da escola'],
      ['categoria', 'Buraco'],
    ]);
    const payload = await formDataToOfflinePayload(fd);
    expect(payload).toEqual({
      titulo: 'Buraco na rua',
      descricao: 'Buraco enorme perto da escola',
      categoria: 'Buraco',
    });
  });

  it('serializa campos File com __type file e dados base64', async () => {
    const file = makeTestFile('foto.jpg', 'image/jpeg', 'bytes-da-foto');
    const fd = makeFormData([
      ['titulo', 'Poste apagado'],
      ['file', file],
    ]);
    const payload = await formDataToOfflinePayload(fd);

    expect(payload.titulo).toBe('Poste apagado');
    expect(payload.file).toBeDefined();
    expect(payload.file.__type).toBe('file');
    expect(payload.file.name).toBe('foto.jpg');
    expect(payload.file.type).toBe('image/jpeg');
    expect(payload.file.data.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('produz payload serializável com JSON.stringify (sem perder File)', async () => {
    const file = makeTestFile('foto.jpg', 'image/jpeg', 'bytes');
    const fd = makeFormData([['file', file], ['titulo', 'X']]);
    const payload = await formDataToOfflinePayload(fd);
    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);
    expect(parsed.file.__type).toBe('file');
    expect(parsed.file.data).toContain('base64');
  });
});

describe('payloadToFormData', () => {
  it('reconstrói FormData com campos de texto', () => {
    const fd = payloadToFormData({
      titulo: 'Buraco',
      descricao: 'desc',
    });
    expect(fd.get('titulo')).toBe('Buraco');
    expect(fd.get('descricao')).toBe('desc');
  });

  it('reconstrói File a partir de payload serializado com __type file', async () => {
    const payload = {
      titulo: 'Poste',
      file: {
        __type: 'file',
        name: 'foto.jpg',
        type: 'image/jpeg',
        data: await fileToBase64(makeTestFile('foto.jpg', 'image/jpeg', 'bytes-originais')),
      },
    };
    const fd = payloadToFormData(payload);
    const restoredFile = fd.get('file');
    expect(restoredFile).toBeInstanceOf(File);
    expect(restoredFile.name).toBe('foto.jpg');
    expect(restoredFile.type).toBe('image/jpeg');
    await expect(restoredFile.text()).resolves.toBe('bytes-originais');
  });

  it('round-trip completo: FormData → payload → FormData preserva imagem', async () => {
    const original = makeFormData([
      ['titulo', 'Entulho na calçada'],
      ['descricao', 'Entulho acumulado'],
      ['file', makeTestFile('entulho.png', 'image/png', 'png-bytes')],
    ]);
    const payload = await formDataToOfflinePayload(original);
    const restored = payloadToFormData(payload);

    expect(restored.get('titulo')).toBe('Entulho na calçada');
    const file = restored.get('file');
    expect(file).toBeInstanceOf(File);
    await expect(file.text()).resolves.toBe('png-bytes');
  });
});
