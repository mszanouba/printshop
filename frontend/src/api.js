const BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(url, options = {}) {
  const headers = { ...options.headers };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const data = await res.json();

  // Token expiré ou invalide → retour au login
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("nom");
    window.location.reload();
    throw new Error("Session expirée, veuillez vous reconnecter");
  }

  if (!res.ok) {
    throw new Error(data.detail || "Une erreur est survenue");
  }

  return data;
}

export const api = {
  register(nom, email, password) {
    return request("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, email, password }),
    });
  },

  login(email, password) {
    return request("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  upload(file) {
    const form = new FormData();
    form.append("file", file);
    return request("/upload", { method: "POST", body: form });
  },

  commander(data) {
    return request("/commander", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  mesCommandes() {
    return request("/commandes");
  },
};
