(function() {

    if (window.isDesktopMode()) {
        (() => {
          const waitForBanner = () => new Promise(resolve => {
            const existing = document.querySelector('div[role="banner"]');
            if (existing) return resolve(existing);

            new MutationObserver((mutations, obs) => {
              for (const { addedNodes } of mutations) {
                for (const node of addedNodes) {
                  if (node.nodeType === 1 && node.matches('div[role="banner"]')) {
                    obs.disconnect();
                    return resolve(node);
                  }
                }
              }
            }).observe(document.body, { childList: true, subtree: true });
          });

          const forceFixed = el => {
            if (el?.classList.contains('xixxii4')) {
              el.style.setProperty('position', 'fixed', 'important');
            }
          };

          waitForBanner().then(banner => {
            const style = document.createElement('style');
            style.textContent = `
              div[role="banner"].xixxii4,
              div[role="banner"] .xixxii4 {
                position: fixed !important;
              }
            `;
            document.head.appendChild(style);

            forceFixed(banner);
            banner.querySelectorAll('.xixxii4').forEach(forceFixed);

            new MutationObserver(mutations => {
              for (const m of mutations) {
                if (m.type === 'childList') {
                  m.addedNodes.forEach(n => {
                    forceFixed(n);
                    n.querySelectorAll?.('.xixxii4')?.forEach(forceFixed);
                  });
                } else if (m.type === 'attributes' && m.attributeName === 'class') {
                  forceFixed(m.target);
                }
              }
            }).observe(banner, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
          });
        })();
        return;
    }

    const isPhotoViewer = () => window.location.pathname.includes('/photo.php');

    const stripViewerHolderMargin = () => {
        // Viewer holder margin-top is computed against our forced feed layout
        // (SPA keeps the same document), landing the photo below the viewport
        // (black screen on first open). FB's healthy layout has no holder
        // margin, so drop it. Gated on the flag below so a clean direct photo
        // load is never touched.
        if (!window._mbForcedBody) return;
        const img = document.querySelector('.hscroller img');
        const holder = img?.parentElement;
        if (!holder?.style.marginTop) return;
        holder.style.removeProperty('margin-top');
        // Stripping alone pins the photo to the top; re-center it if it is
        // still (partly) outside the visible area.
        const r = img.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
            img.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
    };

    const revertViewerStyles = () => {
        // Photo viewer reuses feed scroller markup; feed-only body forcing can
        // leave the media pushed out of view (black screen on first open).
        // SPA keeps the same document, so drop each value we forced.
        const s = document.body.style;
        if (s.paddingTop === '0px') s.paddingTop = '';
        if (s.marginTop === '0px') s.marginTop = '';
        if (s.overflow === 'visible') s.overflow = '';
        if (s.height === '100%') s.height = '';
        stripViewerHolderMargin();
    };

    const ensureViewerMarginWatcher = () => {
        // Holder margin can arrive via innerHTML birth or later style writes;
        // the body childList observer below misses pure style writes.
        // ponytail: document-wide style watch, viewer-only + flag-gated, idle
        // cost is string checks per batch; installed once per document.
        if (window._mbViewerMarginWatcher) return;
        window._mbViewerMarginWatcher = true;
        new MutationObserver(() => {
            if (!window.location.pathname.includes('/photo.php')) return;
            stripViewerHolderMargin();
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    };

    const applyStyles = () => {
        if (isPhotoViewer()) {
            revertViewerStyles();
            return;
        }
        const navbar = document.querySelector('div[data-tti-phase="-1"][data-mcomponent="MContainer"][data-type="container"][data-focusable="true"].m');
        const tabbar = document.querySelector('div[role="tablist"][data-tti-phase="-1"][data-type="container"][data-mcomponent="MContainer"].m');
        const scroller = document.querySelector('div[data-type="vscroller"][data-is-pull-to-refresh-allowed="true"]');

        const hasLogo = navbar?.querySelector('div[aria-label*="Facebook"]');
        const hasFeed = tabbar?.querySelector('div[aria-label*="feed"]');
        const navbarHeight = navbar ? parseFloat(getComputedStyle(navbar).height) || parseFloat(navbar.style.height) || 0 : 0;
        const tabbarHeight = tabbar ? parseFloat(getComputedStyle(tabbar).height) || parseFloat(tabbar.style.height) || 0 : 0;

        if (hasLogo) Object.assign(navbar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            zIndex: '1000',
            pointerEvents: 'auto'
        });

        if (hasFeed) Object.assign(tabbar.style, {
            position: 'fixed',
            top: hasLogo ? navbarHeight + 'px' : '',
            left: '0',
            width: '100%',
            zIndex: '999',
            pointerEvents: 'auto'
        });

        if (scroller) {
            const offset = (hasLogo ? navbarHeight : 0) + (hasFeed ? tabbarHeight : 0);
            const scrollContent = scroller.querySelector(':scope > div:not(.pull-to-refresh-spinner-container)');
            scrollContent ? scrollContent.style.marginTop = offset + 'px' : scroller.style.paddingTop = offset + 'px';

            if (window.isFeed()) scroller.style.paddingBottom = '0';

            const spinnerContainer = scroller.querySelector('.pull-to-refresh-spinner-container');
            if (spinnerContainer) Object.assign(spinnerContainer.style, {
                zIndex: '1001',
            });

            const spinner = scroller.querySelector('.pull-to-refresh-spinner');
            if (spinner) spinner.style.margin = '0 auto';
        }

        Object.assign(document.body.style, {
            paddingTop: '0',
            marginTop: '0',
            overflow: 'visible',
            height: '100%'
        });
        // Mark that our feed forcing touched this document, so the viewer
        // revert above only strips margins we are responsible for.
        window._mbForcedBody = true;
    };

    ensureViewerMarginWatcher();
    applyStyles();
    new MutationObserver(applyStyles).observe(document.body, { childList: true, subtree: true });
})();