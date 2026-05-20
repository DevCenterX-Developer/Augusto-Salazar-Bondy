// ============================================
// I.E. AUGUSTO SALAZAR BONDY 4015
// script.js — Autenticación y utilidades globales
// ============================================

let APP_CONFIG = null;
let firebaseModules = {};

// ── Cargar configuración ─────────────────────
async function loadAppConfig() {
  const res = await fetch('config.json');
  APP_CONFIG = await res.json();
  return APP_CONFIG;
}

// ── Inicializar Firebase ─────────────────────
async function initFirebase() {
  if (firebaseModules.auth) return firebaseModules;

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  const { getStorage, ref, uploadBytes, getDownloadURL } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');

  const app = initializeApp(APP_CONFIG.firebase);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  firebaseModules = {
    app, db, auth, storage,
    // Firestore
    doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, serverTimestamp,
    // Auth
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
    // Storage
    ref, uploadBytes, getDownloadURL
  };

  return firebaseModules;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
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
function showLoader() { document.getElementById('global-loader')?.classList.remove('hidden'); }
function hideLoader() { document.getElementById('global-loader')?.classList.add('hidden'); }

// ── Toggle password ───────────────────────────
function togglePw(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = `<i class="fas fa-eye${isText ? '' : '-slash'}"></i>`;
}

// ── Secciones auth ────────────────────────────
let currentRole = null;
function showSection(id) {
  document.querySelectorAll('.auth-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}
function selectRole(role) {
  currentRole = role;
  showSection(role === 'student' ? 'student-login' : 'teacher-login');
}
function goBack() { showSection('role-selector'); currentRole = null; }

// ── Botón loading ─────────────────────────────
function setBtnLoading(btn, loading, text = 'Procesando...') {
  if (loading) {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
  }
}

// ── REGISTRO ESTUDIANTE ───────────────────────
async function handleStudentRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('s-reg-btn');
  const name = document.getElementById('s-name').value.trim();
  const email = document.getElementById('s-reg-email').value.trim();
  const password = document.getElementById('s-reg-password').value;
  const grade = document.getElementById('s-grade').value.trim();

  setBtnLoading(btn, true, 'Creando cuenta...');
  try {
    const { createUserWithEmailAndPassword, db, auth, doc, setDoc, serverTimestamp } = await initFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, role: 'student', grade,
      createdAt: serverTimestamp(), uid: cred.user.uid
    });
    showToast('Cuenta creada con éxito. ¡Bienvenido!', 'success');
    window.location.href = 'alumnos/dashboard.html';
  } catch (err) {
    showToast(getAuthError(err.code), 'error');
    setBtnLoading(btn, false);
  }
}

// ── LOGIN ESTUDIANTE ──────────────────────────
async function handleStudentLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('s-login-btn');
  const email = document.getElementById('s-email').value.trim();
  const password = document.getElementById('s-password').value;

  setBtnLoading(btn, true, 'Ingresando...');
  try {
    const { signInWithEmailAndPassword, db, auth, doc, getDoc } = await initFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) throw { code: 'user-not-found' };
    const userData = userDoc.data();
    if (userData.role !== 'student') {
      await firebaseModules.signOut(auth);
      throw { code: 'wrong-role-student' };
    }
    sessionStorage.setItem('asb_user', JSON.stringify({ ...userData, uid: cred.user.uid }));
    showToast(`¡Bienvenido, ${userData.name}!`, 'success');
    window.location.href = 'alumnos/dashboard.html';
  } catch (err) {
    showToast(getAuthError(err.code), 'error');
    setBtnLoading(btn, false);
  }
}

// ── LOGIN PROFESOR ────────────────────────────
async function handleTeacherLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('t-login-btn');
  const email = document.getElementById('t-email').value.trim();
  const password = document.getElementById('t-password').value;

  setBtnLoading(btn, true, 'Ingresando...');
  try {
    const { signInWithEmailAndPassword, db, auth, doc, getDoc } = await initFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) throw { code: 'user-not-found' };
    const userData = userDoc.data();
    if (userData.role !== 'teacher' && userData.role !== 'admin') {
      await firebaseModules.signOut(auth);
      throw { code: 'wrong-role-teacher' };
    }
    sessionStorage.setItem('asb_user', JSON.stringify({ ...userData, uid: cred.user.uid }));
    showToast(`¡Bienvenido, Prof. ${userData.name}!`, 'success');
    window.location.href = 'profesores/dashboard.html';
  } catch (err) {
    showToast(getAuthError(err.code), 'error');
    setBtnLoading(btn, false);
  }
}

// ── REGISTRO PROFESOR ─────────────────────────
async function handleTeacherRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('t-reg-btn');
  const name = document.getElementById('t-name').value.trim();
  const email = document.getElementById('t-reg-email').value.trim();
  const password = document.getElementById('t-reg-password').value;
  const specialty = document.getElementById('t-specialty').value.trim();
  const accessCode = document.getElementById('t-access-code').value.trim();

  // Verificar código de acceso docente (configurable)
  const TEACHER_CODE = APP_CONFIG?.app?.teacherCode || 'ASB4015PROF';
  if (accessCode !== TEACHER_CODE) {
    showToast('Código de acceso docente incorrecto.', 'error');
    return;
  }

  setBtnLoading(btn, true, 'Creando cuenta...');
  try {
    const { createUserWithEmailAndPassword, db, auth, doc, setDoc, serverTimestamp } = await initFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, role: 'teacher', specialty,
      createdAt: serverTimestamp(), uid: cred.user.uid
    });
    showToast('Cuenta docente creada. ¡Bienvenido!', 'success');
    window.location.href = 'profesores/dashboard.html';
  } catch (err) {
    showToast(getAuthError(err.code), 'error');
    setBtnLoading(btn, false);
  }
}

// ── RECUPERAR CONTRASEÑA (solo profesores) ────
async function handleRecover(e) {
  e.preventDefault();
  const btn = document.getElementById('r-btn');
  const email = document.getElementById('r-email').value.trim();

  setBtnLoading(btn, true, 'Enviando...');
  try {
    const { sendPasswordResetEmail, auth } = await initFirebase();
    await sendPasswordResetEmail(auth, email);
    showToast('Enlace enviado a tu correo. Revisa tu bandeja.', 'success');
    showSection('teacher-login');
  } catch (err) {
    showToast(getAuthError(err.code), 'error');
    setBtnLoading(btn, false);
  }
}

// ── Mensajes de error ─────────────────────────
function getAuthError(code) {
  const errors = {
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/invalid-email': 'Correo electrónico inválido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'Usuario no encontrado.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Credenciales incorrectas. Verifica tu correo y contraseña.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
    'user-not-found': 'No se encontró el perfil de usuario.',
    'wrong-role-student': 'Esta cuenta no es de estudiante. Usa el acceso de profesor.',
    'wrong-role-teacher': 'Esta cuenta no es de docente. Usa el acceso de estudiante.',
  };
  return errors[code] || 'Ocurrió un error. Intenta de nuevo.';
}

// ── Inicialización ────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoader();
    await loadAppConfig();
    // Verificar si ya hay sesión
    const savedUser = sessionStorage.getItem('asb_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'student') window.location.href = 'alumnos/dashboard.html';
      else if (user.role === 'teacher' || user.role === 'admin') window.location.href = 'profesores/dashboard.html';
      return;
    }
    hideLoader();
    showSection('role-selector');
  } catch (err) {
    console.error('Error inicializando:', err);
    hideLoader();
    showSection('role-selector');
  }
});
