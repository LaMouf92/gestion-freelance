-- =====================================================================
-- Schéma de la base de données — à coller une seule fois dans
-- Supabase > SQL Editor > New query, puis "Run".
-- Chaque table est protégée : seul l'utilisateur connecté voit ses données.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Paramètres (une ligne par utilisateur) ----------
create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  full_name text default '',
  trade_name text default '',
  address text default '',
  siret text default '',
  email text default '',
  phone text default '',
  iban text default '',
  bic text default '',
  website text default '',
  tva_enabled boolean default false,
  tva_rate numeric default 20,
  tva_number text default '',
  invoice_prefix text default 'GA',
  quote_prefix text default 'DA',
  quote_validity_days int default 30,
  payment_terms_days int default 30,
  payment_terms text default 'Paiement à 30 jours par virement bancaire.',
  late_penalty_text text default 'En cas de retard de paiement, des pénalités au taux de 3 fois le taux d''intérêt légal seront exigibles, ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 € (clients professionnels).',
  footer_note text default '',
  micro_threshold numeric default 77700,
  logo_path text,
  updated_at timestamptz default now()
);

-- ---------- Activités (Graphisme, Sudal Care…) ----------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text default '#0203e9',
  category text default 'BNC',            -- BNC | BIC_services | BIC_vente
  contribution_rate numeric default 26.1,  -- % cotisations sociales
  cfp_rate numeric default 0.2,            -- % formation professionnelle
  notes text default '',
  archived boolean default false,
  created_at timestamptz default now()
);

-- ---------- Clients ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text default 'pro',                 -- pro | particulier
  name text not null,
  contact_name text default '',
  email text default '',
  phone text default '',
  address text default '',
  siret text default '',
  tva_number text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ---------- Projets ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  activity_id uuid references activities on delete set null,
  client_id uuid references clients on delete set null,
  title text not null,
  status text default 'prospect',          -- prospect | devis | en_cours | livre | paye | archive
  start_date date,
  due_date date,
  delivered_date date,
  brief text default '',
  deliverables text default '',
  revisions_included int default 2,
  revisions_done int default 0,
  time_spent_hours numeric default 0,
  estimated_amount numeric,             -- montant estimé tant qu'il n'y a pas de devis
  links jsonb default '[]'::jsonb,         -- [{label, url}]
  rights_assignment text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- (mise à jour d'une base déjà créée)
alter table projects add column if not exists estimated_amount numeric;

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid not null references projects on delete cascade,
  title text not null,
  date date not null,
  done boolean default false
);

-- ---------- Devis & factures ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,                      -- devis | facture | acompte
  source text default 'app',               -- app | indy
  number text,                             -- attribué à l'émission (null = brouillon)
  status text default 'brouillon',         -- brouillon | envoye | accepte | refuse | paye | annule
  project_id uuid references projects on delete set null,
  client_id uuid references clients on delete set null,
  activity_id uuid references activities on delete set null,
  parent_id uuid references documents on delete set null, -- devis d'origine
  issue_date date default current_date,
  due_date date,
  title text default '',
  lines jsonb default '[]'::jsonb,         -- [{description, qty, unit, unit_price}]
  deposit_percent numeric,                 -- pour les factures d'acompte
  deposits_deducted jsonb default '[]'::jsonb, -- [{document_id, number, amount}]
  tva_rate numeric default 0,
  total_ht numeric default 0,
  total_tva numeric default 0,
  total_ttc numeric default 0,
  notes text default '',
  client_snapshot jsonb,                   -- copie figée du client à l'émission
  issuer_snapshot jsonb,                   -- copie figée de vos infos à l'émission
  file_path text,                          -- PDF importé (Indy)
  created_at timestamptz default now(),
  unique (user_id, kind, number)
);

-- Compteurs de numérotation (une série par préfixe et par année)
create table if not exists number_series (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  series text not null,                    -- ex. GA-2026
  last_value int not null default 0,
  primary key (user_id, series)
);

-- Attribution atomique du prochain numéro (évite tout doublon)
create or replace function next_number(p_series text)
returns int language plpgsql security invoker as $$
declare v int;
begin
  insert into number_series (user_id, series, last_value)
  values (auth.uid(), p_series, 1)
  on conflict (user_id, series)
  do update set last_value = number_series.last_value + 1
  returning last_value into v;
  return v;
end $$;

-- ---------- Banque ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  label text not null,
  amount numeric not null,                 -- positif = entrée, négatif = sortie
  category text default '',
  activity_id uuid references activities on delete set null,
  notes text default '',
  import_hash text,                        -- évite d'importer deux fois la même ligne
  raw jsonb,
  created_at timestamptz default now(),
  unique (user_id, import_hash)
);

-- ---------- Encaissements (base du CA déclaré à l'Urssaf) ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  activity_id uuid references activities on delete set null,
  document_id uuid references documents on delete set null,
  transaction_id uuid references transactions on delete set null,
  amount numeric not null,
  paid_on date not null,
  method text default 'virement',
  notes text default '',
  created_at timestamptz default now()
);

-- ---------- Déclarations Urssaf ----------
create table if not exists urssaf_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period date not null,                    -- 1er jour du mois déclaré
  activity_id uuid references activities on delete cascade,
  declared_revenue numeric default 0,
  contribution_amount numeric default 0,
  declared_on date,
  paid_amount numeric default 0,
  paid_on date,
  notes text default '',
  unique (user_id, period, activity_id)
);

-- ---------- Fichiers rattachés aux projets ----------
create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references projects on delete cascade,
  name text not null,
  path text not null,
  created_at timestamptz default now()
);

-- ---------- Sécurité : chacun ne voit que ses lignes ----------
do $$
declare t text;
begin
  foreach t in array array['settings','activities','clients','projects','milestones',
    'documents','number_series','transactions','payments','urssaf_declarations','project_files']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format('create policy own_rows on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Stockage des fichiers (PDF, logo…) ----------
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

drop policy if exists "own files" on storage.objects;
create policy "own files" on storage.objects for all
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
