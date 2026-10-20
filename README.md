# Signatures courriel Belleflamme

Petite app pour créer les signatures courriel HTML des employés du Groupe Belleflamme.

- **Site** : https://belleflamme-business-cards.netlify.app (Netlify, statique, aucun build)
- **Base de données** : Supabase, projet `Businesscards` (`yldqwjovshipwnrjwdzs`)
- **Accès** : lien magique par courriel, réservé aux adresses `@belleflamme.ca` inscrites dans la table `gestionnaires`

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css` | Interface |
| `js/app.js` | Connexion, liste des employés, formulaire, copie et téléchargement |
| `js/signature.js` | Génère le HTML de la signature (tableaux + styles en ligne pour Outlook/Gmail) |
| `js/config.js` | URL et clé **publique** Supabase (sans danger côté navigateur, la sécurité est dans les règles RLS) |
| `img/` | Logo et icônes utilisés par **toutes les signatures envoyées** |
| `supabase/schema.sql` | Référence du schéma (déjà appliqué) |

## Règle d'or

Les signatures pointent vers `https://belleflamme-business-cards.netlify.app/img/...`.
**Ne jamais renommer, déplacer ni supprimer un fichier de `img/`**, et ne jamais renommer le site Netlify : chaque courriel déjà envoyé perdrait son logo.
Pour changer une image, ajoute un nouveau fichier (ex. `logo-belleflamme-v2.png`) et mets à jour `js/signature.js`.

## Sécurité

- RLS activé sur `employes` et `gestionnaires` : un compte connecté qui n'est pas gestionnaire ne voit rien.
- Un trigger sur `auth.users` refuse toute création de compte hors `@belleflamme.ca`.
- Les fonctions sensibles sont dans le schéma `prive`, non exposé par l'API.

## Configuration Supabase à faire dans le tableau de bord

1. **Authentication › URL Configuration**
   - Site URL : `https://belleflamme-business-cards.netlify.app`
   - Redirect URLs : `https://belleflamme-business-cards.netlify.app/**`
2. **Authentication › Emails › SMTP Settings** : brancher un vrai serveur d'envoi (Resend, Microsoft 365, etc.).
   Sans ça, Supabase n'envoie les liens de connexion qu'aux membres de l'équipe Supabase, avec une limite très basse par heure.

## Installer une signature

- **Outlook Web / nouvel Outlook** : « Copier la signature », puis Paramètres › Comptes › Signatures, coller.
- **Outlook classique** : « Télécharger pour Outlook classique », mettre le `.htm` dans `%APPDATA%\Microsoft\Signatures`, redémarrer Outlook.
- **Outlook mobile** : texte seulement, mettre une version courte.
