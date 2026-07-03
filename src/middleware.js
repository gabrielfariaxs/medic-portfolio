import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('arthromed_admin_session');

  // Se tentar acessar o admin sem estar logado, redireciona pro login
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session || session.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se já estiver logado e tentar acessar a tela de login, redireciona para a home
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (session && session.value === 'authenticated') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
