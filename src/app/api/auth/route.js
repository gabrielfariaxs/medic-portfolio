import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { role, password } = await request.json();

    let authenticated = false;
    let sessionRole = null;

    if (role === 'admin' && password === process.env.ADMIN_PASSWORD) {
      authenticated = true;
      sessionRole = 'admin';
    } else if (role === 'vendedor' && password === process.env.VENDOR_PASSWORD) {
      authenticated = true;
      sessionRole = 'vendedor';
    }

    if (authenticated) {
      // Set an HTTP-only cookie for the session
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'arthromed_session',
        value: sessionRole,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      return NextResponse.json({ success: true, role: sessionRole });
    }

    return NextResponse.json({ success: false, message: 'Senha incorreta' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}
