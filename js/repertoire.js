// Répertoire : tableau de tous les employés, modifiable directement dans les cellules.
import { chiffres, formatTel } from './signature.js';
import { statut, envoyerLien, lienSignature } from './suivi.js';

const COLONNES = [
  { champ: 'prenom', requis: true },
  { champ: 'nom', requis: true },
  { champ: 'titre', requis: true, large: true },
  { champ: 'division', large: true },
  { champ: 'courriel', requis: true, large: true, type: 'email' },
  { champ: 'cellulaire', tel: true },
  { champ: 'bureau', tel: true },
  { champ: 'poste', etroit: true },
];

// Valeur affichée dans la cellule
const afficher = (col, v) => (col.tel ? formatTel(v) : (v ?? ''));

// Valeur à enregistrer, ou { erreur }
function normaliser(col, brut) {
  const v = brut.trim();
  if (col.requis && !v) return { erreur: 'Champ obligatoire.' };
  if (col.tel) {
    if (!v) return { valeur: null };
    const d = chiffres(v);
    return d.length === 10 ? { valeur: d } : { erreur: 'Le numéro doit avoir 10 chiffres.' };
  }
  if (col.champ === 'poste') return { valeur: v.replace(/\D/g, '') || null };
  if (col.champ === 'courriel') {
    const c = v.toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c) ? { valeur: c } : { erreur: 'Courriel invalide.' };
  }
  return { valeur: v || null };
}

export function creerRepertoire({ sb, $, etat, rafraichirAilleurs }) {
  const tbody = $('rep-table').querySelector('tbody');
  const msg = $('rep-msg');
  const dire = (t, type = '') => {
    msg.textContent = t; msg.className = 'msg' + (type ? ' ' + type : '');
    if (type === 'ok') setTimeout(() => { if (msg.textContent === t) msg.textContent = ''; }, 3000);
  };

  function cellStatut(td, e) {
    const s = statut(e);
    td.replaceChildren();
    const b = document.createElement('span');
    b.className = 'pastille ' + s.classe; b.textContent = s.texte;
    td.append(b);
  }

  function ligne(e) {
    const tr = document.createElement('tr');
    tr.dataset.id = e.id;
    if (!e.actif) tr.classList.add('inactif');

    for (const col of COLONNES) {
      const td = document.createElement('td');
      td.className = 'c-' + col.champ;
      const inp = document.createElement('input');
      inp.value = afficher(col, e[col.champ]);
      inp.setAttribute('aria-label', col.champ);
      if (col.type) inp.type = col.type;
      if (col.tel || col.champ === 'poste') inp.inputMode = 'numeric';
      inp.addEventListener('focus', () => { if (!inp.classList.contains('erreur')) inp.dataset.avant = inp.value; });
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
        if (ev.key === 'Escape') { inp.value = inp.dataset.avant; inp.classList.remove('erreur'); inp.blur(); }
      });
      inp.addEventListener('blur', async () => {
        if (inp.value === inp.dataset.avant) return;
        const n = normaliser(col, inp.value);
        if (n.erreur) { inp.classList.add('erreur'); dire(n.erreur, 'err'); inp.focus(); return; }
        const courant = etat.employes.find((x) => x.id === e.id);
        if ((courant[col.champ] ?? null) === n.valeur) { inp.value = afficher(col, n.valeur); return; }
        inp.classList.remove('erreur'); inp.classList.add('envoi');
        const { data, error } = await sb.from('employes').update({ [col.champ]: n.valeur })
          .eq('id', e.id).select().single();
        inp.classList.remove('envoi');
        if (error) {
          inp.classList.add('erreur');
          return dire(error.code === '23505' ? 'Ce courriel existe déjà.' : 'Erreur : ' + error.message, 'err');
        }
        Object.assign(courant, data);
        inp.value = afficher(col, data[col.champ]);
        inp.dataset.avant = inp.value;
        inp.classList.add('ok'); setTimeout(() => inp.classList.remove('ok'), 900);
        cellStatut(tr.querySelector('.col-statut'), courant);
        compter();
        dire(`${data.prenom} ${data.nom} : enregistré.`, 'ok');
        rafraichirAilleurs(courant);
      });
      td.append(inp);
      tr.append(td);
    }

    const tdS = document.createElement('td'); tdS.className = 'col-statut';
    cellStatut(tdS, e); tr.prepend(tdS);

    const tdA = document.createElement('td'); tdA.className = 'col-actions';
    const bEnv = document.createElement('button');
    bEnv.className = 'btn btn-sec petit'; bEnv.textContent = 'Envoyer'; bEnv.title = 'Envoyer le lien de mise à jour';
    bEnv.disabled = !e.actif;
    bEnv.addEventListener('click', async () => {
      const courant = etat.employes.find((x) => x.id === e.id);
      const maj = await envoyerLien(sb, courant);
      Object.assign(courant, maj);
      cellStatut(tdS, courant);
      compter();
      rafraichirAilleurs(courant);
    });
    const bCop = document.createElement('button');
    bCop.className = 'btn-lien'; bCop.textContent = 'Copier'; bCop.title = 'Copier le lien personnel';
    bCop.addEventListener('click', async () => {
      await navigator.clipboard.writeText(lienSignature(e));
      dire(`Lien de ${e.prenom} copié.`, 'ok');
    });
    tdA.append(bEnv, bCop);
    tr.append(tdA);
    return tr;
  }

  function afficher_() {
    const q = $('rep-recherche').value.trim().toLowerCase();
    const liste = etat.employes.filter((e) =>
      !q || `${e.prenom} ${e.nom} ${e.titre} ${e.division || ''} ${e.courriel}`.toLowerCase().includes(q));
    // Actifs d'abord
    liste.sort((a, b) => (b.actif - a.actif) || a.prenom.localeCompare(b.prenom, 'fr'));
    tbody.replaceChildren(...liste.map(ligne));
    compter();
  }

  function compter() {
    const actifs = etat.employes.filter((e) => e.actif);
    const aJour = actifs.filter((e) => statut(e).classe === 'vert').length;
    $('rep-compte').textContent = `${actifs.length} employés actifs · ${aJour} à jour · ${actifs.length - aJour} à mettre à jour`;
  }

  $('rep-recherche').addEventListener('input', afficher_);
  $('rep-tous').addEventListener('click', async () => {
    if (!confirm('Marquer toutes les signatures comme « à mettre à jour »? À utiliser après un changement de design.')) return;
    const { error } = await sb.rpc('demander_mise_a_jour_tous');
    if (error) return dire('Erreur : ' + error.message, 'err');
    const { data } = await sb.from('employes').select('*');
    etat.employes = data || etat.employes;
    afficher_();
    dire('Tout le monde est à mettre à jour. Envoie les liens.', 'ok');
  });

  return { afficher: afficher_ };
}
