// app/layout.js
// Server Component (no "use client") – correct mobile viewport + deep overflow fixes.

export const metadata = {
  title: "Cote Dunare",
  description: "Platformă hidrologică interactivă",
};

// Next.js App Router viewport export
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const OVERFLOW_FIX_SCRIPT = `
(() => {
  const APPLY = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // quick exit
    const doc = document.documentElement;
    if (!doc) return;

    // Remove old marks
    document.querySelectorAll('[data-oai-overflow="1"]').forEach(el => {
      el.removeAttribute('data-oai-overflow');
      el.classList.remove('oai-overflow-fix');
      el.classList.remove('oai-overflow-media');
    });

    // Find elements that exceed viewport horizontally
    const all = Array.from(document.body.querySelectorAll('*'));
    for (const el of all) {
      // skip non-rendered
      const r = el.getBoundingClientRect();
      if (!r || r.width === 0 || r.height === 0) continue;

      const overflowRight = r.right - vw;
      const overflowLeft = 0 - r.left;

      if (overflowRight > 1 || overflowLeft > 1) {
        el.setAttribute('data-oai-overflow', '1');
        el.classList.add('oai-overflow-fix');

        // Special handling for common offenders
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'canvas' || tag === 'svg' || tag === 'video' || tag === 'img') {
          el.classList.add('oai-overflow-media');
        }

        // If it's a container with fixed positioning, also constrain it
        const cs = window.getComputedStyle(el);
        if (cs && (cs.position === 'fixed' || cs.position === 'absolute')) {
          el.style.maxWidth = '100%';
          el.style.right = cs.right === 'auto' ? '0px' : cs.right;
          el.style.left = cs.left === 'auto' ? '0px' : cs.left;
        }
      }
    }

    // Final safety: ensure document doesn't keep a horizontal scrollWidth bigger than viewport
    if (document.body.scrollWidth > vw + 1) {
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';
    } else {
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    }
  };

  // Run after paint
  const raf = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const run = () => raf(APPLY);

  window.addEventListener('load', run, { passive: true });
  window.addEventListener('resize', run, { passive: true });
  window.addEventListener('orientationchange', run, { passive: true });

  // Also re-run after route changes / dynamic UI updates
  const mo = new MutationObserver(() => run());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <head>
        {/* Global CSS fixes (do NOT rely on hiding overflow as the primary solution) */}
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            background: #f8fafc;
          }
          *, *::before, *::after { box-sizing: border-box; }

          /* Make flex/grid children shrink instead of forcing overflow */
          .min-w-0, .minw0 { min-width: 0; }
          [data-oai-overflow="1"] { outline: 2px solid rgba(255, 0, 0, 0.35); outline-offset: -2px; }

          /* Media should never overflow the viewport */
          img, svg, canvas, video { max-width: 100%; height: auto; }

          /* Tables / code blocks often cause horizontal overflow */
          table { max-width: 100%; }
          pre, code { overflow-wrap: anywhere; word-break: break-word; }

          /* Applied only to elements detected as offenders */
          .oai-overflow-fix { max-width: 100% !important; }
          .oai-overflow-media { width: 100% !important; max-width: 100% !important; }
        `}</style>
      </head>

      <body
        style={{
          margin: 0,
          padding: 0,
          width: "100%",
          maxWidth: "100%",
          background: "#f8fafc",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}

        {/* Deep overflow detector + auto-fix */}
        <script dangerouslySetInnerHTML={{ __html: OVERFLOW_FIX_SCRIPT }} />
      </body>
    </html>
  );
}
