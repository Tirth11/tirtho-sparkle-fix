// Per-thread selected-model cache. Survives reloads and is read synchronously
// at mount time so the picker shows the right model before the DB fetch lands.

const KEY = "tirthoai.thread-model.v1";

type Cache = Record<string, { modelId: string; updatedAt: string }>;

function read(): Cache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Cache;
  } catch {
    return {};
  }
}

function write(c: Cache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore quota */
  }
}

export const ModelCache = {
  get(threadId: string): { modelId: string; updatedAt: string } | undefined {
    return read()[threadId];
  },
  set(threadId: string, modelId: string) {
    const c = read();
    c[threadId] = { modelId, updatedAt: new Date().toISOString() };
    write(c);
  },
  remove(threadId: string) {
    const c = read();
    delete c[threadId];
    write(c);
  },
};
