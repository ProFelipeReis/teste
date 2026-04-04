/* ============================================================
   app/js/payments.js
   Subscription wall, Mercado Pago, ativação, trial welcome
   ============================================================ */

var MP_PUBLIC_KEY  = 'APP_USR-f12a2b24-0d63-4c1a-ab86-7e1ac6302acf';
var MP_BACKEND_URL = 'https://mercadopagopayment-ax2n6uynda-uc.a.run.app';

var _mpInstance        = null;
var _mpSelectedPlan    = 'monthly';
var _mpPricing         = { monthly: 0, discount: 0 };
var _mpPaymentMethodId = '';

// ── Exibe subscription wall ──────────────────────────────────────────────────
window.showSubscriptionWall = async function () {
  document.getElementById('screen-login').style.display    = 'none';
  document.getElementById('screen-dashboard').style.display = 'none';
  document.getElementById('screen-sub-wall').style.display  = 'flex';
  subShowStep('plan');
  try {
    const snap = await _db.collection('settings').doc('pricing').get();
    if (snap.exists) {
      const d = snap.data();
      _mpPricing.monthly  = parseFloat(d.monthly)  || 0;
      _mpPricing.discount = parseFloat(d.discount) || 0;
    }
  } catch (e) {}
  renderSubWallPrices();
  if (!_mpInstance && window.MercadoPago) {
    _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
  }
};

function renderSubWallPrices() {
  const m = _mpPricing.monthly, disc = _mpPricing.discount;
  const annualTotal   = m * 12 * (1 - disc / 100);
  const annualMonthly = annualTotal / 12;
  const saving        = m * 12 - annualTotal;
  const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sub-price-monthly', m > 0 ? fmt(m) : 'R$ —');
  set('sub-price-annual',  annualMonthly > 0 ? fmt(annualMonthly) : 'R$ —');
  set('sub-annual-badge',  disc > 0 ? `Economize ${disc}%` : '');
  const savEl = document.getElementById('sub-annual-saving');
  if (savEl && saving > 0) savEl.textContent = `Economia de ${fmt(saving)}/ano`;
}

window.selectPlan = plan => {
  _mpSelectedPlan = plan;
  document.getElementById('plan-monthly').classList.toggle('selected', plan === 'monthly');
  document.getElementById('plan-annual').classList.toggle('selected', plan === 'annual');
};

window.goToPayment = () => {
  if (!_mpPricing.monthly) { toast('Preços não configurados.', 'error'); return; }
  const disc         = _mpPricing.discount;
  const annualMonthly = _mpPricing.monthly * 12 * (1 - disc / 100) / 12;
  const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const summary = _mpSelectedPlan === 'monthly'
    ? `Plano Mensal — ${fmt(_mpPricing.monthly)}/mês`
    : `Plano Anual — ${fmt(annualMonthly)}/mês (anual)`;
  const el = document.getElementById('sub-card-plan-summary');
  if (el) el.textContent = summary;
  ['mp-cardNumber','mp-expirationDate','mp-securityCode','mp-cardholderName','mp-docNumber'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('sub-pay-error').textContent = '';
  document.getElementById('mp-card-brand').textContent  = '';
  document.getElementById('mp-installments-wrap').style.display = 'none';
  _mpPaymentMethodId = '';
  subShowStep('card');
};

window.backToPlan = () => subShowStep('plan');

// ── Máscara cartão ───────────────────────────────────────────────────────────
window.onCardNumberInput = input => {
  const raw    = input.value.replace(/\D/g, '').slice(0, 16);
  input.value  = (raw.match(/.{1,4}/g) || []).join(' ');
  const brandEl = document.getElementById('mp-card-brand');
  let brand = '', pmid = '';
  if (/^4/.test(raw))            { brand = 'Visa';       pmid = 'visa'; }
  else if (/^5[1-5]/.test(raw)) { brand = 'Mastercard'; pmid = 'master'; }
  else if (/^3[47]/.test(raw))  { brand = 'Amex';       pmid = 'amex'; }
  else if (/^(?:606282|3841)/.test(raw)) { brand = 'Hipercard'; pmid = 'hipercard'; }
  else if (/^(?:4011|4312|4389|4514|4576|5041|5067|5090|6277|6362|6516|6550)/.test(raw)) { brand = 'Elo'; }
  if (brandEl) brandEl.textContent = brand;
  _mpPaymentMethodId = pmid;
  if (raw.length >= 6 && _mpInstance && pmid) loadInstallments(raw.slice(0, 6));
};

window.onExpiryInput = input => {
  const raw = input.value.replace(/\D/g, '').slice(0, 4);
  input.value = raw.length > 2 ? raw.slice(0, 2) + '/' + raw.slice(2) : raw;
};

async function loadInstallments(bin) {
  if (!_mpInstance) return;
  try {
    const amount = getSelectedAmount();
    const result = await _mpInstance.getInstallments({ amount: String(amount.toFixed(2)), bin, paymentTypeId: 'credit_card' });
    const wrap = document.getElementById('mp-installments-wrap');
    const sel  = document.getElementById('mp-installments');
    if (!result?.[0]?.payer_costs) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = 'block';
    if (sel) sel.innerHTML = result[0].payer_costs.map(c => {
      let label = `${c.installments}x de R$ ${c.installment_amount.toFixed(2).replace('.', ',')}`;
      if (c.installment_rate === 0) label += ' (sem juros)';
      return `<option value="${c.installments}">${label}</option>`;
    }).join('');
  } catch (e) {}
}

function getSelectedAmount() {
  const m = _mpPricing.monthly, disc = _mpPricing.discount;
  return _mpSelectedPlan === 'annual' ? m * 12 * (1 - disc / 100) : m;
}

// ── Submete pagamento ─────────────────────────────────────────────────────────
window.submitCardPayment = async () => {
  const errEl = document.getElementById('sub-pay-error');
  errEl.textContent = '';
  const cardRaw = (document.getElementById('mp-cardNumber').value || '').replace(/\s/g, '');
  const expiry  = (document.getElementById('mp-expirationDate').value || '').trim();
  const cvv     = (document.getElementById('mp-securityCode').value || '').trim();
  const name    = (document.getElementById('mp-cardholderName').value || '').trim();
  const cpf     = (document.getElementById('mp-docNumber').value || '').replace(/\D/g, '');
  const email   = (document.getElementById('mp-email').value || '').trim();

  if (cardRaw.length < 13)                { errEl.textContent = 'Número do cartão inválido.'; return; }
  if (!expiry.match(/^\d{2}\/\d{2}$/))   { errEl.textContent = 'Validade inválida. Use MM/AA.'; return; }
  if (cvv.length < 3)                     { errEl.textContent = 'CVV inválido.'; return; }
  if (!name || name.length < 3)           { errEl.textContent = 'Informe o nome do titular.'; return; }
  if (cpf.length !== 11)                  { errEl.textContent = 'CPF inválido.'; return; }
  if (!email || !email.includes('@'))     { errEl.textContent = 'E-mail inválido.'; return; }
  if (!_mpInstance)                       { errEl.textContent = 'SDK Mercado Pago não carregou.'; return; }

  subShowStep('processing');
  try {
    const [expMonth, expYear] = expiry.split('/');
    const tokenResult = await _mpInstance.createCardToken({
      cardNumber: cardRaw, cardExpirationMonth: expMonth, cardExpirationYear: '20' + expYear,
      securityCode: cvv, cardholderName: name, identificationType: 'CPF', identificationNumber: cpf
    });
    if (!tokenResult?.id) throw new Error('Erro ao tokenizar cartão.');
    await processPaymentWithToken(tokenResult.id);
  } catch (err) {
    subShowStep('card');
    const msg = typeof err === 'string' ? err : (err?.message || 'Verifique os dados do cartão.');
    errEl.innerHTML = `✕ ${msg}`;
  }
};

async function processPaymentWithToken(token) {
  const u           = window.CURRENT_USER || {};
  const amount      = getSelectedAmount();
  const installments = parseInt(document.getElementById('mp-installments')?.value || '1') || 1;
  const name        = (document.getElementById('mp-cardholderName').value || '').trim();
  const cpf         = (document.getElementById('mp-docNumber').value || '').replace(/\D/g, '');
  let managerId     = u.id || '';

  if (!managerId && u.username) {
    try {
      const snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
      if (!snap.empty) { managerId = snap.docs[0].id; window.CURRENT_USER.id = managerId; }
    } catch (e) {}
  }

  try {
    const resp = await fetch(MP_BACKEND_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token, amount, installments,
        payment_method_id: _mpPaymentMethodId || '',
        description: `Trainly ${_mpSelectedPlan === 'annual' ? 'Anual' : 'Mensal'}`,
        payer: { email: (document.getElementById('mp-email').value || '').trim(), identification: { type: 'CPF', number: cpf }, first_name: name },
        plan: _mpSelectedPlan, managerId, username: u.username || ''
      })
    });
    const result = await resp.json();
    if (result.status === 'approved' || result.status === 'authorized') {
      await activateSubscription(managerId, _mpSelectedPlan, result);
      subShowStep('success');
      document.getElementById('sub-success-msg').textContent =
        _mpSelectedPlan === 'annual' ? 'Plano anual ativado! Acesso por 12 meses.' : 'Plano mensal ativado! Acesso por 30 dias.';
    } else if (result.status === 'pending' || result.status === 'in_process') {
      subShowStep('success');
      document.getElementById('sub-success-msg').textContent = 'Pagamento em análise. Você receberá a confirmação em breve.';
    } else {
      subShowStep('card');
      document.getElementById('sub-pay-error').innerHTML = `✕ ${result.status_detail || result.message || 'Pagamento recusado.'}`;
    }
  } catch (e) {
    subShowStep('card');
    document.getElementById('sub-pay-error').innerHTML = '✕ Erro de conexão com o servidor.';
  }
}

// ── Ativa assinatura no Firestore ────────────────────────────────────────────
async function activateSubscription(managerId, plan, paymentResult) {
  const now       = Date.now();
  const subEndsAt = plan === 'annual' ? now + 365 * 86400000 : now + 30 * 86400000;
  const paymentData = {
    subEndsAt, trialEndsAt: null,
    lastPayment: {
      plan, amount: getSelectedAmount(),
      paymentId: String(paymentResult.id || ''),
      status: paymentResult.status || 'approved',
      date: now
    }
  };
  try {
    await _updateDoc(_doc(_db, 'managers', managerId), paymentData);
  } catch (fsErr) {
    // Fallback para backend
    try {
      await fetch(MP_BACKEND_URL + '/activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, plan, subEndsAt, paymentId: String(paymentResult.id || ''), username: (window.CURRENT_USER || {}).username || '' })
      });
    } catch (e) {}
  }
  if (window.CURRENT_USER) {
    window.CURRENT_USER.subEndsAt = subEndsAt;
    window.CURRENT_USER.trialEndsAt = null;
    window.CURRENT_USER.subStatus = { ok: true, type: 'active', daysLeft: plan === 'annual' ? 365 : 30 };
    saveSession(window.CURRENT_USER);
  }
}

window.enterAfterPayment = () => {
  document.getElementById('screen-sub-wall').style.display = 'none';
  window.showDashboardAfterLogin(window.CURRENT_USER);
};

function subShowStep(step) {
  ['plan','card','processing','success'].forEach(s => {
    const el = document.getElementById('sub-step-' + s);
    if (el) el.style.display = s === step ? 'block' : 'none';
  });
}

window.maskCPF = input => {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  input.value = v;
};

window.checkPaymentReturn = async () => {
  const params    = new URLSearchParams(window.location.search);
  const paymentId = params.get('payment_id');
  const status    = params.get('status');
  if (paymentId && status === 'approved' && window.CURRENT_USER) {
    await activateSubscription(window.CURRENT_USER.id, 'monthly', { id: paymentId, status: 'approved' });
    history.replaceState({}, '', window.location.pathname);
    toast('✅ Pagamento confirmado! Bem-vindo ao Trainly.');
  }
};

// ── Trial Welcome Modal ───────────────────────────────────────────────────────
var _twPlan    = 'monthly';
var _twPricing = { monthly: 0, discount: 0 };

window.showTrialWelcomeModal = async daysLeft => {
  try {
    const snap = await _db.collection('settings').doc('pricing').get();
    if (snap.exists) {
      const d = snap.data();
      _twPricing.monthly  = parseFloat(d.monthly)  || 0;
      _twPricing.discount = parseFloat(d.discount) || 0;
    }
  } catch (e) {}
  const daysEl = document.getElementById('trial-welcome-days');
  if (daysEl) daysEl.textContent = daysLeft || 7;
  twRenderPrices();
  if (!_mpInstance && window.MercadoPago) _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
  document.getElementById('trial-welcome-overlay')?.classList.add('on');
};

function twRenderPrices() {
  const m = _twPricing.monthly, disc = _twPricing.discount;
  const annTotal   = m * 12 * (1 - disc / 100);
  const annMonthly = annTotal / 12;
  const saving     = m * 12 - annTotal;
  const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('tw-price-monthly', m > 0 ? fmt(m) : 'R$ —');
  set('tw-price-annual',  annMonthly > 0 ? fmt(annMonthly) : 'R$ —');
  set('tw-annual-badge',  disc > 0 ? `Economize ${disc}%` : '');
  const savEl = document.getElementById('tw-annual-saving');
  if (savEl && saving > 0) savEl.textContent = `Economia de ${fmt(saving)}/ano`;
}
window.twSelectPlan = plan => {
  _twPlan = plan;
  document.getElementById('tw-plan-monthly').classList.toggle('selected', plan === 'monthly');
  document.getElementById('tw-plan-annual').classList.toggle('selected', plan === 'annual');
};
window.twGoToPayment = () => {
  document.getElementById('trial-welcome-overlay')?.classList.remove('on');
  _mpSelectedPlan = _twPlan;
  showSubscriptionWall();
};
window.twContinueTrial = () => document.getElementById('trial-welcome-overlay')?.classList.remove('on');
