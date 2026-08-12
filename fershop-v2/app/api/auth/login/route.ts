import { verifyPassword } from "@/lib/passwords";
import { redirectTo } from "@/lib/redirects";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/session";
import { findUserByLogin, recordSuccessfulLogin } from "@/lib/users";

function loginError(request: Request, code: string) {
  return redirectTo(request, `/login?error=${code}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const login = formData.get("login");
  const password = formData.get("password");
  if (
    typeof login !== "string" ||
    typeof password !== "string" ||
    !login.trim() ||
    !password.trim()
  ) {
    return loginError(request, "missing_fields");
  }

  try {
    const user = await findUserByLogin(login);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return loginError(request, "invalid_credentials");
    }
    if (!user.isActive) {
      return loginError(request, "inactive_user");
    }

    await recordSuccessfulLogin(user.id);
    const response = redirectTo(request, "/admin");
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({
        email: user.email,
        name: user.name,
        role: user.role,
        userId: user.id,
        username: user.username,
      }),
      getSessionCookieOptions()
    );
    return response;
  } catch (error) {
    console.error("Error during login", error);
    return loginError(request, "server_error");
  }
}
