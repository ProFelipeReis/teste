/* ============================================================
   app/js/auth.js
   Login, logout, sessão local, subscription check, Auth Firebase
   ============================================================ */

// ── LocalStorage session ────────────────────────────────────────────────────
const LS_GESTOR = 'forge_gestor_session';

function saveSession(data) {
  try { localStorage.setItem(LS_GESTOR, typeof data === 'string' ? data : JSON.stringify(data)); } catch (e) {}
}
function clearSession() {
  try { localStorage.removeItem(LS_GESTOR); } catch (e) {}
}
function hasSession() {
  try { return !!localStorage.getItem(LS_GESTOR); } catch (e) { return false; }
}
function getSession() {
  try {
    const v = localStorage.getItem(LS_GESTOR);
    if (!v) return null;
    const s = JSON.parse(v);
    if (!s || typeof s !== 'object') return null;
    s.phone = s.phone || '';
    if (!s.role) s.role = s.isMaster ? 'master' : 'comum';
    const _teMs = _tsToMs(s.testerEndsAt);
    if (s.isTester && _teMs && _teMs <= Date.now()) s.isTester = false;
    return s;
  } catch (e) { return null; }
}

// ── Subscription helpers ────────────────────────────────────────────────────
function _isTesterActive(mgr) {
  if (!mgr.isTester) return false;
  const ends = _tsToMs(mgr.testerEndsAt);
  if (!ends) return true;
  return ends > Date.now();
}

function _checkSubscription(mgr) {
  const now = Date.now();
  const trialMs = _tsToMs(mgr.trialEndsAt);
  const subMs   = _tsToMs(mgr.subEndsAt);
  if (trialMs && now < trialMs) {
    return { ok: true, type: 'trial', daysLeft: Math.ceil((trialMs - now) / 86400000) };
  }
  if (subMs && now < subMs) {
    return { ok: true, type: 'active', daysLeft: Math.ceil((subMs - now) / 86400000) };
  }
  return { ok: false, type: 'expired' };
}

// ── Login error helper ──────────────────────────────────────────────────────
function showLoginError(msg) {
  const t = document.createElement('div');
  t.className = 'toast error';
  t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg> ${msg}`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Após autenticação: decide para onde o usuário vai ──────────────────────
function _loginSuccess(userData) {
  saveSession(userData);
  window.CURRENT_USER = userData;
  location.reload();
}

// ── UI do topbar / sidebar baseada no role ──────────────────────────────────
function _applyUserUI() {
  const u = window.CURRENT_USER || {};
  const pill = document.getElementById('topbar-user-pill');
  if (pill) pill.textContent = u.displayName || u.username || 'gestor';

  const greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) {
    const h  = new Date().getHours();
    const p  = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const fn = ((u.displayName || u.username || '').split(' ')[0]) || 'você';
    greetingEl.textContent = `${p}, ${fn} 👋`;
  }

  document.querySelectorAll('.sidebar-item-gestores,.mobile-nav-item-gestores').forEach(el =>
    el.classList.toggle('hidden', !(u.role === 'master' || u.role === 'ceo' || !!u.isMaster))
  );
  document.querySelectorAll('.sidebar-item-report,.mobile-nav-item-report').forEach(el =>
    el.classList.toggle('hidden', !u.isTester)
  );
  document.querySelectorAll('.sidebar-item-ceo').forEach(el =>
    el.classList.toggle('hidden', u.role !== 'ceo')
  );
}
window._applyUserUIEarly = _applyUserUI;

// ── Firebase Auth helpers ───────────────────────────────────────────────────
// Deriva e-mail interno a partir do username (nunca exposto ao usuário)
function _authEmail(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@trainly-app.internal';
}

async function _ensureAuthAccount(email, password) {
  try {
    const cred = await _auth.createUserWithEmailAndPassword(email, password);
    return cred.user.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred2 = await _auth.signInWithEmailAndPassword(email, password);
      return cred2.user.uid;
    }
    throw e;
  }
}

// ── LOGIN PRINCIPAL ─────────────────────────────────────────────────────────
async function doLogin() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  if (!user || !pass) { showLoginError('Preencha usuário e senha.'); return; }

  const btn = document.querySelector('#login-form button[type=button]');
  if (btn) { btn.textContent = 'Verificando...'; btn.disabled = true; }

  try {
    // Aguarda Firebase
    let attempts = 0;
    while ((!window.firebase || !window.firebase.firestore || !_auth) && attempts < 40) {
      await new Promise(r => setTimeout(r, 100)); attempts++;
    }
    if (!window.firebase || !window.firebase.firestore || !_auth) {
      showLoginError('Erro de conexão. Tente novamente.'); return;
    }

    // Autentica no Auth via e-mail derivado
    const authEmail = _authEmail(user);
    try {
      await _auth.signInWithEmailAndPassword(authEmail, pass);
    } catch (authErr) {
      if (['auth/wrong-password','auth/invalid-credential','auth/user-not-found'].includes(authErr.code)) {
        showLoginError('Usuário ou senha incorretos.');
      } else {
        showLoginError('Erro ao autenticar: ' + authErr.message);
      }
      return;
    }

    // Lê documento do manager no Firestore
    const snap = await _db.collection('managers').where('username', '==', user).get();
    if (snap.empty) {
      await _auth.signOut();
      showLoginError('Usuário ou senha incorretos.');
      return;
    }

    const docSnap = snap.docs[0];
    const mgr = docSnap.data();

    if (mgr.blocked) {
      await _auth.signOut();
      const reasons = mgr.blockReasons?.length ? mgr.blockReasons : [];
      showBlockedScreen(reasons);
      return;
    }

    const role = mgr.role || (mgr.isMaster ? 'master' : 'comum');
    const subStatus = (role !== 'ceo') ? _checkSubscription(mgr) : null;

    // Garante referralCode permanente
    let referralCode = mgr.referralCode || '';
    if (!referralCode) {
      const arr = new Uint8Array(5); crypto.getRandomValues(arr);
      referralCode = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      try { await _db.collection('managers').doc(docSnap.id).update({ referralCode }); } catch (e) {}
    }

    _loginSuccess({
      id: docSnap.id, username: user, role,
      isMaster: role === 'master' || role === 'ceo',
      isCeo: role === 'ceo',
      isTester: _isTesterActive(mgr),
      displayName: mgr.name || user,
      phone: mgr.phone || '',
      subStatus, trialEndsAt: mgr.trialEndsAt || null,
      subEndsAt: mgr.subEndsAt || null, referralCode,
    });

  } catch (e) {
    showLoginError('Erro: ' + e.message);
  } finally {
    if (btn) { btn.textContent = 'Acessar painel →'; btn.disabled = false; }
  }
}

// ── LOGOUT ──────────────────────────────────────────────────────────────────
window.logoutGestor = window.doLogout = async function () {
  try { if (_auth?.currentUser) await _auth.signOut(); } catch (e) {}
  clearSession();
  try { localStorage.removeItem('trainly_role'); } catch (e) {}
  location.reload();
};

// ── Tela de conta bloqueada ─────────────────────────────────────────────────
function showBlockedScreen(reasons) {
  document.getElementById('screen-login').style.display = 'none';
  const screen = document.getElementById('screen-blocked');
  if (!screen) return;
  screen.style.display = '';
  screen.classList.add('on');
  const list = document.getElementById('blocked-reasons-list');
  if (!list) return;
  const isCrefFake = reasons.some(r => r?.includes('CREF'));
  if (reasons?.length) {
    list.innerHTML = '<div class="blocked-reasons-title">Motivos registrados</div>'
      + reasons.map(r => `<div class="blocked-reason-item">${r}</div>`).join('')
      + (isCrefFake ? `<div style="margin-top:12px;padding:12px 14px;background:#fff8e1;border-radius:8px;border:1px solid #ffc107;">
        <p style="font-size:.76rem;color:#5a3e00;line-height:1.7;margin-bottom:6px;"><strong>Exercício Ilegal da Profissão:</strong>
        previsto no <strong>Art. 47 da Lei das Contravenções Penais</strong>.</p></div>` : '');
  } else {
    list.innerHTML = '<div class="blocked-reasons-title">Motivo</div><div class="blocked-reason-item">Violação dos Termos de Uso</div>';
  }
}

function logoutFromBlocked() {
  const s = document.getElementById('screen-blocked');
  if (s) { s.classList.remove('on'); s.style.display = 'none'; }
  clearSession();
  window.CURRENT_USER = null;
  document.getElementById('screen-login').style.display = 'flex';
}

// ── Inicializa sessão existente ao carregar ─────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Bind Enter no formulário
  const form = document.getElementById('login-form');
  if (form) form.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // Restaura sessão do localStorage
  const session = getSession();
  if (session) {
    window.CURRENT_USER = session;
    if (session.role === 'ceo') {
      (function waitCeo() {
        if (window.showCeoPanel) showCeoPanel();
        else setTimeout(waitCeo, 100);
      })();
    } else if (session.subStatus && !session.subStatus.ok) {
      (function waitWall() {
        if (window.showSubscriptionWall) showSubscriptionWall();
        else setTimeout(waitWall, 100);
      })();
    } else {
      (function waitDash() {
        if (window.showDashboardAfterLogin) showDashboardAfterLogin(session);
        else setTimeout(waitDash, 100);
      })();
    }
  }
});
