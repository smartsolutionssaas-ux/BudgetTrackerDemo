// Storage adapters for the app: Memory, File System Access API, Download/Upload fallback

(function(){
  // Helper: check File System Access API
  const hasFSA = !!(window.showDirectoryPicker && window.isSecureContext !== false);

  // Memory storage keeps data only for the session
  class MemoryStorage {
    constructor(initial = {}) {
      this.kind = 'memory';
      this.store = { ...initial };
    }
    async loadAll() { return { ...this.store }; }
    async get(type) { return this.store[type] ?? null; }
    async set(type, data) { this.store[type] = data; }
    async isConnected() { return true; }
    async connect() { return true; }
    label() { return 'In-Memory'; }
  }

  // File System Access API storage
  class FileSystemAccessStorage {
    constructor() {
      this.kind = 'fsa';
      this.dirHandle = null;
      // kick off async restore of previously connected folder
      this._restorePromise = this._restoreDirHandleFromIDB().catch(() => {});
      this.fileMap = {
        categories: 'categories.json',
        planner: 'planner.json',
        transactions: 'transactions.json',
        debtsPayoff: 'debtsPayoff.json',
        investments: 'investments.json'
      };
    }
    async connect() {
      if (!hasFSA) throw new Error('File System Access API not available');
      this.dirHandle = await window.showDirectoryPicker();
      // persist handle for future sessions
      try {
        await this._idbSet('dirHandle', this.dirHandle);
      } catch {}
      return true;
    }
    async isConnected() {
      if (!this.dirHandle) {
        // await any pending restore
        if (this._restorePromise) {
          try { await this._restorePromise; } catch {}
        }
      }
      if (!this.dirHandle) return false;
      // verify permission; try to request if not granted
      try {
        const ok = await this._verifyRWPermission(this.dirHandle);
        if (!ok) return false;
      } catch {}
      return !!this.dirHandle;
    }
    async label() {
      // Directory name when available
      try {
        return this.dirHandle ? (this.dirHandle.name || 'Connected Folder') : 'Not Connected';
      } catch { return 'Connected'; }
    }
    async _verifyRWPermission(handle) {
      if (!handle || !handle.requestPermission) return true;
      try {
        // First query permission state
        if (handle.queryPermission) {
          const state = await handle.queryPermission({ mode: 'readwrite' });
          if (state === 'granted') return true;
        }
        const status = await handle.requestPermission({ mode: 'readwrite' });
        return status === 'granted';
      } catch { return true; }
    }
    async _readFile(name) {
      if (!this.dirHandle) return null;
      try {
        const fh = await this.dirHandle.getFileHandle(name, { create: false });
        const file = await fh.getFile();
        const text = await file.text();
        return JSON.parse(text);
      } catch { return null; }
    }
    async _writeFile(name, data) {
      if (!this.dirHandle) return;
      const fh = await this.dirHandle.getFileHandle(name, { create: true });
      const writable = await fh.createWritable();
      await writable.write(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      await writable.close();
    }
    async loadAll() {
      const out = {};
      for (const [key, filename] of Object.entries(this.fileMap)) {
        out[key] = await this._readFile(filename);
      }
      return out;
    }
    async get(type) {
      const filename = this.fileMap[type];
      if (!filename) return null;
      return await this._readFile(filename);
    }
    async set(type, data) {
      const filename = this.fileMap[type];
      if (!filename) return;
      await this._writeFile(filename, data);
    }

    // ===== IndexedDB helpers to persist the directory handle =====
    async _openDB() {
      return await new Promise((resolve, reject) => {
        const req = indexedDB.open('finance-app', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('fsa')) db.createObjectStore('fsa');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    async _idbSet(key, value) {
      const db = await this._openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('fsa', 'readwrite');
        const store = tx.objectStore('fsa');
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
    async _idbGet(key) {
      const db = await this._openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('fsa', 'readonly');
        const store = tx.objectStore('fsa');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    async _idbDelete(key) {
      const db = await this._openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('fsa', 'readwrite');
        const store = tx.objectStore('fsa');
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
    async _restoreDirHandleFromIDB() {
      if (!hasFSA) return;
      try {
        const stored = await this._idbGet('dirHandle');
        if (stored) {
          this.dirHandle = stored;
        }
      } catch {}
    }
    async disconnect() {
      try { await this._idbDelete('dirHandle'); } catch {}
      this.dirHandle = null;
      return true;
    }
  }

  // Fallback: user manually downloads/uploads JSON
  // We expose set/get via download/upload prompts when needed.
  class DownloadUploadStorage {
    constructor(initial = {}) {
      this.kind = 'download-upload';
      this.memory = { ...initial };
    }
    async connect() { return true; }
    async isConnected() { return true; }
    label() { return 'Manual Import/Export'; }
    async loadAll() { return { ...this.memory }; }
    async get(type) { return this.memory[type] ?? null; }
    async set(type, data) {
      this.memory[type] = data;
      // Trigger a download as a gentle persistence step
      try {
        const blob = new Blob([JSON.stringify(this.memory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financial_data_backup.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {}
    }
  }

  function createDefaultAdapter(initial) {
    if (hasFSA) return new FileSystemAccessStorage();
    return new DownloadUploadStorage(initial);
  }

  window.StorageAdapters = {
    MemoryStorage,
    FileSystemAccessStorage,
    DownloadUploadStorage,
    createDefaultAdapter,
  };
})();
