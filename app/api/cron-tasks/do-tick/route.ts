import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'ok' });
}

export const dynamic = 'force-dynamic';
