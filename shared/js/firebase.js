/* ============================================================
   shared/js/firebase.js
   Inicialização do Firebase + helpers de Firestore/Auth
   Usado por /app e /aluno
   ============================================================ */

const _firebaseConfig = {
  apiKey: "AIzaSyBVhMJfE1Zj9sVHztDXHUtsC_Y2WIikrkU",
  authDomain: "fichasacademia-8717d.firebaseapp.com",
  projectId: "fichasacademia-8717d",
  storageBucket: "fichasacademia-8717d.firebasestorage.app",
  messagingSenderId: "501312058117",
  appId: "1:501312058117:web:1b9ea06882050deeb33d6c"
};

const _app = firebase.initializeApp(_firebaseConfig);
const _db  = firebase.firestore();
const _auth = firebase.auth();

// ── Helpers Firestore (API compat → interface fluente) ──────────────────────
const _col = (db, ...paths) => {
  let ref = db.collection(paths[0]);
  for (let i = 1; i < paths.length; i += 2) {
    if (paths[i + 1]) ref = ref.doc(paths[i]).collection(paths[i + 1]);
  }
  return ref;
};

const _doc = (db, ...paths) => {
  let ref = db.collection(paths[0]);
  for (let i = 1; i < paths.length; i += 2) {
    ref = ref.doc(paths[i]);
    if (i + 1 < paths.length) ref = ref.collection(paths[i + 1]);
  }
  return ref;
};

const _setDoc    = (ref, data)           => ref.set(data);
const _getDoc    = (ref)                 => ref.get();
const _getDocs   = (query)               => query.get();
const _updateDoc = (ref, data)           => ref.update(data);
const _deleteDoc = (ref)                 => ref.delete();
const _query     = (col, ...constraints) => { let q = col; constraints.forEach(fn => { q = fn(q); }); return q; };
const _where     = (field, op, val)      => (q) => q.where(field, op, val);
const _orderBy   = (field, dir)          => (q) => q.orderBy(field, dir || 'asc');

// ── Auth helpers ────────────────────────────────────────────────────────────
// O app usa Firebase Auth com email virtual derivado do username
const _authEmail = (username) => `${username}@trainly.app`;

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normaliza Timestamp Firestore → milissegundos
function _tsToMs(v) {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return Number(v) || null;
}
