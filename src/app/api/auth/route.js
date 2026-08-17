import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { role, password } = await request.json();

    let authenticated = false;
    let sessionRole = null;

    const adminPass = process.env.ADMIN_PASSWORD || 'medic2026';
    const vendorPass = process.env.VENDOR_PASSWORD || 'vendedor2026';

    if (role === 'admin' && password === adminPass) {
      authenticated = true;
      sessionRole = 'admin';
    } else if (role === 'vendedor' && password === vendorPass) {
      authenticated = true;
      sessionRole = 'vendedor';
    }

    if (authenticated) {
      // Set an HTTP-only cookie for the session
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'medic_session',
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
