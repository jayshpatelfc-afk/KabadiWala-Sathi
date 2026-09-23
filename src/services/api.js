const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8787/api");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      cache: "no-store",
      ...options
    });
  } catch {
    throw new Error("Backend unavailable. Start the API server and try again.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    if (body.error) {
      errorMessage =
        typeof body.error === "string"
          ? body.error
          : body.error.message || JSON.stringify(body.error);
    } else if (body.message) {
      errorMessage =
        typeof body.message === "string"
          ? body.message
          : JSON.stringify(body.message);
    }
    throw new Error(errorMessage);
  }
  return body;
}

export const api = {
  getHealth: () => request("/health"),
  getPrices: () => request("/prices"),
  getPriceById: (id) => request(`/prices/${encodeURIComponent(id)}`),
  getRecyclers: () => request("/recyclers"),
  getRecyclerById: (id) => request(`/recyclers/${encodeURIComponent(id)}`),
  getLots: (status) => request(`/lots${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getLotById: (lotId) => request(`/lots/${encodeURIComponent(lotId)}`),
  createLot: (payload) => request("/lots", { method: "POST", body: JSON.stringify(payload) }),
  updateLotStatus: (lotId, status) =>
    request(`/lots/${encodeURIComponent(lotId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  deleteLot: (lotId) => request(`/lots/${encodeURIComponent(lotId)}`, { method: "DELETE" }),
  getAnalytics: () => request("/analytics")
};

export default api;
