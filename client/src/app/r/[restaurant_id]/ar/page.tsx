import { redirect } from "next/navigation";

type PublicArPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
};

export default async function PublicArPage({ params }: PublicArPageProps) {
  const { restaurant_id } = await params;
  redirect(`/r/${restaurant_id}`);
}
