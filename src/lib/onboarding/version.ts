/**
 * Version of the getting-started onboarding. Stored in
 * profiles.tour_version_seen when someone finishes it (together with
 * has_seen_tour = true).
 *
 * Bump it when a shipped feature needs a new lesson, and give that lesson
 * `since: <new number>`. People who already finished an earlier version then
 * see only the lessons newer than what they last saw ("what's new").
 */
export const ONBOARDING_VERSION = 10;

/** Whether a profile still has onboarding to do (first time, or behind). */
export function needsOnboarding(profile: { has_seen_tour: boolean; tour_version_seen: number }): boolean {
  return !profile.has_seen_tour || profile.tour_version_seen < ONBOARDING_VERSION;
}

/**
 * The "what's new" floor to use when opening the flow: only people who are
 * actually behind get the filtered list. Someone who is up to date and opens
 * Getting started from the sidebar gets the full flow.
 */
export function floorForVisit(profile: { has_seen_tour: boolean; tour_version_seen: number }): number {
  return needsOnboarding(profile) ? lessonsSinceFloor(profile) : 0;
}

/**
 * The lowest `since` a lesson must exceed to be shown. 0 = show every lesson
 * (first time, or the old tour). An account that finished onboarding v10 or
 * later only sees lessons added after the version it saw.
 */
export function lessonsSinceFloor(profile: { has_seen_tour: boolean; tour_version_seen: number }): number {
  return profile.has_seen_tour && profile.tour_version_seen >= 10 ? profile.tour_version_seen : 0;
}
