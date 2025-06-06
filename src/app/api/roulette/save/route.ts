import { NextRequest, NextResponse } from 'next/server';
import { saveRouletteHistory } from '../../rouletteStore';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body.history)) {
    return NextResponse.json({ error: 'Invalid history' }, { status: 400 });
  }
  const key = saveRouletteHistory(body.history);
  return NextResponse.json({ key });
} 