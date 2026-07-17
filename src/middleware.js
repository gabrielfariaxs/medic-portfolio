import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('arthromed_session');

  // Se tentar acessar o admin sem estar logado ou se for apenas vendedor, redireciona pro login
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session || session.value !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se já estiver logado (admin ou vendedor) e tentar acessar a tela de login, redireciona para a home
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (session && (session.value === 'admin' || session.value === 'vendedor')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
