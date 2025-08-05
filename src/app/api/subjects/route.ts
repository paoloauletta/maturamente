import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { subjectsTable } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const subjects = await db
      .select({
        id: subjectsTable.id,
        name: subjectsTable.name,
        description: subjectsTable.description,
        slug: subjectsTable.slug,
      })
      .from(subjectsTable)
      .orderBy(subjectsTable.name);

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
