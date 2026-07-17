import os
import math

from fastapi import FastAPI, UploadFile, Depends, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pypdf import PdfReader

from database import engine, Base, get_db
from models import User, Commande
from auth import hash_password, verify_password, create_token, decode_token

# Créer les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PrintShop API")

# CORS pour le frontend React (Vite tourne sur le port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

security = HTTPBearer()


# ──────────────────────────────────────────────
# Schemas Pydantic
# ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nom: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CommandeRequest(BaseModel):
    fichier_nom: str
    fichier_path: str
    nb_pages: int
    couleur: bool = False
    recto_verso: bool = False
    nb_copies: int = 1


# ──────────────────────────────────────────────
# Dépendance : récupérer l'utilisateur courant
# ──────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    return user


# ──────────────────────────────────────────────
# Calcul du prix
# ──────────────────────────────────────────────

def calculer_prix(nb_pages: int, couleur: bool, recto_verso: bool, nb_copies: int = 1) -> float:
    """
    Tarification :
      - N&B  : 0.50 DH/page (≤50 pages), 0.40 DH/page (>50 pages)
      - Couleur : 1.00 DH/page (≤50 pages), 0.80 DH/page (>50 pages)
      - Recto-verso : on facture par feuille (= ceil(pages / 2))
      - Copies : prix × nb_copies
    """
    if couleur:
        prix_page = 1.00 if nb_pages <= 50 else 0.80
    else:
        prix_page = 0.50 if nb_pages <= 50 else 0.40

    if recto_verso:
        nb_unites = math.ceil(nb_pages / 2)
    else:
        nb_unites = nb_pages

    return round(nb_unites * prix_page * max(nb_copies, 1), 2)


# ──────────────────────────────────────────────
# Routes : Authentification
# ──────────────────────────────────────────────

@app.post("/api/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    user = User(
        nom=data.nom,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"token": create_token(user.id), "nom": user.nom}


@app.post("/api/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    return {"token": create_token(user.id), "nom": user.nom}


# ──────────────────────────────────────────────
# Routes : Upload PDF
# ──────────────────────────────────────────────

@app.post("/api/upload")
def upload_pdf(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    # Sauvegarder sur disque
    safe_name = f"{user.id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    content = file.file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Compter les pages
    try:
        reader = PdfReader(filepath)
        nb_pages = len(reader.pages)
    except Exception:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="Impossible de lire ce fichier PDF")

    return {
        "fichier_nom": file.filename,
        "fichier_path": filepath,
        "nb_pages": nb_pages,
    }


# ──────────────────────────────────────────────
# Routes : Commande
# ──────────────────────────────────────────────

@app.post("/api/commander")
def commander(
    data: CommandeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prix = calculer_prix(data.nb_pages, data.couleur, data.recto_verso, data.nb_copies)

    commande = Commande(
        user_id=user.id,
        fichier_nom=data.fichier_nom,
        fichier_path=data.fichier_path,
        nb_pages=data.nb_pages,
        couleur=data.couleur,
        recto_verso=data.recto_verso,
        nb_copies=data.nb_copies,
        prix_total=prix,
    )
    db.add(commande)
    db.commit()
    db.refresh(commande)

    return {
        "message": "Commande enregistrée avec succès !",
        "commande_id": commande.id,
        "prix_total": prix,
    }


@app.get("/api/commandes")
def mes_commandes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    commandes = (
        db.query(Commande)
        .filter(Commande.user_id == user.id)
        .order_by(Commande.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "fichier_nom": c.fichier_nom,
            "nb_pages": c.nb_pages,
            "couleur": c.couleur,
            "recto_verso": c.recto_verso,
            "nb_copies": c.nb_copies,
            "prix_total": c.prix_total,
            "fichier_path": c.fichier_path,
            "date": c.created_at.isoformat(),
        }
        for c in commandes
    ]


@app.get("/api/prix")
def apercu_prix(nb_pages: int, couleur: bool = False, recto_verso: bool = False, nb_copies: int = 1):
    """Endpoint utilitaire pour tester le calcul de prix."""
    return {"prix": calculer_prix(nb_pages, couleur, recto_verso, nb_copies)}
