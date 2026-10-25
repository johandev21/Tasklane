# Authentication: Clerk as identity provider

We use Clerk for all identity concerns: email + password sign-up/sign-in, session lifecycle, and account management. We do not store passwords or run our own session store.

We chose a hosted provider over custom email+password sessions (Argon2 + server-side session table) so that identity, security, and account management are handled outside our core value — the collaborative board — instead of becoming a parallel project. Clerk's session token is passed to Convex, which verifies it against Clerk's JWKS on every query and mutation, so the same session that authorizes HTTP requests authorizes every Convex function call. No password reset, email verification, or account recovery code lives in this repo.
