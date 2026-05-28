const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';
const SITE_URL = 'https://curiocalc.org';

export async function GET() {
  let recent: Array<{ make: string; model: string; id: string; description: string | null; images: string[]; created_at: string }> = [];

  try {
    const res = await fetch(`${API_URL}/api/v1/stats`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      recent = data.recent ?? [];
    }
  } catch {
    // serve empty feed on error
  }

  const items = recent.map((c) => `
  <item>
    <title>${escXml(`${c.make} ${c.model}`)}</title>
    <link>${SITE_URL}/calculators/${c.id}</link>
    <guid isPermaLink="true">${SITE_URL}/calculators/${c.id}</guid>
    <description>${escXml(c.description ?? `${c.make} ${c.model} — added to CurioCalc`)}</description>
    ${c.images[0] ? `<enclosure url="${escXml(c.images[0])}" type="image/jpeg" length="0"/>` : ''}
    <pubDate>${new Date(c.created_at).toUTCString()}</pubDate>
  </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CurioCalc — New Calculators</title>
    <link>${SITE_URL}</link>
    <description>Latest calculators added to the CurioCalc community catalog.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
