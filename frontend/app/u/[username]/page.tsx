import type { Metadata } from 'next';
import UserProfileClientPage from './_client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    const res = await fetch(`${API_URL}/api/v1/users/${username}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: 'CurioCalc' };
    const user = await res.json();

    const name = user.display_name ?? user.username;
    const title = `${name} (@${user.username}) — CurioCalc`;
    const description = [
      `${name} collects calculators on CurioCalc.`,
      user.owned_count > 0 && `${user.owned_count} owned`,
      user.wanted_count > 0 && `${user.wanted_count} on wishlist`,
      user.bio && user.bio.slice(0, 100),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        siteName: 'CurioCalc',
        ...(user.avatar_url && {
          images: [{ url: user.avatar_url, alt: name }],
        }),
      },
      twitter: {
        card: user.avatar_url ? 'summary' : 'summary',
        title,
        description,
        ...(user.avatar_url && { images: [user.avatar_url] }),
      },
    };
  } catch {
    return { title: 'CurioCalc' };
  }
}

export default function Page() {
  return <UserProfileClientPage />;
}
