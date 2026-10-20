// Page d'invitation d'un gestionnaire : il choisit son mot de passe, son compte est créé.
// La base refuse la création si l'invitation est absente, déjà utilisée ou d'un autre courriel.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE);
const $ = (id) => document.getElementById(id);
const invitation = new URLSearchParams(location.search).get('i') || '';

function dire(t, type = '') { $('b-msg').textContent = t; $('b-msg').className = 'msg' + (type ? ' ' + type : ''); }

function invalide(texte) {
  $('chargement').hidden = true;
  if (texte) $('invalide-texte').textContent = texte;
  $('invalide').hidden = false;
}

async function charger() {
  if (!/^[0-9a-f-]{36}$/i.test(invitation)) return invalide();
  const { data, error } = await sb.rpc('invitation_gestionnaire', { p_invitation: invitation });
  if (error || !data?.length) return invalide();
  if (!data[0].valide) {
    return invalide('Cette invitation a déjà été utilisée. Connecte-toi avec ton courriel et ton mot de passe, ou demande à un gestionnaire de réinitialiser ton accès.');
  }
  $('b-courriel').value = data[0].courriel;
  $('chargement').hidden = true;
  $('form-bienvenue').hidden = false;
  $('b-mdp').focus();
}

$('form-bienvenue').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const mdp = $('b-mdp').value;
  if (mdp.length < 10) return dire('Au moins 10 caractères.', 'err');
  if (mdp !== $('b-confirme').value) return dire('Les deux mots de passe ne sont pas identiques.', 'err');
  dire('Création de ton accès...');
  const { data, error } = await sb.auth.signUp({
    email: $('b-courriel').value,
    password: mdp,
    options: { data: { invitation } },
  });
  if (error) {
    const m = error.message || '';
    if (/database error|invitation_invalide|acces_refuse/i.test(m)) return dire('Invitation refusée. Demande à un gestionnaire de t\'en envoyer une nouvelle.', 'err');
    if (/already registered/i.test(m)) return dire('Ce compte existe déjà. Connecte-toi sur la page d\'accueil.', 'err');
    if (/weak|at least/i.test(m)) return dire('Mot de passe trop faible. Allonge-le ou ajoute des chiffres et symboles.', 'err');
    return dire('Erreur : ' + m, 'err');
  }
  if (!data.session) {
    // « Confirm email » encore activé dans Supabase : le compte attend une confirmation qui ne partira pas
    return dire('Ton compte est créé, mais il doit être activé. Avise Simon : l\'option « Confirm email » est encore active dans Supabase.', 'err');
  }
  dire('Accès créé! Redirection...', 'ok');
  setTimeout(() => { location.href = '/'; }, 800);
});

charger();
