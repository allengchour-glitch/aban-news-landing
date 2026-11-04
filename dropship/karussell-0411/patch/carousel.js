  <script>
    (() => {
      /* 04.11.2026: Pfeile und Positionsbalken für die seitlich wischbaren Produktreihen (Besitzer: «karussell wie vorher bei produkten»).
         Reine Ergänzung: ohne dieses Skript bleibt jede Reihe wie bisher wischbar. */
      const root = (document.currentScript && document.currentScript.closest('.lx-home')) || document.querySelector('.lx-home');
      if (!root || root.dataset.lxCarousel) return;
      root.dataset.lxCarousel = '1';
      const lang = (document.documentElement.lang || 'de').slice(0, 2);
      const text = ({de: ['Vorherige Produkte', 'Weitere Produkte'], fr: ['Produits précédents', 'Produits suivants']})[lang] || ['Vorherige Produkte', 'Weitere Produkte'];
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      const button = (dir, row, id) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `lx-carousel-btn lx-carousel-${dir}`;
        b.setAttribute('aria-label', text[dir === 'prev' ? 0 : 1] + (row ? `: ${row}` : ''));
        b.setAttribute('aria-controls', id);
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;
        return b;
      };
      const setup = (scroller, index) => {
        if (scroller.parentElement.classList.contains('lx-carousel')) return;
        const wrap = document.createElement('div');
        wrap.className = 'lx-carousel';
        if (!scroller.id) scroller.id = `lx-car-row-${index + 1}`;
        const rowName = scroller.getAttribute('aria-label') || '';
        const prev = button('prev', rowName, scroller.id);
        const next = button('next', rowName, scroller.id);
        const bar = document.createElement('div');
        const thumb = document.createElement('span');
        bar.className = 'lx-carousel-progress';
        bar.setAttribute('aria-hidden', 'true');
        bar.appendChild(thumb);
        scroller.parentNode.insertBefore(wrap, scroller);
        wrap.append(prev, next, scroller, bar);
        const originalSnap = scroller.style.scrollSnapType;
        let snapTimer;
        let lastTarget = null;
        const cards = () => Array.from(scroller.children).filter((el) => el.offsetWidth > 0);
        const geometry = () => {
          const base = scroller.getBoundingClientRect().left - scroller.scrollLeft;
          return cards().map((el) => { const r = el.getBoundingClientRect(); return {left: r.left - base, right: r.right - base}; });
        };
        const mid = () => {
          const image = scroller.querySelector('.lx-trend-image, .lx-edit-product-image');
          if (!image) return;
          const w = wrap.getBoundingClientRect();
          const r = image.getBoundingClientRect();
          if (r.height) wrap.style.setProperty('--lx-car-mid', `${Math.round(r.top - w.top + r.height / 2)}px`);
        };
        const update = () => {
          mid();
          const view = scroller.clientWidth;
          const max = scroller.scrollWidth - view;
          const over = max > 2;
          const g = geometry();
          const lastRight = g.length ? g[g.length - 1].right : 0;
          wrap.classList.toggle('is-scrollable', over);
          const prevOff = !over || scroller.scrollLeft <= 2;
          const nextOff = !over || lastRight <= scroller.scrollLeft + view + 2;
          /* Geht der fokussierte Pfeil aus, übernimmt die Reihe den Fokus (nicht der Gegenpfeil: ein weiterer Druck würde sonst zurückblättern). */
          const held = document.activeElement;
          prev.disabled = prevOff;
          next.disabled = nextOff;
          if ((held === prev && prevOff) || (held === next && nextOff)) scroller.focus({preventScroll: true});
          if (over) {
            const ratio = view / scroller.scrollWidth;
            thumb.style.width = `${(ratio * 100).toFixed(2)}%`;
            thumb.style.transform = `translateX(${((scroller.scrollLeft / max) * (1 / ratio - 1) * 100).toFixed(2)}%)`;
          }
        };
        const moveTo = (left) => {
          /* Das Einrasten pausiert, bis die Bewegung zu Ende ist; sonst zieht es den Streifen kurz vor dem Ziel zurück. */
          scroller.style.scrollSnapType = 'none';
          lastTarget = left;
          scroller.scrollTo({left, behavior: reduce.matches ? 'auto' : 'smooth'});
          clearTimeout(snapTimer);
          snapTimer = setTimeout(() => { lastTarget = null; scroller.style.scrollSnapType = originalSnap; }, reduce.matches ? 80 : 900);
        };
        const go = (dir) => {
          const g = geometry();
          if (!g.length) return;
          /* Bei mehreren schnellen Klicks zählt das schon angeforderte Ziel, nicht die halbe Bewegung. */
          const cur = lastTarget !== null ? lastTarget : scroller.scrollLeft;
          const view = scroller.clientWidth;
          const max = scroller.scrollWidth - view;
          const pad = 2;
          let target;
          if (dir > 0) {
            const i = g.findIndex((c) => c.right > cur + view + pad);
            target = i < 0 ? max : Math.min(max, g[i].left - pad);
            if (target <= cur + pad) target = max;
          } else {
            let j = -1;
            g.forEach((c, k) => { if (c.left < cur - pad) j = k; });
            if (j < 0) target = 0;
            else {
              const wanted = g[j].right - view;
              const k = g.findIndex((c) => c.left >= wanted - pad);
              target = Math.max(0, (k < 0 ? g[j].left : g[k].left) - pad);
              if (target >= cur - pad) target = Math.max(0, g[j].left - pad);
            }
          }
          moveTo(Math.max(0, Math.min(max, target)));
        };
        prev.addEventListener('click', () => go(-1));
        next.addEventListener('click', () => go(1));
        let queued = false;
        const later = () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => { queued = false; update(); });
        };
        scroller.addEventListener('scroll', later, {passive: true});
        window.addEventListener('resize', later, {passive: true});
        window.addEventListener('load', later);
        ['pointerdown', 'wheel', 'touchstart'].forEach((type) => scroller.addEventListener(type, () => { lastTarget = null; }, {passive: true}));
        if ('ResizeObserver' in window) {
          const ro = new ResizeObserver(later);
          const watch = () => Array.from(scroller.children).forEach((c) => ro.observe(c));
          ro.observe(scroller);
          watch();
          if ('MutationObserver' in window) new MutationObserver(() => { watch(); later(); }).observe(scroller, {childList: true});
        }
        update();
      };
      root.querySelectorAll('.lx-trends-grid, .lx-edit-product-grid').forEach(setup);
      root.classList.add('lx-car-ready');
    })();
  </script>
