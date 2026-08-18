// Polyfill de FileReader para ambiente Node (Vitest).
// Node 20+ tem File/Blob/FormData/atob, mas não FileReader (API de browser).
// Implementa o subset usado por fileToBase64.
if (typeof globalThis.FileReader === 'undefined') {
  class FileReader {
    constructor() {
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onerror = null;
    }

    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);
        this.result = `data:${blob.type || ''};base64,${base64}`;
        if (this.onload) this.onload();
      }).catch((err) => {
        this.error = err;
        if (this.onerror) this.onerror(err);
      });
    }
  }
  globalThis.FileReader = FileReader;
}
