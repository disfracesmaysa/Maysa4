'use strict';

/* =========================================================
   EMPRESA.JS - PREMIUM V3 CORREGIDO
   - Métodos de pago con imagen desde Google Sheets:
     CLAVE: EMPRESA_METODOS_PAGO
   - Títulos con la misma clase del catálogo: empresa-section-title
========================================================= */

const EmpresaService = (() => {

  const EMPRESA_HISTORY_KEY = "sagcEmpresaOpen";
  let closingEmpresaFromHistory = false;

  function init(){
    const btnEmpresa = document.getElementById("btnEmpresa");
    const empresaView = document.getElementById("empresaView");

    if(!btnEmpresa || !empresaView) return;

    updatePreview();

    btnEmpresa.addEventListener("click", mostrarEmpresa);

    if(!window.empresaHistoryBound){
      window.empresaHistoryBound = true;
      window.addEventListener("popstate", () => {
        const vistaEmpresa = document.getElementById("empresaView");

        if(vistaEmpresa && !vistaEmpresa.classList.contains("hidden")){
          closingEmpresaFromHistory = true;
          mostrarCatalogo();
          closingEmpresaFromHistory = false;
        }
      });
    }

    document.addEventListener("click", e => {
      if(e.target && e.target.id === "btnVolverCatalogo"){
        mostrarCatalogo();
      }

      if(e.target && e.target.classList.contains("empresa-faq-question")){
        e.target.parentElement.classList.toggle("active");
      }

      const galleryItem = e.target.closest(".empresa-gallery-item");
      if(galleryItem){
        openGalleryLightbox(Number(galleryItem.dataset.index || 0));
      }

      if(e.target.closest("#empresaGalleryClose")){
        closeGalleryLightbox();
      }

      if(e.target.closest("#empresaGalleryPrev")){
        changeGalleryImage(-1);
      }

      if(e.target.closest("#empresaGalleryNext")){
        changeGalleryImage(1);
      }

      if(e.target.closest("#empresaGalleryViewAll")){
        openGalleryLightbox(0);
      }

      if(e.target.id === "empresaGalleryLightbox"){
        closeGalleryLightbox();
      }
    });

    document.addEventListener("keydown", e => {
      const lightbox = document.getElementById("empresaGalleryLightbox");
      if(!lightbox || !lightbox.classList.contains("show")) return;

      if(e.key === "Escape") closeGalleryLightbox();
      if(e.key === "ArrowLeft") changeGalleryImage(-1);
      if(e.key === "ArrowRight") changeGalleryImage(1);
    });
  }

  function updatePreview(){
    const info = APP.informacion || {};
    const name = info.EMPRESA_NOMBRE || CONFIG.STORE_NAME || "Nuestra empresa";
    const previewName = document.getElementById("empresaPreviewNombre");

    if(previewName){
      previewName.textContent = name;
    }
  }

  function mostrarEmpresa(){
    render();

    const empresaView = document.getElementById("empresaView");
    const overlay = document.getElementById("overlay");

    if(empresaView){
      empresaView.classList.remove("hidden");
      empresaView.classList.add("empresa-modal-view");
    }

    if(overlay){
      overlay.classList.add("active");
    }

    document.body.style.overflow = "hidden";

    if(!history.state?.[EMPRESA_HISTORY_KEY]){
      history.pushState({
        ...(history.state || {}),
        [EMPRESA_HISTORY_KEY]: true
      }, "", window.location.href);
    }
  }

  function mostrarCatalogo(){
    const empresaView = document.getElementById("empresaView");
    const overlay = document.getElementById("overlay");

    if(empresaView){
      empresaView.classList.add("hidden");
      empresaView.classList.remove("empresa-modal-view");
    }

    if(overlay){
      overlay.classList.remove("active");
    }

    document.body.style.overflow = "";

    if(!closingEmpresaFromHistory && history.state?.[EMPRESA_HISTORY_KEY]){
      history.back();
    }
  }

  function render(){
    const info = APP.informacion || {};
    const contenedor = document.getElementById("empresaView");

    if(!contenedor) return;

    const beneficios = getSimpleList(info, "BENEFICIO_");
    const pasos = getSteps(info);
    const faqs = getFaqs(info);
    const testimonios = getTestimonials(info);
    const galeria = getGallery(info);
    const avisos = getSimpleList(info, "AVISO_");
    const estadisticas = getStats(info);
    const redes = getSocials(info);
    const whatsappUrl = getWhatsappUrl(info);

    contenedor.innerHTML = `
      <div class="empresa-container">

        <section class="empresa-card empresa-hero">
          ${info.EMPRESA_BANNER ? `
            <img class="empresa-banner" src="${safeUrl(info.EMPRESA_BANNER)}" alt="Banner empresa" loading="lazy">
          ` : ""}

          ${info.EMPRESA_LOGO ? `
            <img class="empresa-logo" src="${safeUrl(info.EMPRESA_LOGO)}" alt="Logo empresa" loading="lazy">
          ` : ""}

          <h2 class="empresa-title">
            ${escapeHTML(info.EMPRESA_NOMBRE || CONFIG.STORE_NAME || "Nuestra empresa")}
          </h2>

          ${info.EMPRESA_SLOGAN ? `
            <p class="empresa-slogan">${escapeHTML(info.EMPRESA_SLOGAN)}</p>
          ` : ""}

          ${info.EMPRESA_DESCRIPCION ? `
            <p class="empresa-description">${escapeHTML(info.EMPRESA_DESCRIPCION)}</p>
          ` : ""}
        </section>

        ${beneficios.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">⭐ ¿Por qué elegirnos?</h3>
            <div class="empresa-grid">
              ${beneficios.map(item => `
                <div class="empresa-item">✅ ${escapeHTML(item)}</div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${pasos.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">🛒 ¿Cómo comprar?</h3>
            <div class="empresa-grid">
              ${pasos.map((paso, index) => `
                <div class="empresa-step">
                  <div class="empresa-step-number">${index + 1}</div>
                  <strong>${escapeHTML(paso.titulo)}</strong>
                  <p>${escapeHTML(paso.descripcion)}</p>
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${info.EMPRESA_METODOS_PAGO ? `
          <section class="empresa-card empresa-payment-card">
            <h3 class="empresa-section-title">💳 Métodos de pago</h3>

            <div class="payment-image-box">
              <img
                src="${safeUrl(info.EMPRESA_METODOS_PAGO)}"
                alt="Métodos de pago"
                loading="lazy">
            </div>
          </section>
        ` : ""}


        ${testimonios.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">💬 Clientes nos recomiendan</h3>
            <div class="empresa-grid">
              ${testimonios.map(t => `
                <div class="empresa-testimonio">
                  <div class="empresa-stars">${renderStars(t.estrellas)}</div>
                  <strong>${escapeHTML(t.nombre)}</strong>
                  ${t.ciudad ? `<small>${escapeHTML(t.ciudad)}</small>` : ""}
                  <p>"${escapeHTML(t.comentario)}"</p>
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${galeria.length ? `
          <section class="empresa-card empresa-gallery-section">
            <h3 class="empresa-section-title">📸 ${escapeHTML(info.GALERIA_TITULO || "Confían en nosotros")}</h3>

            ${info.GALERIA_DESCRIPCION ? `
              <p class="empresa-gallery-description">${escapeHTML(info.GALERIA_DESCRIPCION)}</p>
            ` : ""}

            <div class="empresa-gallery-grid">
              ${galeria.slice(0,6).map((imagen, index) => `
                <button
                  type="button"
                  class="empresa-gallery-item"
                  data-index="${index}"
                  aria-label="Ver imagen ${index + 1} de ${galeria.length}">
                  <img
                    src="${escapeHTML(imagen)}"
                    alt="Evidencia de clientes ${index + 1}"
                    loading="lazy"
                    decoding="async">
                </button>
              `).join("")}
            </div>

            ${galeria.length > 6 ? `
              <button
                type="button"
                class="empresa-gallery-view-all"
                id="empresaGalleryViewAll">
                Ver todas las fotos (${galeria.length})
              </button>
            ` : ""}
          </section>

          <div id="empresaGalleryLightbox" class="empresa-gallery-lightbox" aria-hidden="true">
            <button id="empresaGalleryClose" class="empresa-gallery-close" type="button" aria-label="Cerrar">×</button>
            <button id="empresaGalleryPrev" class="empresa-gallery-nav empresa-gallery-prev" type="button" aria-label="Imagen anterior">‹</button>

            <div class="empresa-gallery-lightbox-content">
              <img id="empresaGalleryLargeImage" src="" alt="Imagen ampliada">
              <div id="empresaGalleryCounter" class="empresa-gallery-counter"></div>
            </div>

            <button id="empresaGalleryNext" class="empresa-gallery-nav empresa-gallery-next" type="button" aria-label="Imagen siguiente">›</button>
          </div>
        ` : ""}

        ${avisos.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">📢 Avisos importantes</h3>
            <div class="empresa-grid">
              ${avisos.map(aviso => `
                <div class="empresa-item">📌 ${escapeHTML(aviso)}</div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${faqs.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">❓ Preguntas frecuentes</h3>
            ${faqs.map(faq => `
              <div class="empresa-faq">
                <div class="empresa-faq-question">${escapeHTML(faq.pregunta)}</div>
                <div class="empresa-faq-answer">${escapeHTML(faq.respuesta)}</div>
              </div>
            `).join("")}
          </section>
        ` : ""}

        ${estadisticas.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">📊 Nuestra empresa en números</h3>
            <div class="empresa-grid">
              ${estadisticas.map(e => `
                <div class="empresa-stat">
                  <strong>${escapeHTML(e.numero)}</strong>
                  <span>${escapeHTML(e.texto)}</span>
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${(info.EMPRESA_HORARIO ||
          info.EMPRESA_ENVIOS ||
          info.EMPRESA_DIRECCION ||
          info.EMPRESA_UBICACION ||
          info.EMPRESA_TELEFONO ||
          info.EMPRESA_CORREO) ? `
          <section class="empresa-card empresa-info-list">
            <h3 class="empresa-section-title">🚚 Atención y envíos</h3>

            ${info.EMPRESA_HORARIO
              ? `<p><strong>Horario:</strong> ${escapeHTML(info.EMPRESA_HORARIO)}</p>`
              : ""}

            ${info.EMPRESA_ENVIOS
              ? `<p><strong>Envíos:</strong> ${escapeHTML(info.EMPRESA_ENVIOS)}</p>`
              : ""}

            ${info.EMPRESA_DIRECCION
              ? `<p><strong>Dirección:</strong> ${escapeHTML(info.EMPRESA_DIRECCION)}</p>`
              : ""}

            ${info.EMPRESA_UBICACION
              ? `<p><strong>Ubicación:</strong> ${escapeHTML(info.EMPRESA_UBICACION)}</p>`
              : ""}

            ${info.EMPRESA_TELEFONO
              ? `<p><strong>Teléfono:</strong> ${escapeHTML(info.EMPRESA_TELEFONO)}</p>`
              : ""}

            ${info.EMPRESA_CORREO
              ? `<p><strong>Correo:</strong> ${escapeHTML(info.EMPRESA_CORREO)}</p>`
              : ""}
          </section>
        ` : ""}

        ${info.EMPRESA_GOOGLE_MAPS ? `
          <section class="empresa-card empresa-maps-card">
            <a
              class="empresa-link"
              href="${safeUrl(info.EMPRESA_GOOGLE_MAPS)}"
              target="_blank"
              rel="noopener noreferrer">
              📍 Ver ubicación en Google Maps
            </a>
          </section>
        ` : ""}

        ${redes.length ? `
          <section class="empresa-card">
            <h3 class="empresa-section-title">📱 Redes sociales</h3>
            <div class="empresa-socials">
              ${redes.map(red => `
                <a class="empresa-social-btn" href="${safeUrl(red.url)}" target="_blank" rel="noopener noreferrer">
                  ${red.icono} ${red.nombre}
                </a>
              `).join("")}
            </div>
          </section>
        ` : ""}

        <section class="empresa-card">
          <h3 class="empresa-section-title">📲 Contacto</h3>

      ${whatsappUrl ? `
<a class="empresa-whatsapp"
   href="${whatsappUrl}"
   target="_blank"
   rel="noopener noreferrer">

  <span class="whatsapp-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <path d="M12.04 2C6.52 2 2.03 6.48 2.03 12c0 1.76.46 3.48 1.34 5L2 22l5.13-1.34A9.94 9.94 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm0 18.18a8.15 8.15 0 0 1-4.15-1.13l-.3-.18-3.04.8.81-2.96-.19-.3A8.18 8.18 0 0 1 3.86 12c0-4.51 3.67-8.18 8.18-8.18S20.18 7.49 20.18 12s-3.63 8.18-8.14 8.18Zm4.49-6.13c-.25-.12-1.46-.72-1.69-.8-.23-.09-.4-.12-.57.12-.16.25-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.15-1.17-.06-.11-.23-.17-.48-.29Z"/>
    </svg>
  </span>

  <span>Escribir por WhatsApp</span>

</a>
` : ""}

          <button class="btn-volver-catalogo" id="btnVolverCatalogo">
            ← Volver al catálogo
          </button>
        </section>

      </div>
    `;
  }

  function getSimpleList(info, prefix){
    return Object.keys(info)
      .filter(key => key.startsWith(prefix))
      .filter(key => new RegExp(`^${prefix}\\d+$`).test(key))
      .sort((a,b) => getNumber(a) - getNumber(b))
      .map(key => info[key])
      .filter(Boolean);
  }

  function getSteps(info){
    const result = [];

    Object.keys(info).forEach(key => {
      const match = key.match(/^PASO_(\d+)_TITULO$/);
      if(!match) return;

      const n = match[1];
      const titulo = info[`PASO_${n}_TITULO`];
      const descripcion = info[`PASO_${n}_DESCRIPCION`];

      if(titulo && descripcion){
        result.push({ n:Number(n), titulo, descripcion });
      }
    });

    return result.sort((a,b) => a.n - b.n);
  }

  function getFaqs(info){
    const result = [];

    Object.keys(info).forEach(key => {
      const match = key.match(/^FAQ_(\d+)_PREGUNTA$/);
      if(!match) return;

      const n = match[1];
      const pregunta = info[`FAQ_${n}_PREGUNTA`];
      const respuesta = info[`FAQ_${n}_RESPUESTA`];

      if(pregunta && respuesta){
        result.push({ n:Number(n), pregunta, respuesta });
      }
    });

    return result.sort((a,b) => a.n - b.n);
  }

  function getTestimonials(info){
    const result = [];

    Object.keys(info).forEach(key => {
      const match = key.match(/^TESTIMONIO_(\d+)_NOMBRE$/);
      if(!match) return;

      const n = match[1];
      const nombre = info[`TESTIMONIO_${n}_NOMBRE`];
      const ciudad = info[`TESTIMONIO_${n}_CIUDAD`];
      const estrellas = info[`TESTIMONIO_${n}_ESTRELLAS`];
      const comentario = info[`TESTIMONIO_${n}_COMENTARIO`];

      if(nombre && comentario){
        result.push({ n:Number(n), nombre, ciudad, estrellas, comentario });
      }
    });

    return result.sort((a,b) => a.n - b.n);
  }

  let galleryImages = [];
  let galleryIndex = 0;

  function getGallery(info){
    galleryImages = Object.keys(info)
      .filter(key => /^GALERIA_\d+$/.test(key))
      .sort((a,b) => getNumber(a) - getNumber(b))
      .map(key => normalizeImageUrl(info[key]))
      .filter(Boolean);

    return galleryImages;
  }

  function normalizeImageUrl(value){
    const url = String(value || "").trim();
    if(!url) return "";

    const driveId = extractDriveId(url);
    if(driveId){
      return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
    }

    return isValidUrl(url) ? url : "";
  }

  function extractDriveId(url){
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /thumbnail\?id=([a-zA-Z0-9_-]+)/
    ];

    for(const pattern of patterns){
      const match = String(url).match(pattern);
      if(match) return match[1];
    }

    return "";
  }

  function openGalleryLightbox(index){
    if(!galleryImages.length) return;

    galleryIndex = Math.max(0, Math.min(index, galleryImages.length - 1));

    const lightbox = document.getElementById("empresaGalleryLightbox");
    if(!lightbox) return;

    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
    updateGalleryLightbox();
  }

  function closeGalleryLightbox(){
    const lightbox = document.getElementById("empresaGalleryLightbox");
    if(!lightbox) return;

    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
  }

  function changeGalleryImage(direction){
    if(!galleryImages.length) return;

    galleryIndex = (galleryIndex + direction + galleryImages.length) % galleryImages.length;
    updateGalleryLightbox();
  }

  function updateGalleryLightbox(){
    const image = document.getElementById("empresaGalleryLargeImage");
    const counter = document.getElementById("empresaGalleryCounter");

    if(image){
      image.src = galleryImages[galleryIndex] || "";
      image.alt = `Imagen ${galleryIndex + 1} de ${galleryImages.length}`;
    }

    if(counter){
      counter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    }
  }

  function getStats(info){
    const result = [];

    Object.keys(info).forEach(key => {
      const match = key.match(/^ESTADISTICA_(\d+)_NUMERO$/);
      if(!match) return;

      const n = match[1];
      const numero = info[`ESTADISTICA_${n}_NUMERO`];
      const texto = info[`ESTADISTICA_${n}_TEXTO`];

      if(numero && texto){
        result.push({ n:Number(n), numero, texto });
      }
    });

    return result.sort((a,b) => a.n - b.n);
  }

  function getSocials(info){
    return [
      { nombre:"Facebook", icono:"📘", url:info.EMPRESA_FACEBOOK },
      { nombre:"Instagram", icono:"📸", url:info.EMPRESA_INSTAGRAM },
      { nombre:"TikTok", icono:"🎵", url:info.EMPRESA_TIKTOK },
      { nombre:"YouTube", icono:"▶️", url:info.EMPRESA_YOUTUBE },
      { nombre:"Web", icono:"🌐", url:info.EMPRESA_PAGINA_WEB }
    ].filter(s => s.url && isValidUrl(s.url));
  }

  function getWhatsappUrl(info){
    const number = String(info.EMPRESA_WHATSAPP || APP.config?.WHATSAPP || "").replace(/\D/g, "");
    if(!number) return "";

    const finalNumber = number.startsWith("51") ? number : `51${number}`;
    return `https://wa.me/${finalNumber}`;
  }

  function renderStars(value){
    const n = Math.max(1, Math.min(5, Number(value || 5)));
    return "★".repeat(n);
  }

  function getNumber(text){
    const match = String(text).match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function isValidUrl(url){
    return /^https?:\/\//i.test(String(url || "").trim());
  }

  function safeUrl(url){
    const value = String(url || "").trim();
    return isValidUrl(value) ? value : "";
  }

  function escapeHTML(value){
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return { init };

})();
