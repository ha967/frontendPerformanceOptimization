import manifest from './image-manifest.json';

export interface DemoImage {
  id: string;
  title: string;
  category: string;
  width: number;
  height: number;
}

export const IMAGES: DemoImage[] = manifest.items;
export const IMAGE_WIDTHS: number[] = manifest.widths;
export const CATEGORIES: string[] = [...new Set(IMAGES.map((image) => image.category))];

const BASE_PATH = '/images/generated';

export function fullImageUrl(image: DemoImage): string {
  return `${BASE_PATH}/full/${image.id}.jpg`;
}

export function variantUrl(image: DemoImage, width: number, ext: string): string {
  return `${BASE_PATH}/${image.id}-${width}.${ext}`;
}

export function buildSrcSet(image: DemoImage, ext: string): string {
  return IMAGE_WIDTHS.map((width) => `${variantUrl(image, width, ext)} ${width}w`).join(', ');
}
