// =========================================================
// SAGC Push Notifications v2.0
// Activación profesional, token único por instalación y reintentos.
// =========================================================
(async function(){
  "use strict";

  const cfg = window.SAGC_FIREBASE || {};
  if(!cfg.ACTIVO) return;

  const KEYS = {
    token: "sagc_fcm_token",
    tokenDate: "sagc_fcm_token_fecha",
    registered: "sagc_fcm_token_registrado",
    installId: "sagc_push_installation_id",
    lastSync: "sagc_push_last_sync",
    pendingDestination: "sagc_push_pending_destination"
  };

  let firebasePromise = null;
  let onMessageConfigured = false;
  let activating = false;
  let currentState = "idle";
  let activeMessageTimer = null;

  function installationId(){
    let id = localStorage.getItem(KEYS.installId);
    if(!id){
      id = (crypto.randomUUID ? crypto.randomUUID() : `sagc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(KEYS.installId, id);
    }
    return id;
  }

  function isIOS(){
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  function isStandalone(){
    return window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
  }

  function svgIcon(name){
    const icons = {
      bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      wait:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M8 2v5l4 5-4 5v5M16 2v5l-4 5 4 5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      blocked:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m6 6 12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };
    return icons[name] || icons.bell;
  }

  function showGuidance(message){
    let box = document.getElementById("sagcNotificationGuide");
    if(!box){
      box = document.createElement("div");
      box.id = "sagcNotificationGuide";
      box.setAttribute("role", "status");
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(showGuidance.timer);
    showGuidance.timer = setTimeout(() => box.classList.remove("show"), 6500);
  }

  function supportedBasic(){
    return window.isSecureContext && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  }

  function hideButton(){
    const btn = document.getElementById("sagcNotificationButton");
    if(btn) btn.style.display = "none";
  }

  function showButton(){
    const btn = document.getElementById("sagcNotificationButton");
    if(btn) btn.style.display = "inline-flex";
  }

  function setState(state, detail=""){
    currentState = state;
    const btn = document.getElementById("sagcNotificationButton");
    if(!btn) return;
    if(activeMessageTimer){ clearTimeout(activeMessageTimer); activeMessageTimer = null; }

    if(state === "active"){
      hideButton();
      return;
    }

    showButton();
    const states = {
      unsupported: ["info", "No compatible"],
      iosInstall: ["info", "Agregar a inicio"],
      idle: ["bell", "Activar notificaciones"],
      activating: ["wait", "Activando…"],
      denied: ["blocked", "Activar permiso"],
      temporary: ["info", "Reintentar activación"]
    };
    const [icon, label] = states[state] || states.idle;
    btn.innerHTML = `${svgIcon(icon)}<span>${label}</span>`;
    btn.title = detail || label;
    btn.disabled = state === "activating" || state === "unsupported";
    btn.dataset.state = state;
  }

  function refreshButton(){
    if(typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem(KEYS.token)){
      currentState = "active";
      hideButton();
      return;
    }
    if(isIOS() && !isStandalone()) return setState("iosInstall", "En iPhone, agrega el catálogo a la pantalla de inicio y ábrelo desde su icono.");
    if(!supportedBasic()) return hideButton();
    if(Notification.permission === "denied") return setState("denied", "Activa Notificaciones desde los permisos del sitio y vuelve a tocar aquí.");
    setState("idle");
  }

  function createButton(){
    let btn = document.getElementById("sagcNotificationButton");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "sagcNotificationButton";
      btn.type = "button";
      btn.setAttribute("aria-live", "polite");
      btn.className = "sagc-notification-button";
      document.body.appendChild(btn);
    }
    btn.removeEventListener("click", activateNotifications);
    btn.addEventListener("click", activateNotifications);
    refreshButton();
  }

  function device(){
    const ua = navigator.userAgent || "";
    if(/Android/i.test(ua)) return "Android";
    if(/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
    if(/Windows/i.test(ua)) return "Windows";
    if(/Macintosh|Mac OS X/i.test(ua)) return "Mac";
    if(/Linux/i.test(ua)) return "Linux";
    return "Desconocido";
  }

  function browser(){
    const ua = navigator.userAgent || "";
    if(/Edg\//i.test(ua)) return "Microsoft Edge";
    if(/SamsungBrowser/i.test(ua)) return "Samsung Internet";
    if(/OPR\//i.test(ua)) return "Opera";
    if(/Chrome\//i.test(ua)) return "Google Chrome";
    if(/Firefox\//i.test(ua)) return "Firefox";
    if(/Safari\//i.test(ua)) return "Safari";
    return "Desconocido";
  }

  function endpointPayload(action, token, previousToken=""){
    return {
      action,
      token,
      previousToken,
      installationId: installationId(),
      negocio: cfg.NOMBRE_NEGOCIO || "",
      dispositivo: device(),
      navegador: browser(),
      userAgent: navigator.userAgent || "",
      url: location.href,
      fecha: new Date().toISOString()
    };
  }

  async function postEndpoint(payload){
    const endpoint = String(cfg.TOKEN_ENDPOINT || "").trim();
    if(!endpoint) return false;
    try{
      await fetch(endpoint, {
        method:"POST", mode:"no-cors", keepalive:true,
        headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify(payload)
      });
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      return true;
    }catch(error){
      console.warn("SAGC Push: sincronización pendiente.", error);
      return false;
    }
  }

  async function syncToken(token, previousToken=""){
    if(!token) return false;
    const ok = await postEndpoint(endpointPayload("UPSERT_TOKEN", token, previousToken));
    if(ok) localStorage.setItem(KEYS.registered, token);
    return ok;
  }

  async function deactivateToken(token, reason="replaced"){
    if(!token) return false;
    return postEndpoint({...endpointPayload("DEACTIVATE_TOKEN", token), reason});
  }

  async function loadFirebase(){
    if(firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js");
      const { getMessaging, getToken, onMessage, isSupported } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js");
      if(!(await isSupported())) throw new Error("UNSUPPORTED_PUSH");
      const app = getApps().length ? getApp() : initializeApp({
        apiKey:cfg.apiKey, authDomain:cfg.authDomain, projectId:cfg.projectId,
        storageBucket:cfg.storageBucket, messagingSenderId:cfg.messagingSenderId, appId:cfg.appId
      });
      return { messaging:getMessaging(app), getToken, onMessage };
    })();
    try{return await firebasePromise;}catch(error){firebasePromise=null; throw error;}
  }

  async function serviceWorkerRegistration(){
    let reg = await navigator.serviceWorker.getRegistration();
    if(!reg) reg = await navigator.serviceWorker.register("./service-worker.js", {scope:"./"});
    const ready = await navigator.serviceWorker.ready;
    if(ready.active) return ready;
    return reg;
  }

  async function permission(){
    if(Notification.permission === "granted") return "granted";
    if(Notification.permission === "denied") throw new Error("PERMISSION_DENIED");
    const result = await Notification.requestPermission();
    if(result !== "granted") throw new Error(result === "denied" ? "PERMISSION_DENIED" : "PERMISSION_DISMISSED");
    return result;
  }

  function isTemporary(error){
    const text = String(error?.message || error || "").toLowerCase();
    return text.includes("push service error") || text.includes("registration failed") ||
      text.includes("network") || text.includes("timeout") || text.includes("abort");
  }

  async function getTokenWithRetry(messaging, getToken, reg){
    const attempts = Number(cfg.REINTENTOS_TOKEN || 3);
    let lastError;
    for(let i=0;i<attempts;i++){
      try{
        return await getToken(messaging, {vapidKey:cfg.vapidKey, serviceWorkerRegistration:reg});
      }catch(error){
        lastError = error;
        if(!isTemporary(error) || i === attempts-1) throw error;
        await new Promise(r => setTimeout(r, 800 * (i+1)));
      }
    }
    throw lastError;
  }


  function pendingFromData(data={}){
    const producto = String(data.producto || "").trim();
    let url = String(data.url || data.link || "").trim();
    if(!url && producto){
      url = `./?producto=${encodeURIComponent(producto)}`;
    }
    if(!url) return null;

    try{
      url = new URL(url, location.href).href;
    }catch(_){
      return null;
    }

    return {url, producto, createdAt:Date.now()};
  }

  function savePendingDestination(data={}, reg=null){
    const pending = pendingFromData(data);
    if(!pending) return;

    localStorage.setItem(KEYS.pendingDestination, JSON.stringify(pending));

    const worker = reg?.active || navigator.serviceWorker.controller;
    if(worker){
      worker.postMessage({
        type:"SAGC_SAVE_PENDING_DESTINATION",
        data:{
          url:pending.url,
          producto:pending.producto
        }
      });
    }
  }

  function consumePendingFromServiceWorker(){
    return new Promise(resolve => {
      if(!("serviceWorker" in navigator)) return resolve(null);

      const timer = setTimeout(() => resolve(null), 1800);
      navigator.serviceWorker.ready.then(reg => {
        const worker = reg.active || navigator.serviceWorker.controller;
        if(!worker){
          clearTimeout(timer);
          resolve(null);
          return;
        }

        const channel = new MessageChannel();
        channel.port1.onmessage = event => {
          clearTimeout(timer);
          resolve(event.data?.pending || null);
        };
        worker.postMessage(
          {type:"SAGC_CONSUME_PENDING_DESTINATION"},
          [channel.port2]
        );
      }).catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  function consumePendingLocalFallback(){
    try{
      const raw = localStorage.getItem(KEYS.pendingDestination);
      localStorage.removeItem(KEYS.pendingDestination);
      if(!raw) return null;
      const pending = JSON.parse(raw);
      if(!pending?.url) return null;
      if(Date.now() - Number(pending.createdAt || 0) > 7 * 24 * 60 * 60 * 1000) return null;
      return pending;
    }catch(_){
      localStorage.removeItem(KEYS.pendingDestination);
      return null;
    }
  }

  async function openPendingDestination(){
    const fromWorker = await consumePendingFromServiceWorker();
    const fallback = consumePendingLocalFallback();
    const pending = fromWorker || fallback;
    if(!pending?.url) return false;

    let target;
    try{
      target = new URL(pending.url, location.href);
    }catch(_){
      return false;
    }

    // Seguridad: solo permite destinos del mismo catálogo.
    if(target.origin !== location.origin) return false;

    const current = new URL(location.href);
    if(target.href !== current.href){
      location.replace(target.href);
      return true;
    }
    return false;
  }

  function configureForeground(messaging, onMessage, reg){
    if(onMessageConfigured) return;
    onMessageConfigured = true;
    onMessage(messaging, payload => {
      const n = payload.notification || {};
      const d = payload.data || {};
      savePendingDestination(d, reg);
      const options = {
        body:n.body || d.body || cfg.MENSAJE_PREDETERMINADO || "Tienes una nueva promoción",
        icon:n.icon || d.icon || cfg.ICONO || "./assets/icons/logo192x192.png",
        badge:d.badge || cfg.BADGE || "./assets/icons/logo192x192.png",
        image:n.image || d.image || undefined,
        tag:d.tag || `sagc-${d.producto || "general"}`,
        renotify:String(d.renotify || cfg.RENOTIFY || "false") === "true",
        requireInteraction:String(d.requireInteraction || cfg.REQUIRE_INTERACTION || "false") === "true",
        vibrate:[200,100,200],
        data:{url:d.url || d.link || "./"},
        actions: cfg.ACCIONES === false ? [] : [{action:"view",title:"Ver"},{action:"close",title:"Cerrar"}]
      };
      reg.showNotification(n.title || d.title || cfg.NOMBRE_NEGOCIO || "Nueva notificación", options);
    });
  }

  async function clearPendingNotifications(){
    if(!("serviceWorker" in navigator)) return;
    try{
      const reg = await navigator.serviceWorker.ready;
      if(typeof reg.getNotifications === "function"){
        const notifications = await reg.getNotifications();
        notifications.forEach(notification => notification.close());
      }
      const worker = reg.active || navigator.serviceWorker.controller;
      if(worker) worker.postMessage({type:"SAGC_CLEAR_NOTIFICATIONS"});
      if(typeof navigator.clearAppBadge === "function") await navigator.clearAppBadge();
      else if(typeof navigator.setAppBadge === "function") await navigator.setAppBadge(0);
    }catch(error){
      console.warn("SAGC Push: no se pudieron limpiar todas las notificaciones pendientes.", error);
    }
  }

  async function ensureCurrentToken({silent=true}={}){
    if(!supportedBasic() || Notification.permission !== "granted") return null;
    try{
      const reg = await serviceWorkerRegistration();
      const {messaging,getToken,onMessage} = await loadFirebase();
      const token = await getTokenWithRetry(messaging,getToken,reg);
      if(!token) return null;
      const previous = localStorage.getItem(KEYS.token) || "";
      if(previous && previous !== token) await deactivateToken(previous, "token_refreshed");
      localStorage.setItem(KEYS.token, token);
      localStorage.setItem(KEYS.tokenDate, new Date().toISOString());
      configureForeground(messaging,onMessage,reg);
      await syncToken(token, previous !== token ? previous : "");
      refreshButton();
      return token;
    }catch(error){
      if(!silent) throw error;
      console.warn("SAGC Push: actualización de token pendiente.", error);
      return null;
    }
  }

  async function activateNotifications(){
    if(activating) return;
    if(currentState === "iosInstall"){
      showGuidance("En iPhone: toca Compartir, elige ‘Agregar a pantalla de inicio’, abre el catálogo desde su icono y vuelve a activar las notificaciones.");
      return;
    }
    if(currentState === "denied"){
      showGuidance("Las notificaciones están bloqueadas. Abre los permisos del sitio desde el icono junto a la dirección, permite Notificaciones y vuelve a intentarlo.");
      return;
    }
    activating = true;
    setState("activating");
    try{
      if(!supportedBasic()) throw new Error("UNSUPPORTED_PUSH");
      await permission();
      const token = await ensureCurrentToken({silent:false});
      if(!token) throw new Error("TOKEN_EMPTY");
      setState("active");
    }catch(error){
      console.error("SAGC Push:", error);
      const code = String(error?.message || error || "");
      if(code === "PERMISSION_DENIED"){
        setState("denied", "Activa Notificaciones desde los permisos del sitio.");
        showGuidance("Las notificaciones quedaron bloqueadas. Actívalas desde los permisos del sitio y vuelve a tocar el botón.");
      }else if(code === "PERMISSION_DISMISSED"){
        setState("idle", "La activación fue cancelada.");
        showGuidance("No se activaron las notificaciones. Toca nuevamente cuando estés listo para permitirlas.");
      }else if(code === "UNSUPPORTED_PUSH") hideButton();
      else{
        setState("temporary", "No se pudo completar la activación.");
        showGuidance("No se pudo activar en este momento. Revisa tu conexión y toca ‘Reintentar activación’.");
      }
    }finally{
      activating = false;
      if(currentState === "activating") refreshButton();
    }
  }

  window.SAGC_NOTIFICACIONES = {
    activar:activateNotifications,
    actualizar:() => ensureCurrentToken({silent:false}),
    token:() => localStorage.getItem(KEYS.token),
    instalacion:installationId
  };

  async function init(){
    createButton();

    // Primero revisa si existe una promoción pendiente. Si existe,
    // abre una sola vez su producto aunque la PWA se haya abierto desde el icono.
    const redirected = await openPendingDestination();
    if(redirected) return;

    clearPendingNotifications();
    if(typeof Notification !== "undefined" && Notification.permission === "granted") ensureCurrentToken({silent:true});
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
  window.addEventListener("online", () => ensureCurrentToken({silent:true}));
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible"){
      clearPendingNotifications();
      if(typeof Notification !== "undefined" && Notification.permission === "granted") ensureCurrentToken({silent:true});
    }
  });
  window.addEventListener("pageshow", clearPendingNotifications);
  window.addEventListener("focus", clearPendingNotifications);
  setInterval(() => {
    if(typeof Notification !== "undefined" && Notification.permission === "granted") ensureCurrentToken({silent:true});
  }, Math.max(1, Number(cfg.REVISAR_TOKEN_CADA_HORAS || 24)) * 60 * 60 * 1000);
})();
