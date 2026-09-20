import { parseEvent } from './model.js';
import { record } from './_store.js';

export async function POST(request: Request) {
  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const event = parseEvent(raw);
  if (!event) return Response.json({ ok: false }, { status: 400 });
  try {
    await record(event);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, message }, { status: 503 });
  }
}
