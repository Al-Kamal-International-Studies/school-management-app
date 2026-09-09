import "server-only";

import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildIdCardPdf, idCardFilenameBase } from "@/lib/idcard/buildIdCardPdf";
import { rasterizeIdCardPng } from "@/lib/idcard/rasterizeIdCard";

/**
 * The "Save as Image" sibling of ../route.ts — same authorization and PDF
 * build (buildIdCardPdf.ts), then rasterized to PNG (rasterizeIdCard.ts)
 * instead of served as-is. Added because a plain PDF download did nothing
 * useful on Muhammad's phone: mobile browsers generally open a PDF in
 * their own built-in viewer rather than saving it anywhere, which is not
 * what "download the ID card" means on a phone — a PNG is what the
 * client's Web Share fallback (IdCardDownloadButtons.tsx) can actually
 * hand to the OS's native "Save Image" / "Save to Photos" share-sheet
 * action.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const me = await requireRole("admin", "teacher", "student", "parent");
  const { studentId } = await params;

  const result = await buildIdCardPdf(me, studentId);
  if (!result.ok) return new Response("Not found.", { status: result.status });

  const pngBytes = await rasterizeIdCardPng(result.pdfBytes);

  return new Response(new Uint8Array(pngBytes), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${idCardFilenameBase(result.data)}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
