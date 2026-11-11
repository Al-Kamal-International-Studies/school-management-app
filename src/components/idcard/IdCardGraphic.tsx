import type { IdCardModel } from "@/lib/idcard/cardModel";
import {
  BARCODE,
  CARD_H,
  CARD_RADIUS,
  CARD_W,
  COLOR,
  CREST,
  FIELDS,
  FOOTER,
  HEADER_EDGE_PATH,
  HEADER_EDGE_WIDTH,
  HEADER_GRADIENT,
  HEADER_PATH,
  PHOTO,
  SCHOOL_NAME,
  SILHOUETTE_HEAD,
  SILHOUETTE_SHOULDERS,
  TITLE,
  WAVE_STROKE_OPACITY,
  WAVE_STROKE_WIDTH,
  pathToD,
  wavePolylines,
} from "@/lib/idcard/layout";
import { idCardSans, idCardSerif } from "./idCardFonts";

/**
 * The student ID card as it is shown in the app — "Design B: Navy & Gold",
 * drawn as one inline SVG in the spec's 1011 × 638 design space (viewBox), so
 * it scales to any width with every proportion intact. All geometry and
 * colour come from lib/idcard/layout.ts and all text, sizes and positions
 * from lib/idcard/cardModel.ts — the same inputs the PDF and PNG downloads
 * are drawn from, so what is on screen is what gets downloaded.
 *
 * The student's photo is an HTML <img> laid over the SVG's photo well (rather
 * than an SVG <image>) because the spec crops it with `object-fit: cover;
 * object-position: 50% 30%`, which SVG cannot express.
 */

const sans = idCardSans.style.fontFamily;
const serif = idCardSerif.style.fontFamily;

const WAVES = wavePolylines().map((pts) => pts.map(([x, y]) => `${x},${y}`).join(" "));

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

export function IdCardGraphic({ model, avatarUrl, label }: { model: IdCardModel; avatarUrl: string | null; label: string }) {
  const moduleW = model.barcode ? BARCODE.w / model.barcode.modules : 0;
  const well = { x: PHOTO.cx - PHOTO.wellR, y: PHOTO.cy - PHOTO.wellR, d: PHOTO.wellR * 2 };
  const sil = { x: PHOTO.cx - PHOTO.silhouette.w / 2, y: PHOTO.cy + PHOTO.wellR - PHOTO.silhouette.h };

  return (
    <div
      className="relative w-full overflow-hidden shadow-card"
      // Corner radius 38 px of the 1011 × 638 card, expressed as % so it scales with the card.
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, borderRadius: `${pct(CARD_RADIUS, CARD_W)} / ${pct(CARD_RADIUS, CARD_H)}` }}
    >
      <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} role="img" aria-label={label} className="absolute inset-0 block h-full w-full" textRendering="geometricPrecision">
        <defs>
          <linearGradient id="idcard-header-grad" x1={HEADER_GRADIENT.x1} y1={HEADER_GRADIENT.y1} x2={HEADER_GRADIENT.x2} y2={HEADER_GRADIENT.y2}>
            {HEADER_GRADIENT.stops.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <linearGradient
            id="idcard-ring-grad"
            gradientUnits="userSpaceOnUse"
            x1={PHOTO.cx - PHOTO.goldR}
            y1={PHOTO.cy - PHOTO.goldR}
            x2={PHOTO.cx + PHOTO.goldR}
            y2={PHOTO.cy + PHOTO.goldR}
          >
            <stop offset="0" stopColor={COLOR.gold300} />
            <stop offset="1" stopColor={COLOR.gold700} />
          </linearGradient>
          <clipPath id="idcard-well-clip">
            <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.wellR} />
          </clipPath>
        </defs>

        {/* §3 paper, §4 wave lines (under the header, so they show only in the body) */}
        <rect width={CARD_W} height={CARD_H} fill={COLOR.paper} />
        <g fill="none" stroke={COLOR.gold500} strokeOpacity={WAVE_STROKE_OPACITY} strokeWidth={WAVE_STROKE_WIDTH}>
          {WAVES.map((points, i) => (
            <polyline key={i} points={points} />
          ))}
        </g>

        {/* §5 header + gold edge */}
        <path d={pathToD(HEADER_PATH)} fill="url(#idcard-header-grad)" />
        <path d={pathToD(HEADER_EDGE_PATH)} fill="none" stroke={COLOR.gold500} strokeWidth={HEADER_EDGE_WIDTH} />

        {/* §6 footer */}
        <rect x={0} y={FOOTER.y} width={CARD_W} height={FOOTER.h} fill={COLOR.navy900} />
        <rect x={0} y={FOOTER.y} width={CARD_W} height={FOOTER.ruleH} fill={COLOR.gold500} />
        <g fontFamily={sans} fontWeight={500} fontSize={FOOTER.fontSize} fill={COLOR.white}>
          <text x={FOOTER.leftX} y={FOOTER.baseline}>
            {model.footerLeft}
          </text>
          <text x={model.footerRight.x} y={FOOTER.baseline}>
            {model.footerRight.text}
          </text>
        </g>

        {/* §7 crest + school name */}
        <image href={CREST.src} x={CREST.x} y={CREST.y} width={CREST.w} height={CREST.h} preserveAspectRatio="xMidYMid meet" />
        <g fontFamily={sans} fontWeight={600} fontSize={SCHOOL_NAME.fontSize} fill={COLOR.white}>
          {SCHOOL_NAME.lines.map((l) => (
            <text key={l.text} x={SCHOOL_NAME.x} y={l.baseline}>
              {l.text}
            </text>
          ))}
        </g>

        {/* §8 title */}
        <g fontFamily={serif} fontWeight={800} fontSize={TITLE.fontSize} letterSpacing={TITLE.letterSpacing}>
          {TITLE.lines.map((l) => (
            <text key={l.text} x={TITLE.x} y={l.baseline} fill={l.color}>
              {l.text}
            </text>
          ))}
        </g>

        {/* §9 photo rings + well, and the no-photo silhouette */}
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.goldR} fill="url(#idcard-ring-grad)" />
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.navyR} fill={COLOR.navy900} />
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.wellR} fill={COLOR.photoBg} />
        {!avatarUrl && (
          <g clipPath="url(#idcard-well-clip)" fill={COLOR.placeholder}>
            <circle cx={sil.x + SILHOUETTE_HEAD.cx} cy={sil.y + SILHOUETTE_HEAD.cy} r={SILHOUETTE_HEAD.r} />
            <path d={pathToD(SILHOUETTE_SHOULDERS)} transform={`translate(${sil.x} ${sil.y})`} />
          </g>
        )}

        {/* §10 data fields */}
        <g fontFamily={sans} fontWeight={600}>
          {model.fields.map((f) => (
            <g key={f.label}>
              <text x={FIELDS.labelX} y={f.baseline} fontSize={FIELDS.labelSize} fill={COLOR.goldInk}>
                {f.label}
              </text>
              <text x={FIELDS.valueX} y={f.baseline} fontSize={f.fontSize} fill={COLOR.navy900}>
                {f.value}
              </text>
            </g>
          ))}
        </g>

        {/* §11 barcode + human-readable ID */}
        {model.barcode &&
          model.barcode.runs.map((r) => (
            <rect key={r.start} x={BARCODE.x + r.start * moduleW} y={BARCODE.y} width={r.width * moduleW} height={BARCODE.h} fill={COLOR.barcodeInk} />
          ))}
        <text
          x={model.barcodeText.x}
          y={BARCODE.textBaseline}
          fontFamily={sans}
          fontWeight={600}
          fontSize={BARCODE.textSize}
          letterSpacing={BARCODE.textLetterSpacing}
          fill={COLOR.slateInk}
        >
          {model.barcodeText.text}
        </text>
      </svg>

      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="absolute rounded-full object-cover"
          style={{
            left: pct(well.x, CARD_W),
            top: pct(well.y, CARD_H),
            width: pct(well.d, CARD_W),
            height: pct(well.d, CARD_H),
            objectPosition: `50% ${PHOTO.focusY * 100}%`,
          }}
        />
      )}
    </div>
  );
}
