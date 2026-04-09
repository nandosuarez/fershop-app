const publicRegisterForm = document.getElementById("public-register-form");
const publicRegisterStatus = document.getElementById("public-register-status");
const publicRegisterSubmit = document.getElementById("public-register-submit");
const publicCompanyLogo = document.querySelector("[data-public-company-logo]");
const publicCompanyBrand = document.querySelector("[data-public-company-brand]");
const publicCompanyTagline = document.querySelector("[data-public-company-tagline]");

function getCompanySlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "registro") {
    return parts[1];
  }
  return "";
}

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
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (_error) {
      throw new Error("El servidor devolvio una respuesta no valida.");
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || "No fue posible completar la operacion.");
  }

  return payload;
}

function readClientPayload() {
  const data = new FormData(publicRegisterForm);
  return {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    whatsapp_phone: String(data.get("whatsapp_phone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    city: String(data.get("city") || "").trim(),
    address: String(data.get("address") || "").trim(),
    neighborhood: String(data.get("neighborhood") || "").trim(),
    preferred_contact_channel: String(data.get("preferred_contact_channel") || "").trim(),
    preferred_payment_method: String(data.get("preferred_payment_method") || "").trim(),
    description: String(data.get("description") || "").trim(),
    whatsapp_opt_in: data.get("whatsapp_opt_in") === "on",
    interests: String(data.get("interests") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
  };
}

function applyCompanyBranding(company) {
  const brandName = company?.brand_name || company?.name || "Portal comercial";
  const tagline =
    company?.tagline || "Comparte tus datos y te contactaremos para ayudarte con tu compra.";
  const logoPath = company?.logo_path || "/static/assets/fershop-logo-crop.jpg";

  document.title = `Registro | ${brandName}`;
  if (publicCompanyLogo) {
    publicCompanyLogo.src = logoPath;
    publicCompanyLogo.alt = `Logo ${brandName}`;
  }
  if (publicCompanyBrand) {
    publicCompanyBrand.textContent = brandName;
  }
  if (publicCompanyTagline) {
    publicCompanyTagline.textContent = tagline;
  }
}

async function loadCompany() {
  const slug = getCompanySlugFromPath();
  if (!slug) {
    throw new Error("No encontramos una empresa valida para este formulario.");
  }

  const payload = await requestJson(`/api/public/company/${encodeURIComponent(slug)}`);
  applyCompanyBranding(payload.item || null);
  return slug;
}

publicRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const slug = getCompanySlugFromPath();
  publicRegisterStatus.textContent = "Enviando tu registro...";
  publicRegisterSubmit.disabled = true;

  try {
    await requestJson(`/api/public/register/${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify(readClientPayload()),
    });
    publicRegisterForm.reset();
    publicRegisterStatus.textContent =
      "Tus datos quedaron registrados. El equipo comercial te contactara pronto.";
  } catch (error) {
    publicRegisterStatus.textContent = error.message;
  } finally {
    publicRegisterSubmit.disabled = false;
  }
});

loadCompany().catch((error) => {
  publicRegisterStatus.textContent = error.message;
  if (publicRegisterSubmit) {
    publicRegisterSubmit.disabled = true;
  }
});
