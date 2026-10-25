export function readAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(new Error("size"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
