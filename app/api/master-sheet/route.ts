import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customUrl = searchParams.get("url") || process.env.MASTER_SHEET_URL || process.env.NEXT_PUBLIC_MASTER_SHEET_URL;

  if (customUrl && customUrl.startsWith("http")) {
    try {
      const res = await fetch(customUrl, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const text = await res.text();
        return new NextResponse(text, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Master-Source": "live-google-sheet",
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch custom master sheet URL, falling back to local master sheet:", err);
    }
  }

  try {
    const filePath = path.join(process.cwd(), "public", "master-sheet.csv");
    const data = await fs.promises.readFile(filePath, "utf-8");
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Master-Source": "local-master-sheet",
      },
    });
  } catch (error) {
    return new NextResponse("Error reading master sheet", { status: 500 });
  }
}
