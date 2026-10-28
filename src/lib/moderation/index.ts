import "server-only";

import { createModerator, type LexiconData, type ModelData, type ModerationResult } from "./engine";
import lexicon from "./lexicon.json";
import model from "./model.json";

/**
 * The chat safety filter (HANDOVER Part 42). Runs in-process on the server in
 * well under a millisecond — no Python service to host. The word list and
 * model are produced by `ml/train.py`; retrain there, never hand-edit the JSON.
 */
const moderator = createModerator(lexicon as LexiconData, model as unknown as ModelData);

export type { ModerationResult };

export function moderateMessage(text: string): ModerationResult {
  return moderator.moderate(text);
}

/** For showing stored messages: hides anything today's filter would block
 * (e.g. sent before a stricter model shipped). */
export function isHiddenByFilter(text: string): boolean {
  return moderator.moderate(text).action === "block";
}
