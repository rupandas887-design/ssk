import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  separator?: boolean;
}

export const CountUp: React.FC<CountUpProps> = ({ end, duration = 1200, separator = true }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // If IntersectionObserver is available, only animate when visible
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      animateCount();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCount();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  const animateCount = () => {
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeProgress * end);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <span ref={ref} className="tabular-nums">
      {separator ? count.toLocaleString() : count}
    </span>
  );
};

export default CountUp;
