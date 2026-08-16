"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAvatarUrlAction } from "./actions";
import { initials } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AvatarCropperModal } from "./AvatarCropperModal";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  userId,
  fullName,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  // Object URL of the just-selected (not-yet-uploaded) file. Its presence
  // is what opens the crop modal — nothing is uploaded until the user
  // confirms their pan/zoom choice there.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset now (not just on success) so picking the same file again later
    // — e.g. immediately after Cancel — still fires a change event.
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

  /** Fires when the user hits Confirm in the crop modal. `blob` is the
   * user's chosen pan/zoom framing rendered to a canvas and re-encoded
   * (see AvatarCropperModal) — this, not the original file, is what gets
   * uploaded. */
  async function handleCropConfirm(blob: Blob, ext: string) {
    setError(undefined);

    // Belt-and-suspenders re-check: the fixed export resolution keeps the
    // cropped output well under this in practice, but validate anyway
    // rather than assume.
    if (blob.size > MAX_SIZE_BYTES) {
      setError(dict.profilePage.avatarTooLarge);
      return;
    }

    setUploading(true);

    const supabase = createClient();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      cacheControl: "3600",
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately even though the path is stable.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const result = await setAvatarUrlAction(bustedUrl);
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
        className="group relative h-24 w-24 overflow-hidden rounded-full bg-navy-gradient shadow-card ring-4 ring-white"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={fullName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
            {initials(fullName)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 text-xs font-medium text-navy-600 transition-colors hover:text-navy-800"
      >
        {uploading ? dict.profilePage.uploading : dict.profilePage.changePhoto}
      </button>
      {error && !cropSrc && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {cropSrc && (
        <AvatarCropperModal
          imageSrc={cropSrc}
          altText={fullName}
          pending={uploading}
          error={error}
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
