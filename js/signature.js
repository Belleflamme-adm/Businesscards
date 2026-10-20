// Génère le HTML de signature courriel Belleflamme.
// Tableaux + styles en ligne : seule structure fiable dans Outlook et Gmail.
// Les images pointent vers des URL publiques (jamais de base64).

export const BASE_IMG = 'https://belleflamme-business-cards.netlify.app/img';

const F = 'font-family:Arial,Helvetica,sans-serif;';
const LIEN = 'color:#111111;text-decoration:none;';
const VERT = '#3cb43c';

export const chiffres = (v) => String(v || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

export function formatTel(v) {
  const d = chiffres(v);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v || '');
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ligne(icone, href, texte, alt) {
  return `<tr>
<td width="26" style="padding:4px 12px 4px 0;vertical-align:middle;"><a href="${href}" style="${LIEN}"><img src="${BASE_IMG}/${icone}" width="22" height="22" alt="${alt}" style="display:block;border:0;"></a></td>
<td style="${F}font-size:15px;line-height:20px;padding:4px 0;vertical-align:middle;"><a href="${href}" style="${LIEN}">${texte}</a></td>
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

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;${F}">
<tr>
<td style="vertical-align:middle;padding-right:22px;"><a href="https://www.belleflamme.ca" style="${LIEN}"><img src="${BASE_IMG}/logo-belleflamme.png" width="130" height="131" alt="Le Groupe Belleflamme" style="display:block;border:0;"></a></td>
<td width="3" style="background:${VERT};width:3px;font-size:0;line-height:0;">&nbsp;</td>
<td style="vertical-align:middle;padding-left:22px;">
<div style="${F}font-size:24px;line-height:28px;font-weight:bold;color:#111111;letter-spacing:0.5px;">${esc(nom)}</div>
<div style="${F}font-size:15px;line-height:20px;color:#222222;padding-top:4px;${division ? '' : 'padding-bottom:10px;'}">${titre}</div>
${division ? `<div style="${F}font-size:15px;line-height:20px;color:#222222;padding-bottom:10px;">${division}</div>` : ''}
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
