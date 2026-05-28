import type { Metadata } from 'next';
import CalculatorClientPage from './_client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/api/v1/calculators/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { title: 'CurioCalc' };
    const calc = await res.json();

    const title = `${calc.make} ${calc.model} — CurioCalc`;
    const description = calc.description
      ? calc.description.slice(0, 160)
      : `${calc.make} ${calc.model}${calc.year_introduced ? ` (${calc.year_introduced})` : ''}. Browse, collect, and track vintage and modern calculators on CurioCalc.`;
    const image = calc.images?.[0] ?? null;

    return {
      title,
      description,
      openGraph: {
        title: `${calc.make} ${calc.model}`,
        description,
        type: 'website',
        siteName: 'CurioCalc',
        ...(image && { images: [{ url: image, alt: `${calc.make} ${calc.model}` }] }),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return { title: 'CurioCalc' };
  }
}

export default function Page() {
  return <CalculatorClientPage />;
}
