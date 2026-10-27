export interface StepFlags {
  lazyLoading: boolean;
  fixedDimensions: boolean;
  responsiveImages: boolean;
}

export interface DemoStep {
  index: number;
  shortTitle: string;
  title: string;
  summary: string;
  detail: string;
  flags: StepFlags;
}

const OFF: StepFlags = {
  lazyLoading: false,
  fixedDimensions: false,
  responsiveImages: false,
};

export const STEPS: DemoStep[] = [
  {
    index: 0,
    shortTitle: '基线',
    title: '基线：无优化',
    summary: '所有图片全量加载 1600px 原图，没有尺寸占位，也没有响应式图片。',
    detail:
      '页面一次性请求全部图片的 1600px JPEG；图片地址在首帧后约 300ms 由脚本写入，img 不设置 width/height；不使用 loading="lazy"。这是后续每一步的对照基准。',
    flags: { ...OFF },
  },
  {
    index: 1,
    shortTitle: '懒加载',
    title: '① 图片懒加载',
    summary: '每列首图高优先级加载，其余图片声明为懒加载；没有尺寸占位时收益有限。',
    detail:
      '首屏图片使用 loading="eager" 与 fetchpriority="high"，其余图片使用 loading="lazy" 与 decoding="async"。注意：图片仍然没有尺寸占位，高度为 0，浏览器会把视口外图片也判定为接近视口而全部请求；因此这一步只能改善首屏图片的请求优先级，总字节和 CLS 仍然很差。',
    flags: { ...OFF, lazyLoading: true },
  },
  {
    index: 2,
    shortTitle: '固定宽高比',
    title: '② 固定宽高比 + 骨架屏',
    summary: '用 aspect-ratio 预留图片空间，消除布局位移，也让懒加载真正生效。',
    detail:
      '根据 manifest 中的原始宽高为每张图片建立 aspect-ratio 容器，加载期间显示骨架屏，加载完成后淡入。图片仍在首帧后约 300ms 挂载，但容器已预留高度，因此不再产生布局位移；视口外的懒加载图片也会被真正推迟，不过请求的仍然是 1600px 原图。',
    flags: { ...OFF, lazyLoading: true, fixedDimensions: true },
  },
  {
    index: 3,
    shortTitle: '响应式图片',
    title: '③ 响应式图片',
    summary: '按视口宽度选择 320/640/1280 图片，优先加载 AVIF，其次 WebP。',
    detail:
      '使用 picture、srcset 与 sizes，让浏览器只下载当前布局需要的宽度；同时提供 AVIF、WebP、JPEG 三种格式，兼顾压缩率与兼容性。图片传输体积和 LCP 应明显下降。',
    flags: { ...OFF, lazyLoading: true, fixedDimensions: true, responsiveImages: true },
  },
];

export function getStep(index: number): DemoStep | undefined {
  return STEPS.find((step) => step.index === index);
}

export const FLAG_LABELS: { key: keyof StepFlags; label: string }[] = [
  { key: 'lazyLoading', label: '懒加载' },
  { key: 'fixedDimensions', label: '固定宽高比' },
  { key: 'responsiveImages', label: '响应式图片' },
];
