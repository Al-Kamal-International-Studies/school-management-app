import "server-only";

import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildIdCardPdf, idCardFilenameBase } from "@/lib/idcard/buildIdCardPdf";

/**
 * Serves a freshly-generated ID card PDF as a real download — the first
 * Route Handler in this codebase (every other file-serving surface so far
 * uses a pre-generated Storage object + signed URL, e.g.
 * getAdmissionPdfUrl.ts; this one builds the PDF bytes directly in the
 * response since nothing is pre-generated/stored — see generateIdCard.ts's
 * own doc comment for why). `requireRole` here enforces the exact same
 * gates (must-change-password, device approval, admin MFA, etc.) a normal
 * page load would — Route Handlers support `redirect()` from
 * next/navigation identically to Server Components (confirmed against
 * node_modules/next/dist/docs/.../route.md's own "Redirects" example
 * before relying on it, given AGENTS.md's standing instruction to check
 * this Next version's actual docs rather than assume prior-training
 * behavior).
 *
 * The authorization + PDF-build steps live in buildIdCardPdf.ts, shared
 * with the sibling .../image/route.ts (the "Save as Image" PNG download —
 * Muhammad, chat, 2026-09-09) so the two can never disagree on who's
 * allowed to see a given card.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const me = await requireRole("admin", "teacher", "student", "parent");
  const { studentId } = await params;

  const result = await buildIdCardPdf(me, studentId);
  if (!result.ok) return new Response("Not found.", { status: result.status });

  return new Response(new Uint8Array(result.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${idCardFilenameBase(result.data)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
