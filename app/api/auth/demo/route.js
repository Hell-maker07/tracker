import { NextResponse } from 'next/server';
import { createDemoUser } from '@/lib/seed';

export async function POST() {
  try {
    const user = await createDemoUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Demo auth error:', error);
    return NextResponse.json({ error: 'Failed to launch demo account' }, { status: 500 });
  }
}
