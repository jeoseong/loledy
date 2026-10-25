import type { Champion, ChampionInput, ElementInput, WikiElement } from "./types";

const DB_NAME = "WikiVozesDB";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha no armazenamento local."));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Falha no armazenamento local."));
    tx.onabort = () => reject(tx.error ?? new Error("Operação cancelada."));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("champions")) {
        db.createObjectStore("champions", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("elements")) {
        const store = db.createObjectStore("elements", { keyPath: "id", autoIncrement: true });
        store.createIndex("champId", "champId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir a wiki neste aparelho."));
  });
}

export function getDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Armazenamento indisponível."));
  }
  if (!dbPromise) {
    dbPromise = openDb().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function loadAll(): Promise<{ champions: Champion[]; elements: WikiElement[] }> {
  const db = await getDb();
  const tx = db.transaction(["champions", "elements"], "readonly");
  const championsReq = tx.objectStore("champions").getAll();
  const elementsReq = tx.objectStore("elements").getAll();
  const [champions, elements] = await Promise.all([
    wrap<Champion[]>(championsReq),
    wrap<WikiElement[]>(elementsReq),
  ]);
  return { champions, elements };
}

export async function putChampion(record: ChampionInput): Promise<number> {
  const db = await getDb();
  const tx = db.transaction("champions", "readwrite");
  const key = await wrap(tx.objectStore("champions").put(record));
  return Number(key);
}

export async function putElement(record: ElementInput): Promise<number> {
  const db = await getDb();
  const tx = db.transaction("elements", "readwrite");
  const key = await wrap(tx.objectStore("elements").put(record));
  return Number(key);
}

export async function deleteElement(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("elements", "readwrite");
  const done = txDone(tx);
  tx.objectStore("elements").delete(id);
  await done;
}

export async function deleteChampionCascade(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["champions", "elements"], "readwrite");
  const done = txDone(tx);
  tx.objectStore("champions").delete(id);
  await new Promise<void>((resolve, reject) => {
    const request = tx.objectStore("elements").index("champId").openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Falha ao excluir falas."));
  });
  await done;
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["champions", "elements"], "readwrite");
  const done = txDone(tx);
  tx.objectStore("champions").clear();
  tx.objectStore("elements").clear();
  await done;
}
