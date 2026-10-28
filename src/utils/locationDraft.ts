/**
 * Unsaved location form drafts, kept in this browser so a refresh or a crash does
 * not lose what was typed. One draft per user and per location ("new" for the
 * add form). Storage can be unavailable (private windows, blocked site data), so
 * every access fails quietly.
 */

const PREFIX = 'cms:location-draft:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface LocationDraft<T> {
  savedAt: string;
  /** The location's updatedAt when editing; a draft of an older version is dropped */
  baseUpdatedAt?: string;
  data: T;
}

const keyFor = (userId: string, locationId?: string) => `${PREFIX}${userId}:${locationId || 'new'}`;

export const loadLocationDraft = <T>(
  userId: string,
  locationId?: string,
  baseUpdatedAt?: string
): LocationDraft<T> | null => {
  try {
    const raw = localStorage.getItem(keyFor(userId, locationId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocationDraft<T>;
    const tooOld = Date.now() - new Date(draft.savedAt).getTime() > MAX_AGE_MS;
    if (tooOld || draft.baseUpdatedAt !== baseUpdatedAt) {
      removeLocationDraft(userId, locationId);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

export const saveLocationDraft = <T>(userId: string, locationId: string | undefined, draft: LocationDraft<T>) => {
  try {
    localStorage.setItem(keyFor(userId, locationId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, just without a draft
  }
};

export const removeLocationDraft = (userId: string, locationId?: string) => {
  try {
    localStorage.removeItem(keyFor(userId, locationId));
  } catch {
    // Nothing to clean up
  }
};

/** Drops every user's drafts, e.g. on sign-out on a shared computer */
export const clearLocationDrafts = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clean up
  }
};
