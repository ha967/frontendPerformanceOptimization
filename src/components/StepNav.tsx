import { STEPS } from '../demo/steps';
import './StepNav.css';

export function StepNav({ current }: { current: number }) {
  return (
    <nav className="step-nav" aria-label="优化步骤">
      <div className="step-nav__inner">
        <a className="step-nav__brand" href="/">
          <svg
            className="step-nav__brand-mark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="step-nav__brand-text">性能实验室</span>
        </a>
        <ol className="step-nav__list">
          {STEPS.map((step) => {
            const active = step.index === current;
            return (
              <li key={step.index}>
                <a
                  className={active ? 'step-nav__link is-active' : 'step-nav__link'}
                  href={`/step/${step.index}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="step-nav__num">{step.index}</span>
                  {step.shortTitle}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
