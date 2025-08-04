"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TestPdfPage() {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/test-pdf");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch signed URL");
      }

      setSignedUrl(data.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically fetch the signed URL when the component mounts
    fetchSignedUrl();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>PDF Test Page</CardTitle>
          <CardDescription>
            Testing Supabase signed URL generation for prova.pdf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={fetchSignedUrl}
              disabled={loading}
              variant="outline"
            >
              {loading ? "Loading..." : "Refresh PDF"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">Error: {error}</p>
            </div>
          )}

          {signedUrl && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                PDF loaded successfully from Supabase:
              </p>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={signedUrl}
                  width="100%"
                  height="600"
                  title="PDF Viewer"
                  className="border-0"
                >
                  Your browser does not support iframes.
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    Click here to view the PDF
                  </a>
                </iframe>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Show signed URL
                </summary>
                <code className="block mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                  {signedUrl}
                </code>
              </details>
            </div>
          )}

          {!signedUrl && !loading && !error && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-gray-600">No PDF loaded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
