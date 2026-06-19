import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { method, url, headers, body } = await req.json();

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try {
    const res = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => res.text());
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
