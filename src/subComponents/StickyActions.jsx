import React, { useEffect, useRef, useState } from "react";
import "../css/stickyActions.css";

export default function StickyActions({ children, className = "", offsetBottom = 0 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.05 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`tzSticky ${inView ? "tzSticky--in" : ""} ${className}`}
      style={{ "--tz-sticky-bottom": `${offsetBottom}px` }}
    >
      <div className="tzSticky__inner tzSticky__inner--row">{children}</div>
    </div>
  );
}
