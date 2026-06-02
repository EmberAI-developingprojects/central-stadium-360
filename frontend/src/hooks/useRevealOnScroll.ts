import { useEffect } from "react";

export default function useRevealOnScroll(): void {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!("IntersectionObserver" in window) || prefersReduced) {
      document
        .querySelectorAll<HTMLElement>(".reveal-up")
        .forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    const observed = new WeakSet<Element>();
    const observeAll = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(".reveal-up").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        io.observe(el);
      });
    };
    observeAll(document);

    // Catch .reveal-up nodes that get inserted *after* this effect runs —
    // e.g. cards rendered once async data (news, events) resolves.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList?.contains("reveal-up") && !observed.has(node)) {
            observed.add(node);
            io.observe(node);
          }
          observeAll(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
