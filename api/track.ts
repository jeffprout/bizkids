import { parseEvent } from '../src/analytics/model';

export async function POST(request: Request) {
  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const event = parseEvent(raw);
  if (!event) return Response.json({ ok: false }, { status: 400 });
  return new Response(null, { status: 204 });
}
