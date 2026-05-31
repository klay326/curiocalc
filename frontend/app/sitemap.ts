import type { MetadataRoute } from 'next';

const BASE = 'https://curiocalc.org';
const API  = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,               lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/brands`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/trade`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/trending`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/top`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/compare`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const res = await fetch(
      `${API}/api/v1/calculators?limit=500&sort=created_at&order=desc`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return staticRoutes;
    const calcs: Array<{ id: string; updated_at: string }> = await res.json();

    const calcRoutes: MetadataRoute.Sitemap = calcs.map(c => ({
      url: `${BASE}/calculators/${c.id}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...calcRoutes];
  } catch {
    return staticRoutes;
  }
}
