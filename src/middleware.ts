import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIK = new Set(['/admin/login', '/dosen/login', '/dosen/daftar']);
const BATAS_MS = 3000;

// Middleware hanya menolak akses TANPA sesi. Pengecekan peran ada di layout & API (server).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIK.has(pathname)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Dibatasi waktu: bila Supabase lambat/terhenti, anggap tanpa sesi (→ login), bukan 504.
  const user = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), BATAS_MS)),
  ]).catch(() => null);

  if (!user) {
    const login = pathname.startsWith('/dosen') ? '/dosen/login' : '/admin/login';
    return NextResponse.redirect(new URL(login, request.url));
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/dosen/:path*'] };
