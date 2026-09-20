import { createHash, timingSafeEqual } from 'node:crypto';

function passwordOk(got: string): boolean {
  const want = process.env.STATS_PASSWORD ?? '';
  if (!want || !got) return false;
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    password = '';
  }
  if (!passwordOk(password)) {
    return Response.json({ ok: false, message: 'Wrong password.' }, { status: 401 });
  }
  return Response.json({ ok: true, stats: { starts: 0 } });
}
