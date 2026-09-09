"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Two explicit download options — "Download PDF" and "Save as Image" —
 * replacing the single plain `<a href download>` link this used to be.
 * Muhammad, chat, 2026-09-09: on his phone, tapping that link "takes me
 * to a page, and just shows me the ID, that's it. No download starting."
 * That's expected mobile-browser behavior for a PDF (most open it in a
 * built-in viewer rather than saving it anywhere) and `<a download>`
 * itself is unreliable across mobile browsers/in-app webviews — it's
 * routinely ignored outside of a same-tab, same-origin blob URL.
 *
 * Both buttons here fetch the file as a blob, then:
 *   1. Prefer the Web Share API with a real File attached (`navigator.
 *      share`), when the browser claims it can share that file
 *      (`navigator.canShare`) — this is what actually produces a native
 *      "Save Image"/"Save to Files" sheet on a phone (supported by Mobile
 *      Safari 15+ and Android Chrome), which is the literal "Save to
 *      Photos or Gallery"-style option that was asked for.
 *   2. Otherwise fall back to a synthetic same-page blob-URL anchor click
 *      — reliable on desktop browsers (and older mobile ones), and unlike
 *      the previous plain `<a href>` it never navigates the page away to
 *      do it.
 */
export function IdCardDownloadButtons({ studentId }: { studentId: string }) {
  const { dict } = useLocale();
  const [pending, setPending] = useState<"pdf" | "image" | null>(null);
  const [error, setError] = useState<string>();

  async function saveFile(url: string, kind: "pdf" | "image") {
    setError(undefined);
    setPending(kind);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();

      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? (kind === "pdf" ? "ID-Card.pdf" : "ID-Card.png");

      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (shareError) {
          // AbortError = the user dismissed the share sheet themselves —
          // not a failure, don't fall through to also triggering a
          // blob-anchor download on top of that.
          if (shareError instanceof Error && shareError.name === "AbortError") return;
          // Any other share failure (e.g. no share target chosen/
          // available on this platform despite canShare saying yes) falls
          // through to the anchor-download fallback below.
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError(dict.idCard.downloadError);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <Button type="button" onClick={() => saveFile(`/api/id-card/${studentId}`, "pdf")} loading={pending === "pdf"} disabled={pending === "image"}>
        <FileText className="h-4 w-4" />
        {dict.idCard.downloadPdf}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => saveFile(`/api/id-card/${studentId}/image`, "image")}
        loading={pending === "image"}
        disabled={pending === "pdf"}
      >
        <ImageIcon className="h-4 w-4" />
        {dict.idCard.saveAsImage}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
