'use strict';

document.addEventListener("DOMContentLoaded", initEmpresaPage);

async function initEmpresaPage(){
  try{
    const data = await SheetService.loadAll();
    renderEmpresaPage(data.informacion || {});
  }catch(error){
    console.error(error);
    document.getElementById("empresaPage").innerHTML = `
      <div class="empresa-card">
        <h2>Error</h2>
        <p>No se pudo cargar la información de la empresa.</p>
        <a href="index.html" class="volver-btn">← Volver al catálogo</a>
      </div>
    `;
  }
}

function renderEmpresaPage(info){
  const contenedor = document.getElementById("empresaPage");

  const beneficios = getList(info, "BENEFICIO_");
  const pasos = getSteps(info);
  const faqs = getFaqs(info);
  const testimonios = getTestimonials(info);
  const stats = getStats(info);

  const whatsapp = cleanNumber(info.EMPRESA_WHATSAPP);
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.startsWith("51") ? whatsapp : "51" + whatsapp}` : "";

  contenedor.innerHTML = `
    <section class="empresa-card empresa-hero">
      ${info.EMPRESA_BANNER ? `<img class="empresa-banner" src="${safeUrl(info.EMPRESA_BANNER)}" alt="Banner">` : ""}
      ${info.EMPRESA_LOGO ? `<img class="empresa-logo" src="${safeUrl(info.EMPRESA_LOGO)}" alt="Logo">` : ""}

      <h1 class="empresa-title">${esc(info.EMPRESA_NOMBRE || CONFIG.STORE_NAME)}</h1>
      ${info.EMPRESA_SLOGAN ? `<p class="empresa-slogan">${esc(info.EMPRESA_SLOGAN)}</p>` : ""}
      ${info.EMPRESA_DESCRIPCION ? `<p class="empresa-description">${esc(info.EMPRESA_DESCRIPCION)}</p>` : ""}
    </section>

    <section class="empresa-card info">
      <h2 class="section-title">🚚 Atención y envíos</h2>
      ${info.EMPRESA_HORARIO ? `<p><strong>Horario:</strong> ${esc(info.EMPRESA_HORARIO)}</p>` : ""}
      ${info.EMPRESA_DIRECCION ? `<p><strong>Dirección:</strong> ${esc(info.EMPRESA_DIRECCION)}</p>` : ""}
      ${info.EMPRESA_UBICACION ? `<p><strong>Ubicación:</strong> ${esc(info.EMPRESA_UBICACION)}</p>` : ""}
      ${info.EMPRESA_TELEFONO ? `<p><strong>Teléfono:</strong> ${esc(info.EMPRESA_TELEFONO)}</p>` : ""}
      ${info.EMPRESA_CORREO ? `<p><strong>Correo:</strong> ${esc(info.EMPRESA_CORREO)}</p>` : ""}
    </section>

    ${beneficios.length ? `
      <section class="empresa-card">
        <h2 class="section-title">⭐ ¿Por qué elegirnos?</h2>
        <div class="grid">
          ${beneficios.map(x => `<div class="item">✅ ${esc(x)}</div>`).join("")}
        </div>
      </section>
    ` : ""}

    ${info.EMPRESA_METODOS_PAGO ? `
  <section class="empresa-card">
    <h2 class="section-title">💳 Métodos de pago</h2>

    <div class="payment-image-box">
      <img
        src="${safeUrl(info.EMPRESA_METODOS_PAGO)}"
        alt="Métodos de pago"
        loading="lazy">
    </div>
  </section>
` : ""}

    ${pasos.length ? `
      <section class="empresa-card">
        <h2 class="section-title">🛒 ¿Cómo comprar?</h2>
        <div class="grid">
          ${pasos.map((p,i) => `
            <div class="item">
              <div class="step-number">${i + 1}</div>
              <strong>${esc(p.titulo)}</strong>
              <p>${esc(p.descripcion)}</p>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    ${testimonios.length ? `
      <section class="empresa-card">
        <h2 class="section-title">💬 Testimonios</h2>
        <div class="grid">
          ${testimonios.map(t => `
            <div class="item">
              <div class="testimonio-stars">${renderStars(t.estrellas)}</div>
              <strong>${esc(t.nombre)}</strong>
              ${t.ciudad ? `<p>${esc(t.ciudad)}</p>` : ""}
              <p>"${esc(t.comentario)}"</p>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    ${faqs.length ? `
      <section class="empresa-card">
        <h2 class="section-title">❓ Preguntas frecuentes</h2>
        ${faqs.map(f => `
          <div class="faq">
            <div class="faq-question">${esc(f.pregunta)}</div>
            <div class="faq-answer">${esc(f.respuesta)}</div>
          </div>
        `).join("")}
      </section>
    ` : ""}

    ${stats.length ? `
      <section class="empresa-card">
        <h2 class="section-title">📊 Nuestra empresa en números</h2>
        <div class="grid">
          ${stats.map(s => `
            <div class="item stat">
              <strong>${esc(s.numero)}</strong>
              <span>${esc(s.texto)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <section class="empresa-card">
      <h2 class="section-title">📲 Contacto</h2>
      <div class="empresa-actions">
        ${whatsappUrl ? `<a class="action-btn whatsapp" href="${whatsappUrl}" target="_blank">💬 Escribir por WhatsApp</a>` : ""}
        ${info.EMPRESA_GOOGLE_MAPS ? `<a class="action-btn maps" href="${safeUrl(info.EMPRESA_GOOGLE_MAPS)}" target="_blank">📍 Ver ubicación</a>` : ""}
        ${info.EMPRESA_PAGINA_WEB ? `<a class="action-btn web" href="${safeUrl(info.EMPRESA_PAGINA_WEB)}" target="_blank">🌐 Página web</a>` : ""}
      </div>
    </section>
  `;
}

function getList(info, prefix){
  return Object.keys(info)
    .filter(k => new RegExp(`^${prefix}\\d+$`).test(k))
    .sort((a,b) => getNum(a) - getNum(b))
    .map(k => info[k])
    .filter(Boolean);
}

function getSteps(info){
  return Object.keys(info)
    .filter(k => /^PASO_\d+_TITULO$/.test(k))
    .map(k => {
      const n = k.match(/\d+/)[0];
      return {
        n:Number(n),
        titulo:info[`PASO_${n}_TITULO`],
        descripcion:info[`PASO_${n}_DESCRIPCION`]
      };
    })
    .filter(x => x.titulo && x.descripcion)
    .sort((a,b) => a.n - b.n);
}

function getFaqs(info){
  return Object.keys(info)
    .filter(k => /^FAQ_\d+_PREGUNTA$/.test(k))
    .map(k => {
      const n = k.match(/\d+/)[0];
      return {
        n:Number(n),
        pregunta:info[`FAQ_${n}_PREGUNTA`],
        respuesta:info[`FAQ_${n}_RESPUESTA`]
      };
    })
    .filter(x => x.pregunta && x.respuesta)
    .sort((a,b) => a.n - b.n);
}

function getTestimonials(info){
  return Object.keys(info)
    .filter(k => /^TESTIMONIO_\d+_NOMBRE$/.test(k))
    .map(k => {
      const n = k.match(/\d+/)[0];
      return {
        n:Number(n),
        nombre:info[`TESTIMONIO_${n}_NOMBRE`],
        ciudad:info[`TESTIMONIO_${n}_CIUDAD`],
        estrellas:info[`TESTIMONIO_${n}_ESTRELLAS`],
        comentario:info[`TESTIMONIO_${n}_COMENTARIO`]
      };
    })
    .filter(x => x.nombre && x.comentario)
    .sort((a,b) => a.n - b.n);
}

function getStats(info){
  return Object.keys(info)
    .filter(k => /^ESTADISTICA_\d+_NUMERO$/.test(k))
    .map(k => {
      const n = k.match(/\d+/)[0];
      return {
        n:Number(n),
        numero:info[`ESTADISTICA_${n}_NUMERO`],
        texto:info[`ESTADISTICA_${n}_TEXTO`]
      };
    })
    .filter(x => x.numero && x.texto)
    .sort((a,b) => a.n - b.n);
}

function getNum(text){
  const m = String(text).match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function cleanNumber(value){
  return String(value || "").replace(/\D/g, "");
}

function safeUrl(url){
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) ? value : "";
}

function esc(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
function renderStars(value){
  const n = Number(String(value || "5").replace(/\D/g, ""));
  const total = Math.max(1, Math.min(5, isNaN(n) ? 5 : n));
  return "★".repeat(total);
}
