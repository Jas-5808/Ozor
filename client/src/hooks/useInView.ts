import { useEffect, useRef, useState } from "react";

type UseInViewOptions = IntersectionObserverInit & {
  once?: boolean;
};

export const useInView = (options: UseInViewOptions = {}) => {
  const { once = true, ...observerOptions } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView && once) return;
    const node = ref.current;
    if (!node) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        setInView(true);
        if (once) observer.disconnect();
      }
    }, observerOptions);

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, once, observerOptions.root, observerOptions.rootMargin, observerOptions.threshold]);

  return { ref, inView } as const;
};

export default useInView;
