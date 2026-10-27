import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PerfHud } from '../components/PerfHud';
import { StepNav } from '../components/StepNav';
import { FilterBar } from '../demo/FilterBar';
import { ImageFeed } from '../demo/ImageFeed';
import { IMAGES } from '../demo/images';
import { FLAG_LABELS, getStep, STEPS } from '../demo/steps';
import './DemoPage.css';

const ALL = '全部';

export default function DemoPage() {
  const { index } = useParams<{ index: string }>();
  const step = getStep(Number(index));
  const [category, setCategory] = useState(ALL);
  const [reversed, setReversed] = useState(false);

  if (!step) {
    return <Navigate to="/" replace />;
  }

  const filtered =
    category === ALL ? IMAGES : IMAGES.filter((image) => image.category === category);
  const items = reversed ? [...filtered].reverse() : filtered;

  return (
    <div className="demo-page">
      <StepNav current={step.index} />
      <main className="demo-page__main">
        <header className="demo-header">
          <div className="demo-header__text">
            <p className="eyebrow">
              Phase 1 · Step {step.index} / {STEPS.length - 1}
            </p>
            <h1>{step.title}</h1>
            <p className="demo-header__summary">{step.summary}</p>
          </div>
          <ul className="flag-list" aria-label="优化项开关状态">
            {FLAG_LABELS.map(({ key, label }) => {
              const enabled = step.flags[key];
              return (
                <li key={key} className={enabled ? 'flag is-on' : 'flag'}>
                  <span className="flag__dot" aria-hidden="true" />
                  <span>{label}</span>
                  <span className="flag__state">{enabled ? '已启用' : '未启用'}</span>
                </li>
              );
            })}
          </ul>
        </header>

        <details className="demo-details">
          <summary>这一步做了什么</summary>
          <p>{step.detail}</p>
        </details>

        <FilterBar
          category={category}
          total={IMAGES.length}
          shown={items.length}
          reversed={reversed}
          onCategoryChange={setCategory}
          onReversedChange={setReversed}
        />

        <ImageFeed items={items} flags={step.flags} />

        <p className="demo-page__hint">
          提示：滚动页面触发 FPS 采样，点击分类或倒序按钮产生一次交互指标。右下角 HUD 会持续更新。
        </p>
      </main>
      <PerfHud />
    </div>
  );
}
