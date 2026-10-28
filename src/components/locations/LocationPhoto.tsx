import React, { useEffect, useState } from 'react';
import { loadLocationPhoto, type PhotoSize } from '@/utils/locationPhoto';

interface LocationPhotoProps {
  photoKey?: string | null;
  size?: PhotoSize;
  alt: string;
  className?: string;
  /** Shown when there is no photo or it cannot be loaded */
  fallback: React.ReactNode;
}

const LocationPhoto: React.FC<LocationPhotoProps> = ({ photoKey, size = 'thumb', alt, className = '', fallback }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!photoKey) return;
    let active = true;
    loadLocationPhoto(photoKey, size)
      .then((url) => active && setSrc(url))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [photoKey, size]);

  if (!photoKey || failed) return <>{fallback}</>;
  if (!src) return <div className={`${className} animate-pulse bg-slate-200 dark:bg-slate-700`} aria-label={alt} />;
  return <img src={src} alt={alt} className={`${className} object-cover`} />;
};

export default LocationPhoto;
