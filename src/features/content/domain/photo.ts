import type { Photo, PhotoCredit } from "./types";

/**
 * Wikimedia thumbnail addresses end in /<width>px-<file>; ask for another width of the same photo.
 * A photo kept on our own site (/photos/...) is returned as it is: next/image resizes it itself.
 */
export function photoAt(photo: Photo, width: number): Photo {
  return { ...photo, url: photo.url.replace(/\/\d+px-/, `/${width}px-`) };
}

/** Each author once, in the order the photos appear on the page. */
export function uniqueCredits(photos: readonly Photo[]): PhotoCredit[] {
  const seen = new Set<string>();
  const credits: PhotoCredit[] = [];
  for (const { credit } of photos) {
    if (seen.has(credit.sourceUrl)) continue;
    seen.add(credit.sourceUrl);
    credits.push(credit);
  }
  return credits;
}
