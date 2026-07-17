import { useState, useEffect } from "react";
import { api } from "./api";
import "./App.css";


// ════════════════════════════════════════════════
// Page d'authentification
// ════════════════════════════════════════════════

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setLoading(true);

    try {
      const data =
        mode === "register"
          ? await api.register(nom, email, password)
          : await api.login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("nom", data.nom);
      onLogin(data.nom);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="logo">🖨️</span>
          <h1>PrintShop</h1>
          <p>Service d'impression en ligne</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setErreur(""); }}
          >
            Connexion
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => { setMode("register"); setErreur(""); }}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="nom">Nom complet</label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={4}
            />
          </div>

          {erreur && <p className="erreur">{erreur}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Chargement..."
              : mode === "login"
              ? "Se connecter"
              : "Créer un compte"}
          </button>
        </form>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// Tableau de bord
// ════════════════════════════════════════════════

function Dashboard({ nom, onLogout }) {
  const [tab, setTab] = useState("nouvelle"); // "nouvelle" ou "historique"
  const [uploadResult, setUploadResult] = useState(null);
  const [couleur, setCouleur] = useState(false);
  const [rectoVerso, setRectoVerso] = useState(false);
  const [nbCopies, setNbCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Historique
  const [commandes, setCommandes] = useState([]);
  const [loadingHisto, setLoadingHisto] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);

  // Charger l'historique quand on clique sur l'onglet
  useEffect(() => {
    if (tab === "historique") loadHistorique();
  }, [tab]);

  const loadHistorique = async () => {
    setLoadingHisto(true);
    try {
      const data = await api.mesCommandes();
      setCommandes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHisto(false);
    }
  };

  // Calcul du prix côté client (miroir du backend)
  const calculerPrix = () => {
    if (!uploadResult) return "0.00";

    const pages = uploadResult.nb_pages;
    let prixPage;

    if (couleur) {
      prixPage = pages <= 50 ? 1.0 : 0.8;
    } else {
      prixPage = pages <= 50 ? 0.5 : 0.4;
    }

    const nbUnites = rectoVerso ? Math.ceil(pages / 2) : pages;
    return (nbUnites * prixPage * Math.max(nbCopies, 1)).toFixed(2);
  };

  // Upload du fichier PDF
  const handleUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErreur("Veuillez sélectionner un fichier PDF");
      return;
    }

    setErreur("");
    setLoading(true);
    setUploadResult(null);

    try {
      const data = await api.upload(file);
      setUploadResult(data);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // Passer la commande
  const handleCommander = async () => {
    setLoading(true);
    setErreur("");

    try {
      const data = await api.commander({
        fichier_nom: uploadResult.fichier_nom,
        fichier_path: uploadResult.fichier_path,
        nb_pages: uploadResult.nb_pages,
        couleur,
        recto_verso: rectoVerso,
        nb_copies: nbCopies,
      });

      setConfirmation({
        ...data,
        fichier_nom: uploadResult.fichier_nom,
        nb_pages: uploadResult.nb_pages,
        couleur,
        recto_verso: rectoVerso,
        nb_copies: nbCopies,
      });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUploadResult(null);
    setCouleur(false);
    setRectoVerso(false);
    setNbCopies(1);
    setConfirmation(null);
    setErreur("");
  };

  // Recommander depuis l'historique
  const handleRecommander = (cmd) => {
    setUploadResult({
      fichier_nom: cmd.fichier_nom,
      fichier_path: cmd.fichier_path,
      nb_pages: cmd.nb_pages,
    });
    setCouleur(cmd.couleur);
    setRectoVerso(cmd.recto_verso);
    setNbCopies(cmd.nb_copies || 1);
    setSelectedCommande(null);
    setTab("nouvelle");
  };

  // Formater la date
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="dashboard">
      {/* Barre du haut */}
      <header className="topbar">
        <h2 className="topbar-logo">🖨️ PrintShop</h2>
        <div className="topbar-right">
          <span className="user-badge">{nom}</span>
          <button className="btn-logout" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Navigation entre les onglets */}
      <nav className="tab-nav">
        <button
          className={tab === "nouvelle" ? "active" : ""}
          onClick={() => setTab("nouvelle")}
        >
          Nouvelle impression
        </button>
        <button
          className={tab === "historique" ? "active" : ""}
          onClick={() => setTab("historique")}
        >
          Historique
        </button>
      </nav>

      {/* ═══════ ONGLET : Nouvelle commande ═══════ */}
      {tab === "nouvelle" && (
        <main className="main">

          {/* Étape 1 : Upload */}
          <section className="card">
            <h3>
              <span className="step-num">1</span>
              Téléverser votre fichier
            </h3>

            <div
              className={`dropzone ${dragActive ? "drag" : ""} ${uploadResult ? "done" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !uploadResult && document.getElementById("pdf-input").click()}
            >
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                hidden
                onChange={(e) => {
                  if (e.target.files[0]) handleUpload(e.target.files[0]);
                }}
              />

              {loading && !uploadResult ? (
                <div className="dropzone-inner">
                  <div className="spinner" />
                  <p>Analyse du fichier...</p>
                </div>
              ) : uploadResult ? (
                <div className="dropzone-inner done">
                  <span className="check">✓</span>
                  <p className="filename">{uploadResult.fichier_nom}</p>
                  <p className="pages">
                    {uploadResult.nb_pages} page{uploadResult.nb_pages > 1 ? "s" : ""} détectée{uploadResult.nb_pages > 1 ? "s" : ""}
                  </p>
                  <button
                    className="btn-text"
                    onClick={(e) => { e.stopPropagation(); resetForm(); }}
                  >
                    Changer de fichier
                  </button>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <span className="upload-icon">📄</span>
                  <p>Glissez votre PDF ici</p>
                  <p className="hint">ou cliquez pour parcourir</p>
                </div>
              )}
            </div>
          </section>

          {/* Étape 2 : Options */}
          {uploadResult && (
            <section className="card fade-in">
              <h3>
                <span className="step-num">2</span>
                Options d'impression
              </h3>

              <div className="options-row">
                <div className="option-group">
                  <label>Type</label>
                  <div className="toggle">
                    <button className={!couleur ? "active" : ""} onClick={() => setCouleur(false)}>
                      Noir & Blanc
                    </button>
                    <button className={couleur ? "active" : ""} onClick={() => setCouleur(true)}>
                      Couleur
                    </button>
                  </div>
                </div>

                <div className="option-group">
                  <label>Impression</label>
                  <div className="toggle">
                    <button className={!rectoVerso ? "active" : ""} onClick={() => setRectoVerso(false)}>
                      Recto seul
                    </button>
                    <button className={rectoVerso ? "active" : ""} onClick={() => setRectoVerso(true)}>
                      Recto-verso
                    </button>
                  </div>
                </div>
              </div>

              {/* Nombre de copies */}
              <div className="copies-row">
                <label>Nombre de copies</label>
                <div className="copies-control">
                  <button
                    className="copies-btn"
                    onClick={() => setNbCopies(Math.max(1, nbCopies - 1))}
                    disabled={nbCopies <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="copies-input"
                    value={nbCopies}
                    min={1}
                    onChange={(e) => setNbCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    className="copies-btn"
                    onClick={() => setNbCopies(nbCopies + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Détail tarif */}
              <div className="tarif-detail">
                <div className="tarif-line">
                  <span>Prix unitaire</span>
                  <span>
                    {couleur
                      ? uploadResult.nb_pages > 50 ? "0,80" : "1,00"
                      : uploadResult.nb_pages > 50 ? "0,40" : "0,50"}{" "}
                    DH / page
                  </span>
                </div>

                {rectoVerso && (
                  <div className="tarif-line">
                    <span>Feuilles (recto-verso)</span>
                    <span>
                      {Math.ceil(uploadResult.nb_pages / 2)} feuille{Math.ceil(uploadResult.nb_pages / 2) > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {nbCopies > 1 && (
                  <div className="tarif-line">
                    <span>Copies</span>
                    <span>× {nbCopies}</span>
                  </div>
                )}

                {uploadResult.nb_pages > 50 && (
                  <div className="tarif-line accent">
                    <span>Réduction volume (+ de 50 pages)</span>
                    <span>−20 %</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Étape 3 : Prix + Commander */}
          {uploadResult && (
            <section className="card prix-card fade-in">
              <div className="prix-row">
                <div>
                  <span className="prix-label">Prix total</span>
                  <span className="prix-value">{calculerPrix()} DH</span>
                </div>
                <button
                  className="btn-commander"
                  onClick={handleCommander}
                  disabled={loading}
                >
                  {loading ? "Envoi..." : "Commander"}
                </button>
              </div>

              {erreur && <p className="erreur">{erreur}</p>}
            </section>
          )}
        </main>
      )}

      {/* ═══════ ONGLET : Historique ═══════ */}
      {tab === "historique" && (
        <main className="main">
          {loadingHisto ? (
            <div className="center-msg">
              <div className="spinner" />
              <p>Chargement...</p>
            </div>
          ) : commandes.length === 0 ? (
            <div className="center-msg">
              <p className="empty-icon">📋</p>
              <p>Aucune commande pour le moment.</p>
              <button className="btn-primary small" onClick={() => setTab("nouvelle")}>
                Passer une commande
              </button>
            </div>
          ) : (
            <div className="histo-list">
              {commandes.map((cmd) => (
                <div
                  key={cmd.id}
                  className={`histo-card ${selectedCommande?.id === cmd.id ? "expanded" : ""}`}
                >
                  {/* Résumé de la commande */}
                  <div
                    className="histo-summary"
                    onClick={() =>
                      setSelectedCommande(selectedCommande?.id === cmd.id ? null : cmd)
                    }
                  >
                    <div className="histo-left">
                      <span className="histo-id">#{cmd.id}</span>
                      <div>
                        <p className="histo-filename">{cmd.fichier_nom}</p>
                        <p className="histo-date">{formatDate(cmd.date)}</p>
                      </div>
                    </div>
                    <div className="histo-right">
                      <span className="histo-prix">{cmd.prix_total} DH</span>
                      <span className="histo-chevron">
                        {selectedCommande?.id === cmd.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Détails (accordéon) */}
                  {selectedCommande?.id === cmd.id && (
                    <div className="histo-details fade-in">
                      <div className="recap">
                        <div className="recap-row">
                          <span>Fichier</span>
                          <span>{cmd.fichier_nom}</span>
                        </div>
                        <div className="recap-row">
                          <span>Pages</span>
                          <span>{cmd.nb_pages}</span>
                        </div>
                        <div className="recap-row">
                          <span>Type</span>
                          <span>{cmd.couleur ? "Couleur" : "Noir & Blanc"}</span>
                        </div>
                        <div className="recap-row">
                          <span>Impression</span>
                          <span>{cmd.recto_verso ? "Recto-verso" : "Recto seul"}</span>
                        </div>
                        <div className="recap-row">
                          <span>Copies</span>
                          <span>{cmd.nb_copies || 1}</span>
                        </div>
                        <div className="recap-row total">
                          <span>Total</span>
                          <span>{cmd.prix_total} DH</span>
                        </div>
                      </div>

                      <button
                        className="btn-recommander"
                        onClick={() => handleRecommander(cmd)}
                      >
                        Recommander avec ce fichier
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ═══════ Modal de confirmation ═══════ */}
      {confirmation && (
        <div className="overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-check">✓</div>
            <h2>Commande confirmée</h2>
            <p className="modal-sub">
              Commande n°{confirmation.commande_id} enregistrée.
            </p>

            <div className="recap">
              <div className="recap-row">
                <span>Fichier</span>
                <span>{confirmation.fichier_nom}</span>
              </div>
              <div className="recap-row">
                <span>Pages</span>
                <span>{confirmation.nb_pages}</span>
              </div>
              <div className="recap-row">
                <span>Type</span>
                <span>{confirmation.couleur ? "Couleur" : "Noir & Blanc"}</span>
              </div>
              <div className="recap-row">
                <span>Impression</span>
                <span>{confirmation.recto_verso ? "Recto-verso" : "Recto seul"}</span>
              </div>
              <div className="recap-row">
                <span>Copies</span>
                <span>{confirmation.nb_copies}</span>
              </div>
              <div className="recap-row total">
                <span>Total</span>
                <span>{confirmation.prix_total} DH</span>
              </div>
            </div>

            <button className="btn-primary" onClick={resetForm}>
              Nouvelle commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════
// App racine
// ════════════════════════════════════════════════

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const nom = localStorage.getItem("nom");
    if (token && nom) setUser(nom);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nom");
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLogin={(nom) => setUser(nom)} />;
  }

  return <Dashboard nom={user} onLogout={handleLogout} />;
}
