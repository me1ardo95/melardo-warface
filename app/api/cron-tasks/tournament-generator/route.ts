import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'tournament generator ok' });
}

export const dynamic = 'force-dynamic';
