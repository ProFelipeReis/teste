/* ============================================================
   app/js/students.js
   CRUD de alunos, detalhe, frequência, evolução (assessments)
   ============================================================ */

// ── Carregar e renderizar alunos ────────────────────────────────────────────
window.loadStudents = async () => {
  try {
    const u = window.CURRENT_USER || {};
    let q;
    if (u.role === 'ceo' || u.isMaster) {
      q = _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'));
    } else {
      q = _query(_col(_db, 'students'), _where('managerId', '==', u.username));
    }
    const snap = await _getDocs(q);
    ST.students = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderStudentsGrid(ST.students);
    updateStats();
  } catch (err) {
    document.getElementById('students-grid').innerHTML =
      `<div style="padding:20px;color:red;grid-column:1/-1;">Erro Firebase: ${err.message}</div>`;
  }
};

window.renderStudentsGrid = list => {
  const g = document.getElementById('students-grid');
  if (!list.length) {
    g.innerHTML = `<div class="empty-state">
      <div class="ei">👤</div>
      <p>Nenhum aluno cadastrado.</p>
      <button class="btn btn-primary" style="margin-top:16px;" onclick="openAddStudentModal()">+ Primeiro aluno</button>
    </div>`;
    return;
  }
  const u = window.CURRENT_USER || {};
  const isMaster = u.role === 'ceo' || u.isMaster;
  g.innerHTML = list.map(s => `
    <div class="student-card" onclick="openStudentDetail('${s.id}')">
      <div class="student-card-top">
        <div class="avatar">${initials(s.name)}</div>
        <div>
          <div class="student-name">${s.name}</div>
          <div class="student-code">${s.code}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:4px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${s.phone ? `<span style="font-size:.75rem;color:var(--text3);">📱 ${s.phone}</span>` : ''}
          <span class="badge badge-active">ativo</span>
          ${isMaster && s.managerName ? `<span style="font-size:.72rem;color:var(--text3);background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px 8px;">👤 ${s.managerName}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm" onclick="openEditStudentModal('${s.id}')">✏️ Editar</button>
          <div class="ctx-menu-wrap">
            <button class="ctx-menu-btn" onclick="toggleCtxMenu('sctx_${s.id}')">•••</button>
            <div class="ctx-menu hidden" id="sctx_${s.id}">
              <div class="ctx-menu-item" onclick="closeAllCtxMenus();openTransferModal('${s.id}')">⇄ Transferir aluno</div>
              <div class="ctx-menu-item" onclick="closeAllCtxMenus();deleteStudent('${s.id}')">🗑 Excluir aluno</div>
            </div>
          </div>
        </div>
      </div>
    </div>`).join('');
};

window.filterStudents = () => {
  const q = document.getElementById('search-students').value.toLowerCase();
  const filtered = q
    ? ST.students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.managerName || '').toLowerCase().includes(q))
    : ST.students;
  renderStudentsGrid(filtered);
};

window.updateStats = async () => {
  document.getElementById('stat-alunos').textContent = ST.students.length;
  const studentIds = ST.students.map(s => s.id);
  if (!studentIds.length) {
    document.getElementById('stat-planos').textContent = 0;
    document.getElementById('stat-expired').textContent = 0;
    return;
  }
  const snap = await _getDocs(_col(_db, 'plans'));
  const ps = snap.docs.map(d => d.data()).filter(p => studentIds.includes(p.studentId));
  document.getElementById('stat-planos').textContent  = ps.filter(p => getPlanStatus(p) === 'active').length;
  document.getElementById('stat-expired').textContent = ps.filter(p => getPlanStatus(p) === 'expired').length;
};

// ── Detalhe do aluno ─────────────────────────────────────────────────────────
window.openStudentDetail = async sid => {
  const s = ST.students.find(x => x.id === sid);
  if (!s) return;
  ST.currentStudentId = sid;

  const snap = await _getDocs(_query(_col(_db, 'plans'), _where('studentId', '==', sid)));
  window.__gestorPlans = {};
  const plans = snap.docs.map(d => {
    const p = { id: d.id, ...d.data() };
    window.__gestorPlans[p.id] = p;
    return p;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const active   = plans.filter(p => getPlanStatus(p) === 'active');
  const upcoming = plans.filter(p => getPlanStatus(p) === 'upcoming');
  const expired  = plans.filter(p => getPlanStatus(p) === 'expired');

  document.getElementById('students-list-view').classList.add('hidden');
  const dv = document.getElementById('student-detail-view');
  dv.classList.remove('hidden');

  const age = s.dob ? calcAge(s.dob) : null;
  const sexLabel = { M: 'Masculino', F: 'Feminino', O: 'Outro' }[s.sex] || '';

  dv.innerHTML = `
    <button class="back-btn" onclick="showStudentsList()">← Voltar</button>
    <div class="student-access-banner">
      <div class="student-access-banner-icon">🔑</div>
      <div class="student-access-info">
        <div class="sai-label">Código de acesso do aluno</div>
        <div class="sai-code">${s.code}</div>
        <div class="sai-link">Acesse em <a href="https://trainly.online" target="_blank">trainly.online</a></div>
      </div>
      <div class="student-access-copy">
        <button class="btn btn-ghost btn-sm" onclick="copyStudentCode('${s.code}')">📋 Copiar código</button>
        <button class="btn btn-ghost btn-sm" onclick="copyStudentLink()">🔗 Copiar link</button>
      </div>
    </div>
    <div class="detail-header">
      <div class="detail-avatar">${initials(s.name)}</div>
      <div class="detail-info">
        <h2>${s.name}</h2>
        <div class="code">Código: ${s.code}</div>
        ${age !== null ? `<div style="font-size:.78rem;color:var(--text3);margin-top:3px;">${age} anos${sexLabel ? ' · ' + sexLabel : ''}</div>` : ''}
        ${s.phone ? `<div style="font-size:.82rem;color:var(--text2);margin-top:6px;">📱 ${s.phone}</div>` : ''}
        ${s.email ? `<div style="font-size:.82rem;color:var(--text2);margin-top:2px;">✉️ ${s.email}</div>` : ''}
      </div>
      <div class="detail-actions" style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;">
        ${s.phone ? `<button class="btn btn-whatsapp btn-sm" onclick="contactWhatsApp('${s.phone}','${s.name}')">📱 WhatsApp</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="openEditStudentModal('${sid}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Excluir</button>
      </div>
    </div>

    <div class="freq-inline-section" onclick="openFreqCalendar('${sid}')" style="cursor:pointer;">
      <div class="freq-inline-title">📅 Frequência de Treinos</div>
      <div class="freq-inline-hint">Toque para ver o calendário completo</div>
      <div id="freq-content-${sid}"><div class="spinner" style="width:18px;height:18px;border-width:2px;margin:6px auto;"></div></div>
    </div>

    <div class="student-tabs">
      <button class="student-tab active" onclick="switchStudentTab('stab-treinos',this,'${sid}')">📋 Treinos</button>
      <button class="student-tab" onclick="switchStudentTab('stab-dados',this,'${sid}')">👤 Dados pessoais</button>
      <button class="student-tab" onclick="switchStudentTab('stab-evolucao',this,'${sid}')">📈 Evolução</button>
    </div>

    <div class="student-tab-panel active" id="stab-treinos">
      ${plans.length === 0
        ? `<div class="empty-center"><div class="empty-icon">📋</div><p>Nenhum plano cadastrado.</p><button class="btn btn-primary" style="margin-top:4px;" onclick="openPlanEditInfoModal('${sid}')">+ Criar plano</button></div>`
        : `<div class="add-plan-btn-wrap"><button class="add-plan-btn add-plan-btn--dark" onclick="openPlanEditInfoModal('${sid}')">+ Adicionar plano de treino</button></div>
          ${active.length   ? `<div class="section-label">Planos ativos</div><div class="plans-list">${active.map((p,i)   => planCardHTML(p, sid, i, 'active')).join('')}</div>`   : ''}
          ${upcoming.length ? `<div class="section-label upcoming-label">Em breve</div><div class="plans-list">${upcoming.map((p,i) => planCardHTML(p, sid, i, 'upcoming')).join('')}</div>` : ''}
          ${expired.length  ? `<div class="section-label expired-label">Vencidos</div><div class="plans-list">${expired.map((p,i)  => planCardHTML(p, sid, i, 'expired')).join('')}</div>`  : ''}`
      }
    </div>
    <div class="student-tab-panel" id="stab-dados">
      ${_renderStudentDataTab(s)}
    </div>
    <div class="student-tab-panel" id="stab-evolucao">
      <div id="evolucao-content-${sid}"><div class="spinner"></div></div>
    </div>`;

  loadStudentFrequency(sid);
};

function _renderStudentDataTab(s) {
  const items = [
    ['Peso', s.weight ? s.weight + ' kg' : '—'],
    ['Altura', s.height ? s.height + ' cm' : '—'],
    ['IMC', s.imc ? s.imc : '—'],
    ['% Gordura', s.fat ? s.fat + '%' : '—'],
    ['Data de nascimento', s.dob || '—'],
    ['Sexo', { M: 'Masculino', F: 'Feminino', O: 'Outro' }[s.sex] || '—'],
    ['Observações', s.obs || '—'],
    ['Lesões', s.injuries || '—'],
    ['Condições de saúde', s.conditions || '—'],
    ['Medicamentos', s.meds || '—'],
  ];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
    ${items.map(([label, val]) => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">${label}</div>
        <div style="font-size:.88rem;font-weight:600;color:var(--text);">${val}</div>
      </div>`).join('')}
  </div>`;
}

window.switchStudentTab = function (tabId, btn, sid) {
  document.querySelectorAll('.student-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.student-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  btn.classList.add('active');
  if (tabId === 'stab-evolucao' && sid) loadStudentEvolution(sid);
};

// ── Adicionar aluno ──────────────────────────────────────────────────────────
window._addStudentStep = 1;

window.openAddStudentModal = () => {
  window._addStudentStep = 1;
  ['new-student-name','new-student-phone','new-student-email','new-student-dob','new-student-obs',
   'new-student-weight','new-student-height','new-student-fat',
   'new-m-chest','new-m-waist','new-m-hip','new-m-arm-r','new-m-arm-l','new-m-shoulder',
   'new-m-thigh-r','new-m-thigh-l','new-m-calf-r','new-m-calf-l','new-m-thigh-prox','new-m-thigh-dist',
   'new-txt-injuries','new-txt-conditions','new-txt-meds'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('new-student-sex').value = '';
  document.getElementById('new-student-imc-box').style.display = 'none';
  document.getElementById('new-student-age-preview').style.display = 'none';
  ['new-chk-injuries','new-chk-conditions','new-chk-meds'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
  ['new-health-injuries-detail','new-health-conditions-detail','new-health-meds-detail'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('visible');
  });
  document.querySelectorAll('#modal-add-student .health-check-item').forEach(el => el.classList.remove('checked'));
  document.getElementById('new-student-code-reveal').style.display = 'none';
  document.getElementById('add-student-steps').style.display = '';
  document.getElementById('add-student-step-label').textContent = '';
  _renderAddStudentStep(1);
  openModal('modal-add-student');
  setTimeout(() => document.getElementById('new-student-name').focus(), 100);
};

window._renderAddStudentStep = function (step) {
  window._addStudentStep = step;
  const labels = ['','Etapa 1 de 3 — Dados pessoais','Etapa 2 de 3 — Dados físicos','Etapa 3 de 3 — Saúde'];
  document.getElementById('add-student-step-label').textContent = labels[step] || '';
  [1,2,3].forEach(s => {
    const panel = document.getElementById('add-student-step-' + s);
    if (panel) panel.style.display = s === step ? '' : 'none';
  });
  const back   = document.getElementById('btn-add-student-back');
  const cancel = document.getElementById('btn-add-cancel');
  const next   = document.getElementById('btn-add-student');
  if (back)   back.style.display   = step > 1 ? '' : 'none';
  if (cancel) cancel.style.display = step === 1 ? '' : 'none';
  if (next)   { next.textContent = step < 3 ? 'Próximo →' : 'Cadastrar'; next.onclick = step < 3 ? addStudentStepNext : addStudent; }
};

window.addStudentStepNext = () => {
  if (window._addStudentStep === 1) {
    if (!document.getElementById('new-student-name').value.trim()) { toast('Nome obrigatório!','error'); return; }
  }
  _renderAddStudentStep(window._addStudentStep + 1);
};
window.addStudentStepBack = () => _renderAddStudentStep(window._addStudentStep - 1);

window.addStudent = async () => {
  const name = document.getElementById('new-student-name').value.trim();
  if (!name) { toast('Nome obrigatório!','error'); return; }
  const btn = document.getElementById('btn-add-student');
  btn.classList.add('btn-loading'); btn.textContent = 'Aguarde...';
  try {
    const phone    = document.getElementById('new-student-phone').value.trim();
    const email    = document.getElementById('new-student-email').value.trim();
    const dob      = document.getElementById('new-student-dob').value;
    const sex      = document.getElementById('new-student-sex').value;
    const obs      = document.getElementById('new-student-obs').value.trim();
    const weight   = parseFloat(document.getElementById('new-student-weight').value) || null;
    const height   = parseFloat(document.getElementById('new-student-height').value) || null;
    const fat      = parseFloat(document.getElementById('new-student-fat').value) || null;
    const imc      = (weight && height && height > 50) ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1)) : null;
    const measures = readMeasures('new-m-');
    const injuries   = document.getElementById('new-chk-injuries').checked   ? document.getElementById('new-txt-injuries').value.trim()   : '';
    const conditions = document.getElementById('new-chk-conditions').checked ? document.getElementById('new-txt-conditions').value.trim() : '';
    const meds       = document.getElementById('new-chk-meds').checked       ? document.getElementById('new-txt-meds').value.trim()       : '';

    let code, exists = true;
    while (exists) {
      code = genCode();
      const s = await _getDocs(_query(_col(_db, 'students'), _where('code', '==', code)));
      exists = !s.empty;
    }

    const u = window.CURRENT_USER || {};
    const studentId = Date.now().toString();
    const hasPhysical = weight || height || fat || Object.keys(measures).length > 0;

    await _setDoc(_doc(_db, 'students', studentId), {
      name, code, phone, email, dob, sex, obs,
      injuries, conditions, meds,
      weight: weight || null, height: height || null, imc: imc || null, fat: fat || null,
      measures: Object.keys(measures).length ? measures : null,
      managerId: u.username || '',
      managerName: u.displayName || u.username || '',
      managerPhone: u.phone || '',
      createdAt: Date.now()
    });

    if (hasPhysical) {
      await _setDoc(_doc(_db, 'students', studentId, 'assessments', Date.now().toString()), {
        date: fmtLocalYMD(), ts: Date.now(), weight, height, imc, fat, measures
      });
    }

    [1,2,3].forEach(s => { const p = document.getElementById('add-student-step-' + s); if (p) p.style.display = 'none'; });
    document.getElementById('add-student-steps').style.display = 'none';
    document.getElementById('add-student-step-label').textContent = '';
    document.getElementById('new-student-code-display').textContent = code;
    document.getElementById('new-student-code-reveal').style.display = 'block';
    document.getElementById('add-student-footer').innerHTML =
      `<button class="btn btn-primary" onclick="closeModal('modal-add-student')">Concluir</button>`;
    await loadStudents();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
  finally { const b = document.getElementById('btn-add-student'); if (b) { b.classList.remove('btn-loading'); b.textContent = 'Cadastrar'; } }
};

window.copyNewStudentCode = function () {
  const code = document.getElementById('new-student-code-display').textContent;
  navigator.clipboard.writeText(code)
    .then(() => toast('📋 Código copiado!'))
    .catch(() => toast('Código: ' + code));
};

// ── Editar aluno ──────────────────────────────────────────────────────────────
window.openEditStudentModal = sid => {
  const s = ST.students.find(x => x.id === sid);
  if (!s) return;
  document.getElementById('edit-student-code-display').value = s.code;
  document.getElementById('edit-student-name').value  = s.name  || '';
  document.getElementById('edit-student-phone').value = s.phone || '';
  document.getElementById('edit-student-email').value = s.email || '';
  document.getElementById('edit-student-dob').value   = s.dob   || '';
  document.getElementById('edit-student-sex').value   = s.sex   || '';
  document.getElementById('edit-student-obs').value   = s.obs   || '';
  document.getElementById('edit-student-weight').value = s.weight || '';
  document.getElementById('edit-student-height').value = s.height || '';
  document.getElementById('edit-student-fat').value    = s.fat    || '';
  fillMeasures('edit-m-', s.measures || {});
  [['edit-chk-injuries','edit-txt-injuries','edit-health-injuries-detail',s.injuries],
   ['edit-chk-conditions','edit-txt-conditions','edit-health-conditions-detail',s.conditions],
   ['edit-chk-meds','edit-txt-meds','edit-health-meds-detail',s.meds]
  ].forEach(([chkId, txtId, detId, val]) => {
    const chk = document.getElementById(chkId);
    const txt = document.getElementById(txtId);
    const det = document.getElementById(detId);
    if (chk) chk.checked = !!val;
    if (txt) txt.value = val || '';
    if (det) det.classList.toggle('visible', !!val);
    const item = chk?.closest('.health-check-item');
    if (item) item.classList.toggle('checked', !!val);
  });
  document.querySelectorAll('#modal-edit-student .assessment-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#modal-edit-student .assessment-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('edit-tab-dados').classList.add('active');
  document.querySelector('#modal-edit-student .assessment-tab').classList.add('active');
  if (s.weight && s.height) calcImcPreview('edit-student-weight','edit-student-height','edit-student-imc-box');
  if (s.dob) calcAgePreview('edit-student-dob','edit-student-age-preview');
  document.getElementById('btn-save-edit-student').dataset.sid = sid;
  openModal('modal-edit-student');
};

window.saveEditStudent = async () => {
  const btn = document.getElementById('btn-save-edit-student');
  const sid = btn.dataset.sid;
  const name = document.getElementById('edit-student-name').value.trim();
  if (!name) { toast('Nome obrigatório!','error'); return; }
  btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
  try {
    const phone    = document.getElementById('edit-student-phone').value.trim();
    const email    = document.getElementById('edit-student-email').value.trim();
    const dob      = document.getElementById('edit-student-dob').value;
    const sex      = document.getElementById('edit-student-sex').value;
    const obs      = document.getElementById('edit-student-obs').value.trim();
    const weight   = parseFloat(document.getElementById('edit-student-weight').value) || null;
    const height   = parseFloat(document.getElementById('edit-student-height').value) || null;
    const fat      = parseFloat(document.getElementById('edit-student-fat').value) || null;
    const imc      = (weight && height && height > 50) ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1)) : null;
    const measures = readMeasures('edit-m-');
    const injuries   = document.getElementById('edit-chk-injuries').checked   ? document.getElementById('edit-txt-injuries').value.trim()   : '';
    const conditions = document.getElementById('edit-chk-conditions').checked ? document.getElementById('edit-txt-conditions').value.trim() : '';
    const meds       = document.getElementById('edit-chk-meds').checked       ? document.getElementById('edit-txt-meds').value.trim()       : '';
    const hasPhysical = weight || height || fat || Object.keys(measures).length > 0;

    await _updateDoc(_doc(_db, 'students', sid), {
      name, phone, email, dob, sex, obs, injuries, conditions, meds,
      weight: weight||null, height: height||null, imc: imc||null, fat: fat||null,
      measures: Object.keys(measures).length ? measures : null
    });
    if (hasPhysical) {
      await _setDoc(_doc(_db, 'students', sid, 'assessments', Date.now().toString()), {
        date: fmtLocalYMD(), ts: Date.now(), weight, height, imc, fat, measures
      });
    }
    closeModal('modal-edit-student');
    toast('✅ Aluno atualizado!');
    await loadStudents();
    if (ST.currentStudentId === sid) openStudentDetail(sid);
  } catch (e) { toast('Erro: ' + e.message,'error'); }
  finally { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar alterações'; }
};

// ── Excluir aluno ─────────────────────────────────────────────────────────────
window.deleteStudent = async sid => {
  if (!confirm('Excluir este aluno? Todos os planos vinculados também serão excluídos.')) return;
  try {
    await _deleteDoc(_doc(_db, 'students', sid));
    showStudentsList();
    await loadStudents();
    toast('✅ Aluno excluído.');
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Helpers ────────────────────────────────────────────────────────────────────
window.copyStudentCode = code => {
  navigator.clipboard.writeText(code).then(() => toast('📋 Código copiado!')).catch(() => toast('Código: ' + code));
};
window.copyStudentLink = () => {
  navigator.clipboard.writeText('trainly.online').then(() => toast('🔗 Link copiado!')).catch(() => toast('trainly.online'));
};
window.contactWhatsApp = (phone, name) => {
  const cleaned = phone.replace(/\D/g, '');
  const num = cleaned.startsWith('55') ? cleaned : '55' + cleaned;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Olá ${name}!`)}`, '_blank');
};

window.calcAge = dob => {
  if (!dob) return null;
  const d = new Date(dob + 'T12:00');
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
};
window.calcAgePreview = (dobId, previewId) => {
  const dob = document.getElementById(dobId)?.value;
  const el  = document.getElementById(previewId);
  if (!dob || !el) return;
  const age = calcAge(dob);
  el.textContent = age !== null ? age + ' anos' : '';
  el.style.display = age !== null ? 'block' : 'none';
};
window.calcImcPreview = (wId, hId, boxId) => {
  const w = parseFloat(document.getElementById(wId)?.value);
  const h = parseFloat(document.getElementById(hId)?.value);
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!w || !h || h < 50) { box.style.display = 'none'; return; }
  const hm  = h / 100;
  const imc = (w / (hm * hm)).toFixed(1);
  const cat = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidade I' : imc < 40 ? 'Obesidade II' : 'Obesidade III';
  document.getElementById(boxId.replace('-box','-val'))?.setAttribute('textContent', imc);
  document.getElementById(boxId.replace('-box','-cat'))?.setAttribute('textContent', cat);
  box.style.display = 'flex';
};
window.toggleHealthCheck = function (item, detailId) {
  const chk = item.querySelector('input[type=checkbox]');
  if (event?.target !== chk) chk.checked = !chk.checked;
  item.classList.toggle('checked', chk.checked);
  document.getElementById(detailId)?.classList.toggle('visible', chk.checked);
};
window.switchEditTab = (tabId, btn) => {
  document.querySelectorAll('#modal-edit-student .assessment-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#modal-edit-student .assessment-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  btn.classList.add('active');
};
window.readMeasures = prefix => {
  const ids = ['chest','waist','hip','arm-r','arm-l','shoulder','thigh-r','thigh-l','calf-r','calf-l','thigh-prox','thigh-dist'];
  const m = {};
  ids.forEach(k => { const v = parseFloat(document.getElementById(prefix + k)?.value); if (!isNaN(v) && v > 0) m[k] = v; });
  return m;
};
window.fillMeasures = (prefix, m) => {
  if (!m) return;
  ['chest','waist','hip','arm-r','arm-l','shoulder','thigh-r','thigh-l','calf-r','calf-l','thigh-prox','thigh-dist']
    .forEach(k => { const el = document.getElementById(prefix + k); if (el) el.value = m[k] || ''; });
};

// ── Evolução ──────────────────────────────────────────────────────────────────
window.loadStudentEvolution = async sid => {
  const container = document.getElementById(`evolucao-content-${sid}`);
  if (!container) return;
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const snap = await _getDocs(_query(
      _col(_db, 'students', sid, 'assessments'), _orderBy('ts', 'desc')
    ));
    const assessments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!assessments.length) {
      container.innerHTML = '<div class="empty-center"><div class="empty-icon">📊</div><p>Nenhuma avaliação registrada.</p></div>';
      return;
    }
    const latest = assessments[0];
    const prev   = assessments[1];
    const metricLabel = { weight:'Peso (kg)', height:'Altura (cm)', imc:'IMC', fat:'% Gordura' };
    const diff = (curr, old, invert) => {
      if (!curr || !old) return '<span class="evo-diff-zero">—</span>';
      const d = (curr - old).toFixed(1);
      const cls = d == 0 ? 'evo-diff-zero' : ((invert ? d < 0 : d > 0) ? 'evo-diff-pos' : 'evo-diff-neg');
      return `<span class="evo-metric-diff ${cls}">${d > 0 ? '+' : ''}${d}</span>`;
    };

    container.innerHTML = `
      <div class="evo-compare-card">
        <div class="evo-compare-header">
          <span class="evo-compare-title">Última avaliação</span>
          <span class="evo-compare-date">${latest.date || '—'}</span>
        </div>
        <div class="evo-compare-body">
          ${['weight','height','imc','fat'].map(k => `
            <div class="evo-metric-row">
              <span class="evo-metric-label">${metricLabel[k]}</span>
              <div class="evo-metric-values">
                ${prev?.[k] ? `<span class="evo-metric-prev">${prev[k]}</span>` : ''}
                <span class="evo-metric-curr">${latest[k] || '—'}</span>
                ${prev?.[k] && latest[k] ? diff(latest[k], prev[k], k==='weight'||k==='imc'||k==='fat') : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="evo-history-list">
        ${assessments.slice(1).map(a => `
          <div class="evo-history-item">
            <div class="evo-history-date">${a.date || '—'}</div>
            <div class="evo-history-summary">
              ${a.weight ? `Peso: ${a.weight}kg` : ''}
              ${a.imc ? ` · IMC: ${a.imc}` : ''}
              ${a.fat ? ` · ${a.fat}% gordura` : ''}
            </div>
          </div>`).join('')}
      </div>`;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--red);">Erro: ${e.message}</p>`;
  }
};
