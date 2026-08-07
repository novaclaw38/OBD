// Minimal client-side session + Pro-tier gate.
// Real auth/billing would replace localStorage with a backend session + webhook-verified subscription.

const SESSION_KEY = 'cyberdiag.session';
const PRO_KEY = 'cyberdiag.pro';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function login(email) {
  const session = { email, since: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function isPro() {
  return localStorage.getItem(PRO_KEY) === 'true';
}

export function setPro(value) {
  localStorage.setItem(PRO_KEY, value ? 'true' : 'false');
}

/**
 * Guards a route. Call at the top of a screen's init.
 * Redirects to #/auth or #/pro-subscription and returns false if the guard fails.
 */
export function useAuthGuard({ requireAuth = true, requirePro = false } = {}) {
  const session = getSession();
  if (requireAuth && !session) {
    location.hash = '#/auth';
    return false;
  }
  if (requirePro && !isPro()) {
    location.hash = '#/pro-subscription';
    return false;
  }
  return true;
}
