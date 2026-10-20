-- Schéma du projet Supabase "Businesscards" (yldqwjovshipwnrjwdzs)
-- Déjà appliqué le 19 oct. 2026. Gardé ici comme référence.

create schema if not exists prive;
grant usage on schema prive to authenticated;

create table public.gestionnaires (
  courriel text primary key check (courriel = lower(courriel) and courriel like '%@belleflamme.ca'),
  nom text,
  created_at timestamptz not null default now()
);

create table public.employes (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  titre text not null,
  division text,
  courriel text not null unique check (courriel = lower(courriel)),
  cellulaire text,
  bureau text,
  poste text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Vrai si l'utilisateur connecté est gestionnaire
create or replace function prive.est_gestionnaire()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gestionnaires g where g.courriel = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function prive.est_gestionnaire() from public, anon;
grant execute on function prive.est_gestionnaire() to authenticated;

create or replace function public.employes_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := lower(auth.jwt() ->> 'email');
  return new;
end $$;
revoke all on function public.employes_touch() from public, anon, authenticated;
create trigger employes_touch before insert or update on public.employes
for each row execute function public.employes_touch();

alter table public.gestionnaires enable row level security;
alter table public.employes enable row level security;

create policy "gestionnaires lisent la liste" on public.gestionnaires for select to authenticated using (prive.est_gestionnaire());
create policy "gestionnaires ajoutent gestionnaires" on public.gestionnaires for insert to authenticated with check (prive.est_gestionnaire());
create policy "gestionnaires retirent gestionnaires" on public.gestionnaires for delete to authenticated
  using (prive.est_gestionnaire() and courriel <> lower(auth.jwt() ->> 'email'));

create policy "gestionnaires lisent" on public.employes for select to authenticated using (prive.est_gestionnaire());
create policy "gestionnaires ajoutent" on public.employes for insert to authenticated with check (prive.est_gestionnaire());
create policy "gestionnaires modifient" on public.employes for update to authenticated using (prive.est_gestionnaire()) with check (prive.est_gestionnaire());
create policy "gestionnaires suppriment" on public.employes for delete to authenticated using (prive.est_gestionnaire());

-- Bloque toute création de compte hors @belleflamme.ca
create or replace function prive.bloquer_domaine_externe()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@belleflamme.ca' then
    raise exception 'Seules les adresses @belleflamme.ca peuvent se connecter';
  end if;
  return new;
end $$;
revoke all on function prive.bloquer_domaine_externe() from public, anon, authenticated;
create trigger bloquer_domaine_externe before insert on auth.users
for each row execute function prive.bloquer_domaine_externe();

-- ---------------------------------------------------------------
-- Suivi des mises à jour de signature (option 3), appliqué le 19 oct. 2026
-- ---------------------------------------------------------------
alter table public.employes
  add column jeton uuid not null default gen_random_uuid() unique,  -- lien privé "Ma signature"
  add column version_signature integer not null default 1,          -- +1 à chaque changement d'info affichée
  add column version_confirmee integer not null default 0,          -- dernière version installée par l'employé
  add column confirme_le timestamptz,
  add column demande_le timestamptz;

-- employes_touch() incrémente version_signature quand prenom, nom, titre, division,
-- courriel, cellulaire, bureau ou poste changent.

-- Fonctions publiques (SECURITY DEFINER, appelables sans connexion) : VOULU.
-- Elles ne donnent accès qu'à UN employé actif, et seulement à qui possède son jeton (UUID aléatoire).
--   public.signature_par_jeton(p_jeton uuid)
--   public.confirmer_signature(p_jeton uuid, p_version integer)
-- Fonction réservée aux gestionnaires (SECURITY INVOKER, donc soumise au RLS) :
--   public.demander_mise_a_jour_tous()

-- ---------------------------------------------------------------
-- Logo additionnel (exception par employé), appliqué le 19 oct. 2026
-- ---------------------------------------------------------------
alter table public.employes
  add column logo_secondaire text check (logo_secondaire in ('maison-du-foyer'));
-- employes_touch() compte aussi logo_secondaire comme changement de signature.
-- public.signature_par_jeton_v2(p_jeton uuid) : comme signature_par_jeton, avec logo_secondaire.
-- (signature_par_jeton v1 n'est plus utilisée par le site; à supprimer un jour.)

-- ---------------------------------------------------------------
-- Accès réservé aux gestionnaires, appliqué le 19 oct. 2026
-- ---------------------------------------------------------------
-- prive.bloquer_domaine_externe() refuse maintenant tout courriel absent de public.gestionnaires.
-- Trigger retirer_compte_gestionnaire (after delete on public.gestionnaires) :
--   supprime le compte auth.users correspondant, ce qui coupe l'accès immédiatement.
