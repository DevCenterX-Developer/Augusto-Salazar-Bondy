// alumnos/dashboard.js — Panel del Estudiante

let studentData = null;
let studentClasses = [];
let allActivities = [];
let allSubmissions = [];
let currentActivity = null;

// ── Navegación ────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Inicio',
  clases: 'Mis Clases',
  actividades: 'Actividades',
  calificaciones: 'Calificaciones',
  anuncios: 'Anuncios',
  perfil: 'Mi Perfil'
};

function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;
  // Cerrar sidebar en mobile
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ── Inicialización ────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  AppUtils.initTheme();
  AppUtils.initSidebarMobile();
  AppUtils.showLoader('Cargando tu panel...');

  // Verificar sesión
  const user = AppUtils.getCurrentUser();
  if (!user || user.role !== 'student') {
    window.location.href = '../index.html';
    return;
  }

  try {
    await AppUtils.loadAppConfig();
    await AppUtils.initFirebase();
    studentData = user;
    setupProfile();
    await Promise.all([
      loadStudentClasses(),
      loadAnnouncements()
    ]);
    await loadAllActivities();
    updateDashboardStats();
    AppUtils.hideLoader();
    navigateTo('dashboard');
  } catch (err) {
    console.error(err);
    AppUtils.showToast('Error cargando datos. Recarga la página.', 'error');
    AppUtils.hideLoader();
  }
});

// ── Perfil ────────────────────────────────────
function setupProfile() {
  const initials = AppUtils.getInitials(studentData.name);
  document.getElementById('sidebar-name').textContent = studentData.name || 'Estudiante';
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('welcome-msg').textContent = `¡Hola, ${studentData.name?.split(' ')[0] || 'Estudiante'}!`;
  document.getElementById('profile-avatar-big').textContent = initials;
  document.getElementById('profile-name-big').textContent = studentData.name || '—';
  document.getElementById('profile-email-big').textContent = studentData.email || '—';
  document.getElementById('profile-grade-big').textContent = studentData.grade ? `Grado: ${studentData.grade}` : '';
}

// ── Clases ────────────────────────────────────
async function loadStudentClasses() {
  const { db, collection, query, where, getDocs } = window.__fb || await AppUtils.initFirebase();
  // Buscar memberships del estudiante
  const q = query(collection(db, 'class_members'), where('studentId', '==', studentData.uid));
  const snap = await getDocs(q);
  const classIds = snap.docs.map(d => d.data().classId);
  studentClasses = [];

  for (const cid of classIds) {
    const { doc, getDoc } = window.__fb || await AppUtils.initFirebase();
    const classSnap = await getDoc(doc(db, 'classes', cid));
    if (classSnap.exists()) studentClasses.push({ id: cid, ...classSnap.data() });
  }
  renderStudentClasses();
  document.getElementById('stat-classes').textContent = studentClasses.length;
}

function renderStudentClasses() {
  const grid = document.getElementById('student-classes-grid');
  if (!grid) return;
  if (!studentClasses.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-chalkboard"></i></div><h3>Sin clases aún</h3><p>Únete a una clase con el código que te dio tu profesor.</p></div>`;
    return;
  }
  grid.innerHTML = studentClasses.map((cls, i) => `
    <div class="class-card" onclick="openClassDetail('${cls.id}')">
      <div class="class-card-header" style="background:${AppUtils.getClassColor(i)}">
        <div>
          <div class="class-name">${cls.name}</div>
          <div class="class-code">Código: ${cls.code}</div>
        </div>
      </div>
      <div class="class-card-body">
        <div class="class-teacher"><i class="fas fa-user-tie"></i> ${cls.teacherName || 'Profesor'}</div>
        <div class="class-meta">
          <span><i class="fas fa-book"></i> ${cls.subject || 'Curso'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function openClassDetail(classId) {
  const cls = studentClasses.find(c => c.id === classId);
  if (!cls) return;
  document.getElementById('class-detail-title').textContent = cls.name;
  const body = document.getElementById('class-detail-body');
  body.innerHTML = `
    <div style="margin-bottom:20px">
      <p style="color:var(--text-secondary)">${cls.subject || ''} — Prof. ${cls.teacherName || ''}</p>
    </div>
    <div class="section-title">Recursos</div>
    <div class="resources-list" id="class-resources-${classId}">
      <div class="loading-spinner"></div>
    </div>
    <div class="section-title" style="margin-top:20px">Actividades de esta clase</div>
    <div class="activity-list" id="class-activities-${classId}">
      <div class="loading-spinner"></div>
    </div>
  `;
  openModal('class-detail-modal');
  loadClassResources(classId);
  loadClassActivitiesForModal(classId);
}

async function loadClassResources(classId) {
  const { db, collection, query, where, getDocs } = await AppUtils.initFirebase();
  const q = query(collection(db, 'resources'), where('classId', '==', classId));
  const snap = await getDocs(q);
  const el = document.getElementById(`class-resources-${classId}`);
  if (!el) return;
  if (snap.empty) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Sin recursos aún.</p>'; return; }
  el.innerHTML = '<div class="resources-list">' + snap.docs.map(d => {
    const r = d.data();
    const [icon, cls] = AppUtils.getFileIcon(r.name);
    return `<div class="resource-item" onclick="openResource('${r.url}','${r.name}')">
      <div class="resource-icon ${cls}"><i class="fas ${icon}"></i></div>
      <div><div class="resource-name">${r.name}</div><div class="resource-size">${r.type || ''}</div></div>
      <i class="fas fa-external-link-alt" style="margin-left:auto;color:var(--text-muted)"></i>
    </div>`;
  }).join('') + '</div>';
}

function openResource(url, name) { window.open(url, '_blank', 'noopener'); }

async function loadClassActivitiesForModal(classId) {
  const { db, collection, query, where, getDocs, orderBy } = await AppUtils.initFirebase();
  const q = query(collection(db, 'activities'), where('classId', '==', classId));
  const snap = await getDocs(q);
  const el = document.getElementById(`class-activities-${classId}`);
  if (!el) return;
  if (snap.empty) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Sin actividades aún.</p>'; return; }
  el.innerHTML = snap.docs.map(d => {
    const a = { id: d.id, ...d.data() };
    const sub = allSubmissions.find(s => s.activityId === a.id);
    const status = sub ? (sub.grade !== undefined ? 'graded' : 'submitted') : 'pending';
    return renderActivityItem(a, status);
  }).join('');
}

// ── Actividades ───────────────────────────────
async function loadAllActivities() {
  if (!studentClasses.length) {
    document.getElementById('dashboard-pending-list').innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-tasks"></i></div><h3>Sin actividades</h3><p>Únete a una clase primero.</p></div>';
    document.getElementById('all-activities-list').innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-tasks"></i></div><h3>Sin actividades</h3></div>';
    return;
  }
  const { db, collection, query, where, getDocs } = await AppUtils.initFirebase();
  allActivities = [];

  // Cargar actividades de todas las clases
  for (const cls of studentClasses) {
    const q = query(collection(db, 'activities'), where('classId', '==', cls.id), where('published', '==', true));
    const snap = await getDocs(q);
    snap.docs.forEach(d => allActivities.push({ id: d.id, className: cls.name, ...d.data() }));
  }

  // Cargar entregas del estudiante
  const subQ = query(collection(db, 'submissions'), where('studentId', '==', studentData.uid));
  const subSnap = await getDocs(subQ);
  allSubmissions = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderAllActivities('all');
  renderDashboardPending();
  updateDashboardStats();
}

function renderActivityItem(activity, status) {
  const icons = { pending: 'fa-clock', submitted: 'fa-check-circle', graded: 'fa-star', late: 'fa-exclamation-circle' };
  const colors = { pending: '#fef3c7', submitted: 'var(--secondary-light)', graded: '#dbeafe', late: 'var(--danger-light)' };
  const textColors = { pending: '#92400e', submitted: '#065f46', graded: '#1e40af', late: '#991b1b' };
  const statusLabels = { pending: 'Pendiente', submitted: 'Entregada', graded: 'Calificada', late: 'Atrasada' };
  const isLate = status === 'pending' && AppUtils.isOverdue(activity.dueDate);
  const finalStatus = isLate ? 'late' : status;

  return `<div class="activity-item" onclick="openActivity('${activity.id}')">
    <div class="activity-icon" style="background:${colors[finalStatus]};color:${textColors[finalStatus]}">
      <i class="fas ${icons[finalStatus]}"></i>
    </div>
    <div class="activity-info">
      <div class="activity-name">${activity.title || 'Actividad'}</div>
      <div class="activity-meta">
        <span><i class="fas fa-chalkboard"></i> ${activity.className || ''}</span>
        ${activity.dueDate ? `<span><i class="fas fa-calendar"></i> ${AppUtils.formatDate(activity.dueDate)}</span>` : ''}
        ${activity.maxScore ? `<span><i class="fas fa-star"></i> ${activity.maxScore} pts</span>` : ''}
      </div>
    </div>
    <span class="activity-status" style="background:${colors[finalStatus]};color:${textColors[finalStatus]}">
      <i class="fas ${icons[finalStatus]}"></i> ${statusLabels[finalStatus]}
    </span>
  </div>`;
}

function renderAllActivities(filter = 'all') {
  const list = document.getElementById('all-activities-list');
  if (!list) return;
  let items = allActivities.map(a => {
    const sub = allSubmissions.find(s => s.activityId === a.id);
    const status = sub ? (sub.grade !== undefined ? 'graded' : 'submitted') : 'pending';
    return { activity: a, status };
  });
  if (filter !== 'all') items = items.filter(i => i.status === filter);
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-tasks"></i></div><h3>Sin actividades</h3><p>No hay actividades en esta categoría.</p></div>';
    return;
  }
  list.innerHTML = items.map(i => renderActivityItem(i.activity, i.status)).join('');
}

function filterActivities(val) { renderAllActivities(val); }

function renderDashboardPending() {
  const el = document.getElementById('dashboard-pending-list');
  const pending = allActivities.filter(a => {
    const sub = allSubmissions.find(s => s.activityId === a.id);
    return !sub;
  }).slice(0, 5);
  if (!pending.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-check"></i></div><h3>Todo al día</h3><p>No tienes actividades pendientes.</p></div>';
    return;
  }
  el.innerHTML = pending.map(a => renderActivityItem(a, 'pending')).join('');
}

// ── Abrir actividad ───────────────────────────
async function openActivity(activityId) {
  const activity = allActivities.find(a => a.id === activityId);
  if (!activity) return;
  currentActivity = activity;

  const sub = allSubmissions.find(s => s.activityId === activityId);
  document.getElementById('activity-modal-title').textContent = activity.title || 'Actividad';

  const body = document.getElementById('activity-modal-body');
  const footer = document.getElementById('activity-modal-footer');

  let html = '';

  // Descripción
  if (activity.description) {
    html += `<div style="background:var(--bg);padding:14px 18px;border-radius:var(--radius-sm);margin-bottom:20px;color:var(--text-secondary);font-size:0.93rem">${activity.description}</div>`;
  }

  // Recursos adjuntos
  if (activity.resources?.length) {
    html += `<div class="section-title"><i class="fas fa-paperclip"></i> Recursos</div><div class="resources-list" style="margin-bottom:20px">`;
    activity.resources.forEach(r => {
      const [icon, cls] = AppUtils.getFileIcon(r.name);
      html += `<div class="resource-item" onclick="window.open('${r.url}','_blank')">
        <div class="resource-icon ${cls}"><i class="fas ${icon}"></i></div>
        <div><div class="resource-name">${r.name}</div></div>
        <i class="fas fa-external-link-alt" style="margin-left:auto;color:var(--text-muted)"></i>
      </div>`;
    });
    html += '</div>';
  }

  // Si ya fue entregada, mostrar respuestas
  if (sub) {
    html += `<div class="section-title">Tus respuestas</div>`;
    html += renderSubmittedAnswers(activity, sub);

    // Calificación
    if (sub.grade !== undefined) {
      html += `<div class="card" style="margin-top:20px">
        <div class="card-header"><h3><i class="fas fa-star" style="color:var(--accent)"></i> Calificación</h3></div>
        <div class="card-body" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          <div><div class="grade-badge ${getGradeClass(sub.grade, activity.maxScore)}" style="font-size:1.4rem;padding:8px 20px">${sub.grade}/${activity.maxScore || 20}</div></div>
          ${sub.teacherComment ? `<div><div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px">Comentario del profesor</div><p>${sub.teacherComment}</p></div>` : ''}
        </div>
      </div>`;
    }

    // Retroalimentación IA
    if (sub.aiFeedback) {
      html += renderAIFeedback(sub.aiFeedback);
    } else if (sub.grade !== undefined) {
      html += `<button class="btn-secondary" style="margin-top:12px" onclick="requestAIFeedback('${activityId}')">
        <i class="fas fa-robot"></i> Ver retroalimentación IA
      </button>`;
    }

    body.innerHTML = html;
    footer.innerHTML = `<button class="btn-secondary" onclick="closeModal('activity-modal')">Cerrar</button>`;
  } else {
    // Mostrar formulario para responder
    html += `<div class="section-title">Preguntas</div>`;
    html += `<form id="activity-answer-form" class="activity-form">`;
    (activity.questions || []).forEach((q, i) => {
      html += renderQuestionForStudent(q, i);
    });
    html += `</form>`;

    body.innerHTML = html;
    footer.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('activity-modal')">Cancelar</button>
      <button class="btn-primary" onclick="submitActivity('${activityId}')">
        <i class="fas fa-paper-plane"></i> Enviar respuestas
      </button>`;
  }

  openModal('activity-modal');
}

function renderQuestionForStudent(q, i) {
  let html = `<div class="question-block">
    <div class="question-text"><span class="q-num">${i + 1}.</span> ${q.text || 'Pregunta'}</div>`;

  if (q.image) html += `<img src="${q.image}" style="max-width:100%;border-radius:8px;margin-bottom:12px" loading="lazy"/>`;
  if (q.videoUrl) html += `<div style="margin-bottom:12px"><a href="${q.videoUrl}" target="_blank" class="btn-secondary" style="font-size:0.85rem"><i class="fas fa-play-circle"></i> Ver video</a></div>`;
  if (q.linkUrl) html += `<div style="margin-bottom:12px"><a href="${q.linkUrl}" target="_blank" class="btn-secondary" style="font-size:0.85rem"><i class="fas fa-link"></i> ${q.linkText || 'Abrir enlace'}</a></div>`;
  if (q.explanation) html += `<div style="background:var(--primary-light);padding:10px 14px;border-radius:8px;font-size:0.88rem;color:var(--text);margin-bottom:12px">${q.explanation}</div>`;

  switch (q.type) {
    case 'open':
      html += `<textarea class="answer-textarea" name="q_${i}" placeholder="Escribe tu respuesta aquí..." rows="4"></textarea>`;
      break;
    case 'multiple':
      html += `<div class="radio-group">` + (q.options || []).map((opt, j) =>
        `<label class="option-item"><input type="radio" name="q_${i}" value="${opt}"/> <label>${opt}</label></label>`
      ).join('') + `</div>`;
      break;
    case 'checkbox':
      html += `<div class="checkbox-group">` + (q.options || []).map((opt, j) =>
        `<label class="option-item"><input type="checkbox" name="q_${i}" value="${opt}"/> <label>${opt}</label></label>`
      ).join('') + `</div>`;
      break;
    case 'truefalse':
      html += `<div class="radio-group">
        <label class="option-item"><input type="radio" name="q_${i}" value="Verdadero"/> <label>✅ Verdadero</label></label>
        <label class="option-item"><input type="radio" name="q_${i}" value="Falso"/> <label>❌ Falso</label></label>
      </div>`;
      break;
    case 'text':
      html += `<p style="color:var(--text-secondary);font-style:italic;font-size:0.9rem">(Solo lectura — sin respuesta)</p>`;
      break;
  }
  html += `</div>`;
  return html;
}

function renderSubmittedAnswers(activity, sub) {
  if (!sub.answers || !activity.questions) return '<p style="color:var(--text-muted)">Sin respuestas registradas.</p>';
  return activity.questions.map((q, i) => `
    <div class="question-block" style="margin-bottom:12px">
      <div class="question-text"><span class="q-num">${i + 1}.</span> ${q.text || ''}</div>
      <div style="background:var(--bg);padding:12px 16px;border-radius:var(--radius-sm);font-size:0.9rem;color:var(--text)">
        ${Array.isArray(sub.answers[i]) ? sub.answers[i].join(', ') : (sub.answers[i] || '<em style="color:var(--text-muted)">Sin respuesta</em>')}
      </div>
    </div>
  `).join('');
}

// ── Enviar actividad ──────────────────────────
async function submitActivity(activityId) {
  const activity = currentActivity;
  const form = document.getElementById('activity-answer-form');
  if (!form) return;

  // Recolectar respuestas
  const answers = (activity.questions || []).map((q, i) => {
    if (q.type === 'checkbox') {
      return Array.from(form.querySelectorAll(`input[name="q_${i}"]:checked`)).map(el => el.value);
    } else if (q.type === 'open') {
      return form.querySelector(`[name="q_${i}"]`)?.value || '';
    } else {
      return form.querySelector(`input[name="q_${i}"]:checked`)?.value || '';
    }
  });

  AppUtils.showLoader('Enviando actividad...');
  try {
    const { db, collection, addDoc, serverTimestamp } = await AppUtils.initFirebase();
    const subDoc = await addDoc(collection(db, 'submissions'), {
      activityId,
      classId: activity.classId,
      studentId: studentData.uid,
      studentName: studentData.name,
      answers,
      submittedAt: serverTimestamp(),
      grade: undefined,
      teacherComment: '',
      aiFeedback: null
    });

    allSubmissions.push({ id: subDoc.id, activityId, studentId: studentData.uid, answers });
    AppUtils.hideLoader();
    closeModal('activity-modal');
    AppUtils.showToast('¡Actividad enviada exitosamente!', 'success');
    renderAllActivities('all');
    renderDashboardPending();
    updateDashboardStats();

    // Solicitar IA automáticamente
    requestAIFeedbackBySubmission(subDoc.id, activityId, answers, activity);
  } catch (err) {
    AppUtils.hideLoader();
    AppUtils.showToast('Error enviando. Intenta de nuevo.', 'error');
    console.error(err);
  }
}

// ── Retroalimentación IA ──────────────────────
async function requestAIFeedback(activityId) {
  const activity = allActivities.find(a => a.id === activityId);
  const sub = allSubmissions.find(s => s.activityId === activityId);
  if (!activity || !sub) return;
  await requestAIFeedbackBySubmission(sub.id, activityId, sub.answers, activity);
  openActivity(activityId);
}

async function requestAIFeedbackBySubmission(subId, activityId, answers, activity) {
  const cfg = window.APP_CONFIG || await AppUtils.loadAppConfig();
  if (!cfg.ai?.enabled || cfg.ai?.apiKey === 'TU_GEMINI_API_KEY') return;

  const questionsText = (activity.questions || []).map((q, i) =>
    `Pregunta ${i+1} (${q.type}): ${q.text}\nRespuesta del estudiante: ${Array.isArray(answers[i]) ? answers[i].join(', ') : answers[i] || 'Sin respuesta'}`
  ).join('\n\n');

  const prompt = `Eres un asistente educativo peruano para la I.E. Augusto Salazar Bondy 4015.
Analiza las respuestas de este estudiante a la actividad "${activity.title}" y da retroalimentación educativa en español.

${questionsText}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto adicional):
{
  "resumen": "Evaluación general breve del desempeño del estudiante",
  "errores": "Errores o conceptos mal entendidos encontrados",
  "sugerencias": "Sugerencias específicas de mejora",
  "puntuacion_sugerida": <número entre 0 y ${activity.maxScore || 20}>,
  "nivel": "Excelente|Bueno|Regular|Necesita mejorar"
}`;

  try {
    const result = await AppUtils.callGeminiAI(prompt);
    if (result.error) return;
    let feedback;
    try { feedback = JSON.parse(result.text.replace(/```json|```/g, '').trim()); }
    catch { feedback = { resumen: result.text, errores: '', sugerencias: '', puntuacion_sugerida: null, nivel: 'Regular' }; }

    // Guardar en Firestore
    const { db, doc, updateDoc } = await AppUtils.initFirebase();
    await updateDoc(doc(db, 'submissions', subId), { aiFeedback: feedback });

    // Actualizar local
    const sub = allSubmissions.find(s => s.activityId === activityId);
    if (sub) sub.aiFeedback = feedback;
  } catch (err) {
    console.error('Error IA:', err);
  }
}

function renderAIFeedback(fb) {
  return `<div class="ai-feedback">
    <div class="ai-feedback-header">
      <span class="ai-badge"><i class="fas fa-robot"></i> IA Gemini</span>
      <h4>Retroalimentación educativa</h4>
    </div>
    ${fb.nivel ? `<div style="margin-bottom:12px"><span class="tag tag-blue"><i class="fas fa-chart-bar"></i> Nivel: ${fb.nivel}</span>${fb.puntuacion_sugerida !== undefined && fb.puntuacion_sugerida !== null ? ` <span style="font-size:1.1rem;font-weight:800;color:var(--primary);margin-left:12px">Puntuación sugerida: ${fb.puntuacion_sugerida}</span>` : ''}</div>` : ''}
    ${fb.resumen ? `<div class="ai-section"><div class="ai-section-title">📋 Evaluación general</div><p>${fb.resumen}</p></div>` : ''}
    ${fb.errores ? `<div class="ai-section"><div class="ai-section-title">⚠️ Errores detectados</div><p>${fb.errores}</p></div>` : ''}
    ${fb.sugerencias ? `<div class="ai-section"><div class="ai-section-title">💡 Sugerencias de mejora</div><p>${fb.sugerencias}</p></div>` : ''}
  </div>`;
}

// ── Calificaciones ────────────────────────────
function loadGrades() {
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;
  const graded = allSubmissions.filter(s => s.grade !== undefined);
  if (!graded.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">Sin calificaciones aún.</td></tr>`;
    return;
  }
  tbody.innerHTML = graded.map(s => {
    const act = allActivities.find(a => a.id === s.activityId) || {};
    return `<tr>
      <td><strong>${act.title || 'Actividad'}</strong></td>
      <td>${s.className || act.className || '—'}</td>
      <td>${AppUtils.formatDate(s.submittedAt)}</td>
      <td><span class="grade-badge ${getGradeClass(s.grade, act.maxScore)}">${s.grade}/${act.maxScore || 20}</span></td>
      <td style="max-width:200px;font-size:0.85rem;color:var(--text-secondary)">${s.teacherComment || '—'}</td>
    </tr>`;
  }).join('');
}

function getGradeClass(grade, max = 20) {
  const pct = grade / max;
  if (pct >= 0.85) return 'grade-a';
  if (pct >= 0.70) return 'grade-b';
  if (pct >= 0.55) return 'grade-c';
  return 'grade-d';
}

// ── Anuncios ──────────────────────────────────
async function loadAnnouncements() {
  const { db, collection, query, orderBy, getDocs } = await AppUtils.initFirebase();
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAnnouncements(announcements);
    renderDashboardAnnouncements(announcements.slice(0, 3));
  } catch (err) {
    console.error('Anuncios:', err);
  }
}

function renderAnnouncements(list) {
  const el = document.getElementById('announcements-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-bullhorn"></i></div><h3>Sin anuncios</h3></div>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="announcement-item">
      <div class="announcement-title">${a.title || 'Anuncio'}</div>
      <div class="announcement-body">${a.content || ''}</div>
      <div class="announcement-meta">
        <span><i class="fas fa-user"></i> ${a.authorName || 'Dirección'}</span>
        <span><i class="fas fa-calendar"></i> ${AppUtils.formatDate(a.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function renderDashboardAnnouncements(list) {
  const el = document.getElementById('dashboard-announcements');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-bullhorn"></i></div><h3>Sin anuncios</h3></div>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="announcement-item" style="margin-bottom:12px">
      <div class="announcement-title">${a.title || 'Anuncio'}</div>
      <div class="announcement-body" style="font-size:0.87rem">${(a.content || '').substring(0, 120)}${(a.content || '').length > 120 ? '...' : ''}</div>
      <div class="announcement-meta"><span>${AppUtils.formatDate(a.createdAt)}</span></div>
    </div>
  `).join('');
}

// ── Unirse a clase ────────────────────────────
async function joinClass() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!code) { AppUtils.showToast('Ingresa el código de clase.', 'warning'); return; }

  AppUtils.showLoader('Buscando clase...');
  try {
    const { db, collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } = await AppUtils.initFirebase();
    const q = query(collection(db, 'classes'), where('code', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) { AppUtils.hideLoader(); AppUtils.showToast('Clase no encontrada. Verifica el código.', 'error'); return; }

    const classDoc = snap.docs[0];
    const classData = classDoc.data();

    // Verificar si ya está inscrito
    const memQ = query(collection(db, 'class_members'), where('classId', '==', classDoc.id), where('studentId', '==', studentData.uid));
    const memSnap = await getDocs(memQ);
    if (!memSnap.empty) { AppUtils.hideLoader(); AppUtils.showToast('Ya estás inscrito en esta clase.', 'info'); closeModal('join-class-modal'); return; }

    await addDoc(collection(db, 'class_members'), {
      classId: classDoc.id,
      studentId: studentData.uid,
      studentName: studentData.name,
      joinedAt: serverTimestamp()
    });

    studentClasses.push({ id: classDoc.id, ...classData });
    renderStudentClasses();
    AppUtils.hideLoader();
    closeModal('join-class-modal');
    document.getElementById('join-code-input').value = '';
    AppUtils.showToast(`¡Te uniste a "${classData.name}"!`, 'success');
    document.getElementById('stat-classes').textContent = studentClasses.length;
  } catch (err) {
    AppUtils.hideLoader();
    AppUtils.showToast('Error al unirse a la clase.', 'error');
    console.error(err);
  }
}

// ── Estadísticas ──────────────────────────────
function updateDashboardStats() {
  const pending = allActivities.filter(a => !allSubmissions.find(s => s.activityId === a.id)).length;
  const done = allSubmissions.length;
  const graded = allSubmissions.filter(s => s.grade !== undefined);
  const avg = graded.length ? Math.round(graded.reduce((acc, s) => acc + (s.grade || 0), 0) / graded.length) : null;

  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-avg').textContent = avg !== null ? avg : '—';

  const badge = document.getElementById('pending-badge');
  if (pending > 0) { badge.style.display = 'inline-flex'; badge.textContent = pending; }
  else badge.style.display = 'none';
}

// ── Buscador ──────────────────────────────────
function handleSearch(val) {
  const q = val.toLowerCase();
  if (!q) { renderAllActivities('all'); return; }
  const filtered = allActivities.filter(a => (a.title || '').toLowerCase().includes(q) || (a.className || '').toLowerCase().includes(q));
  const list = document.getElementById('all-activities-list');
  if (!list) return;
  navigateTo('actividades');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3>Sin resultados</h3></div>';
    return;
  }
  list.innerHTML = filtered.map(a => {
    const sub = allSubmissions.find(s => s.activityId === a.id);
    const status = sub ? (sub.grade !== undefined ? 'graded' : 'submitted') : 'pending';
    return renderActivityItem(a, status);
  }).join('');
}

// ── Iniciar carga de calificaciones al navegar ─
document.querySelectorAll('[data-page="calificaciones"]').forEach(btn => {
  btn.addEventListener('click', () => loadGrades());
});
