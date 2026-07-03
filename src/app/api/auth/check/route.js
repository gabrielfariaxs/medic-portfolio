import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('arthromed_admin_session');

  if (session && session.value === 'authenticated') {
    return NextResponse.json({ isAdmin: true });
  }

  return NextResponse.json({ isAdmin: false });
}
