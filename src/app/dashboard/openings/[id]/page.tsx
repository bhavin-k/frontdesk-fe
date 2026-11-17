import { OpeningDetail } from "@/features/dashboard/openings";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OpeningDetail id={id} />;
}
