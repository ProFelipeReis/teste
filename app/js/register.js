/* ============================================================
   app/js/register.js
   Cadastro público de gestores + convite
   ============================================================ */

var _regSelectedPlan = 'monthly';
var _regPricing      = { monthly: 0, discount: 0 };
var _regMpMethodId   = '';
var _regNewId        = null;

window.openRegisterScreen = async function () {
  try {
    const snap = await _db.collection('settings').doc('pricing').get();
    if (snap.exists) {
      const d = snap.data();
      _regPricing.monthly  = parseFloat(d.monthly)  || 0;
      _regPricing.discount = parseFloat(d.discount) || 0;
    }
  } catch (e) {}
  regRenderPrices();
  if (!_mpInstance && window.MercadoPago) _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });

  ['reg-name','reg-user','reg-pass','reg-pass2','reg-cref','reg-card-name','reg-cpf',
   'reg-email','reg-email-step1','reg-cardNumber','reg-expiry','reg-cvv'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['reg-terms','reg-cref-decl'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  document.getElementById('reg-error').textContent = '';
  document.getElementById('reg-card-brand').textContent = '';
  document.getElementById('reg-installments-wrap').style.display = 'none';
  _regSelectedPlan = 'monthly'; _regMpMethodId = '';

  const refCode = window._pendingRefCode || new URLSearchParams(window.location.search).get('ref') || '';
  const refBanner   = document.getElementById('reg-referral-banner');
  const refCodeWrap = document.getElementById('reg-ref-code-wrap');
  const refCodeInput = document.getElementById('reg-ref-code');
  if (refCode) {
    if (refBanner)    refBanner.style.display    = 'block';
    if (refCodeWrap)  refCodeWrap.style.display  = 'none';
    if (refCodeInput) refCodeInput.value = refCode;
  } else {
    if (refBanner)    refBanner.style.display    = 'none';
    if (refCodeWrap)  refCodeWrap.style.display  = 'block';
    if (refCodeInput) refCodeInput.value = '';
  }

  regShowStep(1);
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-register').classList.add('on');
};

window.closeRegisterScreen = function () {
  document.getElementById('screen-register').classList.remove('on');
  document.getElementById('screen-register').style.display = '';
  document.getElementById('screen-login').style.display = 'flex';
};

function regShowStep(n) {
  [1,2,3].forEach(i => {
    const s = document.getElementById('reg-step' + i);
    if (s) s.style.display = i === n ? 'block' : 'none';
    const dot = document.getElementById('reg-dot-' + i);
    if (dot) { dot.classList.remove('active','done'); if (i < n) dot.classList.add('done'); if (i === n) dot.classList.add('active'); }
  });
  document.getElementById('reg-processing').style.display = 'none';
  document.getElementById('reg-success').style.display    = 'none';
}

function regRenderPrices() {
  const m = _regPricing.monthly, disc = _regPricing.discount;
  const annTotal   = m * 12 * (1 - disc / 100);
  const annMonthly = annTotal / 12;
  const saving     = m * 12 - annTotal;
  const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('reg-price-monthly', m > 0 ? fmt(m) : 'R$ —');
  set('reg-price-annual',  annMonthly > 0 ? fmt(annMonthly) : 'R$ —');
  set('reg-annual-badge',  disc > 0 ? `Economize ${disc}%` : '');
  const savEl = document.getElementById('reg-annual-saving');
  if (savEl && saving > 0) savEl.textContent = `Economia de ${fmt(saving)}/ano`;
}

window.regSelectPlan = plan => {
  _regSelectedPlan = plan;
  document.getElementById('reg-plan-monthly').classList.toggle('selected', plan === 'monthly');
  document.getElementById('reg-plan-annual').classList.toggle('selected', plan === 'annual');
};

window.regStep1Next = async function () {
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  const name  = (document.getElementById('reg-name').value  || '').trim();
  const user  = (document.getElementById('reg-user').value  || '').trim().toLowerCase();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  if (!name || name.length < 3)  { errEl.textContent = 'Informe seu nome completo.'; return; }
  if (!user || user.length < 3)  { errEl.textContent = 'Usuário deve ter ao menos 3 caracteres.'; return; }
  if (!pass || pass.length < 6)  { errEl.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
  if (pass !== pass2)            { errEl.textContent = 'As senhas não coincidem.'; return; }
  if (!document.getElementById('reg-terms').checked) { errEl.textContent = 'Você precisa aceitar os Termos de Uso.'; return; }

  const refInput   = document.getElementById('reg-ref-code');
  const refCodeWrap = document.getElementById('reg-ref-code-wrap');
  const refManual  = refInput ? refInput.value.trim() : '';
  if (refManual && !window._pendingRefCode && refCodeWrap?.style.display !== 'none') {
    if (refManual.toUpperCase() === 'DEBUGMODE') {
      window._pendingRefCode = refManual;
    } else {
      const btn1 = document.querySelector('#reg-step1 .btn-primary');
      if (btn1) { btn1.classList.add('btn-loading'); btn1.textContent = 'Verificando...'; }
      try {
        const snap = await _db.collection('managers').where('referralCode', '==', refManual).get();
        if (snap.empty) { errEl.textContent = 'Código de indicação inválido.'; if (btn1) { btn1.classList.remove('btn-loading'); btn1.textContent = 'Continuar →'; } return; }
        window._pendingRefCode = refManual;
      } catch (e) {}
      if (btn1) { btn1.classList.remove('btn-loading'); btn1.textContent = 'Continuar →'; }
    }
  }
  regShowStep(2);
};

window.regStep2Next = async function () {
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  const cref = (document.getElementById('reg-cref').value || '').trim();
  if (!cref) { errEl.textContent = 'Informe seu número de registro no CREF.'; return; }
  if (!document.getElementById('reg-cref-decl').checked) { errEl.textContent = 'Marque a declaração profissional.'; return; }

  [1,2,3].forEach(i => { const el = document.getElementById('reg-step' + i); if (el) el.style.display = 'none'; });
  document.getElementById('reg-processing').style.display = 'block';
  const _rpt = document.getElementById('reg-processing-title');
  if (_rpt) _rpt.textContent = 'Criando sua conta...';

  function showErr(msg) {
    document.getElementById('reg-processing').style.display = 'none';
    errEl.textContent = msg;
    regShowStep(2);
  }

  try {
    let attempts = 0;
    while ((!window.firebase || !window.firebase.firestore || !_auth) && attempts < 40) {
      await new Promise(r => setTimeout(r, 100)); attempts++;
    }
    if (!window.firebase || !_auth) { showErr('Erro de conexão. Tente novamente.'); return; }

    const user     = (document.getElementById('reg-user').value || '').trim().toLowerCase();
    const name     = (document.getElementById('reg-name').value || '').trim();
    const email    = (document.getElementById('reg-email-step1')?.value || '').trim().toLowerCase();
    const password = document.getElementById('reg-pass').value;

    const existing = await _db.collection('managers').where('username', '==', user).get();
    if (!existing.empty) { showErr('Este usuário já está em uso.'); return; }

    const authEmail = _authEmail(user);
    let uid = null;
    try { uid = await _ensureAuthAccount(authEmail, password); }
    catch (authErr) { showErr('Erro ao criar conta: ' + authErr.message); return; }

    const hash   = await _sha256(password);
    _regNewId    = 'mgr_' + Date.now();
    const refCode = window._pendingRefCode || (document.getElementById('reg-ref-code')?.value || '').trim();
    const isDebug = refCode.toUpperCase() === 'DEBUGMODE';
    const trialDays   = isDebug ? 60 : (refCode ? 14 : 7);
    const trialEndsAt = Date.now() + trialDays * 86400000;

    try {
      await _db.collection('managers').doc(_regNewId).set({
        username: user, passwordHash: hash, name, cref, crefDeclared: true,
        email: email || authEmail, authUid: uid,
        role: 'comum', isMaster: false,
        trialEndsAt, subEndsAt: null,
        blocked: false, createdAt: Date.now(),
        referredBy: isDebug ? '' : refCode
      });
    } catch (fsErr) {
      try { const u = _auth.currentUser; if (u) await u.delete(); } catch (e2) {}
      showErr('Erro ao salvar conta: ' + fsErr.message); return;
    }

    if (refCode && !isDebug) {
      try { await _applyReferralBonus(refCode); } catch (e) {}
    }

    try { await _auth.signOut(); } catch (e) {}

    document.getElementById('reg-processing').style.display = 'none';
    document.querySelector('.reg-step-indicator').style.display = 'none';
    const foot = document.getElementById('reg-foot'); if (foot) foot.style.display = 'none';
    document.getElementById('reg-success').style.display = 'block';
    document.getElementById('reg-success-msg').textContent = 'Redirecionando para o login...';

    setTimeout(() => {
      history.replaceState({}, '', window.location.pathname);
      document.getElementById('screen-register').classList.remove('on');
      document.getElementById('screen-register').style.display = '';
      document.getElementById('screen-login').style.display = 'flex';
    }, 2800);

  } catch (e) { showErr('Erro: ' + e.message); }
};

window.regStepBack = to => { document.getElementById('reg-error').textContent = ''; regShowStep(to); };

window.regCardNumberInput = input => {
  const raw = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = (raw.match(/.{1,4}/g) || []).join(' ');
  let brand = '', pmid = '';
  if (/^4/.test(raw))            { brand = 'Visa';       pmid = 'visa'; }
  else if (/^5[1-5]/.test(raw)) { brand = 'Mastercard'; pmid = 'master'; }
  else if (/^3[47]/.test(raw))  { brand = 'Amex';       pmid = 'amex'; }
  document.getElementById('reg-card-brand').innerHTML = brand;
  _regMpMethodId = pmid;
  if (raw.length >= 6 && _mpInstance && pmid) loadInstallmentsReg(raw.slice(0, 6));
};

async function loadInstallmentsReg(bin) {
  try {
    const amount = regGetAmount();
    const result = await _mpInstance.getInstallments({ amount: String(amount.toFixed(2)), bin, paymentTypeId: 'credit_card' });
    const wrap = document.getElementById('reg-installments-wrap');
    const sel  = document.getElementById('reg-installments');
    if (!result?.[0]?.payer_costs) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = 'block';
    if (sel) sel.innerHTML = result[0].payer_costs.map(c => {
      let label = `${c.installments}x de R$ ${c.installment_amount.toFixed(2).replace('.', ',')}`;
      if (c.installment_rate === 0) label += ' (sem juros)';
      return `<option value="${c.installments}">${label}</option>`;
    }).join('');
  } catch (e) {}
}

function regGetAmount() {
  const m = _regPricing.monthly, disc = _regPricing.discount;
  return _regSelectedPlan === 'annual' ? m * 12 * (1 - disc / 100) : m;
}

// ── Referral bonus ────────────────────────────────────────────────────────────
async function _applyReferralBonus(refCode) {
  if (!refCode) return;
  try {
    const snap = await _db.collection('managers').where('referralCode', '==', refCode).get();
    if (snap.empty) return;
    const mgrDoc = snap.docs[0];
    const mgr    = mgrDoc.data();
    const bonus  = 7 * 86400000;
    const now    = Date.now();
    const currEnd = Math.max(mgr.subEndsAt || 0, mgr.trialEndsAt || 0, now);
    const newEnd  = currEnd + bonus;
    const update  = mgr.subEndsAt ? { subEndsAt: newEnd } : { trialEndsAt: newEnd };
    await mgrDoc.ref.update(update);
  } catch (e) {}
}
