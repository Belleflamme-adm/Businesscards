// Logos téléversés pour les signatures.
//   POST /api/logos      : téléverse un PNG (gestionnaires seulement), répond { url }
//   GET  /logos/:cle     : sert l'image (utilisée dans les courriels envoyés)
// Stockage : Netlify Blobs (hébergé avec le site, jamais mis en pause).
// Chaque téléversement a une clé unique et n'est jamais modifié : l'image peut être mise en cache longtemps.
import { getStore } from '@netlify/blobs';

const SUPABASE_URL = 'https://yldqwjovshipwnrjwdzs.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable_dWXBxjbdVdHlz1qe5y6SQg_yT6RBb9j';
const SITE = 'https://belleflamme-signature.netlify.app'; // adresse permanente des images
const TAILLE_MAX = 1024 * 1024; // 1 Mo
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const json = (status, corps) => new Response(JSON.stringify(corps), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Vérifie le jeton Supabase ET l'appartenance à la liste des gestionnaires (via le RLS)
async function estGestionnaire(req) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/.test(auth)) return false;
  const h = { apikey: CLE_PUBLIQUE, authorization: auth };
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: h });
  if (!u.ok) return false;
  const g = await fetch(`${SUPABASE_URL}/rest/v1/gestionnaires?select=courriel&limit=1`, { headers: h });
  if (!g.ok) return false;
  const lignes = await g.json();
  return Array.isArray(lignes) && lignes.length > 0;
}

const slug = (s) => String(s || 'logo').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'logo';

export default async (req, context) => {
  const store = getStore('logos');

  if (req.method === 'GET') {
    const cle = context.params?.cle || '';
    if (!/^[a-z0-9-]+\.png$/.test(cle)) return new Response('Introuvable', { status: 404 });
    const blob = await store.get(cle, { type: 'arrayBuffer' });
    if (!blob) return new Response('Introuvable', { status: 404 });
    return new Response(blob, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=31536000, immutable',
        'netlify-cdn-cache-control': 'public, durable, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
  }

  if (req.method === 'POST') {
    if (!(await estGestionnaire(req))) return json(403, { erreur: 'Accès réservé aux gestionnaires.' });
    const octets = new Uint8Array(await req.arrayBuffer());
    if (!octets.length || octets.length > TAILLE_MAX) return json(413, { erreur: 'Image trop lourde (1 Mo maximum).' });
    if (!PNG.every((b, i) => octets[i] === b)) return json(415, { erreur: 'Format invalide (PNG attendu).' });
    const nom = new URL(req.url).searchParams.get('nom');
    const cle = `${slug(nom)}-${crypto.randomUUID().slice(0, 8)}.png`;
    await store.set(cle, octets, { metadata: { nom: nom || '', televerse_le: new Date().toISOString() } });
    return json(201, { url: `${SITE}/logos/${cle}` });
  }

  return new Response('Méthode non permise', { status: 405 });
};

export const config = { path: ['/logos/:cle', '/api/logos'] };
