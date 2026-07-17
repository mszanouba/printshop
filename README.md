# 🖨️ PrintShop — Service d'impression en ligne

**Prototype fonctionnel** d'une application web de commande d'impression de documents PDF.

---

## Ce que fait l'application

L'utilisateur peut :

1. **Créer un compte** et **se connecter** (authentification sécurisée par JWT)
2. **Téléverser un fichier PDF** — le système détecte automatiquement le nombre de pages
3. **Choisir ses options d'impression** :
   - Noir & Blanc ou Couleur
   - Recto seul ou Recto-verso
   - Nombre de copies
4. **Voir le prix calculé en temps réel** selon les options choisies
5. **Passer la commande** et recevoir une confirmation avec récapitulatif
6. **Consulter l'historique** de toutes ses commandes passées
7. **Recommander** à partir d'une ancienne commande (le fichier et les options sont pré-remplis, modifiables avant de valider)

---

## Grille tarifaire

| Type d'impression | ≤ 50 pages  | > 50 pages (−20%) |
|-------------------|:-----------:|:------------------:|
| Noir & Blanc      | 0,50 DH     | 0,40 DH            |
| Couleur           | 1,00 DH     | 0,80 DH            |

**Recto-verso** : le prix est calculé sur le nombre de **feuilles** (⌈pages ÷ 2⌉) au lieu du nombre de pages.

**Copies** : le prix est multiplié par le nombre de copies demandées.

**Exemple** : un PDF de 80 pages, en N&B, recto-verso, 2 copies → 40 feuilles × 0,40 DH × 2 = **32,00 DH**

---

## Stack technique

| Couche    | Technologie                                  |
|-----------|----------------------------------------------|
| Backend   | Python 3.11 · FastAPI · SQLAlchemy · SQLite  |
| Auth      | JWT (python-jose) · bcrypt                   |
| PDF       | pypdf (détection du nombre de pages)         |
| Frontend  | React 18 · Vite                              |
| Style     | CSS custom (palette orange pastel, responsive)|

---

## Architecture du projet

```
printshop/
├── backend/
│   ├── main.py            ← Routes API + serveur de fichiers statiques
│   ├── models.py           ← Modèles BDD (User, Commande)
│   ├── database.py         ← Configuration SQLite / SQLAlchemy
│   ├── auth.py             ← Hashing mot de passe + JWT
│   ├── requirements.txt    ← Dépendances Python
│   └── uploads/            ← PDFs stockés sur le serveur
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Composant principal (Auth + Dashboard + Historique)
│   │   ├── App.css         ← Tous les styles
│   │   ├── api.js          ← Client HTTP (appels vers /api)
│   │   └── main.jsx        ← Point d'entrée React
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      ← Proxy dev /api → localhost:8000
│
├── build.sh                ← Script de build pour le déploiement
├── render.yaml             ← Configuration Render (hébergement gratuit)
└── README.md
```

---

## API Endpoints

| Méthode | Route              | Auth requise | Description                          |
|---------|--------------------|:------------:|--------------------------------------|
| POST    | `/api/register`    | ✗            | Créer un compte (nom, email, mdp)    |
| POST    | `/api/login`       | ✗            | Se connecter → reçoit un token JWT   |
| POST    | `/api/upload`      | ✓            | Uploader un PDF → retourne nb pages  |
| POST    | `/api/commander`   | ✓            | Passer une commande → prix calculé   |
| GET     | `/api/commandes`   | ✓            | Lister l'historique des commandes    |
| GET     | `/api/prix`        | ✗            | Tester le calcul de prix (utilitaire)|

L'authentification se fait via le header `Authorization: Bearer <token>`.
Le token JWT est valide **30 jours**.

---

## Lancement en local

### Prérequis

- Python 3.10+ installé
- Node.js 18+ installé

### 1. Lancer le backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Le serveur API tourne sur **http://localhost:8000**
La documentation Swagger est accessible sur **http://localhost:8000/docs**

### 2. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface tourne sur **http://localhost:5173**

> En développement, le proxy Vite redirige automatiquement les appels `/api/*` vers le backend sur le port 8000.

---

## Déploiement gratuit (Render)

L'application peut être hébergée gratuitement sur [Render](https://render.com) avec un seul service (backend + frontend combinés).

### Étapes

1. **Créer un compte** sur [render.com](https://render.com) (pas de carte bancaire nécessaire)

2. **Pousser le projet sur GitHub** :
   ```bash
   cd printshop
   git init
   git add .
   git commit -m "PrintShop prototype"
   ```
   Créer un repo sur GitHub, puis :
   ```bash
   git remote add origin https://github.com/VOTRE_USER/printshop.git
   git push -u origin main
   ```

3. **Sur Render** → New → **Web Service** → connecter le repo GitHub

4. **Configurer** :
   - **Runtime** : Python
   - **Build Command** : `bash build.sh`
   - **Start Command** : `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type** : Free

5. **Cliquer sur Deploy** — Render installe tout, build le frontend, et lance le serveur.

6. L'application sera accessible à : `https://printshop-xxxx.onrender.com`

> **Note** : sur le plan gratuit, le serveur se met en veille après 15 min d'inactivité. La première visite après une pause prend ~30 secondes pour redémarrer. C'est normal et suffisant pour une démo.

---

## Fonctionnement détaillé

### Authentification
- À l'inscription, le mot de passe est hashé avec **bcrypt** avant stockage en base.
- À la connexion, un **token JWT** est généré (valide 30 jours) et stocké côté navigateur.
- Chaque requête protégée envoie le token dans le header HTTP.
- Si le token expire, l'utilisateur est redirigé automatiquement vers la page de connexion.

### Upload et détection des pages
- Le fichier PDF est envoyé au serveur via `multipart/form-data`.
- Le serveur vérifie l'extension `.pdf`, stocke le fichier dans le dossier `uploads/`.
- La bibliothèque **pypdf** ouvre le fichier et compte les pages.
- Le nombre de pages est renvoyé au frontend pour le calcul du prix.

### Calcul du prix
- Le prix est calculé **côté client** (affichage en temps réel) ET **côté serveur** (validation à la commande).
- La logique est identique des deux côtés pour garantir la cohérence.
- Formule : `prix = nb_unités × prix_par_page × nb_copies`
  - `nb_unités` = nombre de pages (recto) ou ⌈pages ÷ 2⌉ (recto-verso)
  - `prix_par_page` dépend du type (N&B/couleur) et du palier de volume

### Historique et recommande
- L'historique charge les commandes de l'utilisateur connecté, triées par date décroissante.
- Chaque commande peut être dépliée pour voir le détail complet.
- Le bouton **"Recommander avec ce fichier"** pré-remplit le formulaire de nouvelle commande avec le fichier et les options de l'ancienne commande, tout en permettant de modifier les paramètres avant de valider.

---

## Choix techniques

| Choix                      | Justification                                                    |
|----------------------------|------------------------------------------------------------------|
| FastAPI                    | Framework Python rapide, typage natif, doc Swagger auto-générée |
| SQLite                     | Base embarquée, zéro config, suffisante pour un prototype        |
| JWT (30 jours)             | Authentification stateless, pas de session serveur               |
| bcrypt                     | Standard de hashing de mots de passe, résistant au brute-force   |
| pypdf                      | Lecture PDF légère, pas de dépendance système                    |
| React + Vite               | Build rapide, hot reload, écosystème mature                      |
| CSS custom (sans framework)| Contrôle total du design, code léger                             |
| Proxy Vite (dev)           | Évite les problèmes de CORS en développement                    |
| Fichier statique (prod)    | FastAPI sert le build React → un seul serveur, un seul URL       |