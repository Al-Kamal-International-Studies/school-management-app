import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IdCardPhotoUpload } from "./IdCardPhotoUpload";
import { initials } from "@/lib/utils";
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
const CENTER_COLORS: Record<"akis" | "aket", { primary900: string; primary700: string; accent500: string; onBandSubtitle: string }> = {
  akis: { primary900: "#0F2131", primary700: "#1C3A56", accent500: "#D4AF37", onBandSubtitle: "#F0DFA8" },
  aket: { primary900: "#03282C", primary700: "#0A474D", accent500: "#F5905A", onBandSubtitle: "#FBD3BC" },
};

function formatDob(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The shared ID card UI — an on-page HTML/CSS preview (matching
 * generateIdCard.ts's PDF layout 1:1, just at screen scale) plus a
 * "Download ID Card" link to the real PDF (app/api/id-card/[studentId]/
 * route.ts). Used by all four role-specific pages: student/id-card,
 * parent/id-card, teacher/id-cards/[studentId], admin/id-cards/[studentId]
 * — each page does its own auth/authorization and passes the same props,
 * so there is exactly one place this card is actually laid out.
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
        {/* The card preview itself — fixed aspect ratio matching the real
            CR80 PDF (243:153), scaled up for on-screen legibility. */}
        <div
          className="w-full max-w-[420px] shrink-0 overflow-hidden rounded-2xl shadow-card"
          style={{ aspectRatio: "243 / 153", backgroundColor: "white" }}
        >
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: colors.primary900 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="" className="h-8 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-white">{schoolName}</p>
                <p className="text-[10px] font-bold tracking-wide" style={{ color: colors.onBandSubtitle }}>
                  {dict.idCard.cardLabel}
                </p>
              </div>
            </div>
            <div className="h-[3px] shrink-0" style={{ backgroundColor: colors.accent500 }} />

            <div className="flex flex-1 gap-3 p-4">
              <div
                className="flex h-[86px] w-[86px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-100"
                style={{ borderColor: colors.primary700 }}
              >
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatarUrl} alt={data.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: colors.primary700 }}>
                    {initials(data.fullName)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-navy-900">{data.fullName}</p>
                <dl className="mt-2 space-y-1.5">
                  <div>
                    <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{dict.idCard.gradeClass}</dt>
                    <dd className="text-xs font-semibold text-navy-900">{data.className ?? dict.idCard.notAssigned}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{dict.idCard.studentIdLabel}</dt>
                    <dd className="text-xs font-semibold text-navy-900">{data.enrollmentNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{dict.idCard.dobLabel}</dt>
                    <dd className="text-xs font-semibold text-navy-900">{formatDob(data.dateOfBirth)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-1.5">
              <p className="text-[9px] text-slate-400">
                {centerLabel} · {dict.idCard.academicYearLabel} {data.academicYear}
              </p>
            </div>
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
