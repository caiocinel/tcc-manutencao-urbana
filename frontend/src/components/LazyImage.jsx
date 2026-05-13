import { useState, useRef, useEffect } from 'react';

const cache = new Set();

export default function LazyImage({ src, alt, className, style }) {
  const [loaded, setLoaded] = useState(cache.has(src));
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (inView || loaded) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView, loaded]);

  function onLoad() {
    cache.add(src);
    setLoaded(true);
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        ...style,
      }}
    >
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={onLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
      {(!inView || !loaded) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.03)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
    </div>
  );
}
