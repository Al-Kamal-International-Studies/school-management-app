import "server-only";

import type { Profile } from "@/lib/types/database.types";
import { canViewIdCard } from "./authorizeIdCardAccess";
import { getIdCardData, type IdCardData } from "./getIdCardData";
import { generateIdCardPdf, type IdCardPhoto } from "./generateIdCard";

export type IdCardBuildResult = { ok: true; data: IdCardData; pdfBytes: Uint8Array } | { ok: false; status: 404 };

/**
 * The authorization + PDF-generation steps shared by both download routes
 * (app/api/id-card/[studentId]/route.ts for the PDF itself, .../image/
 * route.ts for the rasterized PNG — see rasterizeIdCard.ts's own doc
 * comment for why that one exists) — kept in one place so the two routes
 * can never drift on who's allowed to see a given card.
 */
export async function buildIdCardPdf(me: Profile, studentId: string): Promise<IdCardBuildResult> {
  const allowed = await canViewIdCard(me, studentId);
  if (!allowed) return { ok: false, status: 404 };

  const data = await getIdCardData(studentId);
  if (!data) return { ok: false, status: 404 };

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
  return { ok: true, data, pdfBytes };
}

/** Same sanitization both routes need for their Content-Disposition filename. */
export function idCardFilenameBase(data: IdCardData): string {
  const sanitizedName = data.fullName.trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Student";
  return `${sanitizedName}_${data.enrollmentNumber}_ID-Card`;
}
