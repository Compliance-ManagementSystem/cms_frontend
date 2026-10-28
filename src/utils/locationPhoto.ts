import { locationService } from '@/services/locationService';

export type PhotoSize = 'full' | 'thumb';

// Photos are only served to signed-in requests, so they are fetched with the
// session token and shown from object URLs. A key's image never changes, so
// each one is fetched once per page load.
const cache = new Map<string, Promise<string>>();

export const loadLocationPhoto = (key: string, size: PhotoSize): Promise<string> => {
  const id = `${key}:${size}`;
  if (!cache.has(id)) {
    const request = locationService.fetchPhoto(key, size).then((blob) => URL.createObjectURL(blob));
    // A failed load can be retried later
    request.catch(() => cache.delete(id));
    cache.set(id, request);
  }
  return cache.get(id)!;
};

/** Opens the full-size photo in a new tab */
export const openLocationPhoto = async (key: string): Promise<void> => {
  const tab = window.open('', '_blank');
  try {
    const url = await loadLocationPhoto(key, 'full');
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
  } catch {
    tab?.close();
  }
};
