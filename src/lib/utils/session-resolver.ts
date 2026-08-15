function base64URLToBase64(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return b64;
}

function base64ToString(b64: string): string {
  try {
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

export function decodeAuthCookie(cookieValue: string): { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string; app_metadata?: { role?: string; school_id?: string; [key: string]: any } } } | null {
  try {
    if (!cookieValue.startsWith('base64-')) return null;
    const b64url = cookieValue.slice(7);
    const b64 = base64URLToBase64(b64url);
    const json = base64ToString(b64);
    const session = JSON.parse(json);
    if (session?.access_token && session?.refresh_token && session?.expires_at) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    return new URL(url).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

export function getAuthCookieName(): string {
  return `sb-${getProjectRef()}-auth-token`;
}
