import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // Generate a signed URL for the prova.pdf file
    // File is in the 'prova' bucket
    const { data, error } = await supabaseAdmin.storage
      .from("prova") // Using the 'prova' bucket
      .createSignedUrl("prova.pdf", 3600); // URL expires in 1 hour (3600 seconds)

    if (error) {
      console.error("Error generating signed URL:", error);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    if (!data || !data.signedUrl) {
      return NextResponse.json(
        { error: "No signed URL returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      message: "Signed URL generated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
