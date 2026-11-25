# Gestion freelance

Application personnelle de gestion pour une activité de graphiste freelance en micro-entreprise :
projets, planning, devis et factures, banque (import CSV Indy) et déclarations Urssaf.

## Lancer en local

```bash
npm install
npm run dev
```

Sans fichier `.env.local`, l'app démarre en **mode démo** : les données restent dans le navigateur.

## Mise en ligne

### 1. Supabase (base de données)
1. Créez un compte sur supabase.com, puis **New project**. Choisissez la région **Europe (Paris ou Francfort)** et notez le mot de passe de la base.
2. Ouvrez **SQL Editor**, puis **New query**. Collez le contenu de `supabase/schema.sql` et cliquez sur **Run**.
3. Ouvrez **Authentication**, puis **Users**, puis **Add user**. Créez votre compte (email et mot de passe) en cochant **Auto confirm**.
4. Dans **Authentication**, puis **Sign In / Providers**, désactivez **Allow new users to sign up**. Vous serez ainsi la seule à pouvoir vous connecter.
5. Dans **Project Settings**, puis **API** (ou **Data API**), copiez **Project URL** et la clé **anon public**.

### 2. Vercel (hébergement)
1. Créez un compte sur vercel.com avec **Continue with GitHub**.
2. Cliquez sur **Add New**, puis **Project**, et importez le dépôt GitHub de l'app.
3. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` : la Project URL
   - `VITE_SUPABASE_ANON_KEY` : la clé anon public
4. Cliquez sur **Deploy**.

### 3. Sur le téléphone
Ouvrez l'adresse Vercel, puis :
- sur iPhone, Safari, bouton Partager, puis **Sur l'écran d'accueil** ;
- sur Android, Chrome, menu ⋮, puis **Installer l'application**.

> Le plan gratuit de Supabase met le projet en pause après 7 jours sans utilisation. Pour le relancer, cliquez sur **Restore** dans le tableau de bord Supabase. Vos données sont conservées.
