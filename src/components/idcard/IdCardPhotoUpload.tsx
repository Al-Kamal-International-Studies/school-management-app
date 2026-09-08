"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { uploadStudentPhotoAction } from "@/lib/idcard/actions";
import { initials } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AvatarCropperModal } from "@/app/(dashboard)/profile/AvatarCropperModal";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The ID card page's own photo control — same upload-to-Storage +
 * pan/zoom-crop shape as (dashboard)/profile/AvatarUpload.tsx, but for an
 * arbitrary `studentId` (not always the caller's own account) and always
 * encoded as PNG (`outputFormat="png"` on the shared AvatarCropperModal —
 * see that component's own doc comment) so the result is guaranteed
 * embeddable in the generated ID card PDF. Only rendered by callers that
 * already confirmed canEditIdCardPhoto — see IdCardView.tsx.
 */
export function IdCardPhotoUpload({
  studentId,
  fullName,
  avatarUrl,
}: {
  studentId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(undefined);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(dict.profilePage.avatarInvalidType);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(dict.profilePage.avatarTooLarge);
      return;
    }

    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function closeCropper() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleCropConfirm(blob: Blob, ext: string) {
    setError(undefined);
    if (blob.size > MAX_SIZE_BYTES) {
      setError(dict.profilePage.avatarTooLarge);
      return;
    }

    setUploading(true);

    // Uploaded server-side (uploadStudentPhotoAction), not via the browser's
    // own Supabase client — see that action's own doc comment for why: the
    // `avatars` bucket's Storage RLS only allows writing to a folder that
    // matches the CALLER's own auth.uid(), which blocks exactly this case
    // (an admin/parent uploading to a different student's folder) with
    // "new row violates row-level security policy".
    const formData = new FormData();
    formData.append("file", blob, `avatar.${ext}`);
    const result = await uploadStudentPhotoAction(studentId, formData);
    setUploading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    closeCropper();
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-24 w-24 overflow-hidden rounded-2xl bg-navy-gradient shadow-card ring-4 ring-white dark:ring-navy-900"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={fullName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">{initials(fullName)}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </motion.button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 text-xs font-medium text-navy-600 transition-colors hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200"
      >
        {uploading ? dict.profilePage.uploading : dict.profilePage.changePhoto}
      </button>
      {error && !cropSrc && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {cropSrc && (
        <AvatarCropperModal
          imageSrc={cropSrc}
          altText={fullName}
          pending={uploading}
          error={error}
          outputFormat="png"
          onCancel={() => {
            if (uploading) return;
            setError(undefined);
            closeCropper();
          }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
