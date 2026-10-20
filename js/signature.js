// Génère le HTML de signature courriel Belleflamme.
// Tableaux + styles en ligne : seule structure fiable dans Outlook et Gmail.
// Les images pointent vers des URL publiques (jamais de base64).

export const BASE_IMG = 'https://belleflamme-business-cards.netlify.app/img';

// Texte : Segoe UI (Windows, donc Outlook classique) en premier, puis Avenir (Mac, iPhone),
// proches de la police de la carte originale. Outlook classique exige que la 1re police soit installée.
const F = "font-family:'Segoe UI',Avenir,'Avenir Next',Arial,Helvetica,sans-serif;";
// Nom : Arial Black (installée sur Windows et Mac), la plus proche du nom très gras de l'original.
const FN = "font-family:'Arial Black',Arial,Helvetica,sans-serif;font-weight:900;";
const LIEN = 'color:#111111;text-decoration:none;';
const VERT = '#3cb43c';

export const chiffres = (v) => String(v || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

export function formatTel(v) {
  const d = chiffres(v);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v || '');
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Proportions calquées sur la carte originale (1800 px) réduite à environ 30 %
function ligne(icone, href, texte, alt) {
  return `<tr>
<td width="26" style="padding:4px 12px 4px 0;vertical-align:middle;"><a href="${href}" style="${LIEN}"><img src="${BASE_IMG}/${icone}" width="26" height="26" alt="${alt}" style="display:block;border:0;"></a></td>
<td style="${F}font-size:19px;line-height:22px;padding:4px 0;vertical-align:middle;white-space:nowrap;"><a href="${href}" style="${LIEN}">${texte}</a></td>
</tr>`;
}

export function signatureHTML(e) {
  const nom = `${e.prenom || ''} ${e.nom || ''}`.trim().toUpperCase();
  const cel = chiffres(e.cellulaire);
  const bur = chiffres(e.bureau);
  const poste = String(e.poste || '').replace(/\D/g, '');
  const courriel = String(e.courriel || '').trim().toLowerCase();

  const lignes = [ligne('icone-web.png', 'https://www.belleflamme.ca', 'www.belleflamme.ca', 'Site web')];
  if (courriel) lignes.push(ligne('icone-courriel.png', `mailto:${esc(courriel)}`, esc(courriel), 'Courriel'));
  if (cel.length === 10) lignes.push(ligne('icone-cellulaire.png', `tel:+1${cel}`, `cel. ${formatTel(cel)}`, 'Cellulaire'));
  if (bur.length === 10) {
    // La virgule = pause, puis composition automatique du poste
    const href = `tel:+1${bur}${poste ? ',' + poste : ''}`;
    lignes.push(ligne('icone-bureau.png', href, `bur. ${formatTel(bur)}${poste ? ' poste ' + poste : ''}`, 'Bureau'));
  }

  const titre = esc(e.titre);
  const division = e.division ? esc(e.division) : '';

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
<tr>
<td style="vertical-align:middle;padding-right:10px;"><a href="https://www.belleflamme.ca" style="${LIEN}"><img src="${BASE_IMG}/logo-belleflamme.png" width="192" height="193" alt="Le Groupe Belleflamme" style="display:block;border:0;"></a></td>
<td width="3" style="background:${VERT};width:3px;font-size:0;line-height:0;">&nbsp;</td>
<td style="vertical-align:middle;padding-left:16px;">
<div style="${FN}font-size:26px;line-height:28px;color:#111111;white-space:nowrap;">${esc(nom)}</div>
<div style="${F}font-size:${division ? 19 : 21}px;line-height:${division ? 22 : 25}px;color:#111111;padding-top:1px;${division ? '' : 'padding-bottom:12px;'}white-space:nowrap;">${titre}</div>
${division ? `<div style="${F}font-size:19px;line-height:22px;color:#111111;padding-bottom:12px;white-space:nowrap;">${division}</div>` : ''}
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
${lignes.join('\n')}
</table>
</td>
</tr>
</table>`;
}

export function signatureTexte(e) {
  const l = [`${e.prenom || ''} ${e.nom || ''}`.trim(), e.titre];
  if (e.division) l.push(e.division);
  l.push('Le Groupe Belleflamme', 'www.belleflamme.ca');
  if (e.courriel) l.push(e.courriel);
  if (chiffres(e.cellulaire).length === 10) l.push(`cel. ${formatTel(e.cellulaire)}`);
  if (chiffres(e.bureau).length === 10) l.push(`bur. ${formatTel(e.bureau)}${e.poste ? ' poste ' + e.poste : ''}`);
  return l.filter(Boolean).join('\n');
}

// Fichier .htm pour le dossier Signatures d'Outlook classique
export function fichierOutlook(e) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Signature ${esc(e.prenom)} ${esc(e.nom)}</title></head>
<body style="margin:0;">
${signatureHTML(e)}
</body></html>`;
}
