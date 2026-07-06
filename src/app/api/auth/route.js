import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if ((email === 'admin@arthromed.com' || email === 'admin@arthromed.com.br') && password === process.env.ADMIN_PASSWORD) {
      // Set an HTTP-only cookie for the session
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'arthromed_admin_session',
        value: 'authenticated',
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Senha incorreta' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}
