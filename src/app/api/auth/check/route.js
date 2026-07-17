import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('arthromed_session');

  if (session && (session.value === 'admin' || session.value === 'vendedor')) {
    return NextResponse.json({ role: session.value });
  }

  return NextResponse.json({ role: null });
}
