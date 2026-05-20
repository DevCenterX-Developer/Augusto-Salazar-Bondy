// assets/app-utils.js — Utilidades compartidas

let APP_CONFIG = null;
let firebaseModules = {};
let currentUser = null;

// ── Config ────────────────────────────────────
async function loadAppConfig() {
  if (APP_CONFIG) return APP_CONFIG;
  const base = window.location.pathname.includes('/alumnos/') || window.location.pathname.includes('/profesores/')
    ? '../config.json' : 'config.json';
  const res = await fetch(base);
  APP_CONFIG = await res.json();
  return APP_CONFIG;
}

// ── Firebase ──────────────────────────────────
async function initFirebase() {
  if (firebaseModules.auth) return firebaseModules;
  const cfg = APP_CONFIG || await loadAppConfig();

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const {
    getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
    query, where, updateDoc, deleteDoc, orderBy, serverTimestamp, limit, onSnapshot
  } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const { getAuth, onAuthStateChanged, signOut } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');

  const app = initializeApp(cfg.firebase);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  firebaseModules = {
    app, db, auth, storage,
    doc, setDoc, getDoc, collection, addDoc, getDocs,
    query, where, updateDoc, deleteDoc, orderBy, serverTimestamp, limit, onSnapshot,
    onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL, deleteObject
  };
  return firebaseModules;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <i class="fas ${icons[type]} toast-icon"></i>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, duration);
}

// ── Loader ────────────────────────────────────
function showLoader(text = 'Cargando...') {
  let l = document.getElementById('global-loader');
  if (l) { l.classList.remove('hidden'); l.querySelector('p').textContent = text; return; }
  l = document.createElement('div');
  l.id = 'global-loader'; l.className = 'global-loader';
  l.innerHTML = `<div class="loader-inner"><div class="loader-logo">ASB</div><div class="loader-spinner"></div><p>${text}</p></div>`;
  document.body.appendChild(l);
}
function hideLoader() { document.getElementById('global-loader')?.classList.add('hidden'); }

// ── Tema oscuro ───────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('asb_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('asb_theme', next);
  updateThemeBtn(next);
}
function updateThemeBtn(theme) {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.innerHTML = `<i class="fas fa-${theme === 'dark' ? 'sun' : 'moon'}"></i> ${theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}`;
}

// ── Sidebar mobile ────────────────────────────
function initSidebarMobile() {
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) { overlay = document.createElement('div'); overlay.className = 'sidebar-overlay'; document.body.appendChild(overlay); }
  if (menuBtn) menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

// ── Cerrar sesión ─────────────────────────────
async function logout() {
  const { auth, signOut } = await initFirebase();
  await signOut(auth);
  sessionStorage.removeItem('asb_user');
  window.location.href = '../index.html';
}

// ── Obtener usuario actual ────────────────────
function getCurrentUser() {
  if (currentUser) return currentUser;
  const saved = sessionStorage.getItem('asb_user');
  if (saved) { currentUser = JSON.parse(saved); return currentUser; }
  return null;
}

// ── Initials avatar ───────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ── Fecha legible ─────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function isOverdue(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d < new Date();
}

// ── Colores de clase ──────────────────────────
const CLASS_COLORS = [
  'linear-gradient(135deg,#1a6ef5,#7c3aed)',
  'linear-gradient(135deg,#0ea271,#1a6ef5)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#ef4444,#f97316)',
  'linear-gradient(135deg,#0ea271,#06b6d4)',
];
function getClassColor(idx) { return CLASS_COLORS[idx % CLASS_COLORS.length]; }

// ── Gemini AI ─────────────────────────────────
async function callGeminiAI(prompt) {
  const cfg = APP_CONFIG || await loadAppConfig();
  const apiKey = cfg.ai?.apiKey;
  if (!apiKey || apiKey === 'TU_GEMINI_API_KEY') {
    return { error: true, message: 'API Key de Gemini no configurada.' };
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.ai.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (data.error) return { error: true, message: data.error.message };
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  } catch (err) {
    return { error: true, message: err.message };
  }
}

// ── Subir archivo a Firebase Storage ─────────
async function uploadFile(file, path) {
  const { storage, ref, uploadBytes, getDownloadURL } = await initFirebase();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

// ── Icono según tipo de archivo ───────────────
function getFileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase();
  const map = { pdf: ['fa-file-pdf', 'resource-pdf'], jpg: ['fa-file-image', 'resource-img'], jpeg: ['fa-file-image', 'resource-img'], png: ['fa-file-image', 'resource-img'], mp4: ['fa-file-video', 'resource-vid'], webm: ['fa-file-video', 'resource-vid'], doc: ['fa-file-word', 'resource-doc'], docx: ['fa-file-word', 'resource-doc'] };
  return map[ext] || ['fa-file', 'resource-doc'];
}

// ── Modal helpers ─────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ── Número de código de clase ─────────────────
function generateClassCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── Exportar ──────────────────────────────────
window.AppUtils = {
  loadAppConfig, initFirebase, showToast, showLoader, hideLoader,
  initTheme, toggleTheme, initSidebarMobile, logout, getCurrentUser,
  getInitials, formatDate, formatDateTime, isOverdue,
  getClassColor, callGeminiAI, uploadFile, getFileIcon,
  openModal, closeModal, generateClassCode
};
