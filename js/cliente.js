/* =========================================================
   CENTRAL DE CONFIGURACIÓN DEL CLIENTE
   Para crear un catálogo nuevo, cambia SOLO este archivo.
========================================================= */

const CLIENTE = {
  /* =====================================================
     🏢 NEGOCIO
  ===================================================== */
  NOMBRE: "DISFRACES MAYSA",
  CATALOGO_ID: "disfracesmaysa",
  NOMBRE_CORTO: "MAYSA",
  DESCRIPCION: "Alquiler y Venta de Disfraces para toda Ocasión",
  URL_WEB: "https://disfracesmaysa.pages.dev/",
  LOGO: "assets/logo.png",

  /* =====================================================
     🖼️ TAMAÑOS DEL ENCABEZADO
     Cambia únicamente los números. El diseño permanece igual.
  ===================================================== */
  TAMANO_LOGO_PC: 60,
  TAMANO_LOGO_CELULAR: 30,
  TAMANO_NOMBRE_PC: 38,
  TAMANO_NOMBRE_CELULAR: 22,

  /* =====================================================
     🏷️ IMAGEN DE NOMBRE (LOGOTIPO ESCRITO)
     Si LOGO_NOMBRE tiene una ruta, esa imagen reemplaza al
     texto del nombre en el encabezado (PC y celular).
     Si lo dejas vacío (""), se ve el texto normal (NOMBRE),
     igual que antes, sin ningún cambio.
  ===================================================== */
  LOGO_NOMBRE: "assets/logo-nombre.png",
  LOGO_NOMBRE_ALT: "", // Texto alternativo. Vacío = usa NOMBRE.

  // Tamaño VISIBLE de la imagen dentro del encabezado.
  // ANCHO la hace más larga y ALTO la hace más alta.
  // El header conserva siempre su tamaño; si excedes el espacio disponible,
  // la imagen se limita automáticamente dentro de él.
  // Pon 0 para que esa medida se ajuste automáticamente.
  LOGO_NOMBRE_ANCHO_PC: 260,
  LOGO_NOMBRE_ALTO_PC: 62,
  LOGO_NOMBRE_ANCHO_CELULAR: 190,
  LOGO_NOMBRE_ALTO_CELULAR: 54,

  // Posición dentro del espacio del nombre: "centro" | "izquierda" | "derecha"
  LOGO_NOMBRE_POSICION_PC: "centro",
  LOGO_NOMBRE_POSICION_CELULAR: "centro",

  // Posición vertical dentro del mismo header: "centro" | "arriba" | "abajo"
  LOGO_NOMBRE_POSICION_VERTICAL_PC: "centro",
  LOGO_NOMBRE_POSICION_VERTICAL_CELULAR: "centro",

  // Ajuste fino en píxeles. No cambia ni desplaza el tamaño del header;
  // cualquier parte que intente salir queda limitada dentro de su espacio.
  LOGO_NOMBRE_MOVER_X_PC: 0,
  LOGO_NOMBRE_MOVER_Y_PC: 0,
  LOGO_NOMBRE_MOVER_X_CELULAR: 0,
  LOGO_NOMBRE_MOVER_Y_CELULAR: 0,

  /* Imagen horizontal recomendada: 1200 × 630 px */
  COMPARTIR: {
    // Déjalos vacíos para usar automáticamente NOMBRE y DESCRIPCION.
    TITULO: "",
    DESCRIPCION: "",
    // Imagen horizontal recomendada para WhatsApp: 1200 × 630 px.
    IMAGEN: "assets/share.png"
  },

  /* =====================================================
     📊 GOOGLE SHEETS
  ===================================================== */
  GOOGLE_SHEET_ID: "1UJuXSiyY1d4GudxypoI49fHgtramM36PoTDQRVsTsos",

  /* =====================================================
     🎨 COLORES
  ===================================================== */
COLOR_PRINCIPAL: "#EE146C",
COLOR_PRINCIPAL_OSCURO: "#59218D",
COLOR_SECUNDARIO: "#25B6A1",
COLOR_SUAVE: "#FFF2F7",
COLOR_HEADER: "#a266eb",
COLOR_PRECIO: "#BF1B75",
COLOR_FONDO_PAGINA: "#FFFAFC",
COLOR_CARRITO: "#a266eb",
COLOR_BOTON_COMPRAR: "#EE146C",
COLOR_INSTALAR: "#a266eb",
  /* =====================================================
     📦 BOTÓN ESPECIAL REUTILIZABLE
     En CONFIG usa BOTON_ESPECIAL: IMPORTACION | MAS_VENDIDO |
     NUEVO_INGRESO | VENTA.
     En PRODUCTOS usa DESTACADO = VENTA para compra directa.
     Si DESTACADO está vacío, el producto se trata como ALQUILER.
     Compatibilidad: MAS_VENDIDO = SI sigue funcionando para IMPORTACION.
  ===================================================== */
  IMPORTACION_GRUPAL: {
    TITULO: "Importación Grupal Abierta",
    ETIQUETA: "IMPORTACIÓN",
    COLOR_BORDE: "#F59E0B",
    COLOR_ETIQUETA: "#F59E0B"
  },

  /* =====================================================
     🔤 TIPOGRAFÍAS
     Ejemplos: Fredoka, Poppins, Sriracha, Montserrat,
     Nunito, Playfair Display
  ===================================================== */
  FUENTE_TITULO: "Fredoka",
  FUENTE_GENERAL: "Poppins",

  /* =====================================================
     📱 INSTALAR APP (PWA)
     REGLA FIJA: nunca se muestra en PC.
     En celular, el cliente decide desde Google Sheets:
       MOSTRAR_INSTALAR_APP | SI / NO
  ===================================================== */
  PWA: {
    SOLO_CELULAR: true,
    MOSTRAR_POR_DEFECTO: true,
    TEXTO: "Instala nuestra app",
    TEXTO_BOTON: "Instalar",
    COMPACTO: true
  },

  /* =====================================================
     📢 ANUNCIOS
     Google Sheets puede reemplazar estos valores.
     Velocidades válidas:
     MUY_LENTA ⭐ | LENTA ⭐⭐ | NORMAL ⭐⭐⭐ |
     RAPIDA ⭐⭐⭐⭐ | MUY_RAPIDA ⭐⭐⭐⭐⭐
     Marcadores válidos: ICONO | PUNTO | NINGUNO
  ===================================================== */
  ANUNCIOS: {
    MOSTRAR: false,
    TEXTO: "Compras mayores a S/300: envío gratis | Nuevos productos disponibles",
    MOVIMIENTO: true,
    VELOCIDAD: "NORMAL",
    MARCADOR: "ICONO", // ICONO | PUNTO | NINGUNO
    ICONO: "📢"        // Solo se usa cuando MARCADOR es ICONO
  },

  /* =====================================================
     🌐 GOOGLE, WHATSAPP Y SEO
     GOOGLE_SITE_VERIFICATION se copia desde Search Console.
  ===================================================== */
SEO: {
  INDEXAR_EN_GOOGLE: true,
  TITULO: "Disfraces Maysa | Alquiler y Venta de Disfraces",
  DESCRIPCION: "Alquiler y venta de disfraces para niños y adultos. Encuentra opciones para fiestas, colegios, eventos, Halloween y toda ocasión.",
  PALABRAS_CLAVE: "Disfraces Maysa, alquiler de disfraces, venta de disfraces, disfraces para niños, disfraces para adultos, disfraces infantiles, disfraces para fiestas, disfraces escolares, disfraces para eventos, disfraces de personajes, disfraces de superhéroes, disfraces de princesas, disfraces para Halloween, disfraces temáticos, accesorios para disfraces",
  GOOGLE_SITE_VERIFICATION: "",
  TIPO_NEGOCIO: "Store",
  IDIOMA: "es-PE"
},
  /* =====================================================
     ⚙️ RENDIMIENTO
     Aunque existan 1,000 productos, solo se dibujan por bloques.
  ===================================================== */
  /* Las miniaturas se activan realmente desde Google Sheets:
     MOSTRAR_MINIATURAS_VARIANTES = SI / NO */
  MOSTRAR_MINIATURAS_VARIANTES: false,

  PRODUCTOS_INICIALES: 24,
  PRODUCTOS_POR_CARGA: 24,
  CACHE_MINUTOS: 0,
  CACHE_VERSION: 126,

  /* =====================================================
     🛒 DATOS GENERALES
  ===================================================== */
  MONEDA: "S/",
  DECIMALES: 2,
  CREADO_POR: "Creado por SAGC",
  IMAGEN_POR_DEFECTO: "assets/placeholder.webp"
};

/* ================= NO MODIFICAR DESDE AQUÍ ================= */
(function aplicarClienteTemprano(){
  if(typeof document === "undefined") return;

  const root = document.documentElement;
  const setVar = (name, value) => value && root.style.setProperty(name, value);
  const share = CLIENTE.COMPARTIR || {};
  const seo = CLIENTE.SEO || {};

  setVar("--primary", CLIENTE.COLOR_PRINCIPAL);
  setVar("--primary-dark", CLIENTE.COLOR_PRINCIPAL_OSCURO);
  setVar("--primary-soft", CLIENTE.COLOR_SUAVE);
  setVar("--bg-header", CLIENTE.COLOR_HEADER);
  setVar("--bg-footer", CLIENTE.COLOR_HEADER);
  setVar("--install-bg", CLIENTE.COLOR_HEADER);
  setVar("--price", CLIENTE.COLOR_PRECIO);
  setVar("--wholesale", CLIENTE.COLOR_PRECIO);
  setVar("--wh-price", CLIENTE.COLOR_PRECIO);
  setVar("--btn-whatsapp", CLIENTE.COLOR_WHATSAPP);
  setVar("--btn-whatsapp-hover", CLIENTE.COLOR_WHATSAPP_HOVER);
  setVar("--bg-page", CLIENTE.COLOR_FONDO_PAGINA);
  const cartColor = CLIENTE.COLOR_CARRITO || CLIENTE.COLOR_PRINCIPAL;
  setVar("--cart-color", cartColor);

  // Contraste automático del carrito para colores claros u oscuros.
  const hexToRgb = value => {
    const raw = String(value || "").trim().replace(/^#/, "");
    if(!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return null;
    const hex = raw.length === 3 ? raw.split("").map(char => char + char).join("") : raw;
    return {r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16)};
  };
  const rgb = hexToRgb(cartColor);
  if(rgb){
    const channel = value => {
      const normalized = value / 255;
      return normalized <= .03928 ? normalized / 12.92 : Math.pow((normalized + .055) / 1.055, 2.4);
    };
    const luminance = .2126 * channel(rgb.r) + .7152 * channel(rgb.g) + .0722 * channel(rgb.b);
    const lightBackground = luminance > .58;
    setVar("--cart-icon-color", lightBackground ? "#172033" : "#FFFFFF");
    setVar("--cart-outline-color", lightBackground ? "rgba(23,32,51,.24)" : "rgba(255,255,255,.82)");
    setVar("--cart-shadow-color", lightBackground ? "rgba(15,23,42,.30)" : "rgba(15,23,42,.36)");
    setVar("--cart-count-bg", lightBackground ? "#9F1239" : "#DC2626");
    setVar("--cart-count-color", "#FFFFFF");
  }
  setVar("--add-cart-color", CLIENTE.COLOR_BOTON_COMPRAR || CLIENTE.COLOR_PRINCIPAL);
  setVar("--import-border", CLIENTE.IMPORTACION_GRUPAL?.COLOR_BORDE || "#F59E0B");
  setVar("--import-label", CLIENTE.IMPORTACION_GRUPAL?.COLOR_ETIQUETA || CLIENTE.IMPORTACION_GRUPAL?.COLOR_BORDE || "#F59E0B");
  setVar("--font-title", `'${CLIENTE.FUENTE_TITULO}', sans-serif`);
  setVar("--font-main", `'${CLIENTE.FUENTE_GENERAL}', sans-serif`);
  setVar("--logo-size-pc", `${CLIENTE.TAMANO_LOGO_PC || 58}px`);
  setVar("--logo-size-mobile", `${CLIENTE.TAMANO_LOGO_CELULAR || 56}px`);
  setVar("--brand-title-size-pc", `${CLIENTE.TAMANO_NOMBRE_PC || 38}px`);
  setVar("--brand-title-size-mobile", `${CLIENTE.TAMANO_NOMBRE_CELULAR || 24}px`);

  // Imagen de nombre (logotipo escrito): tamaño y posición configurables.
  const posicionAJustify = valor => {
    const mapa = {centro:"center", izquierda:"flex-start", derecha:"flex-end"};
    return mapa[String(valor || "").trim().toLowerCase()] || "center";
  };
  const posicionAAlign = valor => {
    const mapa = {centro:"center", arriba:"flex-start", abajo:"flex-end"};
    return mapa[String(valor || "").trim().toLowerCase()] || "center";
  };
  const tamanoAPx = valor => {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? `${numero}px` : "auto";
  };
  const movimientoAPx = valor => {
    const numero = Number(valor);
    return `${Number.isFinite(numero) ? numero : 0}px`;
  };
  setVar("--brand-name-align-pc", posicionAJustify(CLIENTE.LOGO_NOMBRE_POSICION_PC));
  setVar("--brand-name-align-mobile", posicionAJustify(CLIENTE.LOGO_NOMBRE_POSICION_CELULAR));
  setVar("--brand-name-vertical-pc", posicionAAlign(CLIENTE.LOGO_NOMBRE_POSICION_VERTICAL_PC));
  setVar("--brand-name-vertical-mobile", posicionAAlign(CLIENTE.LOGO_NOMBRE_POSICION_VERTICAL_CELULAR));
  setVar("--brand-name-logo-width-pc", tamanoAPx(CLIENTE.LOGO_NOMBRE_ANCHO_PC));
  setVar("--brand-name-logo-height-pc", tamanoAPx(CLIENTE.LOGO_NOMBRE_ALTO_PC));
  setVar("--brand-name-logo-width-mobile", tamanoAPx(CLIENTE.LOGO_NOMBRE_ANCHO_CELULAR));
  setVar("--brand-name-logo-height-mobile", tamanoAPx(CLIENTE.LOGO_NOMBRE_ALTO_CELULAR));
  setVar("--brand-name-logo-x-pc", movimientoAPx(CLIENTE.LOGO_NOMBRE_MOVER_X_PC));
  setVar("--brand-name-logo-y-pc", movimientoAPx(CLIENTE.LOGO_NOMBRE_MOVER_Y_PC));
  setVar("--brand-name-logo-x-mobile", movimientoAPx(CLIENTE.LOGO_NOMBRE_MOVER_X_CELULAR));
  setVar("--brand-name-logo-y-mobile", movimientoAPx(CLIENTE.LOGO_NOMBRE_MOVER_Y_CELULAR));
  root.classList.toggle("usa-logo-nombre", Boolean(CLIENTE.LOGO_NOMBRE));

  const fontFamilies = [...new Set([CLIENTE.FUENTE_TITULO, CLIENTE.FUENTE_GENERAL])]
    .filter(Boolean)
    .map(name => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@300;400;500;600;700;800;900`)
    .join("&");

  if(fontFamilies){
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    document.head.appendChild(fontLink);
  }

  document.title = seo.TITULO || share.TITULO || CLIENTE.NOMBRE;

  const ensureMeta = (selector, attrs) => {
    let el = document.querySelector(selector);
    if(!el){
      el = document.createElement("meta");
      document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([key, value]) => {
      if(value !== undefined && value !== null && value !== "") el.setAttribute(key, value);
    });
  };

  ensureMeta('meta[name="description"]', {name:"description", content:seo.DESCRIPCION || CLIENTE.DESCRIPCION});
  ensureMeta('meta[name="keywords"]', {name:"keywords", content:seo.PALABRAS_CLAVE || ""});
  ensureMeta('meta[name="robots"]', {name:"robots", content:seo.INDEXAR_EN_GOOGLE === false ? "noindex,nofollow" : "index,follow,max-image-preview:large"});
  ensureMeta('meta[property="og:title"]', {property:"og:title", content:share.TITULO || CLIENTE.NOMBRE});
  ensureMeta('meta[property="og:description"]', {property:"og:description", content:share.DESCRIPCION || CLIENTE.DESCRIPCION});
  ensureMeta('meta[property="og:url"]', {property:"og:url", content:CLIENTE.URL_WEB});
  ensureMeta('meta[property="og:image"]', {property:"og:image", content:resolverUrl(share.IMAGEN || CLIENTE.LOGO)});
  ensureMeta('meta[property="og:image:width"]', {property:"og:image:width", content:"1200"});
  ensureMeta('meta[property="og:image:height"]', {property:"og:image:height", content:"630"});
  ensureMeta('meta[property="og:type"]', {property:"og:type", content:"website"});
  ensureMeta('meta[property="og:site_name"]', {property:"og:site_name", content:share.TITULO || CLIENTE.NOMBRE});
  ensureMeta('meta[property="og:locale"]', {property:"og:locale", content:String(seo.IDIOMA || "es-PE").replace("-", "_")});
  ensureMeta('meta[name="twitter:card"]', {name:"twitter:card", content:"summary_large_image"});
  ensureMeta('meta[name="twitter:title"]', {name:"twitter:title", content:share.TITULO || CLIENTE.NOMBRE});
  ensureMeta('meta[name="twitter:description"]', {name:"twitter:description", content:share.DESCRIPCION || CLIENTE.DESCRIPCION});
  ensureMeta('meta[name="twitter:image"]', {name:"twitter:image", content:resolverUrl(share.IMAGEN || CLIENTE.LOGO)});
  ensureMeta('meta[name="theme-color"]', {name:"theme-color", content:CLIENTE.COLOR_HEADER});

  if(seo.GOOGLE_SITE_VERIFICATION){
    ensureMeta('meta[name="google-site-verification"]', {name:"google-site-verification", content:seo.GOOGLE_SITE_VERIFICATION});
  }

  let canonical = document.querySelector('link[rel="canonical"]');
  if(!canonical){ canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
  canonical.href = CLIENTE.URL_WEB;

  if(CLIENTE.PWA?.COMPACTO) root.classList.add("install-compact");

  // Mantiene logo, nombre y favicon sincronizados con este mismo archivo.
  const aplicarIdentidadVisual = () => {
    const logoUrl = resolverUrl(CLIENTE.LOGO);
    const bootLogo = document.getElementById("appBootLogo");
    const bootName = document.getElementById("appBootName");
    const storeLogo = document.getElementById("storeLogo");
    const storeNameLogo = document.getElementById("storeNameLogo");
    const favicon = document.querySelector('link[rel="icon"]');

    if(bootLogo) bootLogo.src = logoUrl;
    if(bootName) bootName.textContent = CLIENTE.NOMBRE || "";
    if(storeLogo) storeLogo.src = logoUrl;
    if(favicon) favicon.href = logoUrl;

    if(storeNameLogo){
      if(CLIENTE.LOGO_NOMBRE){
        storeNameLogo.src = resolverUrl(CLIENTE.LOGO_NOMBRE);
        storeNameLogo.alt = CLIENTE.LOGO_NOMBRE_ALT || CLIENTE.NOMBRE || "";
      } else {
        storeNameLogo.removeAttribute("src");
        storeNameLogo.alt = "";
      }
    }
  };

  if(document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarIdentidadVisual, { once: true });
  } else {
    aplicarIdentidadVisual();
  }

  function resolverUrl(value){
    try { return new URL(value, CLIENTE.URL_WEB).href; }
    catch { return value; }
  }
})();

if(typeof window !== "undefined") window.CLIENTE = CLIENTE;
if(typeof module !== "undefined" && module.exports) module.exports = CLIENTE;
