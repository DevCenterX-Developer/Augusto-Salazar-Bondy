# I.E. Augusto Salazar Bondy 4015 — Plataforma Educativa

## 📋 Instrucciones de Configuración

### 1. Configurar Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Activa **Authentication** → Correo/Contraseña
4. Activa **Firestore Database**
5. Activa **Storage**
6. Ve a Configuración del proyecto → Tus apps → Web
7. Copia las credenciales y pégalas en `config.json`

### 2. Configurar Gemini AI (opcional)

1. Ve a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Genera una API Key
3. Pégala en `config.json` bajo `ai.apiKey`

### 3. Editar config.json

```json
{
  "firebase": {
    "apiKey": "TU_API_KEY_AQUÍ",
    "authDomain": "tu-proyecto.firebaseapp.com",
    "projectId": "tu-proyecto",
    "storageBucket": "tu-proyecto.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abcdef"
  },
  "ai": {
    "provider": "gemini",
    "apiKey": "TU_GEMINI_API_KEY_AQUÍ",
    "model": "gemini-1.5-flash",
    "enabled": true
  },
  "app": {
    "teacherCode": "ASB4015PROF"
  }
}
```

### 4. Reglas de Firestore

Copia estas reglas en Firebase → Firestore → Reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /class_members/{docId} {
      allow read, write: if request.auth != null;
    }
    match /activities/{actId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /submissions/{subId} {
      allow read, write: if request.auth != null;
    }
    match /resources/{resId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /announcements/{annId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Reglas de Storage

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Abrir la plataforma

- Abre `index.html` en tu navegador (usa un servidor local como Live Server en VS Code)
- O súbela a Firebase Hosting / Netlify / Vercel

---

## 👥 Roles

| Rol | Acceso |
|-----|--------|
| Estudiante | Panel alumno, clases, actividades, calificaciones |
| Profesor | Panel docente, crear clases, actividades, calificar |

**Código de registro docente por defecto:** `ASB4015PROF`  
(Cámbialo en config.json → `app.teacherCode`)

---

## 📁 Estructura

```
/alumnos          → Panel del estudiante
/profesores       → Panel del profesor
/assets           → Utilidades compartidas
/firebase         → Configuración Firebase
/config           → Config extras
index.html        → Página de login
style.css         → Estilos globales
script.js         → Lógica de autenticación
config.json       → Configuración del sistema
```

---

## 🔗 Links del colegio

- **Facebook:** https://www.facebook.com/share/18pBELJ6jw/
- **Ubicación:** https://share.google/YClJ9vYz95HX5Omny
