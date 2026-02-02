const API = "/api";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(t) {
  localStorage.setItem("token", t);
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
