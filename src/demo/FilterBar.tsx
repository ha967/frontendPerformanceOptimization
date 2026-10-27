import { CATEGORIES } from './images';
import './FilterBar.css';

const ALL = '全部';

interface FilterBarProps {
  category: string;
  total: number;
  shown: number;
  reversed: boolean;
  onCategoryChange: (category: string) => void;
  onReversedChange: (reversed: boolean) => void;
}

export function FilterBar({
  category,
  total,
  shown,
  reversed,
  onCategoryChange,
  onReversedChange,
}: FilterBarProps) {
  return (
    <section className="filter-bar" aria-label="筛选与排序">
      <div className="filter-bar__group" role="group" aria-label="按分类筛选">
        {[ALL, ...CATEGORIES].map((item) => (
          <button
            key={item}
            type="button"
            className={item === category ? 'chip is-active' : 'chip'}
            aria-pressed={item === category}
            onClick={() => onCategoryChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="filter-bar__meta">
        <span className="filter-bar__count">
          {shown} / {total} 张
        </span>
        <button
          type="button"
          className={reversed ? 'chip is-active' : 'chip'}
          aria-pressed={reversed}
          onClick={() => onReversedChange(!reversed)}
        >
          倒序
        </button>
      </div>
    </section>
  );
}
