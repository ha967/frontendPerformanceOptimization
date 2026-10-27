import { useEffect, useState } from 'react';
import { FeedCard } from './FeedCard';
import type { DemoImage } from './images';
import type { StepFlags } from './steps';
import './ImageFeed.css';

function getColumnCount(width: number): number {
  if (width >= 1200) {
    return 4;
  }
  if (width >= 900) {
    return 3;
  }
  if (width >= 600) {
    return 2;
  }
  return 1;
}

/**
 * 按预估高度把图片分到最短的列。
 * 用 flex 列而不是 CSS column-count：Chrome 的 LayoutShift API 不会上报多列布局内部的位移，
 * 那样 CLS 就完全测不出来。
 */
function distribute(items: DemoImage[], columns: number): DemoImage[][] {
  const buckets: DemoImage[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);

  for (const item of items) {
    let target = 0;
    for (let index = 1; index < columns; index += 1) {
      if (heights[index] < heights[target]) {
        target = index;
      }
    }
    buckets[target].push(item);
    // 列宽归一化为 1000，加上卡片文字与间距的固定高度估算。
    heights[target] += (item.height / item.width) * 1000 + 120;
  }

  return buckets;
}

export function ImageFeed({ items, flags }: { items: DemoImage[]; flags: StepFlags }) {
  const [columnCount, setColumnCount] = useState(() => getColumnCount(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setColumnCount(getColumnCount(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (items.length === 0) {
    return <p className="masonry-empty">当前分类下没有图片。</p>;
  }

  const columns = distribute(items, Math.min(columnCount, items.length));

  return (
    <div className="masonry">
      {columns.map((column, columnIndex) => (
        <div className="masonry__column" key={columnIndex}>
          {column.map((image, itemIndex) => (
            <FeedCard key={image.id} image={image} priority={itemIndex === 0} flags={flags} />
          ))}
        </div>
      ))}
    </div>
  );
}
