'use strict';

/* =========================================================
   SHEETS.JS CORREGIDO
   Carga datos desde Google Sheets:
   CONFIG, PRODUCTOS, VARIANTES, COLORES, MAYOREO, INFORMACION

   STOCK:
   - Vacío = ilimitado
   - 0 = sin stock
   - 10 = máximo 10 unidades
========================================================= */

const SheetService = (() => {

  async function loadAll(){
    // Caché desactivado temporalmente para leer cambios nuevos del Sheet
// const cached = StorageService.loadCache();

// if(cached){
//   return cached;
// }

    const [
  configRows,
  productRows,
  variantRows,
  colorRows,
  wholesaleRows,
  informacionRows
] = await Promise.all([
  fetchCSV(CONFIG.URLS.CONFIG),
  fetchCSV(CONFIG.URLS.PRODUCTOS),
  fetchCSV(CONFIG.URLS.VARIANTES),
  fetchCSV(CONFIG.URLS.COLORES),
  fetchCSV(CONFIG.URLS.MAYOREO),
  fetchCSV(CONFIG.URLS.INFORMACION)
]);

    const config = parseConfig(configRows);
const informacion = parseConfig(informacionRows);
const colors = parseColors(colorRows);
const wholesale = parseWholesale(wholesaleRows);
const variants = parseVariants(variantRows);
const products = parseProducts(productRows, variants, wholesale);

    const categories = buildCategories(products);

   const data = {
  config,
  informacion,
  products,
  categories,
  colors,
  wholesale
};

    // StorageService.saveCache(data);

    return data;
  }

  async function fetchCSV(url){
    if(!url) return [];

    const separator = url.includes("?") ? "&" : "?";
    const freshUrl = `${url}${separator}_=${Date.now()}`;
    const res = await fetch(freshUrl, { cache: "no-store" });

    if(!res.ok){
      throw new Error(`No se pudo cargar: ${url}`);
    }

    const text = await res.text();
    return csvToObjects(text);
  }

  function csvToObjects(csv){
    const rows = parseCSV(csv);

    if(rows.length <= 1){
      return [];
    }

    const headers = rows[0].map((h, index) => {
      const normalized = normalizeKey(h);

      /* Compatibilidad robusta con hojas donde A1 quedó vacío.
         La primera columna de CONFIG/INFORMACION siempre contiene la clave. */
      if(!normalized && index === 0) return "CLAVE";
      if(!normalized && index === 1) return "VALOR";
      return normalized || `COLUMNA_${index + 1}`;
    });

    return rows.slice(1)
      .filter(row => row.some(cell => String(cell || "").trim() !== ""))
      .map(row => {
        const obj = {};

        headers.forEach((header, index) => {
          obj[header] = clean(row[index]);
        });

        return obj;
      });
  }

  function parseCSV(text){
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for(let i = 0; i < text.length; i++){
      const char = text[i];
      const next = text[i + 1];

      if(char === '"' && insideQuotes && next === '"'){
        cell += '"';
        i++;
        continue;
      }

      if(char === '"'){
        insideQuotes = !insideQuotes;
        continue;
      }

      if(char === "," && !insideQuotes){
        row.push(cell);
        cell = "";
        continue;
      }

      if((char === "\n" || char === "\r") && !insideQuotes){
        if(char === "\r" && next === "\n"){
          i++;
        }

        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    row.push(cell);
    rows.push(row);

    return rows;
  }

  function parseConfig(rows){
    const config = {};

    rows.forEach(row => {
      const key = normalizeKey(
        row.CLAVE || row.KEY || row.CONFIGURACION || row.OPCION || ""
      );
      const value = clean(
        row.VALOR ?? row.VALUE ?? row.DATO ?? row.CONTENIDO ?? ""
      );

      if(!key) return;

      config[key] = parseValue(value);
    });

    return config;
  }

  function parseProducts(rows, variants, wholesale){
    return rows
      .filter(row => isActive(row.ESTADO))
      .map(row => {
        const code = clean(row.CODIGO);
        const productVariants = variants.filter(v => v.productId === code);
        const productWholesale = wholesale[code] || [];

        const productStock = parseStock(row.STOCK);

        let finalStock = productStock;
        let unlimitedStock = productStock === null;

        if(productVariants.length){
          const variantStocks = productVariants.map(v => v.stock);
          unlimitedStock = variantStocks.some(stock => stock === null);

          finalStock = unlimitedStock
            ? null
            : variantStocks.reduce((sum, stock) => sum + Number(stock || 0), 0);
        }

        return {
          code,
          name: clean(row.NOMBRE),
          brand: clean(row.MARCA),
          category: clean(row.CATEGORIA || row.CATEGO),
          price: toNumber(row.PRECIO),
          discount: toNumber(row.DESCUENTO),
          image: convertDriveUrl(clean(row.IMAGEN)) || CONFIG.PLACEHOLDER_IMAGE,
image2: convertDriveUrl(clean(row.IMAGEN_2)),
image3: convertDriveUrl(clean(row.IMAGEN_3)),
image4: convertDriveUrl(clean(row.IMAGEN_4)),
image5: convertDriveUrl(clean(row.IMAGEN_5)),
          video: clean(row.VIDEO),
          description: clean(row.DESCRIPCION),
          masVendido: clean(row.MAS_VENDIDO),
          destacado: clean(row.DESTACADO || row.TIPO_DESTACADO),

          /* STOCK:
             null = ilimitado
             0 = sin stock
             número = máximo permitido
          */
          stock: finalStock,
          unlimitedStock,

          hasVideo: Boolean(clean(row.VIDEO)),
          hasVariants: productVariants.length > 0,
          variants: productVariants,
          wholesaleRules: productWholesale,

          /* compatibilidad con código anterior */
          wholesaleMin: productWholesale[1]?.from || productWholesale[0]?.from || 0,
          wholesalePrice: productWholesale[1]?.price || 0
        };
      });
  }

  function parseVariants(rows){
    const parsed = rows
      .filter(row => isActive(row.ACTIVO))
      .map(row => {
        const stock = parseStock(row.STOCK);

        return {
          /* Compatible con los encabezados nuevos y anteriores */
          productId: clean(row.CODIGO || row.PRODUCTO_ID || row.PRODUCT_ID),
          color: clean(row.OPCION1 || row.ETIQUETA_OPCION1 || row.COLOR),
          size: clean(row.OPCION2 || row.ETIQUETA_OPCION2 || row.TALLA),
          image: convertDriveUrl(clean(row.IMAGEN)),

          /* STOCK:
             null = ilimitado
             0 = agotado
             número = máximo permitido
          */
          stock,
          unlimitedStock: stock === null,
          active: true
        };
      })
      .filter(variant => variant.productId);

    /* La imagen se escribe una sola vez por OPCION1.
       Las demás tallas/medidas del mismo color o diseño la reutilizan. */
    const imageByOption = new Map();
    parsed.forEach(variant => {
      const key = `${variant.productId}__${String(variant.color).trim().toLowerCase()}`;
      if(variant.image && !imageByOption.has(key)) imageByOption.set(key, variant.image);
    });
    parsed.forEach(variant => {
      const key = `${variant.productId}__${String(variant.color).trim().toLowerCase()}`;
      if(!variant.image) variant.image = imageByOption.get(key) || "";
    });

    return parsed;
  }

  function parseColors(rows){
    const colors = {};

    rows.forEach(row => {
      const name = clean(row.NOMBRE);
      const hex = clean(row.COLOR_HEX);

      if(name && hex){
        colors[name.toLowerCase()] = hex;
      }
    });

    return colors;
  }

  function parseWholesale(rows){
    const map = {};

    rows.forEach(row => {
      const code = clean(row.PRODUCTO_ID || row.PRODUCT_ID);
      const from = toNumber(row.DESDE);
      const price = toNumber(row.PRECIO);

      if(!code || !from || !price) return;

      if(!map[code]){
        map[code] = [];
      }

      map[code].push({
        from,
        price
      });
    });

    Object.keys(map).forEach(code => {
      map[code].sort((a,b) => a.from - b.from);
    });

    return map;
  }

  function buildCategories(products){
    const set = new Set(["Todos"]);

    products.forEach(product => {
      if(product.category){
        set.add(product.category);
      }
    });

    return [...set];
  }

  function parseValue(value){
    const v = String(value ?? "").trim();
    const normalized = v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    /* Funciona igual con texto escrito o con listas desplegables. */
    if(["SI","TRUE","VERDADERO","1","ACTIVO","MOSTRAR"].includes(normalized)){
      return true;
    }

    if(["NO","FALSE","FALSO","0","INACTIVO","OCULTAR","OCULTO","DESACTIVADO"].includes(normalized)){
      return false;
    }

    return v;
  }

  function isActive(value){
    const v = String(value || "").trim().toUpperCase();
    return ["SI","SÍ","ACTIVO","TRUE","VERDADERO","1"].includes(v);
  }

  function clean(value){
    return String(value || "").trim();
  }

  function toNumber(value){
    const n = Number(String(value || "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function parseStock(value){
    const text = String(value ?? "").trim();

    if(text === ""){
      return null; // stock ilimitado
    }

    const n = Number(text.replace(",", "."));

    return isNaN(n) ? null : Math.max(0, n);
  }

  function normalizeKey(value){
    return String(value || "")
      .replace(/^\uFEFF/, "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
  }

  function convertDriveUrl(url){
    if(!url) return "";

    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);

    if(match && match[1]){
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }

    return url;
  }

  return {
    loadAll
  };

})();
