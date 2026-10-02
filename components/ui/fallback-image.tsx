"use client";

import React, { useState, useEffect } from "react";

export interface FallbackImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  showUnavailableBadge?: boolean;
}

export const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  fallbackSrc = "/placeholder-user.jpg",
  alt = "Image",
  className = "",
  showUnavailableBadge = false,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setHasError(!src);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className="relative inline-block">
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${hasError ? "opacity-85 grayscale-[20%]" : ""}`}
        onError={handleError}
        {...props}
      />
      {hasError && showUnavailableBadge && (
        <span className="block text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1 text-center font-medium">
          फोटो उपलब्ध नहीं / Photo unavailable
        </span>
      )}
    </div>
  );
};
