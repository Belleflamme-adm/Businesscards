// Suivi des mises à jour de signature : lien personnel, statut, envoi du lien.

export const lienSignature = (e) =>
  `${location.origin}/ma-signature.html?t=${encodeURIComponent(e.jeton)}`;

export const estAJour = (e) => e.version_confirmee >= e.version_signature;

const dateCourte = (iso) => new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

// { texte, classe } pour afficher l'état de la signature d'un employé
export function statut(e) {
  if (!e.actif) return { texte: 'Inactif', classe: 'gris' };
  if (estAJour(e)) {
    return { texte: e.confirme_le ? `À jour (${dateCourte(e.confirme_le)})` : 'À jour', classe: 'vert' };
  }
  const premiere = e.version_confirmee === 0;
  if (e.demande_le) return { texte: `Lien envoyé le ${dateCourte(e.demande_le)}`, classe: 'orange' };
  return { texte: premiere ? 'Jamais installée' : 'À mettre à jour', classe: 'rouge' };
}

// Ouvre un brouillon dans le logiciel courriel de l'utilisateur (Outlook), puis note la demande.
export async function envoyerLien(sb, e) {
  const lien = lienSignature(e);
  const premiere = e.version_confirmee === 0;
  const sujet = premiere ? 'Ta signature courriel Belleflamme' : 'Mise à jour de ta signature courriel';
  const corps = [
    `Bonjour ${e.prenom},`,
    '',
    premiere
      ? 'Ta signature courriel Belleflamme est prête.'
      : 'Tes informations ont changé, ta signature courriel doit être mise à jour.',
    '',
    'Clique sur ce lien, puis suis les 3 étapes (environ 30 secondes) :',
    lien,
    '',
    'Merci!',
  ].join('\r\n');
  location.href = `mailto:${encodeURIComponent(e.courriel)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  const { data } = await sb.from('employes').update({ demande_le: new Date().toISOString() })
    .eq('id', e.id).select().single();
  return data || e;
}
