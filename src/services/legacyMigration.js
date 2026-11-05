import { API_BASE } from "../api/config.js";

/**
 * Carries a pre-Supabase account over to Supabase.
 *
 * Users who signed up before the migration have their credentials in the
 * backend's Mongo database and no Supabase auth account, so
 * `signInWithPassword` rejects them. The backend checks the old credentials
 * and creates the missing Supabase account, then hands back a session that we
 * adopt here.
 *
 * Returns `{ ok: true, session }` on success, `{ ok: false, unsupported }`
 * when the backend does not know the endpoint, or `{ ok: false, message }`
 * with a message that is safe to show to the user.
 */
export async function migrateLegacyAccount(email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/migrate-legacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    return { ok: false, unsupported: true, message: err?.message };
  }

  if (response.status === 404 || response.status === 405) {
    return { ok: false, unsupported: true };
  }

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.detail || "Could not migrate the account",
    };
  }

  return {
    ok: true,
    session: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    },
  };
}

/**
 * Makes sure an auth account exists for a legacy user so that Supabase can
 * send them a password reset email. Safe to call for unknown addresses - the
 * backend always answers the same way.
 */
export async function prepareLegacyAccountForReset(email) {
  try {
    await fetch(`${API_BASE}/auth/legacy-account-exists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    // Not fatal: Supabase will report whether the reset email could be sent.
  }
}
