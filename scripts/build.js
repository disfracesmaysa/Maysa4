const fs = require("fs");
const path = require("path");
const CLIENTE = require("../js/cliente.js");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const ignored = new Set(["dist", "node_modules", ".git"]);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyDirectory(source, destination){
  for(const entry of fs.readdirSync(source, { withFileTypes: true })){
    if(ignored.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if(entry.isDirectory()){
      fs.mkdirSync(to, { recursive: true });
      copyDirectory(from, to);
    }else{
      fs.copyFileSync(from, to);
    }
  }
}
copyDirectory(root, dist);

const escapeAttribute = value => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const siteUrl = String(CLIENTE.URL_WEB || "").trim().replace(/\/+$/, "") + "/";
const absoluteUrl = value => {
  try { return new URL(value, siteUrl).href; } catch { return String(value || ""); }
};
const share = CLIENTE.COMPARTIR || {};
const seo = CLIENTE.SEO || {};
const shareTitle = share.TITULO || CLIENTE.NOMBRE;
const shareDescription = share.DESCRIPCION || CLIENTE.DESCRIPCION;
const pageTitle = seo.TITULO || shareTitle;
const pageDescription = seo.DESCRIPCION || shareDescription;
const shareImage = absoluteUrl(share.IMAGEN || CLIENTE.LOGO);
const logoUrl = absoluteUrl(CLIENTE.LOGO);

function replaceOrInsert(html, pattern, replacement, before = "</head>"){
  if(pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace(before, `${replacement}\n${before}`);
}

function generateIndex(indexPath){
  let html = fs.readFileSync(indexPath, "utf8");

  html = replaceOrInsert(html, /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(pageTitle)}</title>`);
  html = replaceOrInsert(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta name="description" content="${escapeAttribute(pageDescription)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta property="og:title" content="${escapeAttribute(shareTitle)}">`);
  html = replaceOrInsert(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta property="og:description" content="${escapeAttribute(shareDescription)}">`);
  html = replaceOrInsert(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta property="og:url" content="${escapeAttribute(siteUrl)}">`);
  html = replaceOrInsert(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta property="og:image" content="${escapeAttribute(shareImage)}">`);
  html = replaceOrInsert(html, /<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta name="theme-color" content="${escapeAttribute(CLIENTE.COLOR_HEADER)}">`);
  html = replaceOrInsert(html, /<link\s+rel="icon"[^>]*>/i,
    `<link rel="icon" type="image/png" href="${escapeAttribute(CLIENTE.LOGO)}">`);

  // Identidad visual inicial, sin alterar estructura ni estilos.
  html = html.replace(/(<img\s+id="appBootLogo"[^>]*\ssrc=")[^"]*(")/i, `$1${escapeAttribute(CLIENTE.LOGO)}$2`);
  html = html.replace(/(<p\s+id="appBootName"[^>]*>)[\s\S]*?(<\/p>)/i, `$1${escapeAttribute(CLIENTE.NOMBRE)}$2`);
  html = html.replace(/(<img\s+id="storeLogo"[^>]*\ssrc=")[^"]*(")/i, `$1${escapeAttribute(CLIENTE.LOGO)}$2`);

  const seoHead = `
  <!-- SEO-GENERADO-INICIO -->
  <meta name="robots" content="${seo.INDEXAR_EN_GOOGLE === false ? "noindex,nofollow" : "index,follow,max-image-preview:large"}">
  ${seo.PALABRAS_CLAVE ? `<meta name="keywords" content="${escapeAttribute(seo.PALABRAS_CLAVE)}">` : ""}
  ${seo.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${escapeAttribute(seo.GOOGLE_SITE_VERIFICATION)}">` : ""}
  <link rel="canonical" href="${escapeAttribute(siteUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeAttribute(shareTitle)}">
  <meta property="og:locale" content="${escapeAttribute(String(seo.IDIOMA || "es-PE").replace("-", "_"))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttribute(shareTitle)}">
  <meta name="twitter:description" content="${escapeAttribute(shareDescription)}">
  <meta name="twitter:image" content="${escapeAttribute(shareImage)}">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": seo.TIPO_NEGOCIO || "OnlineStore",
    name: CLIENTE.NOMBRE,
    description: pageDescription,
    url: siteUrl,
    logo: logoUrl,
    image: shareImage
  }).replace(/</g, "\\u003c")}</script>
  <!-- SEO-GENERADO-FIN -->`;

  html = html.replace(/\s*<!-- SEO-GENERADO-INICIO -->[\s\S]*?<!-- SEO-GENERADO-FIN -->\s*/g, "\n");
  html = html.replace("</head>", `${seoHead}\n</head>`);
  fs.writeFileSync(indexPath, html);
}

function writeGeneratedFiles(base){
  const manifest = {
    name: CLIENTE.NOMBRE,
    short_name: CLIENTE.NOMBRE_CORTO || CLIENTE.NOMBRE.slice(0, 12),
    description: CLIENTE.DESCRIPCION,
    lang: String(seo.IDIOMA || "es-PE").split("-")[0],
    start_url: "./index.html",
    scope: "./",
    display: "standalone",
    orientation: "portrait",
    background_color: CLIENTE.COLOR_HEADER,
    theme_color: CLIENTE.COLOR_HEADER,
    categories: ["shopping", "business"],
    icons: [
      { src: "assets/icons/logo192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "assets/icons/logo512x512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
  fs.writeFileSync(path.join(base, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const cleanSite = siteUrl.replace(/\/$/, "");
  const robots = seo.INDEXAR_EN_GOOGLE === false
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nSitemap: ${cleanSite}/sitemap.xml\n`;
  fs.writeFileSync(path.join(base, "robots.txt"), robots);

  const sitemapUrls = ["/", "/empresa.html"];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls.map(item => `  <url><loc>${cleanSite}${item}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(base, "sitemap.xml"), sitemap);
}

generateIndex(path.join(root, "index.html"));
generateIndex(path.join(dist, "index.html"));
writeGeneratedFiles(root);
writeGeneratedFiles(dist);

console.log("Catálogo generado desde js/cliente.js sin modificar el diseño.");
