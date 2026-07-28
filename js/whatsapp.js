'use strict';

/* =========================================================
   WHATSAPP.JS
   Consulta rápida de un producto.
   Usa Cloudflare para mostrar foto, nombre y precio.
   No reemplaza el WhatsApp del carrito.
========================================================= */

const WhatsAppService = (() => {

  const WORKER_URL =
    "https://rd.rdjaamimportexpress.workers.dev/";

  function init(){
    document.addEventListener("click", e => {
      const button = e.target.closest(".btn-whatsapp-product");
      if(!button) return;

      e.preventDefault();
      e.stopPropagation();

      const code = String(button.dataset.code || "").trim();
      const product = APP.productsByCode?.[code];

      if(!product){
        UIService?.showError?.("No se encontró el producto.");
        return;
      }

      openProductWhatsapp(product, button.dataset);
    });
  }

  function openProductWhatsapp(product, buttonData = {}){
    const number = getWhatsappNumber();

    if(!number){
      UIService?.showError?.("No se configuró el número de WhatsApp.");
      return;
    }

    const catalogId = getCatalogId();

    if(!catalogId){
      UIService?.showError?.("No se pudo identificar el catálogo.");
      return;
    }

    const price = getFinalPrice(product, buttonData.variantPrice);
    const shareUrl = buildShareUrl(catalogId, product.code);
    const qty = Math.max(1, Number(buttonData.qty || 1));
    const option1 = String(buttonData.option1 || "").trim();
    const option2 = String(buttonData.option2 || "").trim();
    const option1Label = String(APP.config?.ETIQUETA_OPCION1 || "Color").trim();
    const option2Label = String(APP.config?.ETIQUETA_OPCION2 || "Talla").trim();

    const message = [
      "Hola, deseo consultar por este producto:",
      "",
      `Producto: ${product.name || ""}`,
      product.code ? `Código: ${product.code}` : "",
      option1 ? `${option1Label}: ${option1}` : "",
      option2 ? `${option2Label}: ${option2}` : "",
      `Cantidad: ${qty}`,
      `Precio: ${formatMoney(price)}`,
      "",
      "Ver producto:",
      shareUrl
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function getCatalogId(){
  const configured = String(
    CONFIG.CATALOGO_ID ||
    APP.config?.CATALOGO_ID ||
    ""
  )
    .trim()
    .toLowerCase();

  if(configured){
    return configured;
  }

  const pathParts = window.location.pathname
    .split("/")
    .filter(Boolean);

  const repositoryName = pathParts[0] || "";

  return repositoryName
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

  function getWhatsappNumber(){
    const value = String(
      APP.config?.WHATSAPP ||
      APP.config?.WHATSAPP_NUMERO ||
      CONFIG.WHATSAPP ||
      ""
    ).replace(/\D/g, "");

    if(!value) return "";

    return value.startsWith("51") ? value : `51${value}`;
  }

  function getFinalPrice(product, variantPrice){
    const variant = Number(variantPrice || 0);
    if(variant > 0) return variant;

    const price = Number(product.price || 0);
    const discount = Number(product.discount || 0);

    if(discount <= 0) return price;

    return price - (price * discount / 100);
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  function buildShareUrl(catalogId, code){
    const url = new URL(WORKER_URL);
    url.searchParams.set("catalogo", catalogId);
    url.searchParams.set("producto", code);
    return url.toString();
  }

  return {
    init
  };

})();
