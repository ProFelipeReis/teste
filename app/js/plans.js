/* ============================================================
   app/js/plans.js
   CRUD de planos de treino, editor de exercícios, clone, WhatsApp
   ============================================================ */

window.__gestorPlans = {};

// ── Card HTML do plano na view do aluno ──────────────────────────────────────
window.planCardHTML = function (p, sid, idx, statusType) {
  const letter = String.fromCharCode(65 + idx);
  const wRows  = (p.workouts || []).map((w, wi) => `
    <div class="workout-row">
      <div class="workout-row-header">
        <span class="workout-row-tag">${String.fromCharCode(65 + wi)}</span>
        <span class="workout-row-title">${w.title || 'Treino ' + String.fromCharCode(65 + wi)}</span>
      </div>
      <div class="workout-days">${(w.days || []).map(d => `<span class="day-chip">${DAYS[d] || d}</span>`).join('')}</div>
      <div class="workout-excount">${(w.exercises || []).length} exercício(s)</div>
    </div>`).join('');

  const expired  = statusType === 'expired';
  const upcoming = statusType === 'upcoming';
  const dateInfo = p.startDate && p.expiry
    ? `${p.startDate} → ${p.expiry}`
    : p.expiry ? `Vence: ${p.expiry}` : '';

  return `<div class="plan-card ${expired ? 'expired' : ''} ${upcoming ? 'upcoming' : ''}">
    <div class="plan-card-header">
      <div class="plan-card-header-top">
        <div class="plan-letter">${letter}</div>
        <div class="plan-info">
          <div class="plan-title">${p.title || 'Plano sem título'}</div>
          <div class="plan-meta">${dateInfo}</div>
        </div>
        <button class="plan-collapse-btn" onclick="togglePlanCollapse(this)" title="Expandir/Recolher">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="ctx-menu-wrap">
          <button class="ctx-menu-btn" onclick="toggleCtxMenu('pctx_${p.id}')">•••</button>
          <div class="ctx-menu hidden" id="pctx_${p.id}">
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();openPlanEditor('${sid}','${p.id}')">✏️ Editar plano</div>
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();viewPlan('${p.id}')">👁 Ver detalhes</div>
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();sendWhatsAppPlan('${sid}','${p.id}')">📱 Enviar WhatsApp</div>
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();openCloneModal('${p.id}','${sid}')">📋 Clonar para outro</div>
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();duplicatePlan('${p.id}','${sid}')">🔁 Duplicar</div>
            <div class="ctx-menu-item" onclick="closeAllCtxMenus();deletePlan('${p.id}','${sid}')" style="color:var(--red);">🗑 Excluir plano</div>
          </div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="btn btn-ghost btn-sm" onclick="openPlanEditor('${sid}','${p.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="viewPlan('${p.id}')">👁 Ver</button>
        <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsAppPlan('${sid}','${p.id}')">📱 WA</button>
      </div>
    </div>
    <div class="plan-workouts">${wRows || '<p style="font-size:.82rem;color:var(--text3);padding:8px 0;">Nenhum treino neste plano.</p>'}</div>
  </div>`;
};

window.togglePlanCollapse = btn => {
  btn.classList.toggle('collapsed');
  const card = btn.closest('.plan-card');
  card?.querySelector('.plan-workouts')?.classList.toggle('collapsed');
};

// ── Abre modal de informações do plano (título, datas) ────────────────────────
window.openPlanEditInfoModal = function (sid, planId) {
  ST.planStudentId = sid;
  ST.editPlanId    = planId || null;
  const plan = planId && window.__gestorPlans[planId];

  document.getElementById('plan-title').value     = plan?.title    || '';
  document.getElementById('plan-startdate').value = plan?.startDate || '';
  document.getElementById('plan-expiry').value    = plan?.expiry    || '';
  document.getElementById('plan-error').textContent = '';

  ST._planTitleSnapshot     = plan?.title    || '';
  ST._planStartDateSnapshot = plan?.startDate || '';
  ST._planExpirySnapshot    = plan?.expiry    || '';

  // Carrega blocos do plano existente
  ST.workoutBlocks = plan?.workouts
    ? JSON.parse(JSON.stringify(plan.workouts))
    : [_newWorkoutBlock()];
  ST._planSnapshot = JSON.stringify(ST.workoutBlocks);

  renderPlanEditor();
  openModal('modal-plan');
};

window.openPlanEditor = (sid, planId) => openPlanEditInfoModal(sid, planId);

function _newWorkoutBlock() {
  return { title: '', days: [], exercises: [] };
}

// ── Renderiza o editor de blocos ─────────────────────────────────────────────
window.renderPlanEditor = function () {
  const container = document.getElementById('plan-editor');
  if (!container) return;
  container.innerHTML = ST.workoutBlocks.map((block, bi) => _blockHTML(block, bi)).join('');
};

function _blockHTML(block, bi) {
  const letter = String.fromCharCode(65 + bi);
  const daysRow = DAYS.map((d, di) =>
    `<button class="day-toggle ${(block.days || []).includes(di) ? 'selected' : ''}"
      onclick="toggleDay(${bi},${di})">${d}</button>`
  ).join('');
  const exRows = (block.exercises || []).map((ex, ei) => _exRowHTML(bi, ei, ex)).join('');
  return `<div class="workout-block" id="wb_${bi}">
    <div class="workout-block-header">
      <div class="wb-letter">${letter}</div>
      <input class="wb-title-input" type="text" placeholder="Nome do treino (ex: Peito e Tríceps)"
        value="${ex(block.title || '')}" oninput="ST.workoutBlocks[${bi}].title=this.value" />
      <button class="remove-block-btn" onclick="removeWorkoutBlock(${bi})" title="Remover treino">✕</button>
    </div>
    <div class="workout-block-body">
      <div class="wb-days-row">
        <span class="wb-days-label">Dias:</span>
        <div class="days-selector">${daysRow}</div>
      </div>
      <div class="exercises-list" id="exlist_${bi}">${exRows}</div>
      <button class="add-ex-btn" onclick="addExercise(${bi})">+ Adicionar exercício</button>
    </div>
  </div>`;
}

function _exRowHTML(bi, ei, ex) {
  const opts = Object.entries(EX_LIB).map(([cat, names]) =>
    `<optgroup label="${cat}">${names.map(n => `<option value="${n}" ${n === ex.name ? 'selected' : ''}>${n}</option>`).join('')}</optgroup>`
  ).join('');
  const nSeries = parseInt(ex.series) || 3;
  const repsArr = Array.isArray(ex.repsArr) ? ex.repsArr : Array(nSeries).fill(ex.reps || '12');
  const repsChips = Array.from({ length: nSeries }, (_, si) =>
    `<div class="ex-rep-chip">
      <span class="ex-rep-chip-lbl">S${si+1}</span>
      <input type="text" value="${repsArr[si] || '12'}" placeholder="12"
        oninput="updateRepsSerie(${bi},${ei},${si},this.value)" />
    </div>`
  ).join('');

  return `<div class="exercise-item" data-bi="${bi}" data-ei="${ei}" draggable="true"
      ondragstart="onDragStart(event,${bi},${ei})"
      ondragover="onDragOver(event,${bi},${ei})"
      ondrop="onDrop(event,${bi},${ei})"
      ondragleave="onDragLeave(event)">
    <div class="ex-row-top">
      <div class="drag-handle" title="Arrastar">⠿</div>
      <span class="ex-num">${ei+1}</span>
      <select class="ex-select" onchange="ST.workoutBlocks[${bi}].exercises[${ei}].name=this.value;updateYTUrl(${bi},${ei})">
        <option value="">— Selecione —</option>${opts}
      </select>
      <button class="remove-ex-btn" onclick="removeExercise(${bi},${ei})">✕</button>
    </div>
    <div class="ex-row-fields">
      <div class="ex-field">
        <span class="ex-field-label">Séries</span>
        <input type="number" min="1" max="20" value="${nSeries}"
          oninput="updateSeriesCount(${bi},${ei},parseInt(this.value)||1)" />
      </div>
      <div class="ex-field" style="grid-column:2/-1;">
        <span class="ex-field-label">Repetições por série</span>
        <div class="ex-reps-chips">${repsChips}</div>
      </div>
    </div>
    <div class="ex-row-bottom">
      <div class="ex-obs-wrap">
        <textarea placeholder="Observações (carga, variação, pausa...)" rows="1"
          oninput="ST.workoutBlocks[${bi}].exercises[${ei}].obs=this.value">${ex(ex.obs || '')}</textarea>
      </div>
    </div>
  </div>`;
}

// Escapa HTML básico
const ex = str => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Ações do editor ──────────────────────────────────────────────────────────
window.addWorkoutBlock = () => { ST.workoutBlocks.push(_newWorkoutBlock()); renderPlanEditor(); };
window.removeWorkoutBlock = bi => { ST.workoutBlocks.splice(bi, 1); renderPlanEditor(); };
window.addExercise = bi => {
  ST.workoutBlocks[bi].exercises.push({ name:'', series:3, reps:'12', repsArr:['12','12','12'], obs:'' });
  renderPlanEditor();
};
window.removeExercise = (bi, ei) => { ST.workoutBlocks[bi].exercises.splice(ei, 1); renderPlanEditor(); };
window.toggleDay = (bi, di) => {
  const days = ST.workoutBlocks[bi].days || [];
  const idx  = days.indexOf(di);
  if (idx >= 0) days.splice(idx, 1); else days.push(di);
  ST.workoutBlocks[bi].days = days;
  renderPlanEditor();
};
window.updateYTUrl = (bi, ei) => {
  const name = ST.workoutBlocks[bi].exercises[ei].name;
  ST.workoutBlocks[bi].exercises[ei].ytUrl = EX_URLS[name] || '';
};
window.updateSeriesCount = (bi, ei, n) => {
  const ex = ST.workoutBlocks[bi].exercises[ei];
  ex.series = n;
  let arr = Array.isArray(ex.repsArr) ? [...ex.repsArr] : [ex.reps || '12'];
  while (arr.length < n) arr.push(arr[arr.length - 1] || '12');
  ex.repsArr = arr.slice(0, n);
  ex.reps = ex.repsArr.join(', ');
  renderPlanEditor();
};
window.updateRepsSerie = (bi, ei, si, val) => {
  const ex = ST.workoutBlocks[bi].exercises[ei];
  if (!Array.isArray(ex.repsArr)) ex.repsArr = [ex.reps || '12'];
  ex.repsArr[si] = val;
  ex.reps = ex.repsArr.join(', ');
};

// ── Drag & Drop ───────────────────────────────────────────────────────────────
let _dragFrom = null;
window.onDragStart = (e, bi, ei) => { _dragFrom = { bi, ei }; e.currentTarget.classList.add('dragging'); };
window.onDragOver  = (e, bi, ei) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
window.onDragLeave = e => e.currentTarget.classList.remove('drag-over');
window.onDrop = (e, bi, ei) => {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if (!_dragFrom || (_dragFrom.bi === bi && _dragFrom.ei === ei)) return;
  if (_dragFrom.bi !== bi) return; // cross-block not supported
  const exs = ST.workoutBlocks[bi].exercises;
  const [moved] = exs.splice(_dragFrom.ei, 1);
  exs.splice(ei, 0, moved);
  _dragFrom = null;
  renderPlanEditor();
};

// ── Salvar plano ──────────────────────────────────────────────────────────────
window.savePlan = async function () {
  const title = document.getElementById('plan-title').value.trim();
  const errEl = document.getElementById('plan-error');
  if (!title) { errEl.textContent = 'Informe o título do plano.'; return; }
  if (!ST.workoutBlocks.length) { errEl.textContent = 'Adicione ao menos um treino.'; return; }

  const btn = document.getElementById('btn-save-plan');
  btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';

  const u    = window.CURRENT_USER || {};
  const data = {
    title,
    startDate: document.getElementById('plan-startdate').value || '',
    expiry:    document.getElementById('plan-expiry').value    || '',
    studentId: ST.planStudentId,
    managerId: u.username || '',
    workouts:  ST.workoutBlocks,
    updatedAt: Date.now()
  };

  try {
    if (ST.editPlanId) {
      await _updateDoc(_doc(_db, 'plans', ST.editPlanId), data);
    } else {
      data.createdAt = Date.now();
      await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), data);
    }
    closeModal('modal-plan');
    toast('✅ Plano salvo!');
    await openStudentDetail(ST.planStudentId);
  } catch (e) {
    errEl.textContent = 'Erro: ' + e.message;
  } finally {
    btn.classList.remove('btn-loading'); btn.textContent = 'Salvar plano';
  }
};

// ── Excluir plano ─────────────────────────────────────────────────────────────
window.deletePlan = async (planId, sid) => {
  if (!confirm('Excluir este plano de treino?')) return;
  try {
    await _deleteDoc(_doc(_db, 'plans', planId));
    toast('✅ Plano excluído.');
    await openStudentDetail(sid);
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Confirmação ao fechar modal com alterações ────────────────────────────────
window.confirmClosePlan = function () {
  const changed =
    JSON.stringify(ST.workoutBlocks) !== (ST._planSnapshot || '[]') ||
    document.getElementById('plan-title').value     !== (ST._planTitleSnapshot     || '') ||
    document.getElementById('plan-startdate').value !== (ST._planStartDateSnapshot || '') ||
    document.getElementById('plan-expiry').value    !== (ST._planExpirySnapshot    || '');
  if (changed) openModal('modal-confirm-close');
  else closeModal('modal-plan');
};
window.discardPlanAndClose = () => {
  ST.workoutBlocks = [];
  closeModal('modal-confirm-close');
  closeModal('modal-plan');
};

// ── Ver plano (somente leitura) ───────────────────────────────────────────────
window.viewPlan = function (planId) {
  const p = window.__gestorPlans[planId];
  if (!p) return;
  document.getElementById('pv-title').textContent = p.title || 'Plano';
  const body = document.getElementById('pv-body');
  body.innerHTML = (p.workouts || []).map((w, wi) => `
    <div class="pv-workout">
      <div class="pv-workout-title">
        <span class="workout-row-tag">${String.fromCharCode(65+wi)}</span>
        ${w.title || 'Treino ' + String.fromCharCode(65+wi)}
      </div>
      <div class="pv-days">${(w.days||[]).map(d => `<span class="day-chip">${DAYS[d]||d}</span>`).join('')}</div>
      ${(w.exercises||[]).map(ex => `
        <div class="pv-ex">
          <div class="pv-ex-name">${ex.name || '—'}</div>
          <div class="pv-ex-meta">${ex.series||3} séries · ${ex.reps||'12'} reps${ex.obs ? '<br>' + ex.obs : ''}</div>
          ${ex.ytUrl ? `<div class="yt-embed"><iframe src="${ytEmbed(ex.ytUrl)}" allowfullscreen loading="lazy"></iframe></div>` : ''}
        </div>`).join('')}
    </div>`).join('');
  const footer = document.getElementById('pv-footer');
  footer.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('modal-plan-view')">Fechar</button>
    <button class="btn btn-primary" onclick="closeModal('modal-plan-view');openPlanEditor('${p.studentId}','${p.id}')">✏️ Editar</button>`;
  openModal('modal-plan-view');
};

// ── WhatsApp ──────────────────────────────────────────────────────────────────
window.sendWhatsAppPlan = function (sid, planId) {
  const student = ST.students.find(s => s.id === sid) || {};
  const msg  = `Olá *${student.name || ''}*, seu treino está pronto! 🏋️\n\n*https://trainly.online*\n\n*Código de acesso:* \`${student.code || ''}\``;
  let url = 'https://wa.me/';
  if (student.phone) {
    const cleaned = student.phone.replace(/\D/g, '');
    url += (cleaned.startsWith('55') ? cleaned : '55' + cleaned);
  }
  url += '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
  toast('Abrindo WhatsApp...');
};

// ── Clone / Duplicar ──────────────────────────────────────────────────────────
window._clonePlanId = null; window._cloneFromSid = null; window._cloneTargetSid = null;

window.openCloneModal = function (planId, sid) {
  window._clonePlanId = planId; window._cloneFromSid = sid; window._cloneTargetSid = null;
  document.getElementById('clone-error').textContent = '';
  const others = ST.students.filter(s => s.id !== sid);
  const list   = document.getElementById('clone-student-list');
  list.innerHTML = !others.length
    ? '<p style="font-size:.83rem;color:var(--text3);">Sem outros alunos.</p>'
    : others.map(s => `<div class="clone-student-item" id="cloneitem_${s.id}" onclick="selectCloneTarget('${s.id}')">
        <div class="avatar" style="width:34px;height:34px;font-size:.82rem;">${initials(s.name)}</div>
        <div><div style="font-weight:700;">${s.name}</div><div style="font-size:.72rem;color:var(--text3);">${s.code}</div></div>
      </div>`).join('');
  openModal('modal-clone');
};

window.selectCloneTarget = sid => {
  window._cloneTargetSid = sid;
  document.querySelectorAll('.clone-student-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('cloneitem_' + sid)?.classList.add('selected');
  document.getElementById('clone-error').textContent = '';
};

window.doClonePlan = async function () {
  if (!window._cloneTargetSid) { document.getElementById('clone-error').textContent = 'Selecione um aluno.'; return; }
  const plan = window.__gestorPlans[window._clonePlanId];
  if (!plan) { document.getElementById('clone-error').textContent = 'Plano não encontrado.'; return; }
  const btn = document.getElementById('btn-do-clone');
  btn.classList.add('btn-loading'); btn.textContent = 'Clonando...';
  try {
    const targetStudent = ST.students.find(s => s.id === window._cloneTargetSid) || {};
    const newData = { ...plan, studentId: window._cloneTargetSid, title: plan.title + ' (cópia)', createdAt: Date.now() };
    delete newData.id;
    await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), newData);
    toast(`✅ Plano clonado para ${targetStudent.name || 'aluno'}!`);
    closeModal('modal-clone');
    await loadStudents();
  } catch (e) {
    document.getElementById('clone-error').textContent = 'Erro: ' + e.message;
  } finally { btn.classList.remove('btn-loading'); btn.textContent = 'Clonar plano'; }
};

window.duplicatePlan = async (planId, sid) => {
  const plan = window.__gestorPlans[planId];
  if (!plan) { toast('Plano não encontrado.', 'error'); return; }
  try {
    const newData = { ...plan, studentId: sid, title: plan.title + ' (cópia)', createdAt: Date.now() };
    delete newData.id;
    await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), newData);
    toast('✅ Plano duplicado!');
    await openStudentDetail(sid);
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Transferir aluno ──────────────────────────────────────────────────────────
window._transferStudentId = null; window._transferTargetManagerId = null;

window.openTransferModal = async function (sid) {
  window._transferStudentId = sid; window._transferTargetManagerId = null;
  document.getElementById('transfer-error').textContent = '';
  const student = ST.students.find(s => s.id === sid) || {};
  document.getElementById('transfer-student-avatar').textContent = initials(student.name || '?');
  document.getElementById('transfer-student-name').textContent   = student.name || '';
  document.getElementById('transfer-student-code').textContent   = student.code || '';
  const list = document.getElementById('transfer-manager-list');
  list.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
  openModal('modal-transfer');
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
    const managers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.username !== (student.managerId || ''));
    if (!managers.length) { list.innerHTML = '<p style="font-size:.83rem;color:var(--text3);">Nenhum outro gestor.</p>'; return; }
    list.innerHTML = managers.map(m => `
      <div class="clone-student-item" id="tmgr_${m.id}" onclick="selectTransferManager('${m.id}','${(m.name||m.username||'?').replace(/'/g,"&#39;")}','${m.username}')">
        <div class="avatar" style="width:34px;height:34px;font-size:.82rem;">${(m.name||m.username||'?').slice(0,2).toUpperCase()}</div>
        <div><div style="font-weight:700;">${m.name||m.username}</div><div style="font-size:.72rem;color:var(--text3);">@${m.username}</div></div>
      </div>`).join('');
  } catch (e) { list.innerHTML = `<p style="color:var(--red);">Erro: ${e.message}</p>`; }
};

window.selectTransferManager = (mgrId, mgrName, mgrUsername) => {
  window._transferTargetManagerId = mgrId;
  window._transferTargetManagerName = mgrName;
  window._transferTargetManagerUsername = mgrUsername;
  document.querySelectorAll('.clone-student-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('tmgr_' + mgrId)?.classList.add('selected');
  document.getElementById('transfer-error').textContent = '';
};

window.confirmTransfer = () => {
  if (!window._transferTargetManagerId) { document.getElementById('transfer-error').textContent = 'Selecione um gestor.'; return; }
  const student = ST.students.find(s => s.id === window._transferStudentId) || {};
  document.getElementById('transfer-confirm-text').innerHTML =
    `Transferir <strong>${student.name||''}</strong> para <strong>${window._transferTargetManagerName}</strong>?`;
  openModal('modal-transfer-confirm');
};

window.doTransfer = async () => {
  const btn = document.getElementById('btn-confirm-transfer');
  btn.classList.add('btn-loading'); btn.textContent = 'Transferindo...';
  try {
    const sid = window._transferStudentId;
    const mgrUsername = window._transferTargetManagerUsername;
    const mgrName     = window._transferTargetManagerName;
    let mgrPhone = '';
    const mgrSnap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', mgrUsername)));
    if (!mgrSnap.empty) mgrPhone = mgrSnap.docs[0].data().phone || '';
    await _updateDoc(_doc(_db, 'students', sid), { managerId: mgrUsername, managerName: mgrName, managerPhone: mgrPhone });
    closeModal('modal-transfer-confirm');
    closeModal('modal-transfer');
    toast(`✅ Aluno transferido para ${mgrName}!`);
    await loadStudents();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
  finally { btn.classList.remove('btn-loading'); btn.textContent = 'Sim, transferir'; }
};
