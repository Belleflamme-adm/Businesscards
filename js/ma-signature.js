// Page personnelle d'un employé : voir, installer et confirmer sa signature.
// Accès par jeton privé dans l'URL (?t=...), sans connexion.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from './config.js';
import { signatureHTML, signatureTexte, fichierOutlook, ajusterApercu } from './signature.js';

const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { auth: { persistSession: false } });
const $ = (id) => document.getElementById(id);
const jeton = new URLSearchParams(location.search).get('t') || '';
let emp = null;

function dire(el, t, type = '') { el.textContent = t; el.className = 'msg' + (type ? ' ' + type : ''); }

async function charger() {
  const uuid = /^[0-9a-f-]{36}$/i.test(jeton);
  const { data, error } = uuid ? await sb.rpc('signature_par_jeton_v3', { p_jeton: jeton }) : { data: null };
  $('chargement').hidden = true;
  if (error || !data?.length) { $('invalide').hidden = false; return; }
  emp = data[0];
  $('contenu').hidden = false;
  $('bonjour').textContent = `Bonjour ${emp.prenom},`;
  const aJour = emp.version_confirmee >= emp.version_signature;
  $('intro').textContent = aJour
    ? 'Voici ta signature courriel Belleflamme.'
    : emp.version_confirmee === 0
      ? 'Voici ta signature courriel Belleflamme. Installe-la en suivant les 3 étapes.'
      : 'Tes informations ont changé. Remplace ton ancienne signature en suivant les 3 étapes.';
  $('etat-ok').hidden = !aJour;
  $('apercu').innerHTML = signatureHTML(emp);
  ajusterApercu($('apercu'));
  addEventListener('resize', () => ajusterApercu($('apercu')));
  if (aJour) { $('btn-confirmer').disabled = true; dire($('confirme-msg'), 'Déjà confirmée.', 'ok'); }
}

// Choix de la version d'Outlook
for (const b of document.querySelectorAll('.choix-btn')) {
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.choix-btn')) x.classList.toggle('actif', x === b);
    for (const p of document.querySelectorAll('[data-panneau]')) p.hidden = p.dataset.panneau !== b.dataset.cible;
    dire($('copie-msg'), '');
  });
}

$('btn-copier').addEventListener('click', async () => {
  const html = signatureHTML(emp);
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([signatureTexte(emp)], { type: 'text/plain' }),
    })]);
  } catch {
    // Repli : copie de l'aperçu rendu, sans la réduction d'écran
    const zone = $('apercu');
    zone.innerHTML = html;
    const r = document.createRange(); r.selectNodeContents(zone);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.execCommand('copy'); s.removeAllRanges();
    ajusterApercu(zone);
  }
  dire($('copie-msg'), 'Copiée! Colle-la maintenant dans Outlook.', 'ok');
});

$('btn-telecharger').addEventListener('click', () => {
  const blob = new Blob([fichierOutlook(emp)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Belleflamme.htm';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  dire($('copie-msg'), 'Téléchargée. Place le fichier dans le dossier Signatures.', 'ok');
});

$('btn-copier-texte').addEventListener('click', async () => {
  await navigator.clipboard.writeText(signatureTexte(emp));
  dire($('copie-msg'), 'Version courte copiée.', 'ok');
});

$('btn-confirmer').addEventListener('click', async () => {
  $('btn-confirmer').disabled = true;
  const { error } = await sb.rpc('confirmer_signature', { p_jeton: jeton, p_version: emp.version_signature });
  if (error) { $('btn-confirmer').disabled = false; return dire($('confirme-msg'), 'Erreur, réessaie.', 'err'); }
  emp.version_confirmee = emp.version_signature;
  $('etat-ok').hidden = false;
  dire($('confirme-msg'), 'Merci! Ta signature est confirmée.', 'ok');
});

charger();
