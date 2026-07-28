'use strict';

/* =========================================================
   APP.JS OPTIMIZADO Y CORREGIDO
   - Inicializa la aplicación.
   - Carga Google Sheets.
   - Construye índices.
   - Inicializa todos los módulos.
   - Footer con redes sociales inteligentes usando SVG.
   - Muestra/oculta la sección Empresa desde Google Sheets CONFIG:
     CLAVE: MOSTRAR_EMPRESA | VALOR: SI / NO
========================================================= */

window.APP = {
  settings: {},
  config: {},
  informacion: {},
  products: [],
  productsByCode: {},
  categories: [],
  categoryIndex: {},
  searchIndex: [],
  cart: [],
  favorites: [],
  currentCategory: "Todos",
  currentSearch: "",
  visibleProducts: CONFIG.INITIAL_PRODUCTS,
  selectedProduct: null,
  initialized: false
};

document.addEventListener("DOMContentLoaded", initApp);

/* =========================================================
   CONTROL DE CARGA PROFESIONAL
   Evita que al actualizar aparezcan datos antiguos o iconos grandes.
========================================================= */
function prepareAppLoadingState(){
  document.body.classList.add("app-loading");

  const empresaAccess = document.getElementById("empresaAccess");
  if(empresaAccess){
    empresaAccess.style.display = "none";
    empresaAccess.classList.add("hidden");
  }

  const empresaView = document.getElementById("empresaView");
  if(empresaView){
    empresaView.style.display = "none";
    empresaView.classList.add("hidden");
  }
}

function finishAppLoadingState(){
  document.body.classList.remove("app-loading");
  document.body.classList.add("app-ready");
}

async function initApp(){
  try{
    prepareAppLoadingState();
    showInitialLoading();

    applyBusinessIdentity();

    const data = await SheetService.loadAll();

    APP.config = data.config || {};
    APP.informacion = data.informacion || {};
    APP.products = data.products || [];
    APP.categories = data.categories || [];
    APP.colors = data.colors || {};
    APP.wholesale = data.wholesale || {};

    APP.cart = StorageService.loadCart();
    APP.favorites = StorageService.loadFavorites();

    applyFooterFromSheet();
    applyInstallConfiguration();
    applyAnnouncementBar();
    applyConfigurableAnimations();
    renderFooterSocials();
    initHeaderMobileView();
    initFooterShareButton();

    buildIndexes();

    APP.initialized = true;

    initServices();
aplicarVisibilidadEmpresa();
aplicarGaleriaCatalogo();
aplicarVisibilidadFiltrosRapidos();
aplicarVisibilidadAccionesDetalle();

    hideInitialLoading();
    finishAppLoadingState();

  }catch(error){
    console.error(error);
    hideInitialLoading();
    finishAppLoadingState();
    showAppError("No se pudo cargar el catálogo. Revisa el ID de Google Sheets y que las hojas sean públicas.");
  }
}

/* Mostrar u ocultar la tarjeta "Conoce nuestra empresa" desde Google Sheets CONFIG */
function aplicarVisibilidadEmpresa(){
  const empresaAccess = document.getElementById("empresaAccess");
  if(!empresaAccess) return;

  const mostrarEmpresa = APP.config.MOSTRAR_EMPRESA;

  if(mostrarEmpresa === false){
    empresaAccess.classList.add("hidden");
  }else{
    empresaAccess.classList.remove("hidden");
  }

  document.body.classList.add("app-ready");
}

/* Mini carrusel debajo del catálogo cuando la sección Empresa está desactivada */
function aplicarGaleriaCatalogo(){
  const section = document.getElementById("catalogGallery");
  const track = document.getElementById("catalogGalleryTrack");
  const title = document.getElementById("catalogGalleryTitle");
  const description = document.getElementById("catalogGalleryDescription");
  const viewport = document.getElementById("catalogGalleryViewport");

  if(!section || !track || !title || !description || !viewport) return;

  const mostrarEmpresa = APP.config.MOSTRAR_EMPRESA !== false;
  const info = APP.informacion || {};
  const imagenes = Object.keys(info)
    .filter(key => /^GALERIA_\d+$/.test(key))
    .sort((a, b) => {
      const numeroA = Number(a.replace("GALERIA_", ""));
      const numeroB = Number(b.replace("GALERIA_", ""));
      return numeroA - numeroB;
    })
    .map(key => String(info[key] || "").trim())
    .filter(Boolean);

  if(mostrarEmpresa || !imagenes.length){
    section.hidden = true;
    track.innerHTML = "";
    return;
  }

  title.textContent = String(info.GALERIA_TITULO || "Confían en nosotros").trim();
  description.textContent = String(
    info.GALERIA_DESCRIPCION ||
    "Estas son algunas de las entregas y experiencias que respaldan nuestro trabajo."
  ).trim();

  track.innerHTML = "";

  imagenes.forEach((url, index) => {
    const item = document.createElement("figure");
    item.className = "catalog-gallery-item";

    const image = document.createElement("img");
    image.src = url;
    image.alt = `Galería ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";

    item.appendChild(image);
    track.appendChild(item);
  });

  section.hidden = false;

  let autoGalleryTimer = null;
  const startAutoGallery = () => {
    if(imagenes.length <= 1 || autoGalleryTimer) return;
    autoGalleryTimer = window.setInterval(() => {
      const firstItem = track.querySelector(".catalog-gallery-item");
      if(!firstItem) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 14;
      const step = firstItem.getBoundingClientRect().width + gap;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      const next = viewport.scrollLeft + step;
      viewport.scrollTo({ left: next >= maxScroll - 4 ? 0 : next, behavior: "smooth" });
    }, 3200);
  };

  const stopAutoGallery = () => {
    if(autoGalleryTimer){
      clearInterval(autoGalleryTimer);
      autoGalleryTimer = null;
    }
  };

  viewport.addEventListener("mouseenter", stopAutoGallery);
  viewport.addEventListener("mouseleave", startAutoGallery);
  viewport.addEventListener("touchstart", stopAutoGallery, { passive:true });
  viewport.addEventListener("touchend", startAutoGallery, { passive:true });
  startAutoGallery();
}

/* =========================================================
   MOSTRAR U OCULTAR FILTROS RÁPIDOS DESDE GOOGLE SHEETS
========================================================= */

function normalizarEstadoImportacion(valor){
  const estado = String(valor ?? "ABIERTA")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toUpperCase();
  if(["CERRADA", "CERRADO", "CLOSE", "CLOSED"].includes(estado)) return "CERRADA";
  if(["PROXIMAMENTE", "PROXIMA", "PRONTO", "SOON"].includes(estado)) return "PROXIMAMENTE";
  return "ABIERTA";
}

function normalizarTipoBotonEspecial(valor){
  const tipo = String(valor || "IMPORTACION")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/\s+/g, "_").toUpperCase();
  if(["MAS_VENDIDO", "MAS_VENDIDOS", "VENDIDO", "BEST_SELLER"].includes(tipo)) return "MAS_VENDIDO";
  if(["NUEVO_INGRESO", "NUEVOS_INGRESOS", "NUEVO", "NEW"].includes(tipo)) return "NUEVO_INGRESO";
  if(["VENTA", "VENTAS", "SALE", "LIQUIDACION", "LIQUIDACIONES", "REMATE", "CLEARANCE"].includes(tipo)) return "VENTA";
  return "IMPORTACION";
}

function obtenerTipoBotonEspecial(){
  return normalizarTipoBotonEspecial(
    APP.config?.BOTON_ESPECIAL_TIPO ||
    APP.config?.BOTON_ESPECIAL ||
    APP.config?.TIPO_BOTON_ESPECIAL ||
    "IMPORTACION"
  );
}

function iconoSvgBotonEspecial(tipo){
  const svg = {
    IMPORTACION:'<svg viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
    MAS_VENDIDO:'<svg viewBox="0 0 24 24"><path d="M12 22c4.42 0 8-3.58 8-8 0-4-3-7-5-9 .5 3-1.5 5-3 6-1.5-1-2-3-1-6-3 2-7 5-7 9 0 4.42 3.58 8 8 8Z"/><path d="M9 18c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.5-1-2.5-2-3 .2 1.2-.5 2-1 2.4-.7-.5-1.2-1.2-.8-2.4C10 15.8 9 16.7 9 18Z"/></svg>',
    NUEVO_INGRESO:'<svg viewBox="0 0 24 24"><path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2L12 3Z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8L5 14Zm14-2-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3Z"/></svg>',
    VENTA:'<<svg viewBox="0 0 24 24"><path d="M12 22c4.42 0 8-3.58 8-8 0-4-3-7-5-9 .5 3-1.5 5-3 6-1.5-1-2-3-1-6-3 2-7 5-7 9 0 4.42 3.58 8 8 8Z"/><path d="M9 18c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.5-1-2.5-2-3 .2 1.2-.5 2-1 2.4-.7-.5-1.2-1.2-.8-2.4C10 15.8 9 16.7 9 18Z"/></svg>>'
  };
  return svg[tipo] || svg.IMPORTACION;
}

function normalizarEstadoBotonEspecial(valor, tipo){
  const estado = String(valor || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/\s+/g, "_").toUpperCase();

  if(["NO", "INACTIVO", "INACTIVA", "OCULTO", "OCULTA", "DESACTIVADO", "DESACTIVADA"].includes(estado)) return "INACTIVO";
  if(["CERRADO", "CERRADA", "FINALIZADO", "FINALIZADA"].includes(estado)) return "CERRADA";
  if(["PROXIMAMENTE", "PROXIMO", "PROXIMA", "PRONTO"].includes(estado)) return "PROXIMAMENTE";
  if(["ABIERTO", "ABIERTA"].includes(estado)) return "ABIERTA";
  if(["SI", "ACTIVO", "ACTIVA"].includes(estado)) return tipo === "IMPORTACION" ? "ABIERTA" : "ACTIVO";
  return tipo === "IMPORTACION" ? normalizarEstadoImportacion(APP.config?.IMPORTACION_ESTADO) : "ACTIVO";
}

function iconoPersonalizadoBotonEspecial(valor, tipo){
  const raw = String(valor || "").trim();
  if(!raw) return iconoSvgBotonEspecial(tipo);

  const clave = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/\s+/g, "_").toUpperCase();
  const mapa = {
    CAJA: "IMPORTACION", PAQUETE: "IMPORTACION", IMPORTACION: "IMPORTACION", BARCO: "IMPORTACION",
    FUEGO: "MAS_VENDIDO", MAS_VENDIDO: "MAS_VENDIDO",
    ESTRELLA: "NUEVO_INGRESO", BRILLO: "NUEVO_INGRESO", NUEVO: "NUEVO_INGRESO",
    ETIQUETA: "VENTA", PRECIO: "VENTA", OFERTA: "VENTA", VENTA: "VENTA",
    RAYO: "VENTA", LIQUIDACION: "VENTA"
  };
  if(mapa[clave]) return iconoSvgBotonEspecial(mapa[clave]);

  /* Permite usar directamente un emoji o un SVG desde Sheets. */
  return raw;
}

function obtenerDatosBotonEspecial(){
  const tipo = obtenerTipoBotonEspecial();
  const base = {
    IMPORTACION:{boton:"Importación",titulo:"Importación grupal abierta",detalle:"Productos disponibles únicamente por tiempo limitado."},
    MAS_VENDIDO:{boton:"Más vendido",titulo:"Productos más vendidos",detalle:"Los productos preferidos por nuestros clientes."},
    NUEVO_INGRESO:{boton:"Nuevo ingreso",titulo:"Nuevos ingresos",detalle:"Conoce los productos que acaban de llegar."},
    VENTA:{boton:"Venta",titulo:"Productos en Venta",detalle:"Productos disponibles para compra directa."}
  }[tipo];

  const texto = String(APP.config?.BOTON_ESPECIAL_TEXTO || "").trim();
  const icono = APP.config?.BOTON_ESPECIAL_ICONO;
  const estado = normalizarEstadoBotonEspecial(APP.config?.BOTON_ESPECIAL_ESTADO, tipo);
  const fecha = String(APP.config?.BOTON_ESPECIAL_FECHA || APP.config?.IMPORTACION_FECHA_CIERRE || "").trim();
  const tiempo = String(APP.config?.BOTON_ESPECIAL_TIEMPO || APP.config?.IMPORTACION_TIEMPO_ENTREGA || "").trim();
  const mensaje = String(APP.config?.BOTON_ESPECIAL_MENSAJE || APP.config?.IMPORTACION_MENSAJE || "").trim();

  if(texto) base.boton = texto;

  if(tipo === "IMPORTACION"){
    if(estado === "CERRADA") Object.assign(base,{titulo:"Importación cerrada",detalle:"La recepción de nuevos pedidos ha finalizado. Puedes revisar los productos disponibles."});
    if(estado === "PROXIMAMENTE") Object.assign(base,{titulo:"Próxima importación",detalle:"Muy pronto abriremos una nueva campaña de pedidos."});
    const titulo = String(APP.config?.TITULO_IMPORTACION || "").trim();
    if(titulo) base.titulo = titulo;
  }

  const detalles=[];
  if(fecha) detalles.push(`Fecha: ${fecha}`);
  if(tiempo) detalles.push(`Tiempo: ${tiempo}`);
  if(mensaje) detalles.push(mensaje);
  if(detalles.length) base.detalle=detalles.join(" · ");

  return {
    ...base,
    tipo,
    estado,
    iconoSvg: iconoPersonalizadoBotonEspecial(icono, tipo),
    visible: estado !== "INACTIVO"
  };
}

/* Compatibilidad con módulos anteriores. */
function obtenerDatosImportacion(){ return obtenerDatosBotonEspecial(); }

function aplicarVisibilidadFiltrosRapidos(){
  const importacion = obtenerDatosBotonEspecial();
  const importacionBoton = document.getElementById("filterBestSellersBtn");

  if(importacionBoton){
    if(importacion.visible === false){
      importacionBoton.remove();
    }else{
    importacionBoton.title = importacion.titulo;
    importacionBoton.setAttribute("aria-label", importacion.titulo);
    importacionBoton.dataset.estado = String(importacion.estado).toLowerCase();
    importacionBoton.dataset.tipo = importacion.tipo.toLowerCase();

    const icono = importacionBoton.querySelector(".quick-filter-importacion-icon");
    const texto = importacionBoton.querySelector(".quick-filter-importacion-text");
    if(icono) icono.innerHTML = importacion.iconoSvg;
    if(texto) texto.textContent = importacion.boton;
    }
  }

  const configuraciones = [
    { id: "filterBestSellersBtn", claves: ["MOSTRAR_BOTON_ESPECIAL", "MOSTRAR_MAS_VENDIDOS", "MOSTRAR_MAS_VENDIDO"] },
    { id: "filterFavoritesBtn", claves: ["MOSTRAR_FAVORITOS", "MOSTRAR_FAVORITO"] },
    { id: "filterOffersBtn", claves: ["MOSTRAR_OFERTAS", "MOSTRAR_OFERTA"] }
  ];

  const leerBooleanoConfig = (claves, valorPorDefecto = true) => {
    const claveEncontrada = claves.find(clave =>
      Object.prototype.hasOwnProperty.call(APP.config || {}, clave)
    );
    if(!claveEncontrada) return valorPorDefecto;

    const valor = APP.config[claveEncontrada];
    if(typeof valor === "boolean") return valor;

    const texto = String(valor ?? "").trim().toUpperCase();
    if(["NO", "FALSE", "FALSO", "0", "OCULTO", "DESACTIVADO"].includes(texto)) return false;
    if(["SI", "SÍ", "TRUE", "VERDADERO", "1", "ACTIVO", "MOSTRAR"].includes(texto)) return true;
    return valorPorDefecto;
  };

  configuraciones.forEach(({id, claves}) => {
    const boton = document.getElementById(id);
    if(!boton) return;

    const mostrar = leerBooleanoConfig(claves, true);

    /* Si Sheets indica NO, se elimina el botón del DOM.
       Así no queda visible, desactivado ni ocupando espacio. */
    if(!mostrar){
      boton.remove();
      return;
    }

    boton.hidden = false;
    boton.classList.remove("sheet-hidden");
    boton.style.removeProperty("display");
    boton.disabled = false;
    boton.setAttribute("aria-hidden", "false");
    boton.tabIndex = 0;
  });
}
/* Mostrar u ocultar el ícono de WhatsApp y el botón "Seguir viendo"
   del modal de producto, y armar el grid de acciones según cuántos
   botones queden visibles (Agregar al carrito siempre está presente):

   - WhatsApp + Seguir viendo (3 visibles)      -> diseño original, sin cambios.
   - Solo Seguir viendo + Agregar carrito        -> 2 botones de texto, 50/50.
   - Solo WhatsApp + Agregar carrito             -> ícono fijo + botón de 160px, centrados.
   - Solo Agregar carrito                        -> 1 botón de 170px, centrado.

   Unificado en una sola función porque ambos toggles afectan el mismo
   contenedor .detail-action-grid: calcularlos por separado hacía que
   cada uno pisara el grid-template-columns del otro. */
function aplicarVisibilidadAccionesDetalle(){
  const whatsappBtn = document.getElementById("detailWhatsappBtn");
  const seguirBtn = document.getElementById("closeDetailBtn");
  const contenedor = seguirBtn?.closest(".detail-action-grid") || whatsappBtn?.closest(".detail-action-grid");
  if(!contenedor) return;

  const leerBooleano = (clave, valorPorDefecto = true) => {
    if(!Object.prototype.hasOwnProperty.call(APP.config || {}, clave)){
      return valorPorDefecto;
    }

    const valor = APP.config[clave];
    if(typeof valor === "boolean") return valor;

    const texto = String(valor ?? "").trim().toUpperCase();
    if(["NO", "FALSE", "FALSO", "0", "OCULTO", "DESACTIVADO"].includes(texto)) return false;
    if(["SI", "SÍ", "TRUE", "VERDADERO", "1", "ACTIVO", "MOSTRAR"].includes(texto)) return true;
    return valorPorDefecto;
  };

  const actualizar = () => {
    const esCelular = window.matchMedia("(max-width: 700px)").matches;

    const mostrarWhatsapp = leerBooleano("MOSTRAR_WHATSAPP_MODAL", true);
    const mostrarSeguirViendo = esCelular
      ? leerBooleano("MOSTRAR_SEGUIR_VIENDO_CELULAR", true)
      : leerBooleano("MOSTRAR_SEGUIR_VIENDO_PC", true);

    if(whatsappBtn){
      whatsappBtn.style.setProperty("display", mostrarWhatsapp ? "flex" : "none", "important");
      whatsappBtn.setAttribute("aria-hidden", mostrarWhatsapp ? "false" : "true");
      whatsappBtn.tabIndex = mostrarWhatsapp ? 0 : -1;
    }

    if(seguirBtn){
      seguirBtn.style.setProperty("display", mostrarSeguirViendo ? "flex" : "none", "important");
      seguirBtn.setAttribute("aria-hidden", mostrarSeguirViendo ? "false" : "true");
      seguirBtn.tabIndex = mostrarSeguirViendo ? 0 : -1;
    }

    const anchoIcono = esCelular ? "38px" : "44px";
    let columnas;
    let justificar;

    if(mostrarWhatsapp && mostrarSeguirViendo){
      /* 3 visibles: diseño original, sin cambios. */
      columnas = `${anchoIcono} minmax(0,1fr) minmax(0,1fr)`;
      justificar = "stretch";
    }else if(!mostrarWhatsapp && mostrarSeguirViendo){
      /* 2 botones de texto (Seguir viendo + Agregar al carrito): 50/50. */
      columnas = "minmax(0,1fr) minmax(0,1fr)";
      justificar = "stretch";
    }else if(mostrarWhatsapp && !mostrarSeguirViendo){
      /* Ícono + 1 botón (Agregar al carrito): ícono fijo + botón de 160px, centrados. */
      columnas = `${anchoIcono} minmax(0,160px)`;
      justificar = "center";
    }else{
      /* 1 solo botón (Agregar al carrito): 170px, centrado debajo del
         control de cantidad (+/-) en vez de centrado en toda la fila. */
      columnas = "minmax(0,170px)";
      justificar = "flex-start";
    }

    let paddingIzquierdo = "0";
    if(!mostrarWhatsapp && !mostrarSeguirViendo){
      const controlCantidad = document.querySelector(".detail-quantity-control");
      const rectContenedor = contenedor.getBoundingClientRect();

      if(controlCantidad && rectContenedor.width > 0){
        const rectCantidad = controlCantidad.getBoundingClientRect();
        const centroCantidad = rectCantidad.left + (rectCantidad.width / 2);
        const anchoBoton = 170;
        let offset = centroCantidad - rectContenedor.left - (anchoBoton / 2);
        offset = Math.max(0, Math.round(offset));
        paddingIzquierdo = `${offset}px`;
      }else{
        /* Respaldo por si el control de cantidad no está visible aún. */
        paddingIzquierdo = "40px";
      }
    }

    contenedor.style.setProperty("padding-left", paddingIzquierdo, "important");
    contenedor.style.setProperty("grid-template-columns", columnas, "important");
    contenedor.style.setProperty("justify-content", justificar, "important");
  };

  actualizar();
  window.SAGC_actualizarAccionesDetalle = actualizar;

  if(!window.__accionesDetalleResponsiveRegistrado){
    window.__accionesDetalleResponsiveRegistrado = true;
    window.addEventListener("resize", actualizar, { passive: true });
  }
}

/* Inicializa todos los módulos */
function initServices(){
  if(typeof CatalogService !== "undefined") CatalogService.init();
  if(typeof SearchService !== "undefined") SearchService.init();
  if(typeof VariantService !== "undefined") VariantService.init();
  if(typeof CartService !== "undefined") CartService.init();
  if(typeof UIService !== "undefined") UIService.init();
  if(typeof ShareService !== "undefined") ShareService.init();
  if(typeof EmpresaService !== "undefined") EmpresaService.init();
   if(typeof WhatsAppService !== "undefined") WhatsAppService.init();
}

/* Aplica nombre y logo del negocio */
function applyBusinessIdentity(){
  document.title = CONFIG.STORE_NAME;

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(descriptionMeta) descriptionMeta.content = CONFIG.STORE_DESCRIPTION || "";
  if(themeMeta) themeMeta.content = CLIENTE.COLOR_HEADER || "#111111";

  const storeName = document.getElementById("storeName");
  const footerStoreName = document.getElementById("footerStoreName");
  const logo = document.getElementById("storeLogo");

  if(storeName){
    if(window.innerWidth <= 600 && CONFIG.STORE_NAME.length > 13){
      const palabras = CONFIG.STORE_NAME.split(" ");
      const mitad = Math.ceil(palabras.length / 2);

      storeName.innerHTML =
        palabras.slice(0, mitad).join(" ") +
        "<br>" +
        palabras.slice(mitad).join(" ");
    }else{
      storeName.textContent = CONFIG.STORE_NAME;
    }
  }

  if(footerStoreName) footerStoreName.textContent = CONFIG.STORE_NAME;
  if(logo) logo.src = CONFIG.LOGO_URL;
}


/* Convierte valores de Google Sheets como SI/NO, SÍ/NO, TRUE/FALSE y 1/0. */
function normalizeSheetBoolean(value, fallback = false){
  if(typeof value === "boolean") return value;
  if(value === null || value === undefined || value === "") return fallback;

  const normalized = String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if(["SI", "TRUE", "VERDADERO", "1", "ON", "ACTIVO"].includes(normalized)) return true;
  if(["NO", "FALSE", "FALSO", "0", "OFF", "INACTIVO"].includes(normalized)) return false;
  return fallback;
}

/* =========================================================
   INSTALAR APP
   - En PC nunca aparece.
   - En celular, el cliente decide desde Google Sheets:
       MOSTRAR_INSTALAR_APP | SI / NO
   - Si la fila no existe, usa PWA.MOSTRAR_POR_DEFECTO de cliente.js.
========================================================= */
function applyInstallConfiguration(){
  const bar = document.getElementById("installAppBar");
  const title = bar?.querySelector(".install-title");
  const button = document.getElementById("installAppBtn");
  const pwa = CLIENTE.PWA || {};

  if(title) title.textContent = pwa.TEXTO || "Instala nuestra app";
  if(button) button.textContent = pwa.TEXTO_BOTON || "Instalar";

  const sheetValue = APP.config?.MOSTRAR_INSTALAR_APP;
  const enabled = sheetValue === undefined
    ? pwa.MOSTRAR_POR_DEFECTO !== false
    : normalizeSheetBoolean(sheetValue, false);

  if(bar){
    bar.dataset.enabled = enabled ? "true" : "false";
    bar.style.display = "none";
  }

  window.installConfigReady = true;
  if(typeof window.refreshInstallBar === "function"){
    window.refreshInstallBar();
  }
}

/*
  BARRA DE ANUNCIOS DESDE LA HOJA CONFIG
  Agrega estas filas:
  MOSTRAR_ANUNCIO | SI
  ANUNCIO_TEXTO | Envío gratis desde S/300 | Cyber Day | Nuevos productos
  ANUNCIO_MOVIMIENTO | SI
  ANUNCIO_VELOCIDAD | NORMAL   (MUY_LENTA / LENTA / NORMAL / RAPIDA / MUY_RAPIDA)
*/
function applyAnnouncementBar(){
  const bar = document.getElementById("announcementBar");
  const track = document.getElementById("announcementTrack");
  if(!bar || !track) return;

  const defaults = CLIENTE.ANUNCIOS || {};
  const enabled = normalizeSheetBoolean(
    APP.config?.MOSTRAR_ANUNCIO,
    defaults.MOSTRAR ?? false
  );
  const raw = String(APP.config?.ANUNCIO_TEXTO || defaults.TEXTO || "").trim();

  if(!enabled || !raw){
    bar.hidden = true;
    track.replaceChildren();
    return;
  }

  const messages = raw.split("|").map(text => text.trim()).filter(Boolean).slice(0, 12);
  if(!messages.length){
    bar.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  messages.forEach(message => {
    const item = document.createElement("span");
    item.className = "announcement-item";

    const markerMode = String(APP.config?.ANUNCIO_MARCADOR || defaults.MARCADOR || "ICONO")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    const markerIcon = String(APP.config?.ANUNCIO_ICONO || defaults.ICONO || "📢").trim();

    if(["PUNTO", "BOLITA", "DOT"].includes(markerMode)){
      item.classList.add("marker-dot");
      item.dataset.icon = "";
    }else if(["NINGUNO", "SIN_MARCADOR", "NONE"].includes(markerMode)){
      item.classList.add("marker-none");
      item.dataset.icon = "";
    }else{
      item.classList.add("marker-icon");
      item.dataset.icon = markerIcon || "📢";
    }

    item.textContent = message;
    fragment.appendChild(item);
  });
  track.replaceChildren(fragment);

  const move = normalizeSheetBoolean(
    APP.config?.ANUNCIO_MOVIMIENTO,
    defaults.MOVIMIENTO ?? true
  );
  const speed = String(APP.config?.ANUNCIO_VELOCIDAD || defaults.VELOCIDAD || "NORMAL")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").toUpperCase();
  const durations = { MUY_LENTA: 48, LENTA: 36, NORMAL: 25, RAPIDA: 17, MUY_RAPIDA: 11 };
  const seconds = durations[speed] || durations.NORMAL;
  track.style.setProperty("--announcement-duration", `${seconds}s`);
  track.classList.toggle("is-moving", move);

  const sizeRaw = String(APP.config?.ANUNCIO_TAMANO || defaults.TAMANO || "PEQUEÑO")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/[\s-]+/g, "_").toUpperCase();
  const sizeAliases = {
    MUY_PEQUENO: "muy-pequeno", MUY_PEQUENA: "muy-pequeno",
    PEQUENO: "pequeno", PEQUENA: "pequeno",
    MEDIANO: "mediano", MEDIANA: "mediano",
    GRANDE: "grande"
  };
  const style = String(APP.config?.ESTILO_ANUNCIO || defaults.ESTILO || "SIMPLE")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  bar.dataset.size = sizeAliases[sizeRaw] || "pequeno";
  bar.dataset.style = style === "PREMIUM" ? "premium" : "simple";
  bar.dataset.moving = move ? "true" : "false";
  bar.hidden = false;
}


/* =========================================================
   ANIMACIONES CONFIGURABLES DESDE GOOGLE SHEETS
   Si una clave no existe, se conserva exactamente el comportamiento actual.

   Claves disponibles:
   ANIMACION_LOGO, ANIMACION_ANUNCIO, ANIMACION_CARRITO,
   ANIMACION_WHATSAPP, ANIMACION_INSTALAR, ANIMACION_OFERTA,
   ANIMACION_FAVORITOS, ANIMACION_BOTON_COMPRAR

   Valores: NINGUNA, PULSE, GLOW, FLASH, SHINE, FLOAT
   Para ANIMACION_ANUNCIO también se aceptan MARQUEE y NEON.
========================================================= */
function applyConfigurableAnimations(){
  const allowed = new Set(["NINGUNA", "PULSE", "GLOW", "FLASH", "SHINE", "FLOAT", "NEON"]);
  const normalizeAnimation = value => {
    const normalized = String(value ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim().replace(/[\s-]+/g, "_").toUpperCase();

    const aliases = {
      "": "", NO: "NINGUNA", NONE: "NINGUNA", SIN_ANIMACION: "NINGUNA", DESACTIVADA: "NINGUNA", DESACTIVADO: "NINGUNA",
      PULSO: "PULSE", BRILLO: "GLOW", DESTELLO: "FLASH", RESPLANDOR: "SHINE", FLOTAR: "FLOAT", FLOTANTE: "FLOAT"
    };
    return aliases[normalized] || normalized;
  };

  const body = document.body;
  if(!body) return;

  const configs = {
    LOGO: APP.config?.ANIMACION_LOGO,
    CARRITO: APP.config?.ANIMACION_CARRITO,
    WHATSAPP: APP.config?.ANIMACION_WHATSAPP,
    INSTALAR: APP.config?.ANIMACION_INSTALAR,
    OFERTA: APP.config?.ANIMACION_OFERTA,
    FAVORITOS: APP.config?.ANIMACION_FAVORITOS,
    BOTON_COMPRAR: APP.config?.ANIMACION_BOTON_COMPRAR
  };

  const animationTargets = {
    LOGO: [".brand-logo"],
    CARRITO: ["#openCartBtn"],
    WHATSAPP: [".btn-whatsapp", ".btn-whatsapp-product"],
    INSTALAR: ["#installAppBtn"],
    OFERTA: [".discount-badge", ".offer-badge"],
    FAVORITOS: [".favorite-btn", "#filterFavoritesBtn"],
    BOTON_COMPRAR: [".open-variants", ".detail-cart-btn"]
  };

  Object.entries(configs).forEach(([key, rawValue]) => {
    const prefix = `anim-${key.toLowerCase().replaceAll("_", "-")}-`;
    [...body.classList].forEach(className => {
      if(className.startsWith(prefix)) body.classList.remove(className);
    });

    const targets = animationTargets[key] || [];
    targets.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.style.removeProperty("animation");
        element.style.removeProperty("animation-name");
      });
    });

    if(rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return;
    const value = normalizeAnimation(rawValue);
    const finalValue = allowed.has(value) ? value : "NINGUNA";
    body.classList.add(`${prefix}${finalValue.toLowerCase()}`);

    if(finalValue === "NINGUNA"){
      targets.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          element.style.setProperty("animation", "none", "important");
          element.style.setProperty("animation-name", "none", "important");
        });
      });
    }
  });

  [...body.classList].forEach(className => {
    if(className.startsWith("anim-anuncio-")) body.classList.remove(className);
  });

  const bar = document.getElementById("announcementBar");
  const track = document.getElementById("announcementTrack");
  bar?.classList.remove("animation-configured");

  /* Limpia completamente la animación anterior antes de leer el nuevo valor.
     Evita que NINGUNA quede pegada al cambiar luego a PULSE/MARQUEE, o viceversa. */
  [bar, track].forEach(element => {
    if(!element) return;
    element.style.removeProperty("animation");
    element.style.removeProperty("animation-name");
  });

  const announcementRaw = APP.config?.ANIMACION_ANUNCIO;
  if(announcementRaw === undefined || announcementRaw === null || String(announcementRaw).trim() === "") return;

  const value = normalizeAnimation(announcementRaw);
  if(value === "MARQUEE"){
    track?.classList.add("is-moving");
    return;
  }

  /* NINGUNA significa anuncio totalmente estático: sin efecto y sin desplazamiento. */
  if(value === "NINGUNA"){
    track?.classList.remove("is-moving");
    if(bar) bar.dataset.moving = "false";
    bar?.style.setProperty("animation", "none", "important");
    track?.style.setProperty("animation", "none", "important");
    return;
  }

  if(allowed.has(value)){
    body.classList.add(`anim-anuncio-${value.toLowerCase()}`);
    bar?.classList.add("animation-configured");
  }
}

/* Crea índices para búsquedas rápidas */
function buildIndexes(){
  APP.productsByCode = {};
  APP.categoryIndex = {};
  APP.searchIndex = [];

  APP.products.forEach(product => {
    APP.productsByCode[product.code] = product;

    (APP.categoryIndex["Todos"] ||= []).push(product);
    (APP.categoryIndex[product.category] ||= []).push(product);

    APP.searchIndex.push({
      code: product.code,
      text:[
        product.code,
        product.name,
        product.brand,
        product.category,
        product.description
      ].join(" ").toLowerCase()
    });
  });
}

/* Skeleton mientras carga */
function showInitialLoading(){
  const grid = document.getElementById("catalogGrid");
  if(!grid) return;

  grid.innerHTML = "";

  for(let i = 0; i < 8; i++){
    const item = document.createElement("div");
    item.className = "skeleton-card";
    item.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line small"></div>
      <div class="skeleton-line price"></div>
    `;
    grid.appendChild(item);
  }
}

/* Oculta skeleton */
function hideInitialLoading(){
  document.querySelectorAll(".skeleton-card").forEach(e => e.remove());
}

/* Error de carga */
function showAppError(message){
  const grid = document.getElementById("catalogGrid");
  if(!grid) return;

  grid.innerHTML = `
    <div class="empty-state">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
    </div>
  `;
}

/* =========================================================
   FOOTER DESDE GOOGLE SHEETS CONFIG
========================================================= */

function getSheetConfig(key, fallback = ""){
  const value = APP.config?.[key];

  if(value === undefined || value === null){
    return fallback;
  }

  return String(value).trim();
}

function applyFooterFromSheet(){
  const footerText = document.getElementById("footerText");
  const legalText = document.getElementById("legalText");
  const createdBy = document.getElementById("createdBy");

  if(footerText){
    footerText.innerHTML = getSheetConfig("TEXTO_PIE_PAGINA", "Atención de lunes a domingo");
  }

  if(legalText){
    legalText.textContent = getSheetConfig("TEXTO_LEGAL", "Todos los derechos reservados");
  }

  if(createdBy){
    createdBy.textContent = CONFIG.CREATED_BY || "Creado por SAGC";
  }
}

function buildSocialUrl(type, value){
  if(!value) return "";

  value = String(value).trim();

  if(type === "whatsapp"){
    const number = value.replace(/\D/g, "");
    if(!number) return "";

    return `https://wa.me/${number.startsWith("51") ? number : "51" + number}`;
  }

  if(value.startsWith("http://") || value.startsWith("https://")){
    return value;
  }

  return "";
}

/* =========================================================
   REDES SOCIALES CON SVG
========================================================= */

function renderFooterSocials(){
  const container = document.getElementById("footerSocials");
  if(!container) return;

  const icons = {
    WHATSAPP: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16.04 3C9.42 3 4.03 8.39 4.03 15.01c0 2.3.65 4.46 1.78 6.29L4 29l7.91-1.73a11.9 11.9 0 0 0 4.13.73C22.66 28 28 22.63 28 16.01S22.66 3 16.04 3zm0 22.85c-1.34 0-2.65-.39-3.78-1.13l-.54-.35-4.7 1.03 1-4.58-.36-.56a9.9 9.9 0 0 1-1.49-5.25c0-5.43 4.42-9.85 9.86-9.85 5.43 0 9.84 4.42 9.84 9.85s-4.41 9.84-9.83 9.84zm5.39-7.38c-.29-.15-1.72-.85-1.99-.95-.27-.1-.47-.15-.67.15-.19.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.35-1.45-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.06c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.72-.7 1.97-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.19-.56-.34z"/>
      </svg>
    `,

    FACEBOOK: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.25-1.5 1.55-1.5h1.65V4.9c-.8-.08-1.6-.12-2.4-.12-2.38 0-4 1.45-4 4.1V11H8.1v3h2.7v8h2.7z"/>
      </svg>
    `,

    INSTAGRAM: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8zm8.7 2.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
      </svg>
    `,

    TIKTOK: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.6 3c.35 2.05 1.55 3.4 3.4 3.72v3.05a7.15 7.15 0 0 1-3.35-.86v5.98c0 3.4-2.2 5.91-5.58 5.91-3.06 0-5.07-2.12-5.07-4.86 0-3.02 2.28-5.07 5.54-5.07.34 0 .65.03.95.1v3.13a3.47 3.47 0 0 0-.95-.13c-1.32 0-2.22.75-2.22 1.89 0 1.08.78 1.82 1.87 1.82 1.27 0 2.12-.75 2.12-2.35V3h3.29z"/>
      </svg>
    `,

    YOUTUBE: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.8 4 12 4 12 4s-3.8 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.5.8 2.1c.8.8 1.9.8 2.4.9 1.7.2 6.4.2 6.4.2s3.8 0 6.7-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.6v-1.7c0-1.8-.2-3.6-.2-3.6zM10.1 14.8V8.9l5.4 3-5.4 2.9z"/>
      </svg>
    `
  };

  const socials = [
    { key:"WHATSAPP", type:"whatsapp", label:"WhatsApp", className:"social-whatsapp" },
    { key:"FACEBOOK", type:"link", label:"Facebook", className:"social-facebook" },
    { key:"INSTAGRAM", type:"link", label:"Instagram", className:"social-instagram" },
    { key:"TIKTOK", type:"link", label:"TikTok", className:"social-tiktok" },
    { key:"YOUTUBE", type:"link", label:"YouTube", className:"social-youtube" }
  ];

  container.innerHTML = "";

  socials.forEach(social => {
    const value = getSheetConfig(social.key, "");
    const url = buildSocialUrl(social.type, value);

    if(!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = `social-icon ${social.className}`;
    a.setAttribute("aria-label", social.label);
    a.setAttribute("title", social.label);
    a.innerHTML = icons[social.key];

    container.appendChild(a);
  });

  container.style.display = container.children.length ? "flex" : "none";
}

/* =========================================================
   SELECTOR DE VISTA EN HEADER - SOLO CELULAR
   Guarda la preferencia del cliente visitante.
========================================================= */
/* =========================================================
   VISTA INICIAL EN CELULAR
   Google Sheets:
   VISTA_INICIAL | 1 = un producto
   VISTA_INICIAL | 2 = dos productos

   El valor de Google Sheets define la vista al abrir o actualizar.
   El visitante puede cambiarla durante la sesión, pero no se guarda.
========================================================= */
function initHeaderMobileView(){
  const sheetValue = String(APP.config.VISTA_INICIAL ?? "2")
    .trim()
    .toLowerCase();

  const view =
    sheetValue === "1" || sheetValue === "large"
      ? "large"
      : "compact";

  applyMobileView(view);

  document.addEventListener("click", e => {
    const viewBtn = e.target.closest(".view-btn");
    if(!viewBtn) return;

    const selectedView = viewBtn.dataset.view === "compact" ? "compact" : "large";
    applyMobileView(selectedView);
  });
}

function applyMobileView(view){
  document.body.classList.remove(
    "mobile-view-large",
    "mobile-view-compact"
  );

  document.body.classList.add(
    view === "compact"
      ? "mobile-view-compact"
      : "mobile-view-large"
  );

  updateHeaderViewButtons();
}

function updateHeaderViewButtons(){
  const isCompact = document.body.classList.contains("mobile-view-compact");

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(isCompact ? ".view-compact" : ".view-large")?.classList.add("active");
}

/* =========================================================
   COMPARTIR EN FOOTER - SOLO CELULAR
   Usa la misma función del botón Compartir Catálogo del header.
========================================================= */
function initFooterShareButton(){
  const footerSocials = document.getElementById("footerSocials");
  if(!footerSocials) return;

  if(!document.getElementById("footerShareCatalogBtn")){
    const button = document.createElement("button");
    button.id = "footerShareCatalogBtn";
    button.type = "button";
    button.className = "social-icon footer-share-mobile";
    button.setAttribute("aria-label", "Compartir catálogo");
    button.setAttribute("title", "Compartir catálogo");
    button.innerHTML = `
  <div class="share-circle">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 1 0 15 5c0 .24.04.47.09.7L8.04 9.81A3 3 0 1 0 8.04 14.2l7.12 4.18c-.04.2-.06.41-.06.62a2.9 2.9 0 1 0 2.9-2.9z"/>
    </svg>
  </div>
`;

    footerSocials.appendChild(button);
  }

  document.getElementById("footerShareCatalogBtn")?.addEventListener("click", () => {
    document.getElementById("shareCatalogBtn")?.click();
  });

  footerSocials.style.display = "flex";
}
