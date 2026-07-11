// ═══ IndexedDB wrapper ═══
const DB_NAME = 'linkbase';
const DB_VER  = 2;
let _db;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('links')) {
        const ls = db.createObjectStore('links', { keyPath: 'id', autoIncrement: true });
        ls.createIndex('collection', 'collection', { unique: false });
        ls.createIndex('favorite',   'favorite',   { unique: false });
        ls.createIndex('reading',    'reading',    { unique: false });
      }
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror   = e => rej(e.target.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    t.onerror = e => rej(e.target.error);
    res(fn(t.objectStore(store)));
  });
}

function req2p(r) {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = e => rej(e.target.error); });
}

// ── Links ──
const DB = {
  addLink:    data => tx('links','readwrite', s => req2p(s.add({ ...data, createdAt: Date.now() }))),
  updateLink: data => tx('links','readwrite', s => req2p(s.put(data))),
  deleteLink: id   => tx('links','readwrite', s => req2p(s.delete(id))),
  getLink:    id   => tx('links','readonly',  s => req2p(s.get(id))),
  getAllLinks: ()   => tx('links','readonly',  s => req2p(s.getAll())),

  addCollection:    data => tx('collections','readwrite', s => req2p(s.add({ ...data, createdAt: Date.now() }))),
  getAllCollections: ()   => tx('collections','readonly',  s => req2p(s.getAll())),
  deleteCollection: id   => tx('collections','readwrite', s => req2p(s.delete(id))),
};
