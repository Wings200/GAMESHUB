import {developerIdentity, readMaintenanceState} from './_lib/site-admin.js';

function getCookie(request, name) {
  const cookies = (request.headers.get('Cookie') || '').split(';');
  for (const cookie of cookies) {
    const parts = cookie.trim().split('=');
    const key = parts.shift();
    if (key === name) return parts.join('=');
  }
  return null;
}

async function sign(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function validSession(request, secret) {
  if (!secret) return false;
  const token = getCookie(request, 'gh_access');
  if (!token) return false;
  const separator = token.indexOf('.');
  if (separator === -1) return false;
  const expires = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiryNumber = Number(expires);
  if (!Number.isFinite(expiryNumber) || Date.now() > expiryNumber) return false;
  return signature === await sign(expires, secret);
}

function redirect(url, destination) {
  return new Response(null, {
    status: 302,
    headers: {'Location': new URL(destination, url).pathname, 'Cache-Control': 'no-store'}
  });
}

function unavailable(pathname, reason = 'GAMESHUB is undergoing maintenance.') {
  const headers = {
    'Cache-Control': 'no-store',
    'Retry-After': '60',
    'X-Content-Type-Options': 'nosniff'
  };
  if (pathname.startsWith('/api/')) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    return new Response(JSON.stringify({ok: false, error: reason}), {status: 503, headers});
  }
  return new Response(reason, {status: 503, headers});
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const publicPaths = new Set([
    '/logo.png', '/favicon.ico', '/oauth-home', '/oauth-home.html',
    '/privacy', '/privacy.html', '/terms', '/terms.html',
    '/api/account/multiplayer-verify', '/api/login'
  ]);
  if (publicPaths.has(pathname)) return context.next();

  const authenticated = await validSession(context.request, context.env.SESSION_SECRET);
  if (pathname === '/login' || pathname === '/login.html') {
    return authenticated ? redirect(url, '/') : context.next();
  }
  if (!authenticated) return redirect(url, '/login');

  // Identity-related endpoints remain reachable to let a developer sign in
  // during maintenance. They do not expose the protected site.
  const accountPaths = new Set(['/api/account/google', '/api/account/me']);
  if (accountPaths.has(pathname)) return context.next();

  // The status endpoint enforces its own developer authentication and must
  // remain available so the authorized panel can turn maintenance OFF.
  if (pathname === '/api/dev/maintenance') return context.next();

  const developerPage = pathname === '/developer' || pathname === '/developer.html';
  const maintenancePage = pathname === '/maintenance' || pathname === '/maintenance.html';
  const engineTest = pathname === '/games/engine-test' || pathname.startsWith('/games/engine-test/');
  let state;
  try {
    state = await readMaintenanceState(context.env.DB);
  } catch (error) {
    console.error('GAMESHUB maintenance gate read failed', error);
    return unavailable(pathname, 'GAMESHUB is temporarily unavailable.');
  }

  let developer = null;
  if (state.enabled || developerPage || maintenancePage || engineTest) {
    try {
      developer = await developerIdentity(context);
    } catch (error) {
      console.error('GAMESHUB developer verification failed', error);
      return unavailable(pathname, 'GAMESHUB is temporarily unavailable.');
    }
  }

  if (developerPage) {
    if (!developer) return state.enabled ? redirect(url, '/maintenance.html')
      : new Response('Not found.', {status: 404, headers: {'Cache-Control': 'no-store'}});
    return context.next();
  }

  // Even with maintenance OFF, the unfinished engine lab stays developer-only.
  if (engineTest && !developer) {
    if (state.enabled && context.request.headers.get('Accept')?.includes('text/html')) {
      return redirect(url, '/maintenance.html');
    }
    return new Response('Not found.', {status: 404, headers: {'Cache-Control': 'no-store'}});
  }

  if (maintenancePage) {
    if (developer && url.searchParams.get('preview') === '1') return context.next();
    if (developer || !state.enabled) return redirect(url, '/');
    return context.next();
  }

  if (state.enabled && !developer) {
    if ((context.request.method === 'GET' || context.request.method === 'HEAD') &&
        context.request.headers.get('Accept')?.includes('text/html')) {
      return redirect(url, '/maintenance.html');
    }
    return unavailable(pathname);
  }

  const response = await context.next();
  // Stop the browser from keeping an obsolete HTML navigation after the switch.
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
  return response;
}
