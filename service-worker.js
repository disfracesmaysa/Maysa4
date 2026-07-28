'use strict';

/* Firebase Cloud Messaging - notificaciones en segundo plano */
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
});

const sagcMessaging = firebase.messaging();


const SAGC_PUSH_DB = "sagc-push-state";
const SAGC_PUSH_STORE = "state";
const SAGC_PENDING_KEY = "pending-destination";
const SAGC_PENDING_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function sagcOpenPushDb(){
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SAGC_PUSH_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains(SAGC_PUSH_STORE)){
        db.createObjectStore(SAGC_PUSH_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function sagcSetPushState(key, value){
  const db = await sagcOpenPushDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAGC_PUSH_STORE, "readwrite");
    tx.objectStore(SAGC_PUSH_STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function sagcGetPushState(key){
  const db = await sagcOpenPushDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAGC_PUSH_STORE, "readonly");
    const request = tx.objectStore(SAGC_PUSH_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function sagcDeletePushState(key){
  const db = await sagcOpenPushDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAGC_PUSH_STORE, "readwrite");
    tx.objectStore(SAGC_PUSH_STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function sagcPendingDestinationFromData(data={}){
  const product = String(data.producto || "").trim();
  let url = String(data.url || data.link || "").trim();

  if(!url && product){
    url = `./?producto=${encodeURIComponent(product)}`;
  }
  if(!url) return null;

  try{
    url = new URL(url, self.registration.scope).href;
  }catch(_){
    return null;
  }

  return {
    url,
    producto: product,
    createdAt: Date.now()
  };
}

async function sagcRememberPendingDestination(data={}){
  const pending = sagcPendingDestinationFromData(data);
  if(!pending) return null;
  await sagcSetPushState(SAGC_PENDING_KEY, pending);
  return pending;
}

async function sagcConsumePendingDestination(){
  const pending = await sagcGetPushState(SAGC_PENDING_KEY);
  await sagcDeletePushState(SAGC_PENDING_KEY);
  if(!pending || !pending.url) return null;
  if(Date.now() - Number(pending.createdAt || 0) > SAGC_PENDING_MAX_AGE) return null;
  return pending;
}

function sagcNotificationOptions(payload){
  const data = payload.data || {};
  const notification = payload.notification || {};
  return {
    title: notification.title || data.title || "RD JAAM IMPORT",
    options: {
      body: notification.body || data.body || "Tienes una nueva promoción",
      icon: notification.icon || data.icon || "./assets/icons/logo192x192.png",
      badge: data.badge || "./assets/icons/logo192x192.png",
      image: notification.image || data.image || undefined,
      tag: data.tag || `sagc-${data.producto || "general"}`,
      renotify: String(data.renotify || "false") === "true",
      requireInteraction: String(data.requireInteraction || "false") === "true",
      vibrate: [200, 100, 200],
      data: { url: data.url || data.link || "./" },
      actions: [
        { action: "view", title: "Ver" },
        { action: "close", title: "Cerrar" }
      ]
    }
  };
}

sagcMessaging.onBackgroundMessage(async payload => {
  // Guarda el destino aunque el cliente abra la PWA desde su icono.
  await sagcRememberPendingDestination(payload.data || {});

  // Los mensajes con notification los muestra Firebase automáticamente.
  if(payload.notification && !payload.data?.forceManual) return;

  const n = sagcNotificationOptions(payload);
  return self.registration.showNotification(n.title, n.options);
});

async function sagcClearNotifications(){
  const notifications = await self.registration.getNotifications();
  notifications.forEach(notification => notification.close());
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    await sagcClearNotifications();
    await sagcDeletePushState(SAGC_PENDING_KEY);
    if(event.action === "close") return;

    const target = new URL(event.notification.data?.url || "./", self.registration.scope).href;
    const windows = await clients.matchAll({type:"window", includeUncontrolled:true});
    for(const client of windows){
      try{
        const current = new URL(client.url);
        const destination = new URL(target);
        if(current.origin === destination.origin){
          if("navigate" in client && client.url !== target) await client.navigate(target);
          return "focus" in client ? client.focus() : null;
        }
      }catch(_){ }
    }
    return clients.openWindow ? clients.openWindow(target) : null;
  })());
});



/* =========================================================
   SERVICE-WORKER.JS OPTIMIZADO
   PWA profesional para Catálogo Virtual

   Qué hace:
   - Guarda archivos principales para cargar rápido.
   - Actualiza automáticamente cuando cambias CACHE_VERSION.
   - Borra cachés antiguas.
   - Google Sheets siempre intenta cargar datos nuevos primero.
   - Las imágenes se guardan para acelerar visitas futuras.
   - Permite responder mensajes desde app.js para activar una nueva versión.
========================================================= */

/* =========================================================
   IMPORTANTE:
   Cada vez que publiques cambios importantes, cambia esta versión.
========================================================= */

const CACHE_VERSION = "v131";

const APP_SCOPE = self.registration.scope
  .replace(self.location.origin, "")
  .replace(/[^\w-]/g, "_");

const STATIC_CACHE = `catalog-static-${APP_SCOPE}-${CACHE_VERSION}`;
const RUNTIME_CACHE = `catalog-runtime-${APP_SCOPE}-${CACHE_VERSION}`;

/* Archivos principales de la aplicación */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./css/variables.css",
  "./css/animations.css",
  "./css/components.css",
  "./css/app.css",
  "./css/responsive.css",

  "./js/cliente.js",
  "./js/firebase/firebase-config.js",
  "./js/firebase/firebase-notifications.js",
  "./js/config.js",
  "./js/utils.js",
  "./js/storage.js",
  "./js/sheets.js",
  "./js/catalog.js",
  "./js/variants.js",
  "./js/cart.js",
  "./js/search.js",
  "./js/share.js",
  "./js/whatsapp.js",
  "./js/ui.js",
  "./js/install.js",
  "./js/empresa.js",
  "./js/app.js",

  "./assets/logo.png",
  "./assets/logo-nombre.png",
  "./assets/placeholder.webp",
  "./assets/qr-yape.jpeg",
  "./assets/icons/logo192x192.png",
  "./assets/icons/logo512x512.png"
];

/* =========================================================
   INSTALL
   Guarda archivos principales y activa el nuevo service worker.
========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.warn("No se pudo guardar caché inicial:", error);
      })
  );
});

/* =========================================================
   ACTIVATE
   Borra cachés antiguas y toma control de la página.
========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   MESSAGE
   Permite que app.js pida activar una nueva versión.
========================================================= */

self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
  if(event.data && event.data.type === "SAGC_CLEAR_NOTIFICATIONS"){
    event.waitUntil(sagcClearNotifications());
  }

  if(event.data && event.data.type === "SAGC_SAVE_PENDING_DESTINATION"){
    event.waitUntil(sagcRememberPendingDestination(event.data.data || {}));
  }

  if(event.data && event.data.type === "SAGC_CONSUME_PENDING_DESTINATION"){
    event.waitUntil((async () => {
      const pending = await sagcConsumePendingDestination();
      if(event.ports && event.ports[0]){
        event.ports[0].postMessage({pending});
      }
    })());
  }
});

/* =========================================================
   FETCH
   Estrategias:
   - HTML: network first para recibir cambios nuevos.
   - Google Sheets: network first.
   - CSS/JS/Manifest propios: stale while revalidate.
   - Imágenes: cache first.
========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  if(request.method !== "GET") return;

  const url = new URL(request.url);

  /* HTML principal: intenta internet primero */
  if(request.mode === "navigate" || request.destination === "document"){
    event.respondWith(networkFirst(request));
    return;
  }

  /* Google Sheets y archivos de Google: intenta internet primero */
  if(
    url.hostname.includes("docs.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ){
    event.respondWith(networkFirst(request));
    return;
  }

  /* Imágenes: caché primero */
  if(request.destination === "image"){
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Archivos propios: muestra rápido y actualiza en segundo plano */
  if(url.origin === self.location.origin){
  event.respondWith(networkFirst(request));
  return;
}
  /* Otros recursos externos */
  event.respondWith(networkFirst(request));
});

/* =========================================================
   CACHE FIRST
   Usa caché primero. Si no existe, descarga y guarda.
========================================================= */

async function cacheFirst(request){
  const cached = await caches.match(request);

  if(cached){
    return cached;
  }

  try{
    const response = await fetch(request);

    if(isValidResponse(response)){
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;

  }catch(error){
    return offlineFallback(request);
  }
}

/* =========================================================
   NETWORK FIRST
   Intenta internet primero. Si falla, usa caché.
========================================================= */

async function networkFirst(request){
  try{
    const response = await fetch(request);

    if(isValidResponse(response)){
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;

  }catch(error){
    const cached = await caches.match(request);

    if(cached){
      return cached;
    }

    return offlineFallback(request);
  }
}

/* =========================================================
   STALE WHILE REVALIDATE
   Muestra caché rápido y actualiza el archivo en segundo plano.
========================================================= */

async function staleWhileRevalidate(request){
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if(isValidResponse(response)){
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/* =========================================================
   VALIDAR RESPUESTA
========================================================= */

function isValidResponse(response){
  return response && response.status === 200 && response.type !== "opaque";
}

/* =========================================================
   FALLBACK OFFLINE
========================================================= */

async function offlineFallback(request){
  if(request.destination === "document" || request.mode === "navigate"){
    const cachedHome =
      await caches.match("./index.html") ||
      await caches.match("./");

    if(cachedHome){
      return cachedHome;
    }
  }

  return new Response("Sin conexión y sin caché disponible.", {
    status: 503,
    statusText: "Offline",
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
