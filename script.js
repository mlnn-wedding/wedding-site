// === Reveal on scroll ===
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
})();

// === Hero wreath masking: keep wreath around the photo only ===
(() => {
  const frame = document.querySelector('.hero-frame');
  const photo = frame?.querySelector('.hero-photo');
  const wreath = frame?.querySelector('.hero-wreath');
  const photoImg = photo?.querySelector('img');
  if (!frame || !photo || !wreath) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const updateMaskVars = () => {
    const frameRect = frame.getBoundingClientRect();
    const photoRect = photo.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height || !photoRect.width || !photoRect.height) return;

    const cx = ((photoRect.left - frameRect.left) + (photoRect.width / 2)) / frameRect.width * 100;
    const cy = ((photoRect.top - frameRect.top) + (photoRect.height / 2)) / frameRect.height * 100;
    const w = (photoRect.width / frameRect.width) * 100;
    const h = (photoRect.height / frameRect.height) * 100;

    const computed = window.getComputedStyle(photo);
    const radiusMatch = computed.borderRadius.match(/[\d.]+/);
    const radiusPx = radiusMatch ? parseFloat(radiusMatch[0]) : 0;
    const base = Math.max(1, Math.min(frameRect.width, frameRect.height));
    const r = clamp((radiusPx / base) * 100, 4, 40);

    frame.style.setProperty('--hole-cx', `${cx}%`);
    frame.style.setProperty('--hole-cy', `${cy}%`);
    frame.style.setProperty('--hole-w', `${w}%`);
    frame.style.setProperty('--hole-h', `${h}%`);
    frame.style.setProperty('--hole-r', `${r}%`);
  };

  let resizeRaf = null;
  const handleResize = () => {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = null;
      updateMaskVars();
    });
  };

  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('load', updateMaskVars, { once: true });
  if (photoImg && !photoImg.complete) {
    photoImg.addEventListener('load', updateMaskVars, { once: true });
  }

  updateMaskVars();
})();

// === Hero bokeh blobs (twig-like drift + parallax) ===
(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = (() => {
    const directHeader = document.querySelector('header');
    if (directHeader) return directHeader;
    const main = document.querySelector('main');
    const primarySections = Array.from(main ? main.querySelectorAll('section') : document.querySelectorAll('section'));
    const viewportHeight = window.innerHeight || 800;
    let best = null;
    let bestScore = -Infinity;
    const candidates = primarySections.length ? primarySections : Array.from(document.body.children);
    candidates.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const rect = el.getBoundingClientRect();
      if (!rect.height) return;
      if (rect.top > viewportHeight) return;
      const score = rect.height - Math.abs(rect.top);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    });
    return best;
  })();

  if (!hero) return;

  hero.classList.add('hero-bokeh-host');
  const layer = document.createElement('div');
  layer.className = 'hero-bokeh-layer';
  layer.setAttribute('aria-hidden', 'true');
  hero.prepend(layer);

  const colorProbe = document.createElement('span');
  colorProbe.style.position = 'absolute';
  colorProbe.style.opacity = '0';
  colorProbe.style.pointerEvents = 'none';
  document.body.appendChild(colorProbe);

  const parseColor = (value) => {
    if (!value) return null;
    colorProbe.style.color = value;
    const computed = getComputedStyle(colorProbe).color;
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  };

  const mixColors = (c1, c2, mix) => ({
    r: Math.round(c1.r + (c2.r - c1.r) * mix),
    g: Math.round(c1.g + (c2.g - c1.g) * mix),
    b: Math.round(c1.b + (c2.b - c1.b) * mix),
  });

  const rootStyles = getComputedStyle(document.documentElement);
  const paletteVars = ['--c-teal', '--c-aqua', '--c-peach', '--c-coral', '--c-lime'];
  const palette = paletteVars
    .map((name) => parseColor(rootStyles.getPropertyValue(name).trim()))
    .filter(Boolean);

  const softFallback = parseColor(rootStyles.getPropertyValue('--c-soft').trim())
    || parseColor(getComputedStyle(document.body).backgroundColor)
    || { r: 253, g: 248, b: 243 };

  if (palette.length < 3) {
    palette.push(softFallback, mixColors(softFallback, { r: 101, g: 182, b: 191 }, 0.4));
  }

  const pickColor = () => {
    const base = palette[Math.floor(Math.random() * palette.length)];
    const mix = 0.18 + Math.random() * 0.36;
    const tinted = mixColors(base, softFallback, mix);
    return `rgb(${tinted.r} ${tinted.g} ${tinted.b})`;
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const isSmallScreen = window.matchMedia('(max-width: 520px)').matches;
  const blobConfigs = [
    { left: '8%', top: '-6%', depth: 0.55 },
    { left: '62%', top: '6%', depth: 0.75 },
    { left: '32%', top: '18%', depth: 0.4 },
  ];

  blobConfigs.forEach(({ left, top, depth }) => {
    const blob = document.createElement('div');
    blob.className = 'hero-bokeh-blob';
    const size = isSmallScreen ? rand(120, 210) : rand(180, 300);
    const blur = isSmallScreen ? rand(36, 50) : rand(30, 44);
    const opacity = isSmallScreen ? rand(0.12, 0.18) : rand(0.16, 0.22);
    const opacityPeak = Math.min(opacity + rand(0.1, 0.14), isSmallScreen ? 0.3 : 0.34);
    const driftX = rand(-10, 10);
    const driftY = rand(-10, 10);
    const driftScale = rand(-0.03, 0.05);
    const duration = rand(42, 60);
    const delay = rand(-8, 0);

    blob.style.setProperty('--size', `${size}px`);
    blob.style.setProperty('--blur', `${blur}px`);
    blob.style.setProperty('--opacity', opacity.toFixed(2));
    blob.style.setProperty('--opacity-peak', opacityPeak.toFixed(2));
    blob.style.setProperty('--drift-x', `${driftX}px`);
    blob.style.setProperty('--drift-y', `${driftY}px`);
    blob.style.setProperty('--drift-scale', driftScale.toFixed(3));
    blob.style.setProperty('--duration', `${duration.toFixed(1)}s`);
    blob.style.setProperty('--delay', `${delay.toFixed(1)}s`);
    blob.style.setProperty('--scale', rand(0.92, 1.04).toFixed(2));
    blob.style.setProperty('--blob-color', pickColor());
    blob.style.left = left;
    blob.style.top = top;
    blob.style.width = 'var(--size)';
    blob.style.height = 'var(--size)';
    blob.dataset.depth = depth.toFixed(2);
    layer.appendChild(blob);
  });

  colorProbe.remove();

  if (motionQuery.matches) return;

  const blobs = Array.from(layer.querySelectorAll('.hero-bokeh-blob'));
  const bounds = { left: 0, top: 0, width: 1, height: 1 };
  const updateBounds = () => {
    const rect = hero.getBoundingClientRect();
    bounds.left = rect.left;
    bounds.top = rect.top;
    bounds.width = rect.width || 1;
    bounds.height = rect.height || 1;
  };
  updateBounds();

  let rafId = null;
  let latest = { x: 0, y: 0 };

  const applyParallax = () => {
    rafId = null;
    const maxShift = 18;
    const minShift = 6;
    blobs.forEach((blob) => {
      const depth = Number(blob.dataset.depth) || 0.6;
      const amplitude = minShift + (maxShift - minShift) * depth;
      blob.style.setProperty('--parallax-x', `${latest.x * amplitude}px`);
      blob.style.setProperty('--parallax-y', `${latest.y * amplitude}px`);
    });
  };

  const scheduleParallax = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(applyParallax);
  };

  const handlePointer = (clientX, clientY) => {
    const normX = ((clientX - bounds.left) / bounds.width) - 0.5;
    const normY = ((clientY - bounds.top) / bounds.height) - 0.5;
    latest = {
      x: Math.max(-1, Math.min(1, normX * 2)),
      y: Math.max(-1, Math.min(1, normY * 2)),
    };
    scheduleParallax();
  };

  const handleMouseMove = (event) => {
    handlePointer(event.clientX, event.clientY);
  };

  const handleMouseLeave = () => {
    latest = { x: 0, y: 0 };
    scheduleParallax();
  };

  const handleOrientation = (event) => {
    if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') return;
    const x = Math.max(-1, Math.min(1, event.gamma / 30));
    const y = Math.max(-1, Math.min(1, event.beta / 30));
    latest = { x, y };
    scheduleParallax();
  };

  const handleResize = () => {
    updateBounds();
    scheduleParallax();
  };

  hero.addEventListener('mousemove', handleMouseMove, { passive: true });
  hero.addEventListener('mouseleave', handleMouseLeave, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', handleResize, { passive: true });

  if ('DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const requestOnTouch = () => {
        DeviceOrientationEvent.requestPermission().then((state) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true });
          }
        }).catch(() => {});
        window.removeEventListener('touchend', requestOnTouch);
      };
      window.addEventListener('touchend', requestOnTouch, { passive: true });
    } else {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
  }

  motionQuery.addEventListener('change', (event) => {
    if (event.matches) {
      blobs.forEach((blob) => {
        blob.style.setProperty('--parallax-x', '0px');
        blob.style.setProperty('--parallax-y', '0px');
      });
    }
  });
})();

// === Placeholders for upcoming sections ===
// Gallery slider (will be wired when gallery section added)
window.Wedding = window.Wedding || {};
window.Wedding.gallery = {
  photos: [
    'photos/gallery-1-placeholder.jpg',
    'photos/gallery-2-placeholder.jpg',
    'photos/gallery-3-placeholder.jpg',
    'photos/gallery-4-placeholder.jpg',
  ],
  index: 0,
  timer: null,
  intervalMs: 5000,
  disableAuto: false,
  _visibilityHandler: null,
  _motionQuery: null,
  _motionHandler: null,
  mount(imgId){
    const current = document.getElementById(imgId);
    if(!current) return;
    const frame = current.closest('.gallery-frame');
    const trio = frame ? frame.closest('.gallery-trio') : null;
    const prevImg = trio ? trio.querySelector('#gallery-prev') : null;
    const nextImg = trio ? trio.querySelector('#gallery-next') : null;
    const sideReady = { prev: false, next: false };
    let buffer = frame ? frame.querySelector('#gallery-buffer') : null;
    if(!buffer && frame){
      buffer = document.createElement('img');
      buffer.id = 'gallery-buffer';
      buffer.setAttribute('aria-hidden', 'true');
      buffer.alt = '';
      buffer.loading = 'lazy';
      buffer.decoding = 'async';
      frame.appendChild(buffer);
    }
    if(!buffer || !this.photos.length) return;

    current.decoding = 'async';

    const front = current;
    const back = buffer;
    let syncRaf = null;
    const disableAnimations = false;
    const resetAnimations = () => {
      [front, back, prevImg, nextImg].forEach((img) => {
        if (img) img.classList.remove('gallery-animated');
      });
    };

    const scheduleSync = () => {
      if (disableAnimations || (this._motionQuery && this._motionQuery.matches)) {
        resetAnimations();
        return;
      }
      if (syncRaf) return;
      syncRaf = requestAnimationFrame(() => {
        syncRaf = null;
        const visible = [active, standby].filter((img) => img && img.classList.contains('is-visible'));
        resetAnimations();
        if (visible.length) {
          void visible[0].offsetWidth;
          visible.forEach((img) => img.classList.add('gallery-animated'));
        }
      });
    };

    const setSource = (imgEl, src) => {
      if(!imgEl || !src) return;
      if(imgEl.getAttribute('data-src') === src) return;

      const jpgMatch = src.match(/\.jpe?g(\?.*)?$/i);
      if(jpgMatch){
        const fallbackSrc = src.replace(/\.jpe?g(\?.*)?$/i, '.svg$1');
        if(fallbackSrc !== src){
          imgEl.onerror = () => {
            imgEl.onerror = null;
            if(imgEl.getAttribute('data-src') === fallbackSrc) return;
            imgEl.setAttribute('data-src', fallbackSrc);
            imgEl.src = fallbackSrc;
          };
        }
      } else {
        imgEl.onerror = null;
      }

      imgEl.setAttribute('data-src', src);
      imgEl.src = src;
    };

    const setAlt = (imgEl, index) => {
      if(!imgEl) return;
      const total = this.photos.length;
      imgEl.alt = `Фотография ${index + 1} из ${total}`;
    };

    const updateSideImage = (imgEl, photoIndex, key) => {
      if(!imgEl || !this.photos.length) return;
      const src = this.photos[photoIndex];
      if(!src) return;
      const markReady = () => {
        imgEl.classList.add('is-visible');
        requestAnimationFrame(() => {
          imgEl.classList.remove('is-updating');
        });
        sideReady[key] = true;
        scheduleSync();
      };
      if(this._motionQuery && this._motionQuery.matches){
        setSource(imgEl, src);
        setAlt(imgEl, photoIndex);
        imgEl.classList.add('is-visible');
        imgEl.classList.remove('is-updating');
        sideReady[key] = true;
        resetAnimations();
        return;
      }
      imgEl.classList.add('is-updating');
      if(sideReady[key] && imgEl.getAttribute('data-src') !== src){
        imgEl.classList.remove('is-visible');
      }
      setSource(imgEl, src);
      setAlt(imgEl, photoIndex);
      const reveal = () => {
        imgEl.onload = null;
        requestAnimationFrame(markReady);
      };
      if(imgEl.complete && imgEl.naturalWidth){
        reveal();
      } else {
        imgEl.onload = reveal;
      }
    };

    const setSideImages = (centerIndex) => {
      if(!this.photos.length) return;
      const total = this.photos.length;
      const prevIndex = (centerIndex - 1 + total) % total;
      const nextIndex = (centerIndex + 1) % total;
      updateSideImage(prevImg, prevIndex, 'prev');
      updateSideImage(nextImg, nextIndex, 'next');
      scheduleSync();
    };

    const showInitial = this.photos[0];
    let active = front;
    let standby = back;
    let isTransitioning = false;

    const makeVisible = (imgEl) => {
      if(!imgEl) return;
      imgEl.classList.add('is-visible');
      imgEl.removeAttribute('aria-hidden');
    };

    const makeHidden = (imgEl) => {
      if(!imgEl) return;
      imgEl.classList.remove('is-visible');
      imgEl.setAttribute('aria-hidden', 'true');
    };

    if(showInitial){
      setSource(active, showInitial);
      setAlt(active, 0);
      makeVisible(active);
      this.index = 0;
      setSideImages(0);
      scheduleSync();
    }
    makeHidden(standby);
    standby.removeAttribute('data-src');
    standby.removeAttribute('src');

    const runSynchronizedSlide = (targetIndex) => {
      const prefersReduced = this._motionQuery && this._motionQuery.matches;
      if (disableAnimations || prefersReduced || !trio || !prevImg || !nextImg) return null;
      const prevStyles = window.getComputedStyle(prevImg);
      const nextStyles = window.getComputedStyle(nextImg);
      if (prevStyles.display === 'none' || nextStyles.display === 'none') return null;

      const prevRect = prevImg.getBoundingClientRect();
      const currentRect = active.getBoundingClientRect();
      const nextRect = nextImg.getBoundingClientRect();
      if (!prevRect.width || !currentRect.width || !nextRect.width) return null;

      const trioRect = trio.getBoundingClientRect();
      const gapEstimate = Math.max(18, Math.min(48, (trioRect.width - (prevRect.width + currentRect.width + nextRect.width)) / 2));
      const flyerClass = 'gallery-flyer';
      const flyers = [];
      const duration = 640;
      trio.classList.add('is-animating');

      const baseRadius = (el) => {
        const radius = window.getComputedStyle(el).borderRadius;
        if (radius && radius !== '0px') return radius;
        const parent = el.parentElement;
        return parent ? window.getComputedStyle(parent).borderRadius : radius;
      };
      const createFlyer = (img, rectOverride) => {
        const rect = rectOverride || img.getBoundingClientRect();
        const flyer = img.cloneNode(true);
        flyer.classList.add(flyerClass);
        flyer.style.position = 'fixed';
        flyer.style.left = `${rect.left}px`;
        flyer.style.top = `${rect.top}px`;
        flyer.style.width = `${rect.width}px`;
        flyer.style.height = `${rect.height}px`;
        flyer.style.borderRadius = baseRadius(img);
        flyer.style.transform = 'translate3d(0,0,0)';
        flyer.style.opacity = '1';
        document.body.appendChild(flyer);
        return flyer;
      };

      const pushFlyer = (img, fromRect, toRect, opts = {}) => {
        const flyer = createFlyer(img, fromRect);
        flyers.push({ node: flyer, from: fromRect, to: toRect, ...opts });
      };

      pushFlyer(prevImg, prevRect, currentRect);
      pushFlyer(active, currentRect, nextRect);
      pushFlyer(nextImg, nextRect, { left: nextRect.left + nextRect.width + gapEstimate, top: nextRect.top, width: nextRect.width, height: nextRect.height }, { fadeOut: true });

      const incomingIndex = (targetIndex - 1 + this.photos.length) % this.photos.length;
      const incomingSrc = this.photos[incomingIndex];
      if (incomingSrc) {
        const startRect = { left: prevRect.left - prevRect.width - gapEstimate, top: prevRect.top, width: prevRect.width, height: prevRect.height };
        const incoming = createFlyer(prevImg, startRect);
        incoming.src = incomingSrc;
        incoming.style.opacity = '0';
        incoming.style.backgroundColor = 'color-mix(in srgb, #fdf8f3 85%, white)';
        incoming.onload = () => { incoming.style.opacity = '0'; };
        flyers.push({ node: incoming, from: startRect, to: prevRect, fadeIn: true });
      }

      requestAnimationFrame(() => {
        flyers.forEach(({ node, from, to, fadeIn, fadeOut }) => {
          const dx = (to.left - from.left) || 0;
          const dy = (to.top - from.top) || 0;
          node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          if (fadeOut) node.style.opacity = '0';
          if (fadeIn) node.style.opacity = '1';
        });
      });

      return new Promise((resolve) => {
        window.setTimeout(() => {
          flyers.forEach(({ node }) => node.remove());
          trio.classList.remove('is-animating');
          resolve();
        }, duration);
      });
    };

    const show = (i, options = {}) => {
      if(!this.photos.length || isTransitioning) return;
      const normalized = (i + this.photos.length) % this.photos.length;
      const nextSrc = this.photos[normalized];
      if(!nextSrc || active.getAttribute('data-src') === nextSrc){
        this.index = normalized;
        setSideImages(normalized);
        return;
      }

      standby.onload = null;
      const beginSwap = () => {
        isTransitioning = true;
        const upcoming = standby;
        const currentActive = active;

        const finalize = () => {
          upcoming.onload = null;
          standby = currentActive;
          active = upcoming;
          this.index = normalized;
          isTransitioning = false;
        };

        const motionReduced = this._motionQuery && this._motionQuery.matches;
        const slidePromise = motionReduced ? null : runSynchronizedSlide(normalized);

        const revealNewState = () => {
          makeHidden(currentActive);
          makeVisible(upcoming);
          setSideImages(normalized);
          scheduleSync();
          finalize();
        };

        if(slidePromise){
          slidePromise.then(revealNewState);
        } else {
          makeHidden(currentActive);
          makeVisible(upcoming);
          revealNewState();
        }
      };

      const prepare = () => {
        beginSwap();
      };

      setSource(standby, nextSrc);
      setAlt(standby, normalized);
      if(standby.complete && standby.naturalWidth){
        prepare();
      } else {
        standby.onload = () => {
          standby.onload = null;
          prepare();
          scheduleSync();
        };
      }
    };

    const start = () => {
      if(this.disableAuto || this.timer || (this._motionQuery && this._motionQuery.matches)) return;
      this.timer = window.setInterval(() => show(this.index - 1), this.intervalMs);
    };

    const stop = () => {
      if(!this.timer) return;
      window.clearInterval(this.timer);
      this.timer = null;
    };

    if(!this._motionQuery && !this.disableAuto){
      this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._motionHandler = () => {
        if(this._motionQuery.matches){
          stop();
        } else {
          start();
        }
        scheduleSync();
      };
      if(typeof this._motionQuery.addEventListener === 'function'){
        this._motionQuery.addEventListener('change', this._motionHandler);
      } else if(typeof this._motionQuery.addListener === 'function'){
        this._motionQuery.addListener(this._motionHandler);
      }
    }

    if(!this._visibilityHandler && !this.disableAuto){
      this._visibilityHandler = () => {
        if(document.hidden){
          stop();
        } else {
          start();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    if(!(this._motionQuery && this._motionQuery.matches) && !this.disableAuto){
      start();
    }

    return { next: () => show(this.index - 1) };
  }
};

// Countdown to 24.07.2026 12:00 local
window.Wedding.countdown = {
  target: new Date('2026-07-24T12:00:00'),
  ids: { m:'cd-months', d:'cd-days', h:'cd-hours', n:'cd-mins', s:'cd-secs' },
  start(){
    const E = (id) => document.getElementById(id);
    const tick = () => {
      const now = new Date();
      let diff = Math.max(0, this.target - now);
      const daysTotal = Math.floor(diff / 86400000);
      const months = Math.floor(daysTotal / 30);
      const days = daysTotal % 30;
      const hours = Math.floor((diff/3600000)%24);
      const mins = Math.floor((diff/60000)%60);
      const secs = Math.floor((diff/1000)%60);
      E(this.ids.m) && (E(this.ids.m).textContent = months);
      E(this.ids.d) && (E(this.ids.d).textContent = days);
      E(this.ids.h) && (E(this.ids.h).textContent = hours);
      E(this.ids.n) && (E(this.ids.n).textContent = mins);
      E(this.ids.s) && (E(this.ids.s).textContent = secs);
    };
    tick();
    setInterval(tick, 1000);
  }
};

// Mini calendar (July 2026)
window.Wedding.miniCal = {
  monthIndex: 6,
  year: 2026,
  mount(containerId, monthId, yearId){
    const cal = document.getElementById(containerId);
    const monthEl = monthId ? document.getElementById(monthId) : null;
    const yearEl = yearId ? document.getElementById(yearId) : null;
    if(!cal) return;
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    yearEl && (yearEl.textContent = this.year);
    monthEl && (monthEl.textContent = monthNames[this.monthIndex]);
    const headers = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    for(const h of headers){ const d=document.createElement('div'); d.textContent=h; d.className='hdr'; cal.appendChild(d); }
    const firstDow = 2; // 1 июля 2026 — среда → offset 2 (если Пн=0)
    const daysInMonth = 31, weddingDay=24;
    for(let i=0;i<firstDow;i++){ cal.appendChild(document.createElement('div')); }
    for(let d=1; d<=daysInMonth; d++){
      const c=document.createElement('div'); c.textContent=d; if(d===weddingDay) c.className='mark'; cal.appendChild(c);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const createRipple = (target, eventOrOptions) => {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const diagonal = Math.sqrt((rect.width ** 2) + (rect.height ** 2)) || Math.max(rect.width, rect.height);
    const size = diagonal * 1.05;
    let x = rect.width / 2;
    let y = rect.height / 2;
    const source = eventOrOptions || {};
    if (typeof source.clientX === 'number' && typeof source.clientY === 'number') {
      x = source.clientX - rect.left;
      y = source.clientY - rect.top;
    } else if (source.center === true) {
      x = rect.width / 2;
      y = rect.height / 2;
    }
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    Array.from(target.querySelectorAll('.ripple')).forEach((node) => {
      if (node !== ripple) node.remove();
    });
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  };

  window.Wedding.gallery.mount('gallery-current');
  window.Wedding.countdown.start();
  window.Wedding.miniCal.mount('mini-calendar', 'calendar-month', 'calendar-year');

  const palette = document.querySelector('.dresscode-palette');
  const examples = document.getElementById('dresscode-examples');
  if (palette && examples) {
    const palettes = {
      green: {
        type: 'color',
        label: 'Зелёный оттенок',
        photoLabel: 'Образ в зелёной палитре',
        items: [
          { tone: '#A7DAB5', name: 'Мята на рассвете', photo: 'green-color-2.jpg' },
          { tone: '#84C76F', name: 'Садовая свежесть', photo: 'green-color-1.jpg' },
          { tone: '#488F4F', name: 'Глубина хвои', photo: 'green-color-4.jpg' },
          { tone: '#455228', name: 'Оливковая ночь', photo: 'green-color-3.jpg' }
        ]
      },
      peach: {
        type: 'color',
        label: 'Тёплый персиковый оттенок',
        photoLabel: 'Образ в персиковой палитре',
        items: [
          { tone: '#FECFB2', name: 'Розовый кварц', photo: 'peach-color-2.jpg' },
          { tone: '#FFB386', name: 'Персиковый софт', photo: 'peach-color-1.jpg' },
          { tone: '#FF833D', name: 'Апероль на закате', photo: 'peach-color-4.jpg' },
          { tone: '#B35D2B', name: 'Пряная корица', photo: 'peach-color-3.jpg' }
        ]
      },
      purple: {
        type: 'color',
        label: 'Фиолетовый оттенок',
        photoLabel: 'Образ в фиолетовой палитре',
        items: [
          { tone: '#C8AFCC', name: 'Сиреневая дымка', photo: 'purple-color-4.jpg' },
          { tone: '#9387AB', name: 'Лавандовый штрих', photo: 'purple-color-3.jpg' },
          { tone: '#735577', name: 'Сливочный ирис', photo: 'purple-color-2.jpg' },
          { tone: '#44354D', name: 'Спелая ежевика', photo: 'purple-color-1.jpg' }
        ]
      },
      blue: {
        type: 'color',
        label: 'Голубой оттенок',
        photoLabel: 'Образ в голубой палитре',
        items: [
          { tone: '#A4B6C6', name: 'Голубой лёд', photo: 'blue-color-1.jpg' },
          { tone: '#AABAD4', name: 'Пудровый деним', photo: 'blue-color-2.jpg' },
          { tone: '#063759', name: 'Полуночный индиго', photo: 'blue-color-3.jpg' },
          { tone: '#141743', name: 'Чернильный вельвет', photo: 'blue-color-4.jpg' }
        ]
      }
    };

    const renderPalette = (key) => {
      const config = palettes[key];
      if (!config) return;
      examples.innerHTML = '';
      const cards = [];
      const flipIcon = `
        <svg viewBox="0 0 24 24" role="presentation" focusable="false" aria-hidden="true">
          <path d="M8.8 5.6a.65.65 0 0 0-.46 1.1L13.64 12l-5.3 5.3a.65.65 0 0 0 .92.92l5.76-5.76a.65.65 0 0 0 0-.92L9.06 5.76a.65.65 0 0 0-.26-.16.65.65 0 0 0-.01 0Z" fill="currentColor"/>
        </svg>
      `;

      const createFlipHint = (side) => {
        const hint = document.createElement('button');
        hint.type = 'button';
        hint.className = 'flip-hint';
        hint.dataset.side = side;
        const target = side === 'front' ? 'back' : 'front';
        hint.dataset.flip = target;
        hint.setAttribute('aria-label', target === 'back' ? 'Посмотреть пример образа' : 'Вернуться к палитре');
        hint.innerHTML = flipIcon;
        return hint;
      };

      config.items.forEach((item, index) => {
        if (config.type === 'color') {
          const tone = typeof item === 'string' ? item : item?.tone;
          const toneName = typeof item === 'object' ? item?.name : '';
          const photoName = typeof item === 'object' ? item?.photo : undefined;
          if (!tone || !photoName) return;
          const block = document.createElement('article');
          block.className = 'color-card dresscode-card';
          block.style.setProperty('--tone', tone);
          block.style.setProperty('--tone-base', tone);
          block.setAttribute('role', 'button');
          block.tabIndex = 0;
          block.setAttribute('aria-pressed', 'false');
          const ariaName = toneName ? ` — ${toneName}` : '';
          block.setAttribute('aria-label', `${config.label} ${index + 1}${ariaName}`);

          const inner = document.createElement('div');
          inner.className = 'color-card-inner';

          const front = document.createElement('div');
          front.className = 'color-card-face color-card-front';
          const caption = document.createElement('span');
          caption.className = 'visually-hidden';
          caption.textContent = `${config.label} ${index + 1}: ${toneName || tone}`;
          front.appendChild(caption);
          front.appendChild(createFlipHint('front'));

          const back = document.createElement('div');
          back.className = 'color-card-face color-card-back';
          if (photoName) {
            const img = document.createElement('img');
            let photoPath = photoName;
            if (!photoPath.includes('/')) {
              photoPath = `photos/${photoPath}`;
            }
            if (!/\.[a-z0-9]+$/i.test(photoPath)) {
              photoPath = `${photoPath}.jpg`;
            }
            img.src = photoPath;
            img.loading = 'lazy';
            img.decoding = 'async';
            const toneDescription = toneName || tone;
            const baseLabel = config.photoLabel ?? config.label;
            const alt = toneDescription ? `${baseLabel}: ${toneDescription}` : `${baseLabel} ${index + 1}`;
            img.alt = alt;
            back.appendChild(img);
          }
          back.appendChild(createFlipHint('back'));

          inner.appendChild(front);
          inner.appendChild(back);
          block.appendChild(inner);
          examples.appendChild(block);
          cards.push(block);
        } else if (config.type === 'image') {
          const src = item?.src;
          if (!src) return;
          const wrapper = document.createElement('div');
          wrapper.className = 'dresscode-example';
          const img = document.createElement('img');
          img.src = src;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = `${config.label} ${index + 1}`;
          wrapper.appendChild(img);
          examples.appendChild(wrapper);
        }
      });

      if (cards.length) {
        requestAnimationFrame(() => {
          cards.forEach((card, index) => {
            card.style.setProperty('--card-delay', `${index * 80}ms`);
            card.classList.add('is-ready');
          });
        });
      }
    };

    const setActiveSwatch = (active) => {
      const buttons = Array.from(palette.querySelectorAll('.swatch'));
      buttons.forEach((button) => {
        const isActive = button === active;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    };

    palette.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('.swatch') : null;
      if (!button) return;
      const key = button.dataset.palette;
      if (!key || !(key in palettes)) return;
      setActiveSwatch(button);
      renderPalette(key);
    });

    palette.addEventListener('pointerdown', (event) => {
      if (typeof event.button === 'number' && event.button !== 0) return;
      const button = event.target instanceof Element ? event.target.closest('.swatch') : null;
      if (!button) return;
      createRipple(button, event);
    });

    palette.addEventListener('focusin', (event) => {
      const button = event.target instanceof Element ? event.target.closest('.swatch') : null;
      if (!button || !button.matches(':focus-visible')) return;
      createRipple(button, { center: true });
    });

    const setCardFlipped = (card, shouldFlip) => {
      if (!card) return;
      const isFlipped = Boolean(shouldFlip);
      card.classList.toggle('is-flipped', isFlipped);
      card.setAttribute('aria-pressed', String(isFlipped));
    };

    examples.addEventListener('click', (event) => {
      const hint = event.target instanceof Element ? event.target.closest('.flip-hint') : null;
      if (hint) {
        event.stopPropagation();
        const card = hint.closest('.dresscode-card');
        if (!card) return;
        setCardFlipped(card, hint.dataset.flip === 'back');
        return;
      }
      const target = event.target instanceof Element ? event.target.closest('.dresscode-card') : null;
      if (!target) return;
      setCardFlipped(target, !target.classList.contains('is-flipped'));
    });

    examples.addEventListener('pointerdown', (event) => {
      const card = event.target instanceof Element ? event.target.closest('.dresscode-card') : null;
      if (!card) return;
      createRipple(card, event);
    });

    examples.addEventListener('focusin', (event) => {
      const card = event.target instanceof Element ? event.target.closest('.dresscode-card') : null;
      if (!card || !card.matches(':focus-visible')) return;
      createRipple(card, { center: true });
    });

    examples.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      const card = event.target instanceof HTMLElement ? event.target.closest('.dresscode-card') : null;
      if (!card || event.target !== card) return;
      event.preventDefault();
      setCardFlipped(card, !card.classList.contains('is-flipped'));
    });

    const initial = palette.querySelector('.swatch[data-palette]');
    if (initial instanceof HTMLElement) {
      const key = initial.dataset.palette;
      if (key && (key in palettes)) {
        setActiveSwatch(initial);
        renderPalette(key);
      }
    }
  }

  const showFeedback = (el, message, isError = false) => {
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', Boolean(isError));
  };

  const rsvp = document.querySelector('.rsvp-form');
  if (rsvp) {
    const submitBtn = rsvp.querySelector('button[type="submit"]');
    const feedbackEl = document.getElementById('rsvp-feedback');
    const drinkInputs = Array.from(rsvp.querySelectorAll('input[name="drinks"]'));
    const drinkNote = rsvp.querySelector('input[name="drinksNote"]');
    const drinkGrid = rsvp.querySelector('.drink-grid');

    const updatePillState = (input) => {
      if (!(input instanceof HTMLInputElement)) return;
      const pill = input.closest('.choice-pill');
      if (!pill) return;
      const isChecked = input.checked;
      pill.classList.toggle('is-selected', isChecked);
      pill.setAttribute('aria-pressed', String(isChecked));
      input.setAttribute('aria-checked', String(isChecked));
    };

    const syncPills = () => {
      rsvp.querySelectorAll('.choice-pill input[type="checkbox"]').forEach((input) => {
        updatePillState(input);
      });
    };

    const ensureDrinksValidity = () => {
      if (!drinkInputs.length) return true;
      const hasChoice = drinkInputs.some((input) => input.checked);
      const noteValue = (drinkNote?.value || '').toString().trim();
      const message = 'Выберите хотя бы один напиток или напишите свой вариант.';
      const control = drinkInputs[0];
      if (hasChoice || noteValue) {
        control.setCustomValidity('');
        return true;
      }
      control.setCustomValidity(message);
      return false;
    };

    rsvp.addEventListener('change', (ev) => {
      const target = ev.target;
      if (target instanceof HTMLInputElement && target.closest('.choice-pill')) {
        updatePillState(target);
        ensureDrinksValidity();
      }
      if (target instanceof HTMLInputElement && target === drinkNote) {
        ensureDrinksValidity();
      }
    });

    if (drinkGrid) {
      const syncFromInput = (input) => {
        if (!(input instanceof HTMLInputElement)) return;
        requestAnimationFrame(() => {
          updatePillState(input);
          ensureDrinksValidity();
        });
      };

      drinkGrid.addEventListener('click', (event) => {
        const pill = event.target instanceof Element ? event.target.closest('.choice-pill') : null;
        if (!pill) return;
        const input = pill.querySelector('input[type="checkbox"]');
        syncFromInput(input);
      });

      drinkGrid.addEventListener('keydown', (event) => {
        const pill = event.target instanceof Element ? event.target.closest('.choice-pill') : null;
        if (!pill) return;
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
        event.preventDefault();
        const input = pill.querySelector('input[type="checkbox"]');
        if (!(input instanceof HTMLInputElement)) return;
        input.click();
        syncFromInput(input);
      });
    }

    drinkNote?.addEventListener('input', ensureDrinksValidity);

    rsvp.addEventListener('reset', () => {
      requestAnimationFrame(() => {
        syncPills();
        ensureDrinksValidity();
      });
    });

    syncPills();
    ensureDrinksValidity();

    const gformUrl = rsvp.dataset.gform;
    const fieldMap = {
      name: 'entry.1768114812',
      attendance: 'entry.261955250',
      guests: 'entry.2115685374',
      kids: 'entry.1985729318',
      day2: 'entry.1672786907',
      drinks: 'entry.1201722257',
      drinksOther: 'entry.1201722257.other_option_response',
      allergy: 'entry.1404903480'
    };

    const setSubmitting = (state) => {
      if (!submitBtn) return;
      submitBtn.disabled = state;
      submitBtn.classList.toggle('is-busy', state);
    };

    const submitToGoogle = (formData) => {
      if (!gformUrl) {
        return Promise.reject(new Error('Не указан адрес Google-формы'));
      }
      const payload = new URLSearchParams();
      payload.append('fvv', '1');
      payload.append('pageHistory', '0');
      payload.append(fieldMap.name, (formData.get('name') || '').toString().trim());
      payload.append(fieldMap.attendance, (formData.get('attendance') || '').toString());
      payload.append(fieldMap.guests, (formData.get('guests') || '').toString());
      payload.append(fieldMap.kids, (formData.get('kids') || '').toString());
      payload.append(fieldMap.day2, (formData.get('day2') || '').toString());
      const drinks = formData.getAll('drinks').map((v) => v.toString()).filter(Boolean);
      drinks.forEach((drink) => payload.append(fieldMap.drinks, drink));
      const extraDrink = (formData.get('drinksNote') || '').toString().trim();
      if (extraDrink) {
        payload.append(fieldMap.drinks, '__other_option__');
        payload.append(fieldMap.drinksOther, extraDrink);
      }
      const allergy = (formData.get('allergy') || '').toString().trim();
      if (allergy) {
        payload.append(fieldMap.allergy, allergy);
      }
      return fetch(gformUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      });
    };

    rsvp.addEventListener('submit', (ev) => {
      ev.preventDefault();
      ensureDrinksValidity();
      if (!rsvp.reportValidity()) {
        return;
      }
      const formData = new FormData(rsvp);
      showFeedback(feedbackEl, 'Отправляем ответ...');
      setSubmitting(true);
      submitToGoogle(formData)
        .then(() => {
          showFeedback(feedbackEl, 'Ответ отправлен! Спасибо, что сообщили нам.');
          if (submitBtn) {
            const original = submitBtn.textContent;
            submitBtn.textContent = 'Отправлено!';
            setTimeout(() => {
              submitBtn.textContent = original;
            }, 2200);
          }
          rsvp.reset();
          syncPills();
          ensureDrinksValidity();
        })
        .catch((err) => {
          console.error('Не удалось отправить ответ в Google-форму', err);
          showFeedback(feedbackEl, 'Не получилось отправить ответ. Попробуйте ещё раз чуть позже.', true);
        })
        .finally(() => {
          setSubmitting(false);
        });
    });
  }

  const wishes = document.querySelector('.wishes-form');
  if (wishes) {
    const submitBtn = wishes.querySelector('button[type="submit"]');
    const feedbackEl = document.getElementById('wishes-feedback');
    const wishField = wishes.querySelector('textarea[name="wish"]');
    const gformUrl = wishes.dataset.gform;
    const fieldMap = {
      wish: 'entry.88530091'
    };

    const ensureWishValidity = () => {
      if (!wishField) return true;
      const raw = wishField.value;
      const trimmed = raw.trim();
      if (!trimmed && raw.length > 0) {
        wishField.setCustomValidity('Введите пожелание, пожалуйста');
        return false;
      }
      wishField.setCustomValidity('');
      return Boolean(trimmed || raw.length === 0);
    };

    wishField?.addEventListener('input', ensureWishValidity);

    const setSubmitting = (state) => {
      if (!submitBtn) return;
      submitBtn.disabled = state;
      submitBtn.classList.toggle('is-busy', state);
    };

    const submitToGoogle = (formData) => {
      if (!gformUrl) {
        return Promise.reject(new Error('Не указан адрес Google-формы для пожеланий'));
      }
      const payload = new URLSearchParams();
      payload.append('fvv', '1');
      payload.append('pageHistory', '0');
      const wishValue = (formData.get('wish') || '').toString().trim();
      payload.append(fieldMap.wish, wishValue);
      return fetch(gformUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      });
    };

    wishes.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!ensureWishValidity() || !wishes.reportValidity()) {
        return;
      }
      const formData = new FormData(wishes);
      showFeedback(feedbackEl, 'Отправляем пожелание...');
      setSubmitting(true);
      submitToGoogle(formData)
        .then(() => {
          showFeedback(feedbackEl, 'Спасибо за ваши тёплые слова!');
          if (submitBtn) {
            const original = submitBtn.textContent;
            submitBtn.textContent = 'Пожелание отправлено';
            setTimeout(() => {
              submitBtn.textContent = original;
            }, 2200);
          }
          wishes.reset();
          ensureWishValidity();
        })
        .catch((err) => {
          console.error('Не удалось отправить пожелание', err);
          showFeedback(feedbackEl, 'Не удалось отправить пожелание. Попробуйте ещё раз позже.', true);
        })
        .finally(() => {
          setSubmitting(false);
        });
    });
  }

});
