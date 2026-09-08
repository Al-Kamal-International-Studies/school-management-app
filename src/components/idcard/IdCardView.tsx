import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IdCardPhotoUpload } from "./IdCardPhotoUpload";
import { initials } from "@/lib/utils";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  PADDING,
  HEADER_HEIGHT,
  HEADER_ACCENT_HEIGHT,
  PHOTO_WIDTH,
  PHOTO_HEIGHT,
  PHOTO_Y,
  CONTENT_BOTTOM,
  CONTENT_HEIGHT,
  DETAILS_X,
  DETAILS_WIDTH,
  FOOTER_RULE_Y,
  pctW,
  pctH,
} from "@/lib/idcard/layout";
import type { IdCardData } from "@/lib/idcard/getIdCardData";
import type { Dictionary } from "@/lib/i18n/types";

/** Same hex values as PALETTE in lib/admissions/generatePdf.ts (kept as a
 * small duplicate here rather than importing pdf-lib Color objects into a
 * component that renders CSS — deliberately NOT the ambient
 * `data-center`-driven CSS variables globals.css sets up (Part 6), since
 * those reflect the VIEWER's own active center, not necessarily the
 * center of the student whose card is being shown (e.g. a multi-center
 * admin viewing an AKET student's card while their own active branding is
 * AKIS) — this card's colors must always match its own subject. */
const CENTER_COLORS: Record<"akis" | "aket", { primary900: string; primary700: string; accent500: string; accent700: string; onBandSubtitle: string }> = {
  akis: { primary900: "#0F2131", primary700: "#1C3A56", accent500: "#D4AF37", accent700: "#946B0A", onBandSubtitle: "#F0DFA8" },
  aket: { primary900: "#03282C", primary700: "#0A474D", accent500: "#F5905A", accent700: "#D96D2C", onBandSubtitle: "#FBD3BC" },
};

/** Font size in points (the same unit generateIdCard.ts's pdf-lib calls
 * use) converted to `cqh` — a CSS container-query unit equal to 1% of the
 * nearest `container-type: size` ancestor's height. Sizing text this way
 * (instead of a fixed px value) is what keeps every proportion identical
 * to the PDF regardless of how large the card renders on screen — the
 * card is a fixed 243×153 "points" box either way, just at a different
 * physical scale. */
function cqh(points: number): string {
  return `${(points / CARD_HEIGHT) * 100}cqh`;
}

function formatDob(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The shared ID card UI — an on-page HTML/CSS preview built from the SAME
 * layout.ts constants generateIdCard.ts's PDF uses for every structural
 * box (header height, photo bounds, details column bounds, footer
 * position), converted to percentages/`cqh` units so the two can't drift
 * apart the way they used to (Muhammad, chat, 2026-09-09: the downloaded
 * PDF didn't match this preview — see layout.ts's own doc comment for the
 * full story). Text layout within the details column still uses plain
 * flexbox `justify-between` rather than literally replicating the PDF's
 * hand-computed cursor math — browsers and pdf-lib use genuinely
 * different font engines, so chasing pixel-identical glyph positions
 * isn't achievable or worth it; what matters is the same boxes, the same
 * proportions, and no overlap regardless of name length, which flexbox
 * handles natively.
 *
 * Used by all four role-specific pages: student/id-card, parent/id-card,
 * teacher/id-cards/[studentId], admin/id-cards/[studentId] — each page
 * does its own auth/authorization and passes the same props, so there is
 * exactly one place this card is actually laid out.
 */
export function IdCardView({
  data,
  canEditPhoto,
  dict,
}: {
  data: IdCardData;
  canEditPhoto: boolean;
  dict: Dictionary;
}) {
  const colors = CENTER_COLORS[data.center];
  const centerLabel = data.center === "akis" ? "AKIS" : "AKET";
  const schoolName = data.center === "akis" ? "Al Kamal International Studies" : "Al Kamal Education Technology";
  const logoSrc = data.center === "akis" ? "/brand/crest-white.png" : "/brand/aket-seal.png";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* The card preview — fixed aspect ratio matching the real CR80 PDF
            (243:153). `containerType: size` turns every `cqh` unit inside
            into "1% of THIS box's own height", which is what makes the
            proportions hold at any on-screen size. */}
        <div
          className="relative w-full max-w-[420px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-card"
          style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`, containerType: "size" }}
        >
          {/* Header band */}
          <div
            className="absolute inset-x-0 top-0 flex items-center"
            style={{ height: `${pctH(HEADER_HEIGHT)}%`, backgroundColor: colors.primary900, paddingInline: `${pctW(PADDING)}%`, gap: `${pctW(7)}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="shrink-0" style={{ height: "52%", width: "auto" }} />
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-white" style={{ fontSize: cqh(7.5), lineHeight: 1.2 }}>
                {schoolName}
              </p>
              <p className="truncate font-bold uppercase tracking-wide" style={{ fontSize: cqh(5.5), color: colors.onBandSubtitle, lineHeight: 1.3 }}>
                {dict.idCard.cardLabel}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-0" style={{ top: `${pctH(HEADER_HEIGHT)}%`, height: `${pctH(HEADER_ACCENT_HEIGHT)}%`, backgroundColor: colors.accent500 }} />

          {/* Photo — a standard passport-photo ratio (35:45mm), sized well
              short of the full content height and vertically centered
              within it (an earlier version spanned the full height
              edge-to-edge and was reported as too large). */}
          <div
            className="absolute flex items-center justify-center overflow-hidden border bg-slate-100"
            style={{
              left: `${pctW(PADDING)}%`,
              bottom: `${pctH(PHOTO_Y)}%`,
              width: `${pctW(PHOTO_WIDTH)}%`,
              height: `${pctH(PHOTO_HEIGHT)}%`,
              borderColor: colors.primary700,
              borderWidth: "1.5px",
            }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt={data.fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold" style={{ fontSize: cqh(18), color: colors.primary700 }}>
                {initials(data.fullName)}
              </span>
            )}
          </div>
          {/* Accent divider — matches the photo's own (centered,
              shorter-than-full) height, not the full content height, so
              it visually corresponds to the photo box itself. */}
          <div
            className="absolute"
            style={{ left: `${pctW(PADDING + PHOTO_WIDTH + 4)}%`, bottom: `${pctH(PHOTO_Y)}%`, width: `${pctW(1.5)}%`, height: `${pctH(PHOTO_HEIGHT)}%`, backgroundColor: colors.accent500 }}
          />

          {/* Details column — name + fields, spread across the FULL
              content height (unlike the photo) via `justify-between`,
              which naturally compresses the field rows when a long name
              wraps to 2 lines instead of 1 (no overlap, regardless of
              name length — the same problem generateIdCard.ts's dynamic
              row-height math solves on the PDF side). */}
          <div
            className="absolute flex flex-col justify-between"
            style={{
              left: `${pctW(DETAILS_X)}%`,
              bottom: `${pctH(CONTENT_BOTTOM)}%`,
              width: `${pctW(DETAILS_WIDTH)}%`,
              height: `${pctH(CONTENT_HEIGHT)}%`,
              // A deliberate gap below the header before the name starts —
              // it used to sit right up against the header band.
              paddingTop: `${pctH(6)}%`,
            }}
          >
            <p className="line-clamp-2 font-bold text-navy-900" style={{ fontSize: cqh(10), lineHeight: 1.2 }}>
              {data.fullName}
            </p>
            <div>
              <p className="font-bold uppercase tracking-wide" style={{ fontSize: cqh(5.5), color: colors.accent700, lineHeight: 1.4 }}>
                {dict.idCard.gradeClass}
              </p>
              <p className="truncate font-bold text-navy-900" style={{ fontSize: cqh(8.5), lineHeight: 1.3 }}>
                {data.className ?? dict.idCard.notAssigned}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide" style={{ fontSize: cqh(5.5), color: colors.accent700, lineHeight: 1.4 }}>
                {dict.idCard.studentIdLabel}
              </p>
              <p className="truncate font-bold text-navy-900" style={{ fontSize: cqh(8.5), lineHeight: 1.3 }}>
                {data.enrollmentNumber}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide" style={{ fontSize: cqh(5.5), color: colors.accent700, lineHeight: 1.4 }}>
                {dict.idCard.dobLabel}
              </p>
              <p className="truncate font-bold text-navy-900" style={{ fontSize: cqh(8.5), lineHeight: 1.3 }}>
                {formatDob(data.dateOfBirth)}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-slate-100"
            style={{ top: `${pctH(CARD_HEIGHT - FOOTER_RULE_Y)}%`, paddingInline: `${pctW(PADDING)}%` }}
          >
            <p className="truncate text-slate-400" style={{ fontSize: cqh(5.5) }}>
              {centerLabel} · {dict.idCard.academicYearLabel} {data.academicYear}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:items-start">
          {canEditPhoto && (
            <div className="flex flex-col items-center">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-navy-400">{dict.idCard.photoLabel}</p>
              <IdCardPhotoUpload studentId={data.studentId} fullName={data.fullName} avatarUrl={data.avatarUrl} />
            </div>
          )}
          <a href={`/api/id-card/${data.studentId}`} download>
            <Button type="button">
              <Download className="h-4 w-4" />
              {dict.idCard.download}
            </Button>
          </a>
        </div>
      </div>

      <Card className="text-xs text-slate-500 dark:text-navy-400">{dict.idCard.helpText}</Card>
    </div>
  );
}
