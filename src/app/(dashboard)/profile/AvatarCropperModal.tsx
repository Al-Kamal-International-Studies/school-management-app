"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Visible diameter of the circular crop frame, in CSS pixels.
const FRAME_SIZE = 256;
// Resolution of the exported square image. Comfortably larger than the
// 96px (h-24 w-24) circle it's rendered into today, with headroom for
// bigger avatar treatments later without needing a re-crop.
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Multiplier converting a wheel-scroll's deltaY into a zoom change.
const WHEEL_ZOOM_SPEED = 0.0015;

interface Point {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Keeps the pan offset within the range that still lets the (scaled)
 * image fully cover the circular frame — never showing empty space at
 * the edges. */
function clampOffset(offset: Point, displayWidth: number, displayHeight: number): Point {
  const maxX = Math.max(0, (displayWidth - FRAME_SIZE) / 2);
  const maxY = Math.max(0, (displayHeight - FRAME_SIZE) / 2);
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };
}

function extForBlob(blob: Blob): string {
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/jpeg") return "jpg";
  return "png";
}

/** Encodes the canvas as a Blob, preferring WEBP and falling back to JPEG
 * (then whatever the browser's default fallback is, typically PNG) for
 * environments that can't encode WEBP via canvas.toBlob. */
function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const tryType = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));

  return (async () => {
    const webp = await tryType("image/webp");
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await tryType("image/jpeg");
    if (jpeg) return jpeg;
    throw new Error("Canvas encoding failed.");
  })();
}

/**
 * A pan/zoom cropping overlay shown after a file is selected in
 * AvatarUpload. Nothing is uploaded until the user hits Confirm — see
 * AvatarUpload.handleCropConfirm, which renders the chosen pan/zoom state
 * onto an offscreen canvas and uploads the resulting Blob.
 *
 * The modal's own entrance uses the plain CSS `animate-fade-in` /
 * `animate-fade-in-up` keyframe utilities (tailwind.config.ts), not a
 * Framer Motion mount animation — see HANDOVER.md Part 4 §14 / Part 5 for
 * why a JS-driven opacity-0-on-mount animation is unsafe here (it can get
 * stuck invisible if the post-hydration effect never runs). Pan/zoom
 * itself is driven directly by pointer/wheel state, not by an animation
 * library, so that risk doesn't apply to the interactive part either.
 */
export function AvatarCropperModal({
  imageSrc,
  altText,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  altText: string;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob, ext: string) => void;
}) {
  const { dict } = useLocale();
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState(false);

  // Refs mirroring the latest zoom/offset state, read from inside
  // pointer/wheel handlers so rapid-fire events (drag, pinch, scroll)
  // never act on a stale closure.
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    // "Cover" scale — the smallest zoom at which the image still fills
    // the whole circular frame with no gaps, same idea as CSS
    // background-size: cover.
    return Math.max(FRAME_SIZE / naturalSize.width, FRAME_SIZE / naturalSize.height);
  }, [naturalSize]);

  const displayScale = baseScale * zoom;
  const displayWidth = (naturalSize?.width ?? FRAME_SIZE) * displayScale;
  const displayHeight = (naturalSize?.height ?? FRAME_SIZE) * displayScale;

  const setZoomClamped = useCallback(
    (nextZoom: number) => {
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      zoomRef.current = z;
      setZoom(z);
      if (naturalSize) {
        const w = naturalSize.width * baseScale * z;
        const h = naturalSize.height * baseScale * z;
        setOffset((prev) => {
          const next = clampOffset(prev, w, h);
          offsetRef.current = next;
          return next;
        });
      }
    },
    [naturalSize, baseScale],
  );

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      setLoadError(true);
      return;
    }
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    zoomRef.current = MIN_ZOOM;
    offsetRef.current = { x: 0, y: 0 };
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  // --- Pan (drag) + pinch-zoom, unified across mouse and touch via the
  // Pointer Events API. ---
  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<Point | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  function pointerDistance(): number {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return 0;
    const [a, b] = pts as [Point, Point];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      pinchStart.current = { distance: pointerDistance(), zoom: zoomRef.current };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const dist = pointerDistance();
      if (pinchStart.current.distance > 0) {
        setZoomClamped((pinchStart.current.zoom * dist) / pinchStart.current.distance);
      }
      return;
    }

    if (pointers.current.size === 1 && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => {
        const next = clampOffset({ x: prev.x + dx, y: prev.y + dy }, displayWidth, displayHeight);
        offsetRef.current = next;
        return next;
      });
    }
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // Dropped from two fingers to one — re-anchor the drag baseline on
      // the remaining finger so it doesn't jump the image on its next move.
      const [remaining] = Array.from(pointers.current.values());
      dragStart.current = remaining ?? null;
      pinchStart.current = null;
    } else if (pointers.current.size === 0) {
      dragStart.current = null;
      pinchStart.current = null;
    }
  }

  // Wheel-to-zoom needs a non-passive native listener — React's onWheel
  // prop is attached passively, so calling preventDefault() there would
  // both warn and fail to stop the page from scrolling underneath.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      setZoomClamped(zoomRef.current - e.deltaY * WHEEL_ZOOM_SPEED * zoomRef.current);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [setZoomClamped]);

  // Let Escape close the dialog, same as clicking Cancel.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, pending]);

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !naturalSize || pending) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setLoadError(true);
      return;
    }

    const ratio = OUTPUT_SIZE / FRAME_SIZE;
    const outW = displayWidth * ratio;
    const outH = displayHeight * ratio;
    const outX = OUTPUT_SIZE / 2 - outW / 2 + offsetRef.current.x * ratio;
    const outY = OUTPUT_SIZE / 2 - outH / 2 + offsetRef.current.y * ratio;
    ctx.drawImage(img, outX, outY, outW, outH);

    try {
      const blob = await encodeCanvas(canvas);
      onConfirm(blob, extForBlob(blob));
    } catch {
      setLoadError(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/60 backdrop-blur-[2px]"
        onClick={pending ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-cropper-title"
        className="relative w-full max-w-sm animate-fade-in-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-navy-800 dark:bg-navy-900"
      >
        <h2 id="avatar-cropper-title" className="font-display text-lg font-semibold text-navy-900 dark:text-white">
          {dict.profilePage.cropTitle}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-navy-300">{dict.profilePage.cropHint}</p>

        <div className="mt-5 flex justify-center">
          <div
            ref={frameRef}
            className="relative touch-none select-none overflow-hidden rounded-full bg-slate-100 shadow-inner ring-4 ring-white cursor-grab dark:bg-navy-800 dark:ring-navy-700"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={endPointer}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt={altText}
              draggable={false}
              onLoad={handleImageLoad}
              onError={() => setLoadError(true)}
              className="pointer-events-none absolute select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                maxWidth: "none",
                left: FRAME_SIZE / 2 - displayWidth / 2 + offset.x,
                top: FRAME_SIZE / 2 - displayHeight / 2 + offset.y,
              }}
            />
          </div>
        </div>

        {loadError && <p className="mt-3 text-center text-xs text-red-600">{dict.profilePage.cropLoadError}</p>}
        {!loadError && error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-slate-400 dark:text-navy-400" aria-hidden="true" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            aria-label={dict.profilePage.cropZoomLabel}
            disabled={!naturalSize || pending}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-navy-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-navy-700 dark:accent-gold-400"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-slate-400 dark:text-navy-400" aria-hidden="true" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={pending} className="btn-secondary">
            <X className="h-4 w-4" />
            {dict.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !naturalSize || loadError}
            className="btn-primary"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pending ? dict.profilePage.uploading : dict.profilePage.cropConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
