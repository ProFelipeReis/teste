/* ============================================================
   app/js/main.js
   Estado global, dashboard, navegação entre abas, notificações,
   perfil, sidebar mobile, anti-zoom iOS
   ============================================================ */

// ── Estado global da aplicação ──────────────────────────────────────────────
window.ST = {
  students: [],
  currentStudentId: null,
  planStudentId: null,
  editPlanId: null,
  workoutBlocks: []
};

// ── showDashboard: chamado após login bem-sucedido ──────────────────────────
window.showDashboardAfterLogin = window.showDashboard = function (userData) {
  const u = userData || window.CURRENT_USER || {};
  window.CURRENT_USER = u;
  if (window.CURRENT_USER.isTester === undefined) window.CURRENT_USER.isTester = false;

  // Splash pós-login
  const splash = document.getElementById('login-splash');
  const vid    = document.getElementById('login-splash-video');
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-sub-wall').style.display = 'none';

  if (splash && vid) {
    splash.classList.add('splash-in');
    vid.currentTime = 0;
    vid.play().catch(() => {});

    function _afterSplash() {
      splash.classList.add('splash-out');
      setTimeout(() => {
        splash.classList.remove('splash-in', 'splash-out');
        vid.pause();
      }, 420);
      document.getElementById('screen-dashboard').style.cssText = 'display:flex;flex-direction:column;';
    }

    const _splashTimeout = setTimeout(_afterSplash, 5000);
    vid.onended = () => { clearTimeout(_splashTimeout); _afterSplash(); };
  } else {
    document.getElementById('screen-dashboard').style.cssText = 'display:flex;flex-direction:column;';
  }

  (_applyUserUI || _applyUserUIEarly || function(){})();
  loadStudents();
  startNotifPolling();

  (function waitChat() {
    if (window.startChatBadgePolling) startChatBadgePolling();
    else setTimeout(waitChat, 200);
  })();

  // Re-valida trial a cada 5 minutos
  if (window._trialCheckInterval) clearInterval(window._trialCheckInterval);
  window._trialCheckInterval = setInterval(async () => {
    const u = window.CURRENT_USER || {};
    if (!u.username || u.role === 'ceo') return;
    try {
      const snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
      if (snap.empty) return;
      const sub = _checkSubscription(snap.docs[0].data());
      if (!sub.ok) {
        clearInterval(window._trialCheckInterval);
        window._trialCheckInterval = null;
        showSubscriptionWall();
      }
    } catch (e) {}
  }, 5 * 60 * 1000);

  setTimeout(() => { if (window._checkPendingReferralRevokeNotice) _checkPendingReferralRevokeNotice(); }, 1500);

  // Atualiza dados do Firestore
  _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username))).then(snap => {
    if (snap.empty) return;
    const mgr = snap.docs[0].data();
    window.CURRENT_USER.displayName = mgr.name || u.username;
    window.CURRENT_USER.phone = mgr.phone || '';
    window.CURRENT_USER.isTester = _isTesterActive(mgr);
    saveSession(window.CURRENT_USER);

    // Trial banner
    const sub = _checkSubscription(mgr);
    if (sub.type === 'trial') {
      showTrialBanner(sub.daysLeft);
      setTimeout(() => showTrialWelcomeModal(sub.daysLeft), 1200);
    }

    // Dashboard stats
    const statAlunos  = document.getElementById('stat-alunos');
    const statPlanos  = document.getElementById('stat-planos');
    const statExpired = document.getElementById('stat-expired');
    if (statAlunos) statAlunos.textContent = ST.students.length;
    if (statPlanos || statExpired) _loadPlanStats();

    _applyUserUI();
    if (window.checkPaymentReturn) checkPaymentReturn();
  }).catch(() => {});
};

// ── Carrega stats de planos no dashboard ────────────────────────────────────
async function _loadPlanStats() {
  try {
    const u = window.CURRENT_USER || {};
    const snap = await _getDocs(_query(_col(_db, 'plans'), _where('managerId', '==', u.username)));
    let active = 0, expired = 0;
    snap.docs.forEach(d => {
      const p = d.data();
      const st = window.getPlanStatus(p);
      if (st === 'active') active++;
      else if (st === 'expired') expired++;
    });
    const elA = document.getElementById('stat-planos');
    const elE = document.getElementById('stat-expired');
    if (elA) elA.textContent = active;
    if (elE) elE.textContent = expired;
  } catch (e) {}
}

// ── Plan status helpers ──────────────────────────────────────────────────────
window.isExpired    = p => p.expiry    ? new Date(p.expiry)              < new Date(new Date().toDateString()) : false;
window.isNotStarted = p => p.startDate ? new Date(p.startDate + 'T00:00') > new Date(new Date().toDateString()) : false;
window.getPlanStatus = p => {
  if (window.isExpired(p))    return 'expired';
  if (window.isNotStarted(p)) return 'upcoming';
  return 'active';
};

// ── Navegação entre abas ────────────────────────────────────────────────────
window.switchTab = function (tabId, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));

  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
  if (el) el.classList.add('active');

  // Sincroniza mobile nav
  const mobileItem = document.querySelector(`.mobile-nav-item[data-tab="${tabId}"]`);
  if (mobileItem) mobileItem.classList.add('active');

  // Ações específicas por aba
  if (tabId === 'tab-alunos')    { showStudentsList(); }
  if (tabId === 'tab-feedbacks') { if (window.loadFeedbacks) loadFeedbacks(); }
  if (tabId === 'tab-chat')      { if (window.loadChatList)  loadChatList(); }
  if (tabId === 'tab-gestores')  { if (window.loadGestores)  loadGestores(); }
  if (tabId === 'tab-report')    { if (window.loadReport)    loadReport(); }
  if (tabId === 'tab-ceo')       { if (window.loadCeoManagers) loadCeoManagers(); }
  if (tabId === 'tab-ceo-reports') { if (window.loadCeoReports) loadCeoReports(); }
};

window.goToAlunos = function () {
  const sidebarItem = document.querySelector('[data-tab="tab-alunos"]');
  switchTab('tab-alunos', sidebarItem);
};

// ── Navegação student detail ─────────────────────────────────────────────────
window.showStudentsList = function () {
  const listView   = document.getElementById('students-list-view');
  const detailView = document.getElementById('student-detail-view');
  if (listView)   listView.style.display   = '';
  if (detailView) detailView.style.display = 'none';
  ST.currentStudentId = null;
};

// ── Trial banner ─────────────────────────────────────────────────────────────
window.showTrialBanner = function (daysLeft) {
  const banner = document.getElementById('trial-banner');
  const text   = document.getElementById('trial-banner-text');
  if (banner && text) {
    text.textContent = daysLeft <= 1
      ? 'Seu período de teste expira hoje! Assine para não perder o acesso.'
      : `Você tem ${daysLeft} dias restantes de avaliação gratuita.`;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 8000);
  }
  const card   = document.getElementById('trial-dash-card');
  const daysEl = document.getElementById('trial-dash-days');
  const descEl = document.getElementById('trial-dash-desc');
  if (card) {
    card.classList.add('visible');
    if (daysEl) daysEl.textContent = daysLeft;
    if (descEl) {
      descEl.innerHTML = daysLeft <= 1
        ? 'Seu teste <strong style="color:#f5c800;">expira hoje!</strong><br/>Assine agora para continuar.'
        : `Você tem <strong style="color:#f5c800;">${daysLeft} dias</strong> restantes.<br/>Assine para não perder o acesso.`;
    }
  }
};

// ── Notificações ─────────────────────────────────────────────────────────────
window._notifData = [];
window._notifPanelOpen = false;

window.startNotifPolling = function () {
  if (!window.CURRENT_USER?.username) return;
  _pollNotifs();
  window._notifInterval = setInterval(_pollNotifs, 30000);
};

async function _pollNotifs() {
  try {
    const u = window.CURRENT_USER || {};
    const sids = ST.students.map(s => s.id);
    if (!sids.length) return;

    const snap = await _getDocs(_query(
      _col(_db, 'notifications'),
      _where('managerId', '==', u.username),
      _orderBy('ts', 'desc')
    ));

    window._notifData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = window._notifData.filter(n => !n.read).length;

    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.classList.toggle('hidden', unread === 0);
    }

    if (window._notifPanelOpen) renderNotifPanel();
  } catch (e) {}
}

window.toggleNotifPanel = function () {
  const panel = document.getElementById('notif-panel');
  window._notifPanelOpen = !window._notifPanelOpen;
  panel.classList.toggle('hidden', !window._notifPanelOpen);
  if (window._notifPanelOpen) {
    renderNotifPanel();
    setTimeout(() => {
      function outsideClick(e) {
        if (!e.target.closest('.notif-wrap-rel')) {
          panel.classList.add('hidden');
          window._notifPanelOpen = false;
          document.removeEventListener('click', outsideClick);
        }
      }
      document.addEventListener('click', outsideClick);
    }, 10);
  }
};

window.renderNotifPanel = function () {
  const list = document.getElementById('notif-list');
  if (!window._notifData.length) {
    list.innerHTML = '<div class="notif-panel-empty">Nenhuma notificação ainda</div>';
    return;
  }
  const typeIcon = {
    workout_done: '🏋️', workout_started: '▶️', workout_finished: '✅',
    workout_skipped: '⏭️', feedback_sent: '💬'
  };
  list.innerHTML = window._notifData.slice(0, 30).map(n => {
    let subtitle = '';
    if (n.type === 'workout_started') subtitle = `${n.workoutTitle || ''} · ${n.timeStr || n.date || ''}`;
    else if (n.type === 'workout_finished') subtitle = `Duração: ${n.totalTime || ''} · ${n.timeStr || ''}`;
    else if (n.type === 'feedback_sent') subtitle = n.feedbackText ? `"${n.feedbackText.slice(0, 60)}..."` : '';
    else subtitle = `${n.workoutTitle || ''} · ${n.date || ''}`;
    return `<div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon">${typeIcon[n.type] || '🔔'}</div>
      <div class="notif-text">
        <div class="notif-title">${n.studentName || ''}</div>
        <div class="notif-sub">${subtitle}</div>
      </div>
    </div>`;
  }).join('');
};

window.clearAllNotifs = async function () {
  try {
    const batch = _db.batch();
    window._notifData.forEach(n => {
      batch.update(_db.collection('notifications').doc(n.id), { read: true });
    });
    await batch.commit();
    window._notifData.forEach(n => n.read = true);
    renderNotifPanel();
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
  } catch (e) {}
};

// ── Perfil modal ──────────────────────────────────────────────────────────────
window.openProfileModal = function () {
  const u = window.CURRENT_USER || {};
  const el = id => document.getElementById(id);
  if (el('profile-name'))  el('profile-name').value  = u.displayName || '';
  if (el('profile-phone')) el('profile-phone').value = u.phone || '';
  openModal('modal-profile');
};

window.saveProfile = async function () {
  const u    = window.CURRENT_USER || {};
  const name = (document.getElementById('profile-name')?.value || '').trim();
  const phone= (document.getElementById('profile-phone')?.value || '').trim();
  if (!name) { toast('Nome obrigatório.', 'error'); return; }
  const btn = document.getElementById('btn-save-profile');
  if (btn) { btn.classList.add('btn-loading'); btn.textContent = 'Salvando...'; }
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
    if (!snap.empty) {
      await _updateDoc(_doc(_db, 'managers', snap.docs[0].id), { name, phone });
    }
    window.CURRENT_USER.displayName = name;
    window.CURRENT_USER.phone = phone;
    saveSession(window.CURRENT_USER);
    _applyUserUI();
    closeModal('modal-profile');
    toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Perfil atualizado!');
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar'; }
  }
};

// ── Alerta para aluno ─────────────────────────────────────────────────────────
window.openCreateAlertModal = function () {
  const sel = document.getElementById('alert-student-select');
  if (sel) {
    sel.innerHTML = '<option value="">— Selecione um aluno —</option>'
      + ST.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }
  document.getElementById('alert-message-text').value = '';
  document.getElementById('alert-error').textContent = '';
  openModal('modal-create-alert');
};

window.sendAlert = async function () {
  const sid = document.getElementById('alert-student-select').value;
  const msg = document.getElementById('alert-message-text').value.trim();
  const errEl = document.getElementById('alert-error');
  if (!sid) { errEl.textContent = 'Selecione um aluno.'; return; }
  if (!msg)  { errEl.textContent = 'Digite uma mensagem.'; return; }
  const btn = document.getElementById('btn-send-alert');
  btn.classList.add('btn-loading'); btn.textContent = 'Enviando...';
  try {
    await _updateDoc(_doc(_db, 'students', sid), {
      pendingAlert: msg,
      pendingAlertAt: Date.now()
    });
    closeModal('modal-create-alert');
    toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Alerta enviado!');
  } catch (e) {
    errEl.textContent = 'Erro: ' + e.message;
  } finally {
    btn.classList.remove('btn-loading'); btn.textContent = 'Enviar alerta';
  }
};

// ── Referral modal ────────────────────────────────────────────────────────────
window.openReferralModal = function () {
  const u = window.CURRENT_USER || {};
  const code = u.referralCode || '';
  const link = `https://trainly.online/app?ref=${code}`;
  const el = id => document.getElementById(id);
  if (el('referral-link-display')) el('referral-link-display').textContent = link;
  if (el('referral-code-display')) el('referral-code-display').textContent = code;
  openModal('modal-referral');
};

window.copyReferralLink = function () {
  const u = window.CURRENT_USER || {};
  const link = `https://trainly.online/app?ref=${u.referralCode || ''}`;
  navigator.clipboard.writeText(link).then(() => {
    toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!');
  }).catch(() => toast('Link: ' + link));
};

// ── Anti-zoom iOS ─────────────────────────────────────────────────────────────
document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend',    e => e.preventDefault(), { passive: false });

let _lastTap = 0;
document.addEventListener('touchend', e => {
  const t = e.target;
  if (t?.closest('.modal') || t?.closest('.modal-overlay') ||
      ['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(t?.tagName)) return;
  const now = Date.now();
  if (now - _lastTap < 300) e.preventDefault();
  _lastTap = now;
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
