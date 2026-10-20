import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, DOMAINE } from './config.js';
import { signatureHTML, signatureTexte, fichierOutlook, chiffres, ajusterApercu } from './signature.js';
import { statut, envoyerLien, lienSignature } from './suivi.js';
import { creerRepertoire } from './repertoire.js';

const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE);
const $ = (id) => document.getElementById(id);

const etat = { employes: [], courant: null, utilisateur: null, vue: 'fiches' };
const form = $('form-employe');

function ecran(nom) {
  for (const id of ['ecran-connexion', 'ecran-refus']) $(id).hidden = id !== nom;
  const dansApp = nom === 'ecran-app';
  $('onglets').hidden = !dansApp;
  $('ecran-app').hidden = !dansApp || etat.vue !== 'fiches';
  $('ecran-repertoire').hidden = !dansApp || etat.vue !== 'repertoire';
}

// ---------- Onglets ----------
for (const b of document.querySelectorAll('.onglet')) {
  b.addEventListener('click', () => {
    etat.vue = b.dataset.vue;
    for (const x of document.querySelectorAll('.onglet')) x.classList.toggle('actif', x === b);
    ecran('ecran-app');
    if (etat.vue === 'repertoire') repertoire.afficher();
    else { afficherListe(); if (etat.courant) ouvrir(etat.employes.find((x) => x.id === etat.courant.id) || etat.courant); }
  });
}

// Le répertoire prévient quand il modifie un employé
const repertoire = creerRepertoire({
  sb, $, etat,
  rafraichirAilleurs: (e) => { if (etat.courant?.id === e.id) etat.courant = e; },
});
function message(el, texte, type = '') {
  el.textContent = texte;
  el.className = 'msg' + (type ? ' ' + type : '');
  if (type === 'ok') setTimeout(() => { if (el.textContent === texte) el.textContent = ''; }, 3500);
}

// ---------- Connexion ----------
const traduireErreur = (e) => {
  const m = e?.message || '';
  if (/invalid login credentials/i.test(m)) return 'Courriel ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return 'Compte pas encore confirmé. Utilise le lien par courriel ci-dessous.';
  if (/database error saving new user|acces_refuse|signups not allowed/i.test(m)) return 'Ce courriel n\'a pas accès. Demande à un gestionnaire de t\'ajouter à la liste.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (/should be different/i.test(m)) return 'Le nouveau mot de passe doit être différent de l\'ancien.';
  if (/weak|at least/i.test(m)) return 'Mot de passe trop faible. Allonge-le ou ajoute des chiffres et symboles.';
  return 'Erreur : ' + m;
};

$('form-connexion').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const courriel = $('connexion-courriel').value.trim().toLowerCase();
  const msg = $('connexion-msg');
  if (!courriel.endsWith(DOMAINE)) return message(msg, `Seules les adresses ${DOMAINE} sont acceptées.`, 'err');
  message(msg, 'Connexion...');
  const { error } = await sb.auth.signInWithPassword({ email: courriel, password: $('connexion-mdp').value });
  if (error) return message(msg, traduireErreur(error), 'err');
  message(msg, '');
  $('connexion-mdp').value = '';
});

// Repli : lien par courriel (premier accès ou mot de passe oublié)
$('btn-lien-magique').addEventListener('click', async () => {
  const courriel = $('connexion-courriel').value.trim().toLowerCase();
  const msg = $('connexion-msg');
  if (!courriel) return message(msg, 'Entre ton courriel d\'abord.', 'err');
  if (!courriel.endsWith(DOMAINE)) return message(msg, `Seules les adresses ${DOMAINE} sont acceptées.`, 'err');
  message(msg, 'Envoi en cours...');
  const { error } = await sb.auth.signInWithOtp({
    email: courriel,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) return message(msg, traduireErreur(error), 'err');
  message(msg, `Lien envoyé à ${courriel}. Ouvre-le dans ce navigateur, puis clique « Mon mot de passe » en haut pour en choisir un.`, 'ok');
});

// Choisir ou changer son mot de passe
const fenetreMdp = (ouvrir) => {
  $('fenetre-mdp').hidden = !ouvrir;
  message($('mdp-msg'), '');
  if (ouvrir) {
    $('mdp-courriel').value = etat.utilisateur?.email || '';
    $('mdp-nouveau').value = ''; $('mdp-confirme').value = '';
    $('mdp-nouveau').focus();
  }
};
$('btn-mon-mdp').addEventListener('click', () => fenetreMdp(true));
$('btn-mdp-annuler').addEventListener('click', () => fenetreMdp(false));
$('fenetre-mdp').addEventListener('click', (ev) => { if (ev.target === $('fenetre-mdp')) fenetreMdp(false); });
$('form-mdp').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const n = $('mdp-nouveau').value, c = $('mdp-confirme').value, msg = $('mdp-msg');
  if (n.length < 10) return message(msg, 'Au moins 10 caractères.', 'err');
  if (n !== c) return message(msg, 'Les deux mots de passe ne sont pas identiques.', 'err');
  message(msg, 'Enregistrement...');
  const { error } = await sb.auth.updateUser({ password: n });
  if (error) return message(msg, traduireErreur(error), 'err');
  message(msg, 'Mot de passe enregistré.', 'ok');
  setTimeout(() => fenetreMdp(false), 1200);
});

$('btn-deconnexion').addEventListener('click', async () => { await sb.auth.signOut(); });

sb.auth.onAuthStateChange((_evt, session) => { demarrer(session); });

let dernierUtilisateur;
async function demarrer(session) {
  const u = session?.user || null;
  if (u?.id === dernierUtilisateur && u) return;
  dernierUtilisateur = u?.id;
  etat.utilisateur = u;
  $('session').hidden = !u;
  $('session-courriel').textContent = u?.email || '';
  if (!u) return ecran('ecran-connexion');

  // Un non-gestionnaire ne voit aucune ligne (RLS)
  const { data, error } = await sb.from('gestionnaires').select('courriel, nom').order('courriel');
  if (error || !data?.length) return ecran('ecran-refus');
  afficherGestionnaires(data);
  ecran('ecran-app');
  await chargerEmployes();
  nouveau();
}

// ---------- Employés ----------
async function chargerEmployes() {
  const { data, error } = await sb.from('employes').select('*').order('prenom').order('nom');
  if (error) return message($('form-msg'), 'Erreur de chargement : ' + error.message, 'err');
  etat.employes = data;
  afficherListe();
}

function afficherListe() {
  const q = $('recherche').value.trim().toLowerCase();
  const inactifs = $('voir-inactifs').checked;
  const ul = $('employes');
  ul.replaceChildren();
  for (const e of etat.employes) {
    if (!inactifs && !e.actif) continue;
    const texte = `${e.prenom} ${e.nom} ${e.titre} ${e.courriel}`.toLowerCase();
    if (q && !texte.includes(q)) continue;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    if (etat.courant?.id === e.id) b.classList.add('actif');
    if (!e.actif) b.classList.add('inactif');
    const n = document.createElement('span'); n.textContent = `${e.prenom} ${e.nom}`;
    const s = document.createElement('span'); s.className = 'sous'; s.textContent = e.actif ? e.titre : `${e.titre} · inactif`;
    b.append(n, s);
    b.addEventListener('click', () => ouvrir(e));
    li.append(b);
    ul.append(li);
  }
  if (!ul.children.length) {
    const li = document.createElement('li'); li.className = 'msg'; li.textContent = 'Aucun employé.'; ul.append(li);
  }
}
$('recherche').addEventListener('input', afficherListe);
$('voir-inactifs').addEventListener('change', afficherListe);

function valeurs() {
  const f = Object.fromEntries(new FormData(form));
  for (const k in f) f[k] = f[k].trim();
  f.courriel = f.courriel.toLowerCase();
  f.cellulaire = chiffres(f.cellulaire) || null;
  f.bureau = chiffres(f.bureau) || null;
  f.poste = f.poste.replace(/\D/g, '') || null;
  f.division = f.division || null;
  f.logo_secondaire = f.logo_secondaire || null;
  return f;
}

function remplir(e) {
  for (const el of form.elements) if (el.name) el.value = e?.[el.name] ?? '';
}

function afficherStatut(e) {
  const p = $('form-statut');
  if (!e) { p.hidden = true; return; }
  const s = statut(e);
  p.hidden = false;
  p.innerHTML = '';
  const b = document.createElement('span');
  b.className = 'pastille ' + s.classe; b.textContent = 'Signature : ' + s.texte;
  p.append(b);
}

function nouveau() {
  etat.courant = null;
  remplir(null);
  $('form-titre').textContent = 'Nouvel employé';
  $('btn-actif').hidden = true;
  $('btn-envoyer-lien').hidden = true;
  $('btn-copier-lien').hidden = true;
  afficherStatut(null);
  message($('form-msg'), '');
  apercu();
  afficherListe();
}
$('btn-nouveau').addEventListener('click', nouveau);

function ouvrir(e) {
  etat.courant = e;
  remplir(e);
  $('form-titre').textContent = `${e.prenom} ${e.nom}`;
  $('btn-actif').hidden = false;
  $('btn-actif').textContent = e.actif ? 'Désactiver' : 'Réactiver';
  $('btn-envoyer-lien').hidden = !e.actif;
  $('btn-copier-lien').hidden = !e.actif;
  afficherStatut(e);
  message($('form-msg'), '');
  apercu();
  afficherListe();
}

function valider(f) {
  if (f.cellulaire && f.cellulaire.length !== 10) return 'Le cellulaire doit avoir 10 chiffres.';
  if (f.bureau && f.bureau.length !== 10) return 'Le numéro de bureau doit avoir 10 chiffres.';
  if (f.poste && !f.bureau) return 'Un poste a besoin d\'un numéro de bureau.';
  return null;
}

form.addEventListener('input', apercu);
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = valeurs();
  const msg = $('form-msg');
  const err = valider(f);
  if (err) return message(msg, err, 'err');
  message(msg, 'Enregistrement...');
  const requete = etat.courant
    ? sb.from('employes').update(f).eq('id', etat.courant.id).select().single()
    : sb.from('employes').insert(f).select().single();
  const { data, error } = await requete;
  if (error) {
    const doublon = error.code === '23505';
    return message(msg, doublon ? 'Ce courriel existe déjà.' : 'Erreur : ' + error.message, 'err');
  }
  await chargerEmployes();
  ouvrir(data);
  const aEnvoyer = data.version_confirmee < data.version_signature;
  message(msg, aEnvoyer ? 'Enregistré. Envoie le lien pour que la signature soit mise à jour.' : 'Enregistré.', 'ok');
});

$('btn-envoyer-lien').addEventListener('click', async () => {
  const e = etat.courant; if (!e) return;
  const maj = await envoyerLien(sb, e);
  const i = etat.employes.findIndex((x) => x.id === maj.id);
  if (i >= 0) etat.employes[i] = maj;
  ouvrir(maj);
});

$('btn-copier-lien').addEventListener('click', async () => {
  const e = etat.courant; if (!e) return;
  await navigator.clipboard.writeText(lienSignature(e));
  message($('form-msg'), 'Lien personnel copié.', 'ok');
});

$('btn-actif').addEventListener('click', async () => {
  const e = etat.courant; if (!e) return;
  const { data, error } = await sb.from('employes').update({ actif: !e.actif }).eq('id', e.id).select().single();
  if (error) return message($('form-msg'), 'Erreur : ' + error.message, 'err');
  await chargerEmployes();
  ouvrir(data);
});

// ---------- Aperçu et export ----------
function donneesApercu() {
  const f = valeurs();
  return {
    ...f,
    prenom: f.prenom || 'Prénom', nom: f.nom || 'Nom',
    titre: f.titre || 'Titre', courriel: f.courriel || 'prenom@belleflamme.ca',
  };
}
function apercu() { $('apercu').innerHTML = signatureHTML(donneesApercu()); ajusterApercu($('apercu')); }
addEventListener('resize', () => ajusterApercu($('apercu')));

function pret() {
  const f = valeurs();
  if (!f.prenom || !f.nom || !f.titre || !f.courriel) {
    message($('apercu-msg'), 'Remplis prénom, nom, titre et courriel d\'abord.', 'err');
    return null;
  }
  const err = valider(f);
  if (err) { message($('apercu-msg'), err, 'err'); return null; }
  return f;
}

$('btn-copier').addEventListener('click', async () => {
  const f = pret(); if (!f) return;
  const html = signatureHTML(f);
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([signatureTexte(f)], { type: 'text/plain' }),
    })]);
  } catch {
    // Repli : copie de la sélection rendue
    const zone = $('apercu');
    zone.innerHTML = html;
    const r = document.createRange(); r.selectNodeContents(zone);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.execCommand('copy'); s.removeAllRanges();
    ajusterApercu(zone);
  }
  message($('apercu-msg'), 'Signature copiée. Colle-la dans Outlook.', 'ok');
});

$('btn-code').addEventListener('click', async () => {
  const f = pret(); if (!f) return;
  await navigator.clipboard.writeText(signatureHTML(f));
  message($('apercu-msg'), 'Code HTML copié.', 'ok');
});

$('btn-telecharger').addEventListener('click', () => {
  const f = pret(); if (!f) return;
  const blob = new Blob([fichierOutlook(f)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Belleflamme - ${f.prenom} ${f.nom}.htm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// ---------- Gestionnaires ----------
function afficherGestionnaires(liste) {
  const ul = $('liste-gestionnaires');
  ul.replaceChildren();
  const moi = etat.utilisateur?.email?.toLowerCase();
  for (const g of liste) {
    const li = document.createElement('li');
    const t = document.createElement('span'); t.textContent = g.courriel;
    li.append(t);
    if (g.courriel !== moi) {
      const b = document.createElement('button');
      b.className = 'btn-lien'; b.textContent = 'Retirer';
      b.addEventListener('click', async () => {
        if (!confirm(`Retirer ${g.courriel} des gestionnaires? Son compte sera supprimé et il perdra l'accès immédiatement.`)) return;
        const { error } = await sb.from('gestionnaires').delete().eq('courriel', g.courriel);
        if (error) return alert('Erreur : ' + error.message);
        rechargerGestionnaires();
      });
      li.append(b);
    }
    ul.append(li);
  }
}
async function rechargerGestionnaires() {
  const { data } = await sb.from('gestionnaires').select('courriel, nom').order('courriel');
  afficherGestionnaires(data || []);
}
$('form-gestionnaire').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const c = $('gest-courriel').value.trim().toLowerCase();
  if (!c.endsWith(DOMAINE)) return alert(`Seules les adresses ${DOMAINE} sont acceptées.`);
  const { error } = await sb.from('gestionnaires').insert({ courriel: c });
  if (error) return alert(error.code === '23505' ? 'Déjà gestionnaire.' : 'Erreur : ' + error.message);
  $('gest-courriel').value = '';
  rechargerGestionnaires();
  alert(`${c} est ajouté. Il peut maintenant aller sur ${location.host}, entrer son courriel et cliquer « Première connexion ou mot de passe oublié? » pour recevoir son lien.`);
});
