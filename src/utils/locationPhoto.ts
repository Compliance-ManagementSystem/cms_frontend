import { locationService } from '@/services/locationService';

export type PhotoSize = 'full' | 'thumb';

// Signed-in requests get a signed Cloudinary URL for a photo, which the browser
// then loads directly. A key's image never changes, so each URL is requested once
// per page load.
const cache = new Map<string, Promise<string>>();

export const loadLocationPhoto = (key: string, size: PhotoSize): Promise<string> => {
  const id = `${key}:${size}`;
  if (!cache.has(id)) {
    const request = locationService.getPhotoUrl(key, size);
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
