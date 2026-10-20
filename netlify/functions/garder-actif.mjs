// Tâche planifiée : une petite requête à Supabase chaque jour pour que le projet
// (plan gratuit) ne soit jamais mis en pause pour inactivité.
// Les résultats sont visibles dans Netlify › Logs › Functions › garder-actif.
const SUPABASE_URL = 'https://yldqwjovshipwnrjwdzs.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable_dWXBxjbdVdHlz1qe5y6SQg_yT6RBb9j';

export default async () => {
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/garder_actif`, {
        method: 'POST',
        headers: { apikey: CLE_PUBLIQUE, authorization: `Bearer ${CLE_PUBLIQUE}`, 'content-type': 'application/json' },
        body: '{}',
      });
      const texte = await r.text();
      if (r.ok) { console.log(`Supabase actif (essai ${essai}) : ${texte}`); return; }
      console.error(`Essai ${essai} : HTTP ${r.status} ${texte}`);
    } catch (e) {
      console.error(`Essai ${essai} : ${e.message}`);
    }
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  console.error('ÉCHEC : Supabase ne répond pas. Le projet est peut-être en pause : le restaurer dans le tableau de bord Supabase.');
};

// Tous les jours à 8 h 05 (heure de Toronto en été, 13 h 05 UTC). Cron en UTC.
export const config = { schedule: '5 13 * * *' };
