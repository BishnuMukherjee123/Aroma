import { notFound } from "next/navigation";

type PublicArPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
};

export default async function PublicArPage({ params }: PublicArPageProps) {
  await params;
  notFound();
}
