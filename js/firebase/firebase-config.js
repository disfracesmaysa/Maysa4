// =========================================================
// FIREBASE - CONFIGURACIÓN DEL NEGOCIO
// Solo la administradora técnica modifica estos datos.
// El cliente final no necesita entrar a Firebase.
// =========================================================
window.SAGC_FIREBASE = {
  ACTIVO: false,
  NOMBRE_NEGOCIO: "",
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  // Clave pública VAPID generada en Cloud Messaging > Certificados push web
  vapidKey: "",
  // Aplicación web de Apps Script que guarda automáticamente los tokens.
  TOKEN_ENDPOINT: "",

  // SAGC Push Notifications v2.0
  ICONO: "./assets/icons/logo192x192.png",
  BADGE: "./assets/icons/logo192x192.png",
  MENSAJE_PREDETERMINADO: "Tienes una nueva promoción",
  REQUIRE_INTERACTION: false,
  RENOTIFY: false,
  ACCIONES: true,
  REINTENTOS_TOKEN: 3,
  REVISAR_TOKEN_CADA_HORAS: 24
};
