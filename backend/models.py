from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    commandes = relationship("Commande", back_populates="user")


class Commande(Base):
    __tablename__ = "commandes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    fichier_nom = Column(String)
    fichier_path = Column(String)
    nb_pages = Column(Integer)
    couleur = Column(Boolean, default=False)
    recto_verso = Column(Boolean, default=False)
    nb_copies = Column(Integer, default=1)
    prix_total = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="commandes")
