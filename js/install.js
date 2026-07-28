'use strict';

/* =========================================================
   INSTALACIÓN PWA
   - No modifica el diseño.
   - Usa siempre el cuadro nativo de instalación de Chrome.
   - Si el evento todavía no está listo, espera unos segundos.
========================================================= */

let deferredInstallPrompt = null;
let installPromptWaiters = [];
window.installConfigReady = false;

function isAppInstalled(){
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS(){
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isRealMobileDevice(){
  const mobileUA = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return mobileUA || touchMac;
}

function getInstallBar(){
  return document.getElementById('installAppBar');
}

function sheetAllowsInstallBar(){
  const bar = getInstallBar();
  return bar?.dataset.enabled === 'true';
}

function hideInstallBar(){
  const bar = getInstallBar();
  if(bar) bar.style.display = 'none';
}

function refreshInstallBar(){
  const bar = getInstallBar();
  if(!bar) return;

  const canShow =
    window.installConfigReady === true &&
    sheetAllowsInstallBar() &&
    isRealMobileDevice() &&
    window.matchMedia('(max-width: 1024px)').matches &&
    !isAppInstalled();

  bar.style.display = canShow ? 'flex' : 'none';
}
window.refreshInstallBar = refreshInstallBar;

function resolveInstallWaiters(promptEvent){
  const waiters = installPromptWaiters;
  installPromptWaiters = [];
  waiters.forEach(resolve => resolve(promptEvent));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  resolveInstallWaiters(event);
  refreshInstallBar();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  resolveInstallWaiters(null);
  hideInstallBar();
});

window.addEventListener('resize', refreshInstallBar, {passive:true});
window.addEventListener('pageshow', refreshInstallBar);

document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible') refreshInstallBar();
});

function waitForInstallPrompt(timeoutMs = 3500){
  if(deferredInstallPrompt) return Promise.resolve(deferredInstallPrompt);

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      installPromptWaiters = installPromptWaiters.filter(item => item !== done);
      resolve(null);
    }, timeoutMs);

    function done(promptEvent){
      clearTimeout(timeout);
      resolve(promptEvent || null);
    }

    installPromptWaiters.push(done);
  });
}

async function showNativeInstallPrompt(){
  if(isAppInstalled()){
    hideInstallBar();
    return;
  }

  const promptEvent = deferredInstallPrompt || await waitForInstallPrompt();

  if(promptEvent){
    deferredInstallPrompt = null;
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if(result?.outcome === 'accepted') hideInstallBar();
    else refreshInstallBar();
    return;
  }

  if(isIOS()){
    alert('Para instalar en iPhone:\n\n1. Abre este catálogo en Safari.\n2. Toca Compartir.\n3. Elige “Agregar a pantalla de inicio”.');
    return;
  }

  alert('Chrome todavía no habilitó la instalación. Actualiza esta página una vez y vuelve a tocar “Instalar”.');
}

document.addEventListener('click', async event => {
  const installBtn = event.target.closest('#installAppBtn');
  if(!installBtn) return;

  event.preventDefault();
  if(installBtn.disabled) return;

  installBtn.disabled = true;
  try{
    await showNativeInstallPrompt();
  }finally{
    installBtn.disabled = false;
  }
});
