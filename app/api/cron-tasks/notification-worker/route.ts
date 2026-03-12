import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'notification worker ok' });
}

export const dynamic = 'force-dynamic';
