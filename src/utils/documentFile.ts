import { complianceRecordService } from '@/services/complianceRecordService';

/**
 * Opens a stored document in a new browser tab.
 *
 * Files are only served to authenticated requests, so the file is fetched with
 * the session token and shown from an object URL. The tab is opened before the
 * fetch so the browser treats it as a user-initiated popup.
 */
export const openDocumentInNewTab = async (documentId: string): Promise<void> => {
  const tab = window.open('', '_blank');
  try {
    const blob = await complianceRecordService.fetchDocumentFile(documentId, { inline: true });
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    // Give the new tab time to load before releasing the object URL
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
};
