import env from '@/config/env';
import { useEffect } from 'react';

export const APP_NAME = env.APP_NAME;

export const formatPageTitle = (title?: string | null): string => (title ? `${title} · ${APP_NAME}` : APP_NAME);

/**
 * Sets the browser tab title. Every route already gets a generic title (see
 * routes/RouteTitle.tsx); detail pages call this with the loaded record's name
 * to replace it, e.g. usePageTitle(entity?.name). Nothing happens while
 * `title` is empty, so the generic title stays until the data arrives.
 */
export const usePageTitle = (title?: string | null): void => {
  useEffect(() => {
    if (title) document.title = formatPageTitle(title);
  }, [title]);
};
