import Image from "next/image";
import { redirect } from "next/navigation";

import { getPageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  inactive_user: "Este usuario esta inactivo.",
  invalid_credentials: "El usuario y la clave no coinciden.",
  missing_fields: "Escribe tu usuario y tu clave.",
  server_error: "No fue posible validar el acceso. Revisa la conexion con la base de datos.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  if (await getPageSession()) {
    redirect("/admin");
  }
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] ?? "Ocurrio un error." : null;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__brand">
          <Image
            src="/brand/fershop-logo-light.png"
            alt="FerShop USA"
            width={2082}
            height={756}
            priority
          />
          <span>Centro operativo</span>
        </div>
        <div className="auth-card__content">
          <p className="auth-kicker">Acceso privado</p>
          <h1>Iniciar sesion</h1>
          {errorMessage ? <p className="auth-message auth-message--error">{errorMessage}</p> : null}
          {params.success === "signed_out" ? (
            <p className="auth-message auth-message--success">La sesion se cerro correctamente.</p>
          ) : null}
          <form action="/api/auth/login" method="post" className="auth-form">
            <label>
              <span>Usuario o correo</span>
              <input name="login" autoComplete="username" autoFocus required />
            </label>
            <label>
              <span>Clave</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit">Ingresar</button>
          </form>
          <a href="/" className="auth-back-link">Volver a la tienda</a>
        </div>
      </section>
    </main>
  );
}
