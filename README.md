# Signatures courriel Belleflamme

Petite app pour créer les signatures courriel HTML des employés du Groupe Belleflamme.

- **Site** : https://belleflamme-signature.netlify.app (Netlify, statique, aucun build)
- **Base de données** : Supabase, projet `Businesscards` (`yldqwjovshipwnrjwdzs`)
- **Accès** : lien magique par courriel, réservé aux adresses `@belleflamme.ca` inscrites dans la table `gestionnaires`

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css` | Interface |
| `js/app.js` | Connexion, liste des employés, formulaire, copie et téléchargement |
| `js/signature.js` | Génère le HTML de la signature (tableaux + styles en ligne pour Outlook/Gmail) |
| `js/repertoire.js` | Onglet Répertoire : tous les employés, modifiables dans les cellules |
| `js/suivi.js` | Statut de signature (à jour / à mettre à jour) et envoi du lien |
| `ma-signature.html`, `js/ma-signature.js` | Page personnelle de chaque employé (lien privé) : copier, télécharger, confirmer |
| `js/config.js` | URL et clé **publique** Supabase (sans danger côté navigateur, la sécurité est dans les règles RLS) |
| `img/` | Logo et icônes utilisés par **toutes les signatures envoyées** |
| `supabase/schema.sql` | Référence du schéma (déjà appliqué) |

## Règle d'or

Les signatures pointent vers `https://belleflamme-signature.netlify.app/img/...`.
**Ne jamais renommer, déplacer ni supprimer un fichier de `img/`**, et ne plus jamais renommer le site Netlify : chaque courriel déjà envoyé perdrait son logo.
(Le site s'appelait `belleflamme-business-cards` jusqu'au 19 oct. 2026, avant toute diffusion des signatures.)
Pour changer d'adresse un jour sans briser les anciens courriels, il faudra un domaine à soi (ex. `signature.belleflamme.ca`) qui redirige.
Pour changer une image, ajoute un nouveau fichier (ex. `logo-belleflamme-v2.png`) et mets à jour `js/signature.js`.

## Mise à jour des signatures (option 3)

Une signature collée dans Outlook est une copie figée : Microsoft n'offre aucun moyen de la remplacer à distance.
Le fonctionnement retenu :

1. Tu modifies un employé (fiche ou répertoire). S'il s'agit d'une info affichée dans la signature, sa signature passe à « À mettre à jour ».
2. « Envoyer » ouvre un brouillon dans ton Outlook avec le lien privé de l'employé.
3. L'employé ouvre le lien, copie sa signature, la colle dans Outlook et clique « C'est fait ». Le statut redevient « À jour ».
4. Après un changement de design, « Demander à tous de mettre à jour » remet tout le monde à « À mettre à jour ».

Plus tard : l'envoi pourra être automatique avec Resend (domaine belleflamme.ca à vérifier dans le DNS).

## Sécurité

- RLS activé sur `employes` et `gestionnaires` : un compte connecté qui n'est pas gestionnaire ne voit rien.
- Un trigger sur `auth.users` refuse toute création de compte dont le courriel n'est pas dans `gestionnaires`.
- Les fonctions sensibles sont dans le schéma `prive`, non exposé par l'API.
- Exception voulue : `signature_par_jeton` et `confirmer_signature` sont publiques (page « Ma signature »). Elles exigent le jeton privé de l'employé et n'exposent que les infos déjà visibles dans sa signature. Si un lien circule par erreur, il suffit de régénérer le jeton (`update employes set jeton = gen_random_uuid() where ...`).

## Connexion des gestionnaires

- **La table `gestionnaires` est la seule porte d'entrée.** Un trigger sur `auth.users` refuse la création de tout compte dont le courriel n'y est pas (et hors @belleflamme.ca).
- **Ajouter un gestionnaire** : dans l'app, section Gestionnaires, ajouter son courriel. Il va ensuite sur le site, entre son courriel, clique « Première connexion ou mot de passe oublié? », ouvre le lien reçu, puis choisit un mot de passe via « Mon mot de passe ».
- **Retirer un gestionnaire** : le retirer de la liste supprime aussi son compte (trigger `retirer_compte_gestionnaire`). Il perd l'accès immédiatement. On ne peut pas se retirer soi-même.
- Ensuite, connexion par **courriel + mot de passe** (retenus par le navigateur); la session reste ouverte.
- **Envoi des liens** : le serveur d'envoi par défaut de Supabase n'envoie qu'aux membres de l'équipe Supabase. Pour les autres gestionnaires, brancher un SMTP (Resend, Microsoft 365) dans Authentication › Emails › SMTP Settings.

## Configuration Supabase à faire dans le tableau de bord

1. **Authentication › URL Configuration**
   - Site URL : `https://belleflamme-signature.netlify.app`
   - Redirect URLs : `https://belleflamme-signature.netlify.app/**`
2. **Authentication › Emails › SMTP Settings** : brancher un vrai serveur d'envoi (Resend, Microsoft 365, etc.).
   Sans ça, Supabase n'envoie les liens de connexion qu'aux membres de l'équipe Supabase, avec une limite très basse par heure.

## Installer une signature

- **Outlook Web / nouvel Outlook** : « Copier la signature », puis Paramètres › Comptes › Signatures, coller.
- **Outlook classique** : « Télécharger pour Outlook classique », mettre le `.htm` dans `%APPDATA%\Microsoft\Signatures`, redémarrer Outlook.
- **Outlook mobile** : texte seulement, mettre une version courte.
