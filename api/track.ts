import { parseEvent } from './model';
import { record } from './_store';

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
  } catch {
    // Storage hiccup. The week already happened; do not make the game look broken.
  }
  return new Response(null, { status: 204 });
}
