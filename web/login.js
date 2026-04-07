const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  const rawText = await response.text();
  const payload = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) {
    throw new Error(payload.error || "No fue posible completar la operacion.");
  }
  return payload;
}

async function checkExistingSession() {
  try {
    await requestJson("/api/session");
    window.location.href = "/";
  } catch (_error) {
    return;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Validando acceso...";

  const data = new FormData(loginForm);
  const payload = {
    username: String(data.get("username") || "").trim(),
    password: String(data.get("password") || ""),
  };

  try {
    const response = await requestJson("/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    loginStatus.textContent = `Acceso correcto. Entrando a ${response.company.brand_name || response.company.name}...`;
    window.location.href = "/";
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

checkExistingSession();
