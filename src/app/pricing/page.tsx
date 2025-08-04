import { PricingPage } from "@/app/components/pricing/pricing-page";
import { db } from "@/db/drizzle";
import { subjectsTable } from "@/db/schema";

export default async function PricingPageRoute() {
  // Fetch available subjects
  const subjects = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      description: subjectsTable.description,
      slug: subjectsTable.slug,
      color: subjectsTable.color,
      maturita: subjectsTable.maturita,
    })
    .from(subjectsTable)
    .orderBy(subjectsTable.order_index);

  return <PricingPage subjects={subjects} />;
}
