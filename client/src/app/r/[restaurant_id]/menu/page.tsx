import { redirect } from "next/navigation";

type PublicMenuRedirectPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
};

export default async function PublicMenuRedirectPage({
  params,
}: PublicMenuRedirectPageProps) {
  const { restaurant_id } = await params;

  redirect(`/r/${restaurant_id}`);
}
