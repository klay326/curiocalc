import type { Metadata } from 'next';
import CollectionCardClient from './_client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  try {
    const res = await fetch(`${API_URL}/api/v1/users/${username}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'CurioCalc' };
    const user = await res.json();
    const name = user.display_name ?? `@${username}`;
    const title = `${name}'s calculator collection — CurioCalc`;
    const description = `${name} owns ${user.owned_count} calculators on CurioCalc.${user.bio ? ' ' + user.bio.slice(0, 120) : ''}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        siteName: 'CurioCalc',
        images: [{ url: `https://curiocalc.org/api/og/card/${username}`, width: 1200, height: 630, alt: title }],
      },
      twitter: { card: 'summary_large_image', title, description },
    };
  } catch {
    return { title: 'CurioCalc' };
  }
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CollectionCardClient username={username} />;
}
