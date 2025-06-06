import { NextRequest, NextResponse } from 'next/server';
import { getRouletteHistory, updateRouletteHistory } from '../../rouletteStore';

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const history = getRouletteHistory(key);
  if (!history) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ history });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const body = await req.json();
  if (!Array.isArray(body.history)) {
    return NextResponse.json({ error: 'Invalid history' }, { status: 400 });
  }
  const ok = updateRouletteHistory(key, body.history);
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 