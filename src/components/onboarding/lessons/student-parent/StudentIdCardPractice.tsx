"use client";

import type { PracticeProps } from "@/lib/onboarding/types";
import IdCardPracticeBase from "./IdCardPracticeBase";

export default function StudentIdCardPractice(props: PracticeProps) {
  return <IdCardPracticeBase {...props} role="student" />;
}
