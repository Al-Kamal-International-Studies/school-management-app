import "server-only";

import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { canViewIdCard } from "@/lib/idcard/authorizeIdCardAccess";
import { getIdCardData } from "@/lib/idcard/getIdCardData";
import { generateIdCardPdf, type IdCardPhoto } from "@/lib/idcard/generateIdCard";

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
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const me = await requireRole("admin", "teacher", "student", "parent");
  const { studentId } = await params;

  const allowed = await canViewIdCard(me, studentId);
  if (!allowed) return new Response("Not found.", { status: 404 });

  const data = await getIdCardData(studentId);
  if (!data) return new Response("Not found.", { status: 404 });

  // Fetch the avatar server-side and sniff its actual content-type — pdf-lib
  // can only embed PNG/JPEG, not WEBP (the format AvatarCropperModal's own
  // encodeCanvas() prefers for the general profile-avatar upload flow
  // elsewhere in this app). A WEBP avatar, a fetch failure, or no avatar at
  // all all fall back to the initials placeholder generateIdCardPdf draws
  // itself — never a failed download over a missing/incompatible photo.
  let photo: IdCardPhoto | null = null;
  if (data.avatarUrl) {
    try {
      const res = await fetch(data.avatarUrl, { cache: "no-store" });
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (contentType.includes("png")) photo = { bytes, format: "png" };
        else if (contentType.includes("jpeg") || contentType.includes("jpg")) photo = { bytes, format: "jpg" };
      }
    } catch {
      photo = null;
    }
  }

  const pdfBytes = await generateIdCardPdf(data, photo);

  const sanitizedName = data.fullName.trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Student";
  const filename = `${sanitizedName}_${data.enrollmentNumber}_ID-Card.pdf`;

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
