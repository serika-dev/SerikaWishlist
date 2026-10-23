/** Reuse the Accounts service's safe, non-AI Serika.art artwork feed. */
export async function GET() {
  try {
    const response = await fetch('https://accounts.serika.dev/api/auth/random-bg', {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return Response.json({ data: null }, { status: 502 });
    return Response.json(await response.json());
  } catch {
    return Response.json({ data: null }, { status: 502 });
  }
}
