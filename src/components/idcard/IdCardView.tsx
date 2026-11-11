import { Card } from "@/components/ui/Card";
import { IdCardPhotoUpload } from "./IdCardPhotoUpload";
import { IdCardDownloadButtons } from "./IdCardDownloadButtons";
import { IdCardGraphic } from "./IdCardGraphic";
import { buildIdCardModel } from "@/lib/idcard/cardModel";
import type { IdCardData } from "@/lib/idcard/getIdCardData";
import type { Dictionary } from "@/lib/i18n/types";

/**
 * The shared ID card page body — the card itself (IdCardGraphic, the
 * spec's "Design B: Navy & Gold") plus the photo and download controls.
 * The card's text is formatted, sanitized and measured once by
 * buildIdCardModel — the same step the PDF and PNG downloads use — so the
 * card shown here and the file saved from the buttons beside it are the same
 * design with the same content.
 *
 * Used by all four role-specific pages: student/id-card, parent/id-card,
 * teacher/id-cards/[studentId], admin/id-cards/[studentId] — each page does
 * its own auth/authorization and passes the same props, so there is exactly
 * one place the card is laid out.
 */
export async function IdCardView({
  data,
  canEditPhoto,
  dict,
}: {
  data: IdCardData;
  canEditPhoto: boolean;
  dict: Dictionary;
}) {
  const model = await buildIdCardModel(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="w-full max-w-[480px] shrink-0">
          <IdCardGraphic model={model} avatarUrl={data.avatarUrl} label={`${dict.idCard.title}: ${data.fullName}`} />
        </div>

        <div className="flex flex-col items-center gap-4 sm:items-start">
          {canEditPhoto && (
            <div className="flex flex-col items-center">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-navy-400">{dict.idCard.photoLabel}</p>
              <IdCardPhotoUpload studentId={data.studentId} fullName={data.fullName} avatarUrl={data.avatarUrl} />
            </div>
          )}
          <IdCardDownloadButtons studentId={data.studentId} />
        </div>
      </div>

      <Card className="text-xs text-slate-500 dark:text-navy-400">{dict.idCard.helpText}</Card>
    </div>
  );
}
