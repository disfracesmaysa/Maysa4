'use strict';

/* =========================================================
   CART.JS FINAL CORREGIDO
   - Maneja carrito
   - Permite + / -
   - Permite escribir cantidad
   - Aplica descuento
   - Recalcula precio por mayor
   - Envía WhatsApp con precios correctos
   STOCK:
   - stock = null  => ilimitado
   - stock = 0     => sin stock, no vende
   - stock = 10    => máximo 10 unidades
========================================================= */

const CartService = (() => {

  function init(){
    render();
    registerEvents();
  }

  function registerEvents(){
    document.addEventListener("click", e => {

      if(e.target.closest("#openCartBtn")){
        openCart();
      }

      if(e.target.closest("#closeCartBtn") || e.target.closest("#continueShoppingBtn")){
        closeCart();
      }

      if(e.target.closest("#overlay")){
        closeCart();

        if(typeof VariantService !== "undefined"){
          VariantService.close();
        }
      }

      const plusCard = e.target.closest(".card-plus");
      if(plusCard){
        const product = APP.productsByCode[plusCard.dataset.code];
        if(product) addDirectProduct(product, 1);
      }

      const minusCard = e.target.closest(".card-minus");
      if(minusCard){
        const product = APP.productsByCode[minusCard.dataset.code];
        if(product) addDirectProduct(product, -1);
      }

      const plusCart = e.target.closest(".cart-plus");
      if(plusCart){
        changeQty(plusCart.dataset.key, 1);
      }

      const minusCart = e.target.closest(".cart-minus");
      if(minusCart){
        changeQty(minusCart.dataset.key, -1);
      }

      const remove = e.target.closest(".cart-remove");
      if(remove){
        removeItem(remove.dataset.key);
      }

      if(e.target.closest("#sendWhatsappBtn")){
        sendWhatsapp();
      }

      if(e.target.closest("#removePaymentProof")){
        clearPaymentProof();
      }

      if(e.target.closest("#openYapeBtn")){
        window.setTimeout(() => {
          if(document.visibilityState === "visible"){
            window.open("https://www.yape.com.pe/", "_blank", "noopener,noreferrer");
          }
        }, 1200);
      }
    });

    document.addEventListener("change", e => {
      if(e.target?.id === "requestFitting"){
        toggleFittingFields();
        return;
      }

      if(["pickupDate", "pickupTime"].includes(e.target?.id)){
        setDefaultReturnDate(true);
        validateRentalDuration();
        return;
      }

      if(["returnDate", "returnTime"].includes(e.target?.id)){
        validateRentalDuration();
        return;
      }

      if(e.target?.id === "paymentProof"){
        previewPaymentProof(e.target.files?.[0]);
        return;
      }

      const cartInput = e.target.closest(".cart-qty-input");
      if(!cartInput) return;

      setCartItemQty(cartInput.dataset.key, Number(cartInput.value || 0));
    });

    document.addEventListener("input", e => {
      const cartInput = e.target.closest(".cart-qty-input");
      if(!cartInput) return;

      cartInput.value = cartInput.value.replace(/[^\d]/g, "");
    });
  }

  function makeKey(code, color = "", size = ""){
    return `${code}__${color || "SIN_COLOR"}__${size || "SIN_TALLA"}`;
  }

  function getDiscountPrice(product){
    const price = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);

    if(discount <= 0) return price;

    return price - (price * discount / 100);
  }

  function getProductStock(product){
    if(!product) return null;

    if(product.stock === null || product.unlimitedStock === true){
      return null;
    }

    const n = Number(product.stock || 0);
    return isNaN(n) ? null : Math.max(0, n);
  }

  function getItemStock(item){
    const product = APP.productsByCode?.[item.code];

    if(product?.hasVariants && Array.isArray(product.variants)){
      const variant = product.variants.find(v =>
        String(v.color || "") === String(item.color || "") &&
        String(v.size || "") === String(item.size || "")
      );

      if(variant){
        if(variant.stock === null || variant.unlimitedStock === true){
          return null;
        }

        const n = Number(variant.stock || 0);
        return isNaN(n) ? null : Math.max(0, n);
      }
    }

    return getProductStock(product);
  }

  function getQtyByCode(code){
    return APP.cart
      .filter(item => item.code === code)
      .reduce((sum,item) => sum + Number(item.qty || 0), 0);
  }

  function getQtyByKey(key){
    const item = APP.cart.find(i => i.key === key);
    return Number(item?.qty || 0);
  }

  function notify(message){
    if(typeof UIService !== "undefined" && UIService.showSuccess){
      UIService.showSuccess(message);
    }else{
      alert(message);
    }
  }

  function animateFloatingCart(){
    const button = document.getElementById("openCartBtn");
    if(!button) return;
    button.classList.remove("cart-added");
    void button.offsetWidth;
    button.classList.add("cart-added");
    window.setTimeout(() => button.classList.remove("cart-added"), 650);
  }

  function notifyError(message){
    if(typeof UIService !== "undefined" && UIService.showError){
      UIService.showError(message);
    }else{
      alert(message);
    }
  }

  function normalizeHighlighted(value){
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim().replace(/\s+/g, "_").toUpperCase();
  }

  function getProductMode(product){
    return normalizeHighlighted(product?.destacado) === "VENTA" ? "venta" : "alquiler";
  }

  function getUpdateMessage(product){
    return getProductMode(product) === "venta" ? "Carrito actualizado" : "Reserva actualizada";
  }

  function getCartMode(){
    const hasRental = APP.cart.some(item => String(item.mode || "alquiler") === "alquiler");
    const hasSale = APP.cart.some(item => String(item.mode || "") === "venta");
    if(hasRental && hasSale) return "mixto";
    if(hasRental) return "alquiler";
    return "venta";
  }

  function clampQtyByStock(item, requestedQty){
    requestedQty = Number(requestedQty || 0);

    if(requestedQty <= 0){
      return 0;
    }

    const stock = getItemStock(item);

    if(stock === null){
      return requestedQty;
    }

    if(stock <= 0){
      return 0;
    }

    return Math.min(requestedQty, stock);
  }

  function addDirectProduct(product, amount){
    if(product.hasVariants) return;

    const stock = getProductStock(product);
    const currentQty = getQtyByCode(product.code);

    if(amount > 0 && stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      updateCardQtyDisplay(product.code);
      return;
    }

    if(amount > 0 && stock !== null && currentQty >= stock){
      notifyError(`Solo hay ${stock} unidades disponibles.`);
      updateCardQtyDisplay(product.code);
      return;
    }

    const key = makeKey(product.code);
    let item = APP.cart.find(i => i.key === key);

    if(!item && amount > 0){
      item = createCartItem({
        product,
        color:"",
        size:"",
        qty:0
      });

      APP.cart.push(item);
    }

    if(item){
      const newQty = clampQtyByStock(item, Number(item.qty || 0) + amount);

      if(newQty <= 0){
        APP.cart = APP.cart.filter(i => i.key !== key);
      }else{
        item.qty = newQty;
      }
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);

    if(amount > 0){
      notify(getUpdateMessage(product));
      animateFloatingCart();
    }
  }

  function addItem({product, color, size, qty}){
    if(!product) return;

    const amount = Number(qty || 0);
    if(amount <= 0) return;

    const key = makeKey(product.code, color, size);
    let item = APP.cart.find(i => i.key === key);

    if(!item){
      item = createCartItem({
        product,
        color,
        size,
        qty:0
      });
    }

    const stock = getItemStock(item);

    if(stock !== null && stock <= 0){
      notifyError("Esta opción no tiene stock disponible.");
      updateCardQtyDisplay(product.code);
      return;
    }

    const newQty = clampQtyByStock(item, Number(item.qty || 0) + amount);

    if(stock !== null && newQty < Number(item.qty || 0) + amount){
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    if(newQty <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
    }else{
      item.qty = newQty;

      if(!APP.cart.some(i => i.key === key)){
        APP.cart.push(item);
      }
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);

    if(newQty > 0){
      notify("Producto agregado al carrito");
      animateFloatingCart();
      openCart();
    }
  }

  function setVariantQty({product, color = "", size = "", qty = 0}){
    if(!product) return;

    qty = Math.max(0, Number(qty || 0));
    const key = makeKey(product.code, color, size);
    let item = APP.cart.find(i => i.key === key);

    if(qty <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      recalculateProductPrices(product.code);
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(!item){
      item = createCartItem({
        product,
        color,
        size,
        qty:0
      });
      APP.cart.push(item);
    }

    const stock = getItemStock(item);

    if(stock !== null && stock <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      notifyError("Esta opción no tiene stock disponible.");
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(stock !== null && qty > stock){
      qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    item.qty = qty;
    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);
  }

  function getVariantImage(product, color = "", size = ""){
    if(!product?.hasVariants || !Array.isArray(product.variants)) return product?.image || "";
    const exact = product.variants.find(v =>
      String(v.color || "") === String(color || "") &&
      String(v.size || "") === String(size || "") &&
      String(v.image || "").trim()
    );
    if(exact?.image) return exact.image;
    const sameOption1 = product.variants.find(v =>
      String(v.color || "") === String(color || "") && String(v.image || "").trim()
    );
    return sameOption1?.image || product.image || "";
  }

  function createCartItem({product, color = "", size = "", qty = 0}){
    const finalPrice = getDiscountPrice(product);
    const key = makeKey(product.code, color, size);

    return {
      key,
      code:product.code,
      name:product.name,
      image:getVariantImage(product, color, size),
      color,
      size,
      qty:Number(qty || 0),
      mode:getProductMode(product),

      price:finalPrice,
      originalPrice:Number(product.price || 0),
      discount:Number(product.discount || 0),

      stock:getProductStock(product),
      unlimitedStock:product.stock === null || product.unlimitedStock === true,

      wholesaleRules:product.wholesaleRules || [],
      wholesalePrice:product.wholesalePrice || 0,
      wholesaleMin:product.wholesaleMin || 0,

      unitPrice:finalPrice,
      subtotal:0
    };
  }

  function changeQty(key, amount){
    const item = APP.cart.find(i => i.key === key);
    if(!item) return;

    const requestedQty = Number(item.qty || 0) + Number(amount || 0);

    if(requestedQty <= 0){
      removeItem(key);
      return;
    }

    const stock = getItemStock(item);

    if(amount > 0 && stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      item.qty = 0;
      removeItem(key);
      return;
    }

    if(amount > 0 && stock !== null && requestedQty > stock){
      item.qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }else{
      item.qty = requestedQty;
    }

    recalculateProductPrices(item.code);
    saveAndRender();
    updateCardQtyDisplay(item.code);
  }

  function setProductQty(product, qty){
    if(!product) return;

    qty = Number(qty || 0);
    const key = makeKey(product.code);
    let item = APP.cart.find(i => i.key === key);

    if(qty <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(!item){
      item = createCartItem({
        product,
        color:"",
        size:"",
        qty:0
      });
    }

    const stock = getProductStock(product);

    if(stock !== null && stock <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      notifyError("Este producto no tiene stock disponible.");
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(stock !== null && qty > stock){
      qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    item.qty = qty;

    if(!APP.cart.some(i => i.key === key)){
      APP.cart.push(item);
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);
  }

  function setCartItemQty(key, qty){
    const item = APP.cart.find(i => i.key === key);
    if(!item) return;

    qty = Number(qty || 0);

    if(qty <= 0){
      removeItem(key);
      return;
    }

    const stock = getItemStock(item);

    if(stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      removeItem(key);
      return;
    }

    if(stock !== null && qty > stock){
      qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    item.qty = qty;

    recalculateProductPrices(item.code);
    saveAndRender();
    updateCardQtyDisplay(item.code);
  }

  function removeItem(key){
    const item = APP.cart.find(i => i.key === key);

    APP.cart = APP.cart.filter(i => i.key !== key);

    if(item){
      recalculateProductPrices(item.code);
      updateCardQtyDisplay(item.code);
    }

    saveAndRender();
  }

  function recalculateProductPrices(code){
    const items = APP.cart.filter(item => item.code === code);
    const totalQty = items.reduce((sum,item) => sum + Number(item.qty || 0), 0);

    items.forEach(item => {
      refreshItemFromProduct(item);

      const stock = getItemStock(item);

      if(stock !== null && stock <= 0){
        item.qty = 0;
      }

      if(stock !== null && Number(item.qty || 0) > stock){
        item.qty = stock;
      }

      item.unitPrice = getUnitPriceByQty(item, totalQty);
      item.isWholesale = isUsingWholesalePrice(item, totalQty);
      item.subtotal = item.unitPrice * Number(item.qty || 0);
    });

    APP.cart = APP.cart.filter(item => Number(item.qty || 0) > 0);
  }

  function refreshItemFromProduct(item){
    const product = APP.productsByCode?.[item.code];

    if(!product) return item;

    item.name = product.name || item.name;
    item.image = getVariantImage(product, item.color, item.size) || product.image || item.image;

    item.price = getDiscountPrice(product);
    item.originalPrice = Number(product.price || 0);
    item.discount = Number(product.discount || 0);
    item.mode = getProductMode(product);

    item.stock = getItemStock(item);
    item.unlimitedStock = item.stock === null;

    item.wholesaleRules = Array.isArray(product.wholesaleRules)
      ? product.wholesaleRules
      : [];

    item.wholesalePrice = product.wholesalePrice || item.wholesalePrice || 0;
    item.wholesaleMin = product.wholesaleMin || item.wholesaleMin || 0;

    return item;
  }

  function isUsingWholesalePrice(item, totalQty){
    refreshItemFromProduct(item);

    const rules = Array.isArray(item.wholesaleRules)
      ? [...item.wholesaleRules]
      : [];

    if(
      rules.length === 0 &&
      Number(item.wholesaleMin) > 0 &&
      Number(item.wholesalePrice) > 0
    ){
      rules.push({
        from:Number(item.wholesaleMin),
        price:Number(item.wholesalePrice)
      });
    }

    return rules
      .map(rule => ({
        from:Number(rule.from || 0),
        price:Number(rule.price || 0)
      }))
      .filter(rule => rule.from > 0 && rule.price > 0)
      .some(rule => Number(totalQty || 0) >= rule.from);
  }

  function getUnitPriceByQty(item, totalQty){
    refreshItemFromProduct(item);

    let price = Number(item.price || 0);

    const rules = Array.isArray(item.wholesaleRules)
      ? [...item.wholesaleRules]
      : [];

    if(
      rules.length === 0 &&
      Number(item.wholesaleMin) > 0 &&
      Number(item.wholesalePrice) > 0
    ){
      rules.push({
        from:Number(item.wholesaleMin),
        price:Number(item.wholesalePrice)
      });
    }

    rules
      .map(rule => ({
        from:Number(rule.from || 0),
        price:Number(rule.price || 0)
      }))
      .filter(rule => rule.from > 0 && rule.price > 0)
      .sort((a,b) => a.from - b.from)
      .forEach(rule => {
        if(Number(totalQty || 0) >= rule.from){
          price = rule.price;
        }
      });

    return price;
  }

  function recalculateAllPrices(){
    const codes = [...new Set(APP.cart.map(item => item.code))];

    codes.forEach(code => {
      recalculateProductPrices(code);
    });
  }

  function getProductQty(code){
    return APP.cart
      .filter(item => item.code === code)
      .reduce((sum,item) => sum + Number(item.qty || 0), 0);
  }

  function updateCardQtyDisplay(code){
    const el = document.getElementById(`qty-${code}`);
    if(!el) return;

    const qty = getProductQty(code);

    if(el.tagName === "INPUT"){
      el.value = qty > 0 ? qty : 0;
    }else{
      el.textContent = qty > 0 ? qty : 0;
    }
  }

  function saveAndRender(){
    recalculateAllPrices();
    StorageService.saveCart(APP.cart);
    render();
  }

  function render(){
    recalculateAllPrices();
    renderCount();
    renderItems();
    renderTotals();
    renderCartMode();
  }

  function renderCount(){
    const count = APP.cart.reduce((sum,item) => sum + Number(item.qty || 0), 0);

    const cartCount = document.getElementById("cartCount");
    const totalQty = document.getElementById("cartTotalQty");

    if(cartCount) cartCount.textContent = count;
    if(totalQty) totalQty.textContent = count;

    /* Permite que el carrito flotante sea visible sobre el modal
       únicamente cuando ya existe al menos un producto agregado. */
    document.body.classList.toggle("cart-has-items", count > 0);
  }

  function renderItems(){
    const box = document.getElementById("cartItems");
    if(!box) return;

    if(APP.cart.length === 0){
      box.innerHTML = `
        <div class="empty-cart">
          <p>Tu carrito está vacío.</p>
        </div>
      `;
      return;
    }

    box.innerHTML = APP.cart.map(item => {
      const hasDiscount =
        Number(item.discount || 0) > 0 &&
        Number(item.originalPrice || 0) > Number(item.price || 0) &&
        item.isWholesale !== true;

      const oldPrice = hasDiscount
        ? `<small class="cart-old-price">${formatMoney(item.originalPrice)}</small>`
        : "";

      const discountLine = hasDiscount
        ? `<small class="cart-discount-line">Descuento: -${item.discount}%</small>`
        : "";

      return `
        <div class="cart-item premium-cart-item">
          <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}">

          <div class="cart-item-info">
            <h4>${escapeHtml(item.name)}</h4>

            <span class="cart-item-type ${item.mode === "venta" ? "is-sale" : "is-rental"}">
              ${item.mode === "venta" ? "🏷️ Venta" : "📅 Alquiler"}
            </span>

            ${item.size || item.color ? `
              <small class="cart-variant-line">
                ${item.size ? `Talla: ${escapeHtml(item.size)}` : ""}
                ${item.size && item.color ? " &nbsp; |&nbsp; " : ""}
                ${item.color ? `Color: ${escapeHtml(item.color)}` : ""}
              </small>
            ` : ""}

            ${oldPrice}
            ${discountLine}

            <div class="cart-price-line">
              <span>${formatMoney(item.unitPrice)} x ${item.qty}</span>
              <strong>${formatMoney(item.subtotal)}</strong>
            </div>

            <div class="cart-item-actions">
              <button class="cart-minus" data-key="${escapeAttr(item.key)}">−</button>

              <input
                class="cart-qty-input"
                data-key="${escapeAttr(item.key)}"
                type="text"
                inputmode="numeric"
                value="${item.qty}"
              >

              <button class="cart-plus" data-key="${escapeAttr(item.key)}">+</button>
              <button class="cart-remove" data-key="${escapeAttr(item.key)}">🗑</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderTotals(){
    const total = APP.cart.reduce((sum,item) => {
      return sum + Number(item.subtotal || 0);
    },0);

    const totalEl = document.getElementById("cartTotal");
    if(totalEl) totalEl.textContent = formatMoney(total);
  }

  function renderCartMode(){
    const mode = getCartMode();
    const hasRental = mode === "alquiler" || mode === "mixto";
    const panel = document.getElementById("cartPanel");
    const title = document.getElementById("cartTitle");
    const form = document.getElementById("reservationForm");
    const sendText = document.getElementById("sendWhatsappText");

    panel?.classList.toggle("has-rental", hasRental);
    if(form) form.hidden = !hasRental;

    if(title){
      title.textContent = mode === "alquiler"
        ? "Tu Reserva"
        : mode === "mixto"
        ? "Tu Reserva y Compra"
        : "Tu Carrito";
    }

    if(sendText){
      sendText.textContent = mode === "alquiler"
        ? "Enviar reserva"
        : mode === "mixto"
        ? "Enviar solicitud"
        : "Enviar pedido";
    }

    if(hasRental){
      setReservationMinimumDates();
      toggleFittingFields();
    }
  }

  function todayIso(){
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0,10);
  }

  function setReservationMinimumDates(){
    const today = todayIso();
    ["pickupDate", "returnDate", "fittingDate"].forEach(id => {
      const input = document.getElementById(id);
      if(input) input.min = today;
    });
  }

  function parseLocalDateTime(dateValue, timeValue){
    if(!dateValue || !timeValue) return null;
    const date = new Date(`${dateValue}T${timeValue}:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function toLocalInputParts(date){
    const pad = value => String(value).padStart(2, "0");
    return {
      date:`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`,
      time:`${pad(date.getHours())}:${pad(date.getMinutes())}`
    };
  }

  function setDefaultReturnDate(force = false){
    const pickupDate = document.getElementById("pickupDate");
    const pickupTime = document.getElementById("pickupTime");
    const returnDate = document.getElementById("returnDate");
    const returnTime = document.getElementById("returnTime");
    const start = parseLocalDateTime(pickupDate?.value, pickupTime?.value);
    if(!start || !returnDate || !returnTime) return;

    if(force || !returnDate.value || !returnTime.value){
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const values = toLocalInputParts(end);
      returnDate.value = values.date;
      returnTime.value = values.time;
    }
  }

  function getRentalDurationHours(){
    const start = parseLocalDateTime(
      document.getElementById("pickupDate")?.value,
      document.getElementById("pickupTime")?.value
    );
    const end = parseLocalDateTime(
      document.getElementById("returnDate")?.value,
      document.getElementById("returnTime")?.value
    );
    if(!start || !end) return null;
    return (end.getTime() - start.getTime()) / 3600000;
  }

  function validateRentalDuration(){
    const warning = document.getElementById("rentalExtraCharge");
    const hours = getRentalDurationHours();
    if(warning) warning.hidden = !(hours !== null && hours > 24);
    return hours;
  }

  function toggleFittingFields(){
    const requested = Boolean(document.getElementById("requestFitting")?.checked);
    const fields = document.getElementById("fittingFields");
    if(fields) fields.hidden = !requested;
  }

  function previewPaymentProof(file){
    const preview = document.getElementById("paymentProofPreview");
    const image = document.getElementById("paymentProofImage");
    const name = document.getElementById("paymentProofName");
    if(!file){
      clearPaymentProof();
      return;
    }

    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){
      notifyError("El comprobante debe ser una imagen JPG, PNG o WEBP.");
      clearPaymentProof();
      return;
    }

    if(file.size > 8 * 1024 * 1024){
      notifyError("El comprobante no debe superar los 8 MB.");
      clearPaymentProof();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if(image) image.src = String(reader.result || "");
      if(name) name.textContent = file.name;
      if(preview) preview.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  function clearPaymentProof(){
    const input = document.getElementById("paymentProof");
    const preview = document.getElementById("paymentProofPreview");
    const image = document.getElementById("paymentProofImage");
    const name = document.getElementById("paymentProofName");
    if(input) input.value = "";
    if(image) image.removeAttribute("src");
    if(name) name.textContent = "";
    if(preview) preview.hidden = true;
  }

  function openCart(){
    /* Si el cliente abre el carrito desde un modal de producto,
       cerramos solo ese modal y mostramos el carrito habitual. */
    const detailModal = document.getElementById("detailModal");
    const variantModal = document.getElementById("variantModal");

    detailModal?.classList.remove("show");
    detailModal?.setAttribute("aria-hidden", "true");
    variantModal?.classList.remove("show");
    document.body.classList.remove("modal-open");

    document.getElementById("cartPanel")?.classList.add("show");
    document.getElementById("overlay")?.classList.add("show");
    document.body.classList.add("cart-open");
  }

  function closeCart(){
    document.getElementById("cartPanel")?.classList.remove("show");
    document.getElementById("overlay")?.classList.remove("show");
    document.body.classList.remove("cart-open");
  }

  function sendWhatsapp(){
    const nameInput = document.getElementById("clientName");
    const clientName = nameInput ? nameInput.value.trim() : "";
    const cartMode = getCartMode();
    const hasRental = cartMode === "alquiler" || cartMode === "mixto";

    if(APP.cart.length === 0){
      alert("Tu carrito está vacío.");
      return;
    }

    if(!clientName){
      alert("Escribe tu nombre para enviar el pedido.");
      if(nameInput) nameInput.focus();
      return;
    }

    const reservationData = hasRental ? validateReservationForm() : null;
    if(hasRental && !reservationData) return;

    const phone = APP.config.WHATSAPP;

    if(!phone){
      alert("No hay número de WhatsApp configurado.");
      return;
    }

    recalculateAllPrices();

    let message = "";

    if(hasRental){
      message = buildReservationWhatsapp(clientName, reservationData, cartMode);
    }else{
      const estiloWhatsapp = String(APP.config?.ESTILO_WHATSAPP || "MODELO_1")
        .trim()
        .toUpperCase();

      switch(estiloWhatsapp){
        case "MODELO_2":
          message = buildWhatsappModelo2(clientName);
          break;
        case "MODELO_3":
          message = buildWhatsappModelo3(clientName);
          break;
        case "MODELO_4":
          message = buildWhatsappModelo4(clientName);
          break;
        case "MODELO_5":
          message = buildWhatsappModelo5(clientName);
          break;
        case "MODELO_6":
          message = buildWhatsappModelo6(clientName);
          break;
        case "MODELO_1":
        default:
          message = buildWhatsappModelo1(clientName);
          break;
      }
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    if(hasRental){
      notify("WhatsApp abierto. Envía allí el comprobante seleccionado para confirmar la reserva.");
      return;
    }

    setTimeout(() => {
      APP.cart = [];
      StorageService.saveCart(APP.cart);

      document.querySelectorAll(".card-qty-input").forEach(input => {
        input.value = "0";
      });

      render();

      if(nameInput){
        nameInput.value = "";
      }

      closeCart();

      document.getElementById("overlay")?.classList.remove("show");

      document.querySelectorAll(".modal.show").forEach(modal => {
        modal.classList.remove("show");
      });

      document.body.classList.remove("modal-open");

    }, 800);
  }

  function validateReservationForm(){
    const phoneInput = document.getElementById("reservationPhone");
    const pickupDateInput = document.getElementById("pickupDate");
    const pickupTimeInput = document.getElementById("pickupTime");
    const returnDateInput = document.getElementById("returnDate");
    const returnTimeInput = document.getElementById("returnTime");
    const termsInput = document.getElementById("acceptRentalTerms");
    const fittingInput = document.getElementById("requestFitting");
    const fittingDateInput = document.getElementById("fittingDate");
    const fittingTimeInput = document.getElementById("fittingTime");
    const proofInput = document.getElementById("paymentProof");

    const phone = String(phoneInput?.value || "").replace(/[^\d+]/g, "");
    if(phone.replace(/\D/g, "").length < 9){
      notifyError("Ingresa un número de celular válido para la reserva.");
      phoneInput?.focus();
      return null;
    }

    if(!pickupDateInput?.value || !pickupTimeInput?.value){
      notifyError("Selecciona la fecha y hora reales de recojo.");
      (!pickupDateInput?.value ? pickupDateInput : pickupTimeInput)?.focus();
      return null;
    }

    setDefaultReturnDate();

    if(!returnDateInput?.value || !returnTimeInput?.value){
      notifyError("Selecciona la fecha y hora de devolución.");
      (!returnDateInput?.value ? returnDateInput : returnTimeInput)?.focus();
      return null;
    }

    const pickup = parseLocalDateTime(pickupDateInput.value, pickupTimeInput.value);
    const returnAt = parseLocalDateTime(returnDateInput.value, returnTimeInput.value);
    const now = new Date();
    now.setSeconds(0,0);

    if(!pickup || pickup < now){
      notifyError("La fecha y hora de recojo no pueden estar en el pasado.");
      pickupDateInput.focus();
      return null;
    }

    if(!returnAt || returnAt <= pickup){
      notifyError("La devolución debe ser posterior al recojo.");
      returnDateInput.focus();
      return null;
    }

    if(!termsInput?.checked){
      notifyError("Debes aceptar las condiciones del alquiler.");
      termsInput?.focus();
      return null;
    }

    const wantsFitting = Boolean(fittingInput?.checked);
    let fitting = null;
    if(wantsFitting){
      if(!fittingDateInput?.value || !fittingTimeInput?.value){
        notifyError("Selecciona la fecha y hora de la prueba.");
        (!fittingDateInput?.value ? fittingDateInput : fittingTimeInput)?.focus();
        return null;
      }
      fitting = parseLocalDateTime(fittingDateInput.value, fittingTimeInput.value);
      if(!fitting || fitting < now || fitting >= pickup){
        notifyError("La prueba debe programarse antes del recojo y no puede estar en el pasado.");
        fittingDateInput.focus();
        return null;
      }
    }

    const proof = proofInput?.files?.[0];
    if(!proof){
      notifyError("Adjunta el comprobante del pago de separación.");
      document.querySelector(".payment-proof-label")?.scrollIntoView({behavior:"smooth", block:"center"});
      return null;
    }

    const durationHours = (returnAt.getTime() - pickup.getTime()) / 3600000;
    validateRentalDuration();

    return {
      phone,
      pickup,
      returnAt,
      durationHours,
      wantsFitting,
      fitting,
      proofName:proof.name
    };
  }

  function formatReservationDate(date){
    if(!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle:"short",
      timeStyle:"short"
    }).format(date);
  }

  function buildReservationWhatsapp(clientName, data, mode){
    const rentals = APP.cart.filter(item => item.mode !== "venta");
    const sales = APP.cart.filter(item => item.mode === "venta");
    let message = mode === "mixto" ? "🛍️ *RESERVA Y COMPRA*\n\n" : "📅 *SOLICITUD DE RESERVA*\n\n";
    message += `👤 Cliente: ${clientName}\n`;
    message += `📱 Celular: ${data.phone}\n`;
    message += `📍 Recojo: ${formatReservationDate(data.pickup)}\n`;
    message += `↩️ Devolución: ${formatReservationDate(data.returnAt)}\n`;
    message += `⏱️ Duración: ${Math.round(data.durationHours * 10) / 10} horas`;
    if(data.durationHours > 24) message += " (aplica alquiler diario adicional)";
    message += "\n\n";

    if(rentals.length){
      message += "📅 *PRODUCTOS EN ALQUILER*\n";
      rentals.forEach(item => {
        message += formatReservationItem(item);
      });
      message += "\n";
    }

    if(sales.length){
      message += "🏷️ *PRODUCTOS EN VENTA*\n";
      sales.forEach(item => {
        message += formatReservationItem(item);
      });
      message += "\n";
    }

    message += `💰 *TOTAL REFERENCIAL: ${formatMoney(getCartTotal())}*\n\n`;
    message += "✅ Acepto las condiciones del alquiler y las fechas seleccionadas.\n";

    if(data.wantsFitting){
      message += `👗 Solicito prueba: ${formatReservationDate(data.fitting)}\n`;
      message += "La prueba se agenda después de verificar el pago de separación.\n";
    }else{
      message += "👗 No solicito prueba previa.\n";
    }

    message += `\n📎 Comprobante seleccionado: ${data.proofName}\n`;
    message += "Enviaré el comprobante en este chat para confirmar la reserva.";
    return message;
  }

  function formatReservationItem(item){
    let line = `• ${item.code || "SIN_CODIGO"} | ${item.name}\n`;
    const variant = getVariantLine(item);
    if(variant) line += `  ${variant}\n`;
    line += `  Cantidad: ${item.qty} | Subtotal: ${formatMoney(item.subtotal)}\n`;
    return line;
  }

  function getCartTotal(){
    return APP.cart.reduce((sum,item) => sum + Number(item.subtotal || 0), 0);
  }

  function getVariantLine(item){
    const details = [];
    if(item.color) details.push(item.color);
    if(item.size) details.push(item.size);
    return details.join(" | ");
  }

  function buildWhatsappModelo1(clientName){

  let message = `Hola, soy ${clientName}.\n`;
  message += `Quiero realizar el siguiente pedido:\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;

  APP.cart.forEach(item => {

    message += `${item.code || "SIN_CODIGO"} | ${item.name.toUpperCase()}\n`;

    if(item.color || item.size){
      let detalles = [];

      if(item.color){
        detalles.push(item.color);
      }

      if(item.size){
        detalles.push(item.size);
      }

      message += `${detalles.join(" | ")}\n`;
    }

    message += `${item.qty} und | ${formatMoney(item.unitPrice).replace("S/ ", "S/")} | Subtotal: ${formatMoney(item.subtotal).replace("S/ ", "S/")}\n\n`;

  });

  message = message.trimEnd();

  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `TOTAL: ${formatMoney(getCartTotal()).replace("S/ ", "S/")}`;

  return message;
}

  function buildWhatsappModelo2(clientName){
    let message = `Hola, soy ${clientName}.\n\n`;
    message += `Pedido:\n\n`;

    APP.cart.forEach(item => {
      const variant = getVariantLine(item);
      message += `• ${item.code || "SIN_CODIGO"} | ${item.name}\n`;
      if(variant){
        message += `${variant} | `;
      }
      message += `x${item.qty} | ${formatMoney(item.unitPrice)}\n\n`;
    });

    message += `TOTAL: ${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo3(clientName){
    let message = `PEDIDO\n\n`;
    message += `Cliente: ${clientName}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    APP.cart.forEach(item => {
      message += `Código: ${item.code || "SIN_CODIGO"}\n`;
      message += `Producto: ${item.name}\n`;

     if(item.color){
  message += `${APP.config?.ETIQUETA_OPCION1 || "Color"}: ${item.color}\n`;
}

if(item.size){
  message += `${APP.config?.ETIQUETA_OPCION2 || "Talla"}: ${item.size}\n`;
}

      message += `Cantidad: ${item.qty}\n`;
      message += `Precio: ${formatMoney(item.unitPrice)}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `TOTAL: ${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo4(clientName){
    let message = `✨ Hola, soy ${clientName}.\n\n`;
    message += `Deseo solicitar:\n\n`;

    APP.cart.forEach(item => {
      message += `🌸 ${item.name}\n`;

      if(item.code){
        message += `Código: ${item.code}\n`;
      }

      if(item.color){
  message += `${APP.config?.ETIQUETA_OPCION1 || "Color"}: ${item.color}\n`;
}

if(item.size){
  message += `${APP.config?.ETIQUETA_OPCION2 || "Talla"}: ${item.size}\n`;
}

      message += `Cantidad: ${item.qty}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
    });

    message += `Total:\n`;
    message += `${formatMoney(getCartTotal())}\n\n`;
    message += `Muchas gracias.`;
    return message;
  }

  function buildWhatsappModelo5(clientName){
    let message = `Pedido de ${clientName}\n\n`;

    APP.cart.forEach(item => {
      const variant = getVariantLine(item);
      message += `${item.code || "SIN_CODIGO"} x${item.qty}`;

      if(variant){
        message += ` (${variant})`;
      }

      message += `\n`;
    });

    message += `\nTOTAL\n`;
    message += `${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo6(clientName){
    let message = `👤 Cliente:\n`;
    message += `${clientName}\n\n`;
    message += `🛒 Pedido\n\n`;
    message += `━━━━━━━━━━━━━━\n\n`;

    APP.cart.forEach(item => {
      message += `*${item.code || "SIN_CODIGO"}*\n`;
      message += `${item.name}\n`;

      const variant = getVariantLine(item);
      if(variant){
        message += `${variant}\n`;
      }

      message += `Cantidad: ${item.qty}\n`;
      message += `Precio: ${formatMoney(item.unitPrice)}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
      message += `━━━━━━━━━━━━━━\n\n`;
    });

    message += `TOTAL\n`;
    message += `${formatMoney(getCartTotal())}`;
    return message;
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  return {
    init,
    addItem,
    addDirectProduct,
    changeQty,
    removeItem,
    render,
    openCart,
    closeCart,
    getProductQty,
    getUnitPriceByQty,
    isUsingWholesalePrice,
    setProductQty,
    setCartItemQty,
    setVariantQty,
    getProductMode,
    getUpdateMessage,
    getCartMode
  };

})();
