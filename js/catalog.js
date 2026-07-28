'use strict';

/* =========================================================
   CATALOG.JS FINAL CORREGIDO
   Qué hace:
   - Muestra productos en el catálogo.
   - Respeta CONFIG en español e inglés.
   - Permite ver detalle, video y favoritos.
   - Permite escribir cantidad directa en pantalla principal
     para productos SIN variantes.
========================================================= */

const CatalogService = (() => {
  const grid = () => document.getElementById("catalogGrid");
  const categoriesBar = () => document.getElementById("categoriesBar");
  const categoriesSelect = () => document.getElementById("categoriesSelect");
  const categoriesSelectWrap = () => document.getElementById("categoriesSelectWrap");
  const loadMoreBtn = () => document.getElementById("loadMoreBtn");

  let filteredProducts = [];
  let activeQuickFilter = "";
  const DETAIL_HISTORY_KEY = "sagcProductDetail";
  let closingDetailFromHistory = false;
function initMobileViewMode(){
const sheetValue = String(APP.config.VISTA_INICIAL ?? "2")
  .trim()
  .toLowerCase();

const view =
  sheetValue === "1" || sheetValue === "large"
    ? "large"
    : "compact";

  document.body.classList.remove("mobile-view-large", "mobile-view-compact");
  document.body.classList.add(view === "compact" ? "mobile-view-compact" : "mobile-view-large");

  if(CONFIG.ALLOW_VIEW_TOGGLE === false) return;

  const searchSection = document.querySelector(".search-section");
  if(!searchSection || document.getElementById("mobileViewToggle")) return;

  const controls = document.createElement("div");
  controls.id = "mobileViewToggle";
  controls.className = "mobile-view-toggle";
  controls.innerHTML = `
    <button type="button" class="view-btn view-large" data-view="large">▣ Grande</button>
    <button type="button" class="view-btn view-compact" data-view="compact">▦ Compacto</button>
  `;

  searchSection.appendChild(controls);
  updateViewButtons();
}

function updateViewButtons(){
  const isCompact = document.body.classList.contains("mobile-view-compact");

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(
    isCompact ? ".view-compact" : ".view-large"
  )?.classList.add("active");
}
  function init(){
  filteredProducts = showConfig("MOSTRAR_AGOTADOS", "SHOW_SOLD_OUT")
    ? [...APP.products]
    : APP.products.filter(product => !isProductSoldOut(product));

  initMobileViewMode();

  renderCategories();
  renderProducts();
  registerEvents();
  openProductFromUrl();
}

  function registerEvents(){
    document.addEventListener("click", e => {
  const viewBtn = e.target.closest(".view-btn");
  if(!viewBtn) return;

  const view = viewBtn.dataset.view;

  document.body.classList.remove("mobile-view-large", "mobile-view-compact");
  document.body.classList.add(view === "compact" ? "mobile-view-compact" : "mobile-view-large");

  updateViewButtons();
  scheduleEqualProductCardHeights();
});

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        scheduleEqualProductCardHeights();
        const bar = categoriesBar();
        if(bar && !bar.hidden) applyCategoryOverflow(bar);
      }, 120);
    });
     loadMoreBtn()?.addEventListener("click", () => {
      APP.visibleProducts += CONFIG.LOAD_MORE_PRODUCTS;
      renderProducts();
    });

    categoriesBar()?.addEventListener("click", e => {
      const more = e.target.closest(".category-more-toggle");
      if(more){
        const bar = categoriesBar();
        const expanded = bar?.classList.toggle("show-more-categories");
        more.setAttribute("aria-expanded", expanded ? "true" : "false");
        more.textContent = expanded ? "Menos ▴" : "Más ▾";
        return;
      }
      const btn = e.target.closest(".category-btn");
      if(!btn) return;
      selectCategory(btn.dataset.category);
      categoriesBar()?.classList.remove("show-more-categories");
      const toggle = categoriesBar()?.querySelector(".category-more-toggle");
      if(toggle){ toggle.textContent = "Más ▾"; toggle.setAttribute("aria-expanded", "false"); }
    });

    categoriesSelect()?.addEventListener("change", e => {
      selectCategory(e.target.value);
    });

    document.addEventListener("click", e => {
      /* FILTROS RÁPIDOS: Favoritos, Importación grupal y Ofertas */
  const favBtn = e.target.closest("#filterFavoritesBtn");
  const bestBtn = e.target.closest("#filterBestSellersBtn");
  const offerBtn = e.target.closest("#filterOffersBtn");

  if(favBtn || bestBtn || offerBtn){
    document.querySelectorAll(".quick-filter-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    if(favBtn){
      activeQuickFilter = activeQuickFilter === "favorites" ? "" : "favorites";
      if(activeQuickFilter) favBtn.classList.add("active");
    }

    if(bestBtn){
      activeQuickFilter = activeQuickFilter === "importacion" ? "" : "importacion";
      if(activeQuickFilter) bestBtn.classList.add("active");
    }

    if(offerBtn){
      activeQuickFilter = activeQuickFilter === "offers" ? "" : "offers";
      if(activeQuickFilter) offerBtn.classList.add("active");
    }

    APP.visibleProducts = CONFIG.INITIAL_PRODUCTS;
    applyFilters();
    return;
  }

      const productTrigger = e.target.closest(".product-detail-trigger");
      if(productTrigger && !e.target.closest("button, input, a")){
        openDetailModal(productTrigger.dataset.code);
        return;
      }

      if(e.target.closest("#overlay") && document.getElementById("detailModal")?.classList.contains("show")){
        closeDetailModal();
        return;
      }

      if(e.target.closest("#closeDetailModal") || e.target.closest("#closeDetailBtn")){
        closeDetailModal();
        return;
      }

      if(e.target.closest("#detailPrevImg")){
        detailImageIndex = detailImageIndex <= 0 ? detailImages.length - 1 : detailImageIndex - 1;
        renderDetailImage();
        return;
      }

      if(e.target.closest("#detailNextImg")){
        detailImageIndex = detailImageIndex >= detailImages.length - 1 ? 0 : detailImageIndex + 1;
        renderDetailImage();
        return;
      }

      const thumb = e.target.closest(".detail-thumb");
      if(thumb){
        detailImageIndex = Number(thumb.dataset.index || 0);
        renderDetailImage();
        return;
      }

      if(e.target.closest("#detailVideoBtn")){
        const videoUrl = e.target.closest("#detailVideoBtn").dataset.video;
        if(videoUrl) window.open(videoUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const option1 = e.target.closest(".detail-option1");
      if(option1){
        detailSelectedOption1 = option1.dataset.value || "";
        detailSelectedOption2 = "";
        const variantImage = option1.dataset.image || "";
        if(variantImage){
          const detailImage = document.getElementById("detailImage");
          if(detailImage){
            detailImage.src = variantImage;
            detailImage.alt = `${detailProduct?.name || "Producto"} - ${detailSelectedOption1}`;
          }
        }
        renderDetailVariants();
        return;
      }

      const option2 = e.target.closest(".detail-option2");
      if(option2){
        detailSelectedOption2 = option2.dataset.value || "";
        renderDetailVariants();
        return;
      }

      if(e.target.closest("#detailQtyMinus")){
        changeDetailQty(-1);
        return;
      }

      if(e.target.closest("#detailQtyPlus")){
        changeDetailQty(1);
        return;
      }

      if(e.target.closest("#detailAddCartBtn")){
        addDetailProductToCart();
        return;
      }

      const fav = e.target.closest(".favorite-btn");
      if(fav){
        const code = fav.dataset.favorite;
        StorageService.toggleFavorite(code);
        fav.classList.toggle("active");
        fav.textContent = fav.classList.contains("active") ? "♥" : "♡";
      }
    });

    /* Cuando el cliente escribe una cantidad directa en pantalla principal */
    document.addEventListener("change", e => {
      const qtyInput = e.target.closest(".card-qty-input");
      if(!qtyInput) return;

      const product = APP.productsByCode[qtyInput.dataset.code];

      if(product){
        CartService.setProductQty(product, Number(qtyInput.value || 0));
      }
    });

    /* Mientras escribe, solo permite números */
    document.addEventListener("input", e => {
      const qtyInput = e.target.closest(".card-qty-input");
      if(qtyInput){
        qtyInput.value = qtyInput.value.replace(/[^\d]/g, "");
      }

      if(e.target && e.target.id === "detailQty"){
        e.target.value = String(e.target.value || "").replace(/[^\d]/g, "");
        detailQty = Math.max(0, Number(e.target.value || 0));
        updateDetailQty();
      }
    });

    if(!window.catalogCategoryResizeBound){
      window.catalogCategoryResizeBound = true;
      let categoryResizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(categoryResizeTimer);
        categoryResizeTimer = setTimeout(renderCategories, 180);
      });
    }

    if(!window.catalogDetailHistoryBound){
      window.catalogDetailHistoryBound = true;
      window.addEventListener("popstate", () => {
        if(document.getElementById("detailModal")?.classList.contains("show")){
          closingDetailFromHistory = true;
          hideDetailModal();
          closingDetailFromHistory = false;
        }
      });
    }

    document.addEventListener("keydown", e => {
      if((e.key === "Enter" || e.key === " ") && e.target?.classList?.contains("product-detail-trigger")){
        e.preventDefault();
        openDetailModal(e.target.dataset.code);
      }

      if(e.key === "Escape" && document.getElementById("detailModal")?.classList.contains("show")){
        closeDetailModal();
      }
    });
  }

  function normalizeCategoryMode(value){
    const mode = String(value ?? "BOTONES").trim().toUpperCase();

    if(["DESPLEGABLE", "SELECT", "LISTA"].includes(mode)) return "DESPLEGABLE";
    if(["OCULTAR", "OCULTO", "NINGUNO", "NO"].includes(mode)) return "OCULTAR";
    if(mode === "AUTO") return APP.categories.length > 6 ? "DESPLEGABLE" : "BOTONES";
    return "BOTONES";
  }

  function selectCategory(category){
    const selected = category || "Todos";

    APP.currentCategory = selected;
    APP.currentSearch = "";
    APP.visibleProducts = CONFIG.INITIAL_PRODUCTS;

    document.querySelectorAll(".category-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.category === selected);
    });

    const select = categoriesSelect();
    if(select) select.value = selected;

    const input = document.getElementById("searchInput");
    if(input) input.value = "";

    applyFilters();
  }

  function renderCategories(){
    const bar = categoriesBar();
    const select = categoriesSelect();
    const selectWrap = categoriesSelectWrap();
    if(!bar || !select || !selectWrap) return;

    bar.innerHTML = "";
    select.innerHTML = "";

    const mode = normalizeCategoryMode(APP.config.MODO_CATEGORIAS);
    const toolbar = document.querySelector(".catalog-toolbar");
    if(toolbar){
      toolbar.dataset.categoryMode = mode.toLowerCase();
    }

    APP.categories.forEach((category) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = category === "Todos" ? "category-btn active" : "category-btn";
      btn.dataset.category = category;
      btn.textContent = category;
      bar.appendChild(btn);

      const option = document.createElement("option");
      option.value = category;
      option.textContent = category === "Todos" ? "Todas las categorías" : category;
      select.appendChild(option);
    });

    bar.hidden = mode !== "BOTONES";
    selectWrap.hidden = mode !== "DESPLEGABLE";
    bar.classList.remove("show-more-categories");

    if(mode === "BOTONES"){
      requestAnimationFrame(() => applyCategoryOverflow(bar));
    }

    if(mode === "OCULTAR") APP.currentCategory = "Todos";
    select.value = APP.currentCategory || "Todos";
  }

  function applyCategoryOverflow(bar){
    if(!bar || bar.hidden) return;
    const buttons = [...bar.querySelectorAll(".category-btn")];
    buttons.forEach(btn => btn.classList.remove("category-extra"));
    bar.querySelector(".category-more-toggle")?.remove();

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "category-more-toggle";
    toggle.textContent = "Más ▾";
    toggle.setAttribute("aria-expanded", "false");
    toggle.style.visibility = "hidden";
    bar.appendChild(toggle);

    const available = Math.max(180, bar.clientWidth || bar.parentElement?.clientWidth || window.innerWidth - 32);
    const gap = parseFloat(getComputedStyle(bar).gap || 6);
    const toggleWidth = toggle.getBoundingClientRect().width || 66;
    let used = 0;
    let hiddenCount = 0;

    buttons.forEach((btn, index) => {
      const width = btn.getBoundingClientRect().width;
      const reserve = index < buttons.length - 1 ? toggleWidth + gap : 0;
      if(used + width + reserve <= available){
        used += width + gap;
      }else{
        btn.classList.add("category-extra");
        hiddenCount += 1;
      }
    });

    if(hiddenCount){
      toggle.style.visibility = "visible";
    }else{
      toggle.remove();
    }
  }

  function applyFilters(){
    let products = [...APP.products];

    if(!showConfig("MOSTRAR_AGOTADOS", "SHOW_SOLD_OUT")){
      products = products.filter(product => !isProductSoldOut(product));
    }

    if(APP.currentCategory && APP.currentCategory !== "Todos"){
      products = products.filter(p => p.category === APP.currentCategory);
    }

    if(APP.currentSearch){
      const term = APP.currentSearch.toLowerCase().trim();

      const matchingCodes = new Set(
        APP.searchIndex
          .filter(item => item.text.includes(term))
          .map(item => item.code)
      );

      products = products.filter(p => matchingCodes.has(p.code));
    }

     if(activeQuickFilter === "favorites"){
  const favorites = StorageService.loadFavorites();
  products = products.filter(p => favorites.includes(p.code));
}

if(activeQuickFilter === "importacion"){
  const tipoEspecial = typeof obtenerTipoBotonEspecial === "function" ? obtenerTipoBotonEspecial() : "IMPORTACION";
  products = products.filter(p => {
    const destacado = String(p.destacado || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g,"_").toUpperCase();
    if(destacado) return destacado === tipoEspecial;
    if(tipoEspecial !== "IMPORTACION") return false;
    const legacy = String(p.bestSeller || p.masVendido || "").trim().toUpperCase();
    return ["SI","TRUE","1"].includes(legacy);
  });
}

if(activeQuickFilter === "offers"){
  products = products.filter(p => Number(p.discount || 0) > 0);
}
    filteredProducts = products;
    actualizarBannerImportacion();
    renderProducts();
  }

  function actualizarBannerImportacion(){
    const banner = document.getElementById("importacionBanner");
    const titulo = document.getElementById("importacionBannerTitulo");
    const detalle = document.getElementById("importacionBannerDetalle");
    const icono = banner?.querySelector(".importacion-banner-icon");
    if(!banner) return;

    const estaActivo = activeQuickFilter === "importacion";
    banner.hidden = !estaActivo;

    const datos = typeof obtenerDatosBotonEspecial === "function"
      ? obtenerDatosBotonEspecial()
      : {tipo:"IMPORTACION", estado:"ABIERTA", titulo:"Importación grupal abierta", detalle:"Productos disponibles únicamente por tiempo limitado."};

    banner.dataset.estado = String(datos.estado).toLowerCase();
    banner.dataset.tipo = String(datos.tipo).toLowerCase();
    if(icono) icono.innerHTML = datos.iconoSvg || "📦";
    if(titulo) titulo.textContent = datos.titulo;
    if(detalle) detalle.textContent = datos.detalle;
  }

  function renderProducts(){
    const container = grid();
    if(!container) return;

    const list = filteredProducts.slice(0, APP.visibleProducts);

    if(list.length === 0){
      container.innerHTML = `
        <div class="empty-state">
          <h2>No encontramos productos</h2>
          <p>Prueba con otra búsqueda o categoría.</p>
        </div>
      `;
      toggleLoadMore(0,0);
      return;
    }

    container.innerHTML = list.map(productTemplate).join("");
    toggleLoadMore(list.length, filteredProducts.length);
    scheduleEqualProductCardHeights();
  }

  let equalHeightFrame = 0;
  function scheduleEqualProductCardHeights(){
    cancelAnimationFrame(equalHeightFrame);
    equalHeightFrame = requestAnimationFrame(() => {
      requestAnimationFrame(equalProductCardHeights);
    });
  }

  function equalProductCardHeights(){
    const container = grid();
    if(!container) return;
    const cards = [...container.querySelectorAll('.product-card')];
    if(!cards.length) return;

    cards.forEach(card => {
      card.style.height = 'auto';
      card.style.minHeight = '0';
    });

    const maxHeight = Math.ceil(Math.max(...cards.map(card => card.getBoundingClientRect().height)));
    cards.forEach(card => {
      card.style.height = `${maxHeight}px`;
      card.style.minHeight = `${maxHeight}px`;
    });
  }

  function isProductSoldOut(product){
    if(!product || product.unlimitedStock === true || product.stock === null) return false;
    if(product.hasVariants && Array.isArray(product.variants)){
      const hasUnlimitedVariant = product.variants.some(variant => variant?.stock === null || variant?.unlimitedStock === true);
      if(hasUnlimitedVariant) return false;
      return !product.variants.some(variant => Number(variant?.stock || 0) > 0);
    }
    return Number(product.stock || 0) <= 0;
  }

  function productTemplate(product){
    const isFavorite = StorageService.isFavorite(product.code);
    const soldOut = isProductSoldOut(product);

    const showCode = showConfig("MOSTRAR_CODIGO", "SHOW_CODE");
    const showBrand = showConfig("MOSTRAR_MARCA", "SHOW_BRAND");
    const showStock = showConfig("MOSTRAR_STOCK", "SHOW_STOCK");
    const showDiscount = showConfig("MOSTRAR_DESCUENTO", "SHOW_DISCOUNT");
    const showDetail = showConfig("MOSTRAR_DETALLE", "SHOW_DETAIL");
    const showVideo = showConfig("MOSTRAR_VIDEO", "SHOW_VIDEO");
    const showWholesale = showConfig("MOSTRAR_MAYORISTA", "SHOW_WHOLESALE");

    const hasExtraImages = [product.image2, product.image3, product.image4, product.image5]
      .some(value => String(value || "").trim() !== "");

    const hasDescription = showDetail && String(product.description || "").trim() !== "";
    const hasVideo = showVideo && String(product.video || "").trim() !== "";
    const canOpenDetail = true;

    const discount = showDiscount && Number(product.discount) > 0
      ? `<span class="discount-badge">-${product.discount}%</span>`
      : "";

    const code = showCode
      ? `<span class="product-meta-part product-code"><span class="product-meta-label">Código:</span> <strong>${escapeHtml(product.code)}</strong></span>`
      : "";

    const brandText = String(product.brand || "").trim();
    const brandLengthClass = brandText.length > 28
      ? "brand-very-long"
      : brandText.length > 20
      ? "brand-long"
      : brandText.length > 13
      ? "brand-medium"
      : "brand-short";

    const brand = showBrand && brandText
      ? `<span class="product-meta-part product-brand"><span class="product-meta-label">Marca:</span> <strong>${escapeHtml(brandText)}</strong></span>`
      : "";

    const metaParts = [code, brand].filter(Boolean);
    const meta = metaParts.length
      ? `<div class="product-meta ${brandLengthClass}">${metaParts.join('<span class="product-meta-separator" aria-hidden="true">|</span>')}</div>`
      : `<div class="product-meta product-meta-empty" aria-hidden="true">&nbsp;</div>`;

    const wholesale = showWholesale && product.wholesaleRules && product.wholesaleRules.length > 0
      ? renderWholesalePreview(product)
      : "";

    const variantStock = product.hasVariants && Array.isArray(product.variants)
      ? product.variants.reduce((total, variant) => {
          if(variant?.stock === null || variant?.unlimitedStock === true) return total;
          const value = Number(variant?.stock || 0);
          return total + (Number.isFinite(value) && value > 0 ? value : 0);
        }, 0)
      : 0;

    const stockValue = product.hasVariants && variantStock > 0
      ? variantStock
      : Number(product.stock || 0);

    const stock = showStock && stockValue > 0
      ? `<p class="product-stock">Stock disponible: ${stockValue}</p>`
      : "";

    const quantity = !product.hasVariants
      ? `
        <div class="card-qty">
          <button class="card-minus" data-code="${escapeAttr(product.code)}" aria-label="Restar cantidad" ${soldOut ? "disabled" : ""}>−</button>
          <input
            id="qty-${escapeAttr(product.code)}"
            class="card-qty-input"
            data-code="${escapeAttr(product.code)}"
            type="text"
            inputmode="numeric"
            value="${CartService.getProductQty(product.code)}"
            aria-label="Cantidad"
            ${soldOut ? "disabled" : ""}
          >
          <button class="card-plus" data-code="${escapeAttr(product.code)}" aria-label="Sumar cantidad" ${soldOut ? "disabled" : ""}>+</button>
        </div>
      `
      : "";

    const triggerClass = canOpenDetail ? "product-detail-trigger" : "";
    const triggerAttrs = canOpenDetail
      ? `data-code="${escapeAttr(product.code)}" role="button" tabindex="0"`
      : "";

    const optionsMessage = soldOut
      ? "Producto agotado. Toca para ver detalles."
      : "Toca el producto para ver todos los detalles.";

    const optionsNote = product.hasVariants
      ? `<p class="card-options-note card-options-note-inline ${triggerClass}" ${triggerAttrs}><span aria-hidden="true">👆</span><span>${optionsMessage}</span></p>`
      : "";

    const whatsappCard = showConfig("MOSTRAR_WHATSAPP_TARJETA", "SHOW_WHATSAPP_CARD")
      ? `
        <button
          type="button"
          class="btn-whatsapp-product card-whatsapp-icon-btn"
          data-code="${escapeAttr(product.code)}"
          aria-label="Consultar ${escapeAttr(product.name)} por WhatsApp"
          title="Consultar por WhatsApp"
          ${soldOut ? "disabled" : ""}>
          <span class="whatsapp-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M12.04 2C6.52 2 2.03 6.48 2.03 12c0 1.76.46 3.48 1.34 5L2 22l5.13-1.34A9.94 9.94 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm0 18.18a8.15 8.15 0 0 1-4.15-1.13l-.3-.18-3.04.8.81-2.96-.19-.3A8.18 8.18 0 0 1 3.86 12c0-4.51 3.67-8.18 8.18-8.18S20.18 7.49 20.18 12s-3.63 8.18-8.14 8.18Zm4.49-6.13c-.25-.12-1.46-.72-1.69-.8-.23-.09-.4-.12-.57.12-.16.25-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.15-1.17-.06-.11-.23-.17-.48-.29Z"/>
            </svg>
          </span>
        </button>`
      : "";

    const tipoEspecial = typeof obtenerTipoBotonEspecial === "function" ? obtenerTipoBotonEspecial() : "IMPORTACION";
    const destacadoNormalizado = String(product.destacado || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g,"_").toUpperCase();
    const legadoImportacion = ["SI", "TRUE", "1"].includes(String(product.bestSeller || product.masVendido || "").trim().toUpperCase());
    const esImportacion = destacadoNormalizado ? destacadoNormalizado === tipoEspecial : (tipoEspecial === "IMPORTACION" && legadoImportacion);
    const datosEspecial = typeof obtenerDatosBotonEspecial === "function" ? obtenerDatosBotonEspecial() : {boton:"Importación"};
    const etiquetaImportacion = String(tipoEspecial === "IMPORTACION" ? (APP.config?.ETIQUETA_IMPORTACION || CLIENTE.IMPORTACION_GRUPAL?.ETIQUETA || datosEspecial.boton) : datosEspecial.boton).trim();
    const iconosBadge = {IMPORTACION:"📦",MAS_VENDIDO:"🔥",NUEVO_INGRESO:"✨",VENTA:"🏷️"};
    const iconoEtiqueta = iconosBadge[tipoEspecial] || "📦";

    return `
      <article class="product-card premium-card ${esImportacion ? "product-card-importacion" : ""} ${soldOut ? "product-card-sold-out" : ""}" data-code="${escapeAttr(product.code)}">
        ${soldOut ? `<span class="product-sold-out-badge">AGOTADO</span>` : ""}
        ${esImportacion ? `<span class="product-importacion-badge">${iconoEtiqueta} ${escapeHtml(etiquetaImportacion)}</span>` : ""}
        <div class="product-image-wrap premium-image ${triggerClass} ${esImportacion ? "has-special-badge" : ""}" ${triggerAttrs}>
          ${discount}

          <button class="favorite-btn ${isFavorite ? "active" : ""}" data-favorite="${escapeAttr(product.code)}" aria-label="Favorito">
            ${isFavorite ? "♥" : "♡"}
          </button>

          <img
            src="${escapeAttr(product.image)}"
            alt="${escapeAttr(product.name)}"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            draggable="false"
          >

          ${canOpenDetail ? `<span class="product-open-hint">Ver producto</span>` : ""}
        </div>

        <div class="product-info premium-info">
          <h3 class="${triggerClass}" ${triggerAttrs}>${escapeHtml(product.name)}</h3>
          ${meta}

          <div class="card-price-whatsapp-row ${whatsappCard ? "has-whatsapp" : "without-whatsapp"}">
            ${Number(product.price) > 0
              ? `<p class="product-price">${Number(product.discount) > 0
                  ? formatMoney(
                      Number(product.price) -
                      (Number(product.price) * Number(product.discount) / 100)
                    )
                  : formatMoney(product.price)
                }</p>`
              : `<p class="product-no-price">Consultar<br>precio</p>`
            }
            ${whatsappCard}
          </div>

          ${Number(product.price) > 0 && Number(product.discount) > 0
  ? `<p class="product-old-price product-discount-after-price"><span>Antes:</span> <span class="old-price-value">${formatMoney(product.price)}</span></p>`
  : `<p class="product-old-price product-old-price-empty" aria-hidden="true">&nbsp;</p>`
}

          ${wholesale}
          ${stock}
          <div class="card-purchase-row ${product.hasVariants ? "has-variants" : "has-quantity"}">
            ${product.hasVariants ? optionsNote : quantity}
          </div>
        </div>
      </article>
    `;
  }

  function renderWholesalePreview(product){
  const rules = product.wholesaleRules || [];

  if(rules.length === 0) return "";

  const layoutClass =
    rules.length === 1
      ? "wholesale-one"
      : rules.length === 2
      ? "wholesale-two"
      : "wholesale-three";

  return `
    <div class="card-wholesale-list wholesale-compact">
      <div class="wholesale-title">
        <span class="wholesale-icon">🏷️</span>
        <strong>PRECIO POR MAYOR</strong>
      </div>

      <div class="wholesale-tiers ${layoutClass}">
        ${rules.map(rule => `
          <div class="wholesale-tier">
            <span>Desde ${rule.from}</span>
            <strong>${formatMoney(rule.price)}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
  function showConfig(keySpanish, keyEnglish){
    const config = APP.config || {};

    function parseEnabled(value){
      if(value === undefined || value === null || value === "") return null;
      if(typeof value === "boolean") return value;

      const normalized = String(value).trim().toUpperCase();
      if(["SI","SÍ","TRUE","1","YES","ON","ACTIVO"].includes(normalized)) return true;
      if(["NO","FALSE","0","OFF","INACTIVO"].includes(normalized)) return false;

      return Boolean(value);
    }

    const spanishValue = parseEnabled(config[keySpanish]);
    if(spanishValue !== null) return spanishValue;

    const englishValue = parseEnabled(config[keyEnglish]);
    if(englishValue !== null) return englishValue;

    return true;
  }

  function toggleLoadMore(visible,total){
    const btn = loadMoreBtn();
    if(!btn) return;
    btn.style.display = visible < total ? "inline-flex" : "none";
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  let detailImages = [];
  let detailImageIndex = 0;
  let detailProduct = null;
  let detailSelectedOption1 = "";
  let detailSelectedOption2 = "";
  let detailQty = 1;

  function openDetailModal(code){
    const product = APP.productsByCode[code];
    if(!product) return;

    detailProduct = product;
    detailSelectedOption1 = "";
    detailSelectedOption2 = "";
    detailQty = 1;

    detailImages = [
      product.image,
      product.image2,
      product.image3,
      product.image4,
      product.image5
    ].filter(img => img && String(img).trim() !== "");

    if(detailImages.length === 0){
      detailImages = [CONFIG.PLACEHOLDER_IMAGE];
    }

    detailImageIndex = 0;
    renderDetailImage();

    setDetailText("detailName", product.name || "");
    setDetailText("detailCode", product.code ? `Código: ${product.code}` : "");
    setDetailText("detailBrand", product.brand ? `Marca: ${product.brand}` : "");
    const detailMetaRow = document.querySelector(".detail-meta-row");
    if(detailMetaRow){
      detailMetaRow.classList.toggle("has-both", Boolean(product.code && product.brand));
    }

    const finalPrice = getDetailFinalPrice(product);
    const oldPrice = document.getElementById("detailOldPrice");
    if(oldPrice){
  const showOldPrice =
    Number(product.price) > 0 &&
    Number(product.discount) > 0;

  oldPrice.textContent = showOldPrice
    ? formatMoney(product.price)
    : "";

  oldPrice.style.display = showOldPrice
    ? "block"
    : "none";
}
    const detailPriceEl = document.getElementById("detailPrice");
    if(detailPriceEl) detailPriceEl.classList.toggle("is-no-price", !(Number(product.price) > 0));
    setDetailText(
  "detailPrice",
  Number(product.price) > 0
    ? formatMoney(finalPrice)
    : "Consultar\nprecio"
);

    const descriptionSection = document.getElementById("detailDescriptionSection");
    const description = String(product.description || "").trim();
    if(descriptionSection){
      descriptionSection.style.display = description ? "block" : "none";
    }
    setDetailText("detailDescription", description);

    const videoBtn = document.getElementById("detailVideoBtn");
    if(videoBtn){
      const video = String(product.video || "").trim();
      videoBtn.style.display = video ? "inline-flex" : "none";
      videoBtn.dataset.video = video;
    }

    const stockEl = document.getElementById("detailStock");
    if(stockEl){
      const canShowModalStock = showConfig("MOSTRAR_STOCK_MODAL", "SHOW_STOCK_MODAL");
      const variantStock = product.hasVariants && Array.isArray(product.variants)
        ? product.variants.reduce((total, variant) => {
            if(variant?.stock === null || variant?.unlimitedStock === true) return total;
            const value = Number(variant?.stock || 0);
            return total + (Number.isFinite(value) && value > 0 ? value : 0);
          }, 0)
        : 0;
      const stockValue = product.hasVariants && variantStock > 0
        ? variantStock
        : Number(product.stock || 0);

      stockEl.textContent = canShowModalStock && stockValue > 0
        ? `Stock disponible: ${stockValue}`
        : "";
      stockEl.style.display = stockEl.textContent ? "block" : "none";
    }

    renderDetailWholesale();
    renderDetailVariants();
    updateDetailQty();

    const whatsappBtn = document.getElementById("detailWhatsappBtn");
    if(whatsappBtn){
      whatsappBtn.dataset.code = product.code;
      /* La visibilidad del botón y el layout del grid de acciones
         (.detail-action-grid) se controlan de forma centralizada en
         aplicarVisibilidadAccionesDetalle() en app.js, junto con el
         botón "Seguir viendo". No se tocan aquí para evitar que dos
         funciones distintas se pisen el mismo estilo. */
    }
    updateDetailActionData();

    const detailModal = document.getElementById("detailModal");

    if(!detailModal?.classList.contains("show") && !history.state?.[DETAIL_HISTORY_KEY]){
      history.pushState({
        ...(history.state || {}),
        [DETAIL_HISTORY_KEY]: true,
        productCode: product.code
      }, "", window.location.href);
    }

    detailModal?.classList.add("show");
    detailModal?.setAttribute("aria-hidden", "false");
    document.getElementById("overlay")?.classList.add("show");
    document.body.classList.add("modal-open");

    /* Recalcula el centrado del botón único (Agregar al carrito) bajo
       el control de cantidad ahora que el modal ya es medible en pantalla. */
    requestAnimationFrame(() => {
      if(typeof window.SAGC_actualizarAccionesDetalle === "function"){
        window.SAGC_actualizarAccionesDetalle();
      }
    });
     /* Abrir siempre desde arriba */
const detailContent = detailModal?.querySelector(".detail-modal-content");

if (detailContent) {
    detailContent.scrollTop = 0;

    requestAnimationFrame(() => {
        detailContent.scrollTop = 0;
    });
  }
}
  function renderDetailImage(){
    const img = document.getElementById("detailImage");
    const prev = document.getElementById("detailPrevImg");
    const next = document.getElementById("detailNextImg");
    const thumbs = document.getElementById("detailThumbs");

    if(img){
      img.src = detailImages[detailImageIndex] || CONFIG.PLACEHOLDER_IMAGE;
      img.alt = detailProduct?.name || "Producto";
    }

    const showControls = detailImages.length > 1;
    if(prev) prev.style.display = showControls ? "flex" : "none";
    if(next) next.style.display = showControls ? "flex" : "none";

    if(thumbs){
      thumbs.style.display = showControls ? "flex" : "none";
      thumbs.innerHTML = detailImages.map((image, index) => `
        <button type="button" class="detail-thumb ${index === detailImageIndex ? "active" : ""}" data-index="${index}" aria-label="Ver imagen ${index + 1}">
          <img src="${escapeAttr(image)}" alt="Miniatura ${index + 1}" loading="lazy">
        </button>
      `).join("");
    }
  }

  function renderDetailWholesale(){
    const box = document.getElementById("detailWholesale");
    if(!box || !detailProduct) return;

    const rules = detailProduct.wholesaleRules || [];
    if(rules.length === 0){
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    box.style.display = "block";
    box.innerHTML = `
      <div class="detail-wholesale-title">
        <span class="wholesale-icon" aria-hidden="true">🏷️</span>
        <strong>PRECIO POR MAYOR</strong>
      </div>
      <div class="detail-wholesale-grid">
        ${rules.map(rule => `
          <div class="detail-wholesale-tier">
            <span>Desde ${rule.from}</span>
            <strong>${formatMoney(rule.price)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function variantThumbnailsEnabled(){
    const raw = APP.config?.MOSTRAR_MINIATURAS_VARIANTES;
    if(raw === undefined || raw === null || raw === "") return Boolean(CLIENTE?.MOSTRAR_MINIATURAS_VARIANTES);
    if(typeof raw === "boolean") return raw;
    return ["SI","SÍ","TRUE","1","ON","ACTIVO"].includes(String(raw).trim().toUpperCase());
  }

  function detailOption1Style(){
    const value = APP.config?.ESTILO_OPCION1
      ?? APP.config?.TIPO_OPCION1
      ?? CLIENTE?.ESTILO_OPCION1
      ?? CLIENTE?.TIPO_OPCION1
      ?? "CIRCULO";

    const normalized = String(value).trim().toUpperCase();
    return ["BOTON", "CIRCULO", "IMAGEN"].includes(normalized) ? normalized : "CIRCULO";
  }

  function renderDetailVariants(){
    const section = document.getElementById("detailVariants");
    const option1Box = document.getElementById("detailOption1Box");
    const option2Box = document.getElementById("detailOption2Box");
    const option1Title = document.getElementById("detailOption1Title");
    const option2Title = document.getElementById("detailOption2Title");
    if(!section || !option1Box || !option2Box || !detailProduct) return;

    if(!detailProduct.hasVariants || !Array.isArray(detailProduct.variants) || detailProduct.variants.length === 0){
      section.style.display = "none";
      const detailThumbs = document.getElementById("detailThumbs");
      const prevBtn = document.getElementById("detailPrevImg");
      const nextBtn = document.getElementById("detailNextImg");
      if(detailThumbs) detailThumbs.style.display = detailImages.length > 1 ? "flex" : "none";
      if(prevBtn) prevBtn.style.display = detailImages.length > 1 ? "grid" : "none";
      if(nextBtn) nextBtn.style.display = detailImages.length > 1 ? "grid" : "none";
      return;
    }

    section.style.display = "block";
    const variants = detailProduct.variants;
    const option1Values = uniqueValues(variants.map(v => v.color));
    const option2Values = uniqueValues(variants
      .filter(v => !detailSelectedOption1 || sameValue(v.color, detailSelectedOption1))
      .map(v => v.size));

    if(!detailSelectedOption1 && option1Values.length === 1){
      detailSelectedOption1 = option1Values[0];
    }
    if(!detailSelectedOption2 && option2Values.length === 1){
      detailSelectedOption2 = option2Values[0];
    }

    const option1Label = APP.config?.ETIQUETA_OPCION1 || "Color";
    const option2Label = APP.config?.ETIQUETA_OPCION2 || "Talla";
    if(option1Title) option1Title.textContent = option1Label;
    if(option2Title) option2Title.textContent = option2Label;

    option1Box.parentElement.style.display = option1Values.length ? "block" : "none";
    option2Box.parentElement.style.display = option2Values.length ? "block" : "none";

    const option1ImageMap = new Map();
    variants.forEach(variant => {
      if(variant.image && variant.color && !option1ImageMap.has(String(variant.color).toLowerCase())){
        option1ImageMap.set(String(variant.color).toLowerCase(), variant.image);
      }
    });
    const option1Style = detailOption1Style();
    const useVariantImages = option1Style !== "BOTON"
      && variantThumbnailsEnabled()
      && option1ImageMap.size > 0;
    section.classList.toggle("has-variant-images", useVariantImages);
    section.classList.toggle("option1-as-buttons", option1Style === "BOTON");

    option1Box.innerHTML = option1Values.map(value => {
      const variantImage = option1ImageMap.get(String(value).toLowerCase()) || "";

      /* BOTON siempre tiene prioridad: muestra el texto completo aunque exista miniatura. */
      if(option1Style === "BOTON"){
        return `
          <button type="button" class="detail-variant-btn detail-option1 detail-option1-text-btn ${sameValue(value, detailSelectedOption1) ? "active" : ""}" data-value="${escapeAttr(value)}" data-image="${escapeAttr(variantImage)}" aria-label="${escapeAttr(value)}" title="${escapeAttr(value)}">
            ${escapeHtml(value)}
          </button>`;
      }

      if(useVariantImages && variantImage){
        return `
          <button type="button" class="detail-variant-btn detail-option1 detail-variant-image-btn ${sameValue(value, detailSelectedOption1) ? "active" : ""}" data-value="${escapeAttr(value)}" data-image="${escapeAttr(variantImage)}" data-label="${escapeAttr(value)}" aria-label="${escapeAttr(value)}" title="${escapeAttr(value)}">
            <img src="${escapeAttr(variantImage)}" alt="" loading="lazy" decoding="async">
          </button>`;
      }

      const isColorOption = /^colou?r$/i.test(String(option1Label).trim()) || /^color$/i.test(String(option1Label).trim());
      return `
        <button type="button" class="detail-variant-btn detail-color-btn detail-option1 ${isColorOption ? "is-color-only" : "is-text-option"} ${sameValue(value, detailSelectedOption1) ? "active" : ""}" data-value="${escapeAttr(value)}" data-image="${escapeAttr(variantImage)}" aria-label="${escapeAttr(value)}" title="${escapeAttr(value)}">
          <span class="detail-color-dot" style="--detail-color:${escapeAttr(resolveDetailColor(value))}" aria-hidden="true"></span>
          ${isColorOption ? "" : `<span>${escapeHtml(value)}</span>`}
        </button>`;
    }).join("");

    const detailThumbs = document.getElementById("detailThumbs");
    const prevBtn = document.getElementById("detailPrevImg");
    const nextBtn = document.getElementById("detailNextImg");
    if(useVariantImages){
      /* En móvil responsive.css fuerza display:flex!important.
         Por eso ocultamos con prioridad important cuando existen miniaturas de variantes. */
      if(detailThumbs) detailThumbs.style.setProperty("display", "none", "important");
      if(prevBtn) prevBtn.style.setProperty("display", "none", "important");
      if(nextBtn) nextBtn.style.setProperty("display", "none", "important");
    }else{
      if(detailThumbs) detailThumbs.style.setProperty("display", detailImages.length > 1 ? "flex" : "none", "important");
      if(prevBtn) prevBtn.style.setProperty("display", detailImages.length > 1 ? "grid" : "none", "important");
      if(nextBtn) nextBtn.style.setProperty("display", detailImages.length > 1 ? "grid" : "none", "important");
    }

    option2Box.innerHTML = option2Values.map(value => {
      const variant = variants.find(v =>
        (!detailSelectedOption1 || sameValue(v.color, detailSelectedOption1)) &&
        sameValue(v.size, value)
      );
      const disabled = variant && variant.stock !== null && Number(variant.stock) <= 0;
      return `
        <button type="button" class="detail-variant-btn detail-option2 ${sameValue(value, detailSelectedOption2) ? "active" : ""}" data-value="${escapeAttr(value)}" ${disabled ? "disabled" : ""}>
          ${escapeHtml(value)}
        </button>
      `;
    }).join("");

    updateDetailVariantMessage();
    updateDetailActionData();
  }

  function updateDetailVariantMessage(){
    const message = document.getElementById("detailVariantMessage");
    if(!message || !detailProduct?.hasVariants) return;

    const option1Values = uniqueValues(detailProduct.variants.map(v => v.color));
    const option2Values = uniqueValues(detailProduct.variants.map(v => v.size));
    const missing1 = option1Values.length > 0 && !detailSelectedOption1;
    const missing2 = option2Values.length > 0 && !detailSelectedOption2;

    if(missing1 || missing2){
      message.style.display = "block";
      message.textContent = "Selecciona las opciones del producto.";
      message.className = "detail-variant-message";
      return;
    }

    const variant = getSelectedDetailVariant();
    if(!variant){
      message.textContent = "Esta combinación no está disponible.";
      message.className = "detail-variant-message error";
      return;
    }

    if(variant.stock !== null && Number(variant.stock) <= 0){
      message.textContent = "Esta opción no tiene stock.";
      message.className = "detail-variant-message error";
      return;
    }

    if(!showConfig("MOSTRAR_STOCK_MODAL", "SHOW_STOCK_MODAL")){
      message.textContent = "";
      message.className = "detail-variant-message";
      message.style.display = "none";
      return;
    }

    message.style.display = "block";
    message.textContent = variant.stock === null ? "Opción disponible." : `Stock disponible: ${variant.stock}`;
    message.className = "detail-variant-message success";
  }

  function getDetailMissingVariantMessage(){
    if(!detailProduct?.hasVariants) return "";

    const variants = Array.isArray(detailProduct.variants) ? detailProduct.variants : [];
    const option1Values = uniqueValues(variants.map(v => v.color));
    const option2Values = uniqueValues(variants.map(v => v.size));
    const missing1 = option1Values.length > 0 && !detailSelectedOption1;
    const missing2 = option2Values.length > 0 && !detailSelectedOption2;
    const option1Label = String(APP.config?.ETIQUETA_OPCION1 || "color").toLowerCase();
    const option2Label = String(APP.config?.ETIQUETA_OPCION2 || "talla").toLowerCase();

    if(missing1 && missing2) return `Selecciona ${option1Label} y ${option2Label}.`;
    if(missing1) return `Selecciona ${option1Label}.`;
    if(missing2) return `Selecciona ${option2Label}.`;
    return "";
  }

  function getSelectedDetailVariant(){
    if(!detailProduct?.hasVariants) return null;
    if(getDetailMissingVariantMessage()) return null;

    return (detailProduct.variants || []).find(v =>
      sameValue(v.color, detailSelectedOption1) &&
      sameValue(v.size, detailSelectedOption2)
    ) || null;
  }

  function changeDetailQty(amount){
    detailQty = Math.max(1, Number(detailQty || 1) + Number(amount || 0));
    updateDetailQty();
  }

  function updateDetailQty(){
    const input = document.getElementById("detailQty");
    if(input) input.value = detailQty;
    updateDetailActionData();
  }

  function updateDetailActionData(){
    const button = document.getElementById("detailWhatsappBtn");
    const addButton = document.getElementById("detailAddCartBtn");
    if(!button || !detailProduct) return;

    const soldOut = isProductSoldOut(detailProduct);
    button.disabled = soldOut;
    button.setAttribute("aria-disabled", soldOut ? "true" : "false");
    if(addButton){
      addButton.disabled = soldOut;
      addButton.setAttribute("aria-disabled", soldOut ? "true" : "false");
      addButton.textContent = soldOut ? "Agotado" : "Agregar al carrito";
    }

    button.dataset.code = detailProduct.code || "";
    button.dataset.qty = String(Math.max(0, Number(detailQty || 0)));
    button.dataset.option1 = detailSelectedOption1 || "";
    button.dataset.option2 = detailSelectedOption2 || "";

    const variant = getSelectedDetailVariant();
    button.dataset.variantPrice = variant && Number(variant.price || 0) > 0
      ? String(variant.price)
      : "";
  }

  function resolveDetailColor(value){
    const name = String(value || "").trim();
    const normalized = name.toLowerCase();

    const configured = APP.colors?.[name] || APP.colors?.[normalized];
    if(configured){
      if(typeof configured === "string") return configured;
      if(configured.hex) return configured.hex;
      if(configured.color) return configured.color;
      if(configured.value) return configured.value;
    }

    const commonColors = {
      "negro":"#111111",
      "blanco":"#ffffff",
      "rojo":"#ef4444",
      "azul":"#2563eb",
      "celeste":"#38bdf8",
      "celeste claro":"#7dd3fc",
      "verde":"#22c55e",
      "amarillo":"#facc15",
      "naranja":"#f97316",
      "morado":"#9333ea",
      "violeta":"#8b5cf6",
      "rosado":"#f472b6",
      "rosa":"#f472b6",
      "fucsia":"#d946ef",
      "gris":"#9ca3af",
      "plateado":"#cbd5e1",
      "dorado":"#d4af37",
      "beige":"#d6c7a1",
      "marrón":"#92400e",
      "marron":"#92400e"
    };

    return commonColors[normalized] || "#e5e7eb";
  }

  function syncDetailQtyToCart(showNotice = false){
    if(!detailProduct || typeof CartService === "undefined") return;

    const qty = Math.max(0, Number(detailQty || 0));

    if(detailProduct.hasVariants){
      const variant = getSelectedDetailVariant();

      if(!variant){
        if(qty > 0){
          UIService?.showError?.("Selecciona las opciones del producto.");
          detailQty = 0;
          updateDetailQty();
        }
        return;
      }

      if(variant.stock !== null && Number(variant.stock) <= 0){
        UIService?.showError?.("Esta opción no tiene stock.");
        detailQty = 0;
        updateDetailQty();
        return;
      }

      CartService.setVariantQty?.({
        product:detailProduct,
        color:variant.color || "",
        size:variant.size || "",
        qty
      });
      if(showNotice){
        UIService?.showSuccess?.(CartService?.getUpdateMessage?.(detailProduct) || "Carrito actualizado");
      }
      return;
    }

    CartService.setProductQty(detailProduct, qty);

    if(showNotice){
      UIService?.showSuccess?.(CartService?.getUpdateMessage?.(detailProduct) || "Carrito actualizado");
    }
  }

  function addDetailProductToCart(){
    if(isProductSoldOut(detailProduct)){
      UIService?.showError?.("Este producto está agotado.");
      return;
    }
    if(!detailProduct) return;

    const amount = Math.max(1, Number(detailQty || 1));

    if(detailProduct.hasVariants){
      const missingMessage = getDetailMissingVariantMessage();
      if(missingMessage){
        UIService?.showError?.(missingMessage);
        return;
      }

      const variant = getSelectedDetailVariant();
      if(!variant){
        UIService?.showError?.("Selecciona una variante disponible.");
        return;
      }
      if(variant.stock !== null && Number(variant.stock) <= 0){
        UIService?.showError?.("Esta opción no tiene stock.");
        return;
      }

      const currentItem = APP.cart.find(item =>
        item.code === detailProduct.code &&
        String(item.color || "") === String(variant.color || "") &&
        String(item.size || "") === String(variant.size || "")
      );
      const currentQty = Number(currentItem?.qty || 0);

      CartService.setVariantQty?.({
        product:detailProduct,
        color:variant.color || "",
        size:variant.size || "",
        qty:currentQty + amount
      });
    }else{
      const current = CartService.getProductQty(detailProduct.code);
      CartService.setProductQty(detailProduct, current + amount);
    }

    UIService?.showSuccess?.(CartService?.getUpdateMessage?.(detailProduct) || "Carrito actualizado");
  }

  function openProductFromUrl(){
    const params = new URLSearchParams(window.location.search);
    const code = String(params.get("producto") || "").trim();
    if(!code) return;

    const product = APP.productsByCode?.[code] || APP.productsByCode?.[code.toUpperCase()];
    if(!product) return;

    window.setTimeout(() => openDetailModal(product.code), 120);
  }

  function closeDetailModal(){
    if(!closingDetailFromHistory && history.state?.[DETAIL_HISTORY_KEY]){
      history.back();
      return;
    }

    hideDetailModal();
  }

  function hideDetailModal(){
    const detailModal = document.getElementById("detailModal");
    detailModal?.classList.remove("show");
    detailModal?.setAttribute("aria-hidden", "true");
    document.getElementById("overlay")?.classList.remove("show");
    document.body.classList.remove("modal-open");
  }

  function getDetailFinalPrice(product){
    const price = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);
    return discount > 0 ? price - (price * discount / 100) : price;
  }

  function setDetailText(id, value){
    const element = document.getElementById(id);
    if(element) element.textContent = value || "";
  }

  function uniqueValues(values){
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
  }

  function sameValue(a, b){
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  }

  function escapeAttr(value){
    return String(value || "").replace(/"/g, "&quot;");
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

 return {
  init,
  applyFilters,
  renderProducts,
  formatMoney,
  openProductDetail: openDetailModal
};

})();
