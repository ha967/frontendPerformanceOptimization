import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { buildSrcSet, fullImageUrl, variantUrl } from './images';
import type { DemoImage } from './images';
import type { StepFlags } from './steps';
import { recordCardCommit } from '../metrics/renderStats';

const IMAGE_SIZES =
  '(max-width: 599px) 92vw, (max-width: 899px) 46vw, (max-width: 1199px) 31vw, 23vw';

interface FeedCardProps {
  image: DemoImage;
  priority: boolean;
  flags: StepFlags;
}

export function FeedCard({ image, priority, flags }: FeedCardProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  // 没有依赖数组：每次提交后都计数，用于观察筛选/排序时的重渲染规模。
  useEffect(() => {
    recordCardCommit();
  });

  // 演示用加载器：首帧后再写入 src，让“无尺寸占位”的基线稳定产生 CLS。
  // 所有步骤使用相同的挂载时机，保证每一步的差异只来自图片属性与格式。
  useEffect(() => {
    const img = imgRef.current;
    const src = img?.dataset.src;
    if (!img || !src || img.src) {
      return;
    }
    const timer = window.setTimeout(() => {
      img.src = src;
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  const eager = flags.lazyLoading && priority;
  const loading = flags.lazyLoading ? (eager ? 'eager' : 'lazy') : undefined;
  const fetchPriority = flags.lazyLoading && eager ? 'high' : undefined;
  const decoding = flags.lazyLoading ? 'async' : undefined;
  const width = flags.fixedDimensions ? image.width : undefined;
  const height = flags.fixedDimensions ? image.height : undefined;

  const handleLoad = flags.fixedDimensions
    ? (event: SyntheticEvent<HTMLImageElement>) => {
        event.currentTarget.closest('.feed-card__media')?.classList.add('is-loaded');
      }
    : undefined;

  const imageElement = flags.responsiveImages ? (
    <picture>
      <source type="image/avif" srcSet={buildSrcSet(image, 'avif')} sizes={IMAGE_SIZES} />
      <source type="image/webp" srcSet={buildSrcSet(image, 'webp')} sizes={IMAGE_SIZES} />
      <img
        ref={imgRef}
        data-src={variantUrl(image, 640, 'jpg')}
        srcSet={buildSrcSet(image, 'jpg')}
        sizes={IMAGE_SIZES}
        alt={image.title}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        onLoad={handleLoad}
      />
    </picture>
  ) : (
    <img
      ref={imgRef}
      data-src={fullImageUrl(image)}
      alt={image.title}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      onLoad={handleLoad}
    />
  );

  return (
    <article className="feed-card" data-image-id={image.id}>
      <div
        className={
          flags.fixedDimensions ? 'feed-card__media' : 'feed-card__media feed-card__media--auto'
        }
        style={
          flags.fixedDimensions ? { aspectRatio: `${image.width} / ${image.height}` } : undefined
        }
      >
        {imageElement}
      </div>
      <div className="feed-card__body">
        <h2 className="feed-card__title">{image.title}</h2>
        <p className="feed-card__meta">
          {image.category} · {image.width} × {image.height}
        </p>
      </div>
    </article>
  );
}
