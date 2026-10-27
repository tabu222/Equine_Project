// Đăng nhập / đăng ký bằng Google (POST /api/auth/google – xem backend/docs/API.md mục 4.1).
import { ApiError, apiPostPublic, saveSession } from './apiClient.ts';

export const googleClientId: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export type GoogleResult =
  | { status: 'signed-in' }
  | { status: 'signup-required'; email: string; fullName: string };

export interface GoogleSignup {
  fullName: string;
  phone: string;
  address: string;
  clubId: string;
}

/** Gửi ID token Google. Có tài khoản -> lưu phiên; chưa có -> backend yêu cầu bổ sung thông tin chủ ngựa. */
export async function signInWithGoogle(credential: string, signup?: GoogleSignup): Promise<GoogleResult> {
  const body: Record<string, unknown> = { Credential: credential };
  if (signup) {
    body.FullName = signup.fullName.trim();
    body.Phone = signup.phone.trim();
    body.Address = signup.address.trim();
    body.ClubID = Number(signup.clubId);
  }
  const result = await apiPostPublic<Record<string, unknown>>('/auth/google', body);
  if (result.SignupRequired) {
    return { status: 'signup-required', email: String(result.Email || ''), fullName: String(result.FullName || '') };
  }
  if (typeof result.access !== 'string' || typeof result.refresh !== 'string') {
    throw new ApiError('Đăng nhập Google chưa trả đủ thông tin phiên đăng nhập.');
  }
  saveSession(result.access, result.refresh);
  return { status: 'signed-in' };
}

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: Record<string, unknown>) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

let scriptPromise: Promise<GoogleIdentity> | null = null;

/** Tải thư viện Google Identity Services một lần. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const existing = (window as unknown as { google?: GoogleIdentity }).google;
  if (existing?.accounts?.id) return Promise.resolve(existing);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const google = (window as unknown as { google?: GoogleIdentity }).google;
        if (google?.accounts?.id) resolve(google);
        else reject(new Error('Không tải được Google Sign-In.'));
      };
      script.onerror = () => { scriptPromise = null; reject(new Error('Không tải được Google Sign-In.')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}
