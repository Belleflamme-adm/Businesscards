// Prépare un logo téléversé pour les signatures courriel :
// image (PNG, JPG, WebP, SVG) ou PDF (1re page) -> recadrage des marges -> PNG net, taille courriel.

// Taille d'affichage maximale dans la signature (px). Le PNG est produit en double pour les écrans haute densité.
const MAX_L = 140;
const MAX_H = 70;
const DENSITE = 2;

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

async function canvasDepuisPdf(fichier) {
  const pdfjs = await import(PDFJS);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await pdfjs.getDocument({ data: await fichier.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const echelle = Math.min(4, 2000 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale: echelle });
  const c = document.createElement('canvas');
  c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp, background: 'rgba(0,0,0,0)' }).promise;
  return c;
}

async function canvasDepuisImage(fichier) {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    // Les SVG sans taille explicite : on fixe une grande taille pour un rendu net
    let l = img.naturalWidth || 1200, h = img.naturalHeight || 600;
    if (fichier.type === 'image/svg+xml' && Math.max(l, h) < 1200) { const k = 1200 / Math.max(l, h); l *= k; h *= k; }
    const c = document.createElement('canvas');
    c.width = Math.round(l); c.height = Math.round(h);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

// Retire les marges blanches ou transparentes autour du logo
function recadrer(c) {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const { data, width: L, height: H } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = L, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * 4;
      const visible = data[i + 3] > 16 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240);
      if (visible) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) throw new Error('Le fichier semble vide (aucun dessin visible).');
  const marge = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - marge); y0 = Math.max(0, y0 - marge);
  x1 = Math.min(L - 1, x1 + marge); y1 = Math.min(H - 1, y1 + marge);
  const r = document.createElement('canvas');
  r.width = x1 - x0 + 1; r.height = y1 - y0 + 1;
  r.getContext('2d').drawImage(c, x0, y0, r.width, r.height, 0, 0, r.width, r.height);
  return r;
}

// Réduction par étapes (évite le flou et le crénelage d'une réduction brutale)
function reduire(c, L, H) {
  let src = c;
  while (src.width / 2 > L && src.height / 2 > H) {
    const t = document.createElement('canvas');
    t.width = Math.round(src.width / 2); t.height = Math.round(src.height / 2);
    const x = t.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, t.width, t.height);
    src = t;
  }
  const f = document.createElement('canvas');
  f.width = L; f.height = H;
  const x = f.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, L, H);
  return f;
}

export async function preparerLogo(fichier) {
  const estPdf = fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name);
  const estImage = /^image\/(png|jpeg|webp|svg\+xml|gif)$/.test(fichier.type);
  if (!estPdf && !estImage) throw new Error('Format non pris en charge. Utilise un PDF, PNG, JPG, WebP ou SVG.');
  if (fichier.size > 15 * 1024 * 1024) throw new Error('Fichier trop lourd (15 Mo maximum).');

  const brut = estPdf ? await canvasDepuisPdf(fichier) : await canvasDepuisImage(fichier);
  const net = recadrer(brut);

  const k = Math.min(MAX_L / net.width, MAX_H / net.height, 1);
  const largeur = Math.max(10, Math.round(net.width * k));
  const hauteur = Math.max(10, Math.round(net.height * k));
  const sortie = reduire(net, Math.min(net.width, largeur * DENSITE), Math.min(net.height, hauteur * DENSITE));

  const blob = await new Promise((ok) => sortie.toBlob(ok, 'image/png'));
  const avertissement = net.width < largeur * DENSITE * 0.75
    ? 'Ce fichier est de petite taille : le logo risque d\'être un peu flou. Un fichier plus grand ou un PDF donnera un meilleur résultat.'
    : '';
  return { blob, largeur, hauteur, apercu: sortie.toDataURL('image/png'), avertissement };
}
