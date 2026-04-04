/* ============================================================
   app/js/ceo.js
   Painel CEO: gestão de managers, histórico de pagamentos,
   preços, CREF pendente, reports
   ============================================================ */

window._ceoAllManagers = [];
window._ceoPayFilter = 'all';
window._ceoPayAll = [];

// ── Exibe painel CEO ──────────────────────────────────────────────────────────
window.showCeoPanel = function () {
  window.CURRENT_USER.isMaster = true;
  window.showDashboardAfterLogin(window.CURRENT_USER);
  setTimeout(() => {
    const ceoTab = document.querySelector('[data-tab="tab-ceo"]');
    if (ceoTab) switchTab('tab-ceo', ceoTab);
    loadCrefPending();
    loadCeoPaymentHistory();
  }, 300);
};

// ── Carrega todos os gestores ─────────────────────────────────────────────────
window.loadCeoManagers = async function () {
  const tbody = document.getElementById('ceo-managers-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="spinner" style="margin:20px auto;"></div></td></tr>';
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
    window._ceoAllManagers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCeoTable(window._ceoAllManagers);
    loadCeoPaymentHistory();

    let active = 0, trial = 0, expired = 0;
    window._ceoAllManagers.forEach(m => {
      if (m.role === 'ceo') return;
      const sub = _checkSubscription(m);
      if (sub.type === 'active') active++;
      else if (sub.type === 'trial') trial++;
      else expired++;
    });
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('ceo-stat-total',   window._ceoAllManagers.length);
    set('ceo-stat-active',  active);
    set('ceo-stat-trial',   trial);
    set('ceo-stat-expired', expired);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);padding:20px;">Erro: ${e.message}</td></tr>`;
  }
};

window.renderCeoTable = function (list) {
  const tbody = document.getElementById('ceo-managers-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">Nenhum gestor.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(m => {
    const sub = m.role !== 'ceo' ? _checkSubscription(m) : null;
    let subBadge = !sub ? '<span class="sub-status-badge sub-active">⭐ CEO</span>'
      : sub.type === 'trial'   ? `<span class="sub-status-badge sub-trial">🕐 Teste (${sub.daysLeft}d)</span>`
      : sub.type === 'active'  ? `<span class="sub-status-badge sub-active">✓ Ativo (${sub.daysLeft}d)</span>`
      :                          '<span class="sub-status-badge sub-expired">✕ Expirado</span>';
    if (m.blocked) subBadge = '<span class="sub-status-badge sub-blocked">🔒 Bloqueado</span>';
    const roleBadge = m.role === 'ceo' ? '<span class="role-badge role-ceo">CEO</span>'
      : m.role === 'master' ? '<span class="role-badge role-master">Master</span>'
      : '<span class="role-badge role-comum">Comum</span>';
    const expDate = m.subEndsAt ? new Date(m.subEndsAt).toLocaleDateString('pt-BR')
      : m.trialEndsAt ? new Date(m.trialEndsAt).toLocaleDateString('pt-BR') + ' (trial)' : '—';
    const safeJson = JSON.stringify(m).replace(/'/g,"&#39;").replace(/"/g,'&quot;');
    return `<tr>
      <td><strong>${m.name || m.username}</strong><br><span style="font-size:.74rem;color:var(--text3);">@${m.username}</span>${m.cref ? `<br><span style="font-size:.7rem;color:var(--text3);">CREF: ${m.cref}</span>` : ''}</td>
      <td>${roleBadge}</td>
      <td>${subBadge}</td>
      <td style="font-size:.8rem;">${expDate}</td>
      <td class="ceo-actions-cell">
        <button class="btn btn-ghost btn-sm" onclick="openCeoEditModal('${m.id}')">✏️ Editar</button>
      </td>
    </tr>`;
  }).join('');
};

window.filterCeoTable = function (query) {
  const q = (query || document.getElementById('ceo-search')?.value || '').toLowerCase();
  const filtered = q
    ? window._ceoAllManagers.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.username || '').toLowerCase().includes(q) ||
        (m.cref || '').toLowerCase().includes(q))
    : window._ceoAllManagers;
  renderCeoTable(filtered);
};

// ── Editar gestor ──────────────────────────────────────────────────────────────
window._ceoEditMgrId = null;
window.openCeoEditModal = function (mgrId) {
  const m = window._ceoAllManagers.find(x => x.id === mgrId);
  if (!m) return;
  window._ceoEditMgrId = mgrId;
  document.getElementById('ceo-edit-title').textContent    = 'Gerenciar: ' + (m.name || m.username);
  document.getElementById('ceo-edit-avatar').textContent   = initials(m.name || m.username || '?');
  document.getElementById('ceo-edit-name').textContent     = m.name || m.username;
  document.getElementById('ceo-edit-username').textContent = '@' + m.username;
  document.getElementById('ceo-edit-role').value           = m.role || 'comum';
  document.getElementById('ceo-edit-blocked').checked      = !!m.blocked;
  document.getElementById('ceo-edit-sub-type').value       = 'trial7';
  document.getElementById('ceo-edit-error').textContent    = '';
  updateCeoSubUI();
  openModal('modal-ceo-edit');
};

window.updateCeoSubUI = function () {
  const type = document.getElementById('ceo-edit-sub-type').value;
  document.getElementById('ceo-custom-days-wrap').style.display = type === 'custom' ? '' : 'none';
  document.getElementById('ceo-edit-date-wrap').style.display   = type === 'setdate' ? '' : 'none';
  document.getElementById('ceo-tester-days-wrap').style.display = type === 'tester' ? '' : 'none';
};

window.ceoSaveManagerEdits = async function () {
  const mgrId  = window._ceoEditMgrId;
  const btn    = document.getElementById('btn-ceo-save');
  const errEl  = document.getElementById('ceo-edit-error');
  const role   = document.getElementById('ceo-edit-role').value;
  const blocked = document.getElementById('ceo-edit-blocked').checked;
  const subType = document.getElementById('ceo-edit-sub-type').value;
  btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
  try {
    const now = Date.now();
    const update = { role, isMaster: role === 'master' || role === 'ceo', blocked };
    if (role === 'ceo') update.isMaster = true;

    if (subType === 'trial7') {
      update.trialEndsAt = now + 7 * 86400000; update.subEndsAt = null;
    } else if (subType === 'custom') {
      const days = parseInt(document.getElementById('ceo-edit-days').value) || 0;
      if (!days) { errEl.textContent = 'Informe o número de dias.'; return; }
      update.subEndsAt = now + days * 86400000;
    } else if (subType === 'monthly') {
      update.subEndsAt = now + 30 * 86400000;
    } else if (subType === 'setdate') {
      const dateVal = document.getElementById('ceo-edit-date').value;
      if (!dateVal) { errEl.textContent = 'Informe a data.'; return; }
      update.subEndsAt = new Date(dateVal + 'T23:59:59').getTime();
    } else if (subType === 'expire') {
      update.subEndsAt = now - 1; update.trialEndsAt = now - 1;
    } else if (subType === 'tester') {
      const days = parseInt(document.getElementById('ceo-edit-tester-days').value) || 14;
      update.isTester = true; update.testerEndsAt = now + days * 86400000;
    }

    if (!Array.isArray(update.adminActions)) update.adminActions = [];
    update.adminActions = firebase.firestore.FieldValue.arrayUnion({
      action: subType, date: now,
      by: (window.CURRENT_USER || {}).username || 'ceo'
    });

    await _updateDoc(_doc(_db, 'managers', mgrId), update);
    closeModal('modal-ceo-edit');
    toast('✅ Gestor atualizado!');
    await loadCeoManagers();
  } catch (e) {
    errEl.textContent = 'Erro: ' + e.message;
  } finally { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar'; }
};

window.ceoDeleteManager = async function () {
  if (!confirm('Excluir este gestor permanentemente?')) return;
  try {
    await _deleteDoc(_doc(_db, 'managers', window._ceoEditMgrId));
    closeModal('modal-ceo-edit');
    toast('✅ Gestor excluído.');
    await loadCeoManagers();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Criar gestor pelo CEO ──────────────────────────────────────────────────────
window.ceoCreateManager = async function () {
  const btn    = document.getElementById('btn-ceo-add');
  const errEl  = document.getElementById('ceo-add-error');
  const user   = (document.getElementById('ceo-new-user').value  || '').trim().toLowerCase();
  const pass   = document.getElementById('ceo-new-pass').value;
  const name   = (document.getElementById('ceo-new-name').value  || '').trim();
  const phone  = (document.getElementById('ceo-new-phone').value || '').trim();
  const role   = document.getElementById('ceo-new-role').value;
  if (!user || !pass) { errEl.textContent = 'Usuário e senha obrigatórios.'; return; }
  if (pass.length < 6) { errEl.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
  btn.classList.add('btn-loading'); btn.textContent = 'Cadastrando...';
  try {
    const existing = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', user)));
    if (!existing.empty) { errEl.textContent = 'Usuário já existe.'; return; }
    const authEmail = _authEmail(user);
    const uid  = await _ensureAuthAccount(authEmail, pass);
    const hash = await _sha256(pass);
    const id   = 'mgr_' + Date.now();
    await _setDoc(_doc(_db, 'managers', id), {
      username: user, passwordHash: hash, name: name || user, phone,
      email: authEmail, authUid: uid,
      role, isMaster: role === 'master' || role === 'ceo',
      trialEndsAt: Date.now() + 7 * 86400000, subEndsAt: null,
      blocked: false, createdAt: Date.now()
    });
    closeModal('modal-ceo-add');
    toast('✅ Gestor cadastrado!');
    await loadCeoManagers();
  } catch (e) {
    errEl.textContent = 'Erro: ' + e.message;
  } finally { btn.classList.remove('btn-loading'); btn.textContent = 'Cadastrar'; }
};

// ── Preços ─────────────────────────────────────────────────────────────────────
window.loadPricing = async function () {
  try {
    const snap = await _db.collection('settings').doc('pricing').get();
    if (snap.exists) {
      const d = snap.data();
      const elM = document.getElementById('pricing-monthly');
      const elD = document.getElementById('pricing-discount');
      if (elM) elM.value = d.monthly  || '';
      if (elD) elD.value = d.discount || '';
    }
  } catch (e) {}
};

window.savePricing = async function () {
  const monthly  = parseFloat(document.getElementById('pricing-monthly')?.value) || 0;
  const discount = parseFloat(document.getElementById('pricing-discount')?.value) || 0;
  if (!monthly) { toast('Informe o preço mensal.', 'error'); return; }
  try {
    await _db.collection('settings').doc('pricing').set({ monthly, discount }, { merge: true });
    toast('✅ Preços salvos!');
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── CREF pendente ──────────────────────────────────────────────────────────────
window.loadCrefPending = async function () {
  const container = document.getElementById('cref-pending-list');
  if (!container) return;
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _where('crefDeclared', '==', true)));
    const pending = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.cref && !m.crefVerified && m.role !== 'ceo');
    if (!pending.length) {
      container.innerHTML = '<p style="font-size:.83rem;color:var(--text3);padding:16px 0;">Nenhum CREF pendente de verificação.</p>';
      return;
    }
    container.innerHTML = pending.map(m => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-weight:700;">${m.name || m.username}</div>
          <div style="font-size:.8rem;color:var(--text3);">CREF: ${m.cref} · @${m.username}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="crefVerify('${m.id}',true)">✅ Verificar</button>
          <button class="btn btn-danger btn-sm" onclick="crefVerify('${m.id}',false)">✕ Reprovar</button>
        </div>
      </div>`).join('');
    const badge = document.getElementById('ceo-reports-badge');
    if (badge) { badge.textContent = pending.length; badge.classList.toggle('hidden', pending.length === 0); }
  } catch (e) {}
};

window.crefVerify = async (mgrId, approved) => {
  try {
    const update = approved
      ? { crefVerified: true, crefVerifiedAt: Date.now() }
      : { crefVerified: false, blocked: true, blockReasons: ['CREF inválido ou não verificado'] };
    await _updateDoc(_doc(_db, 'managers', mgrId), update);
    toast(approved ? '✅ CREF verificado!' : '⚠️ Gestor reprovado e bloqueado.');
    loadCrefPending();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Histórico de pagamentos ───────────────────────────────────────────────────
window.loadCeoPaymentHistory = async function () {
  const tbody = document.getElementById('ceo-payment-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>';
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
    const payments = [];
    snap.docs.forEach(d => {
      const m = { id: d.id, ...d.data() };
      if (m.lastPayment?.date) {
        payments.push({ ...m.lastPayment, _managerId: m.id, _managerName: m.name || m.username, _managerUser: m.username, _source: 'mp' });
      }
      if (Array.isArray(m.paymentHistory)) {
        m.paymentHistory.forEach(p => {
          if (m.lastPayment && p.paymentId === m.lastPayment.paymentId) return;
          payments.push({ ...p, _managerId: m.id, _managerName: m.name || m.username, _managerUser: m.username, _source: 'mp' });
        });
      }
    });
    window._ceoPayAll = payments.sort((a, b) => (b.date || 0) - (a.date || 0));
    renderPaymentTable(window._ceoPayAll);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);padding:20px;">Erro: ${e.message}</td></tr>`;
  }
};

function renderPaymentTable(list) {
  const tbody = document.getElementById('ceo-payment-tbody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Nenhum pagamento.</td></tr>'; return; }
  const fmt = v => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
  tbody.innerHTML = list.map(p => {
    const status = p.status === 'approved' ? '<span class="pay-status-badge pay-approved">✓ Aprovado</span>'
      : p.status === 'pending' ? '<span class="pay-status-badge pay-pending">⏳ Pendente</span>'
      : p.status === 'manual'  ? '<span class="pay-status-badge pay-manual">✎ Manual</span>'
      : '<span class="pay-status-badge pay-rejected">✕ Recusado</span>';
    return `<tr>
      <td style="font-size:.8rem;">${p.date ? new Date(p.date).toLocaleDateString('pt-BR') : '—'}</td>
      <td><strong>${p._managerName}</strong><br><span style="font-size:.72rem;color:var(--text3);">@${p._managerUser}</span></td>
      <td style="font-size:.8rem;">${p.plan === 'annual' ? 'Anual' : 'Mensal'}</td>
      <td style="font-size:.8rem;font-weight:700;">${fmt(p.amount)}</td>
      <td>${status}</td>
      <td style="font-size:.72rem;color:var(--text3);">${p.paymentId || '—'}</td>
    </tr>`;
  }).join('');
}

window.filterCeoPayments = type => {
  window._ceoPayFilter = type;
  document.querySelectorAll('.ceo-payment-filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === type)
  );
  const filtered = type === 'all' ? window._ceoPayAll : window._ceoPayAll.filter(p => p.status === type);
  renderPaymentTable(filtered);
};
