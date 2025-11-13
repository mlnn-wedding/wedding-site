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
  _visibilityHandler: null,
  _motionQuery: null,
  _motionHandler: null,
  mount(imgId){
    const current = document.getElementById(imgId);
    if(!current) return;
    const frame = current.closest('.gallery-frame');
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
      makeVisible(active);
      this.index = 0;
    }
    makeHidden(standby);
    standby.removeAttribute('data-src');
    standby.removeAttribute('src');

    const show = (i) => {
      if(!this.photos.length || isTransitioning) return;
      const normalized = (i + this.photos.length) % this.photos.length;
      const nextSrc = this.photos[normalized];
      if(!nextSrc || active.getAttribute('data-src') === nextSrc){
        this.index = normalized;
        return;
      }

      standby.onload = null;
      const beginSwap = () => {
        isTransitioning = true;
        const upcoming = standby;
        const currentActive = active;

        let fallbackTimer = null;
        const finalize = (event) => {
          if(event && (event.target !== upcoming || event.propertyName !== 'opacity')){
            return;
          }
          upcoming.removeEventListener('transitionend', finalize);
          if(fallbackTimer){
            window.clearTimeout(fallbackTimer);
          }
          upcoming.onload = null;
          standby = currentActive;
          active = upcoming;
          this.index = normalized;
          isTransitioning = false;
        };

        if(this._motionQuery && this._motionQuery.matches){
          makeHidden(currentActive);
          makeVisible(upcoming);
          upcoming.onload = null;
          standby = currentActive;
          active = upcoming;
          this.index = normalized;
          isTransitioning = false;
          return;
        }

        fallbackTimer = window.setTimeout(() => finalize(), 1200);
        upcoming.addEventListener('transitionend', finalize);

        requestAnimationFrame(() => {
          makeVisible(upcoming);
          makeHidden(currentActive);
        });
      };

      const prepare = () => {
        beginSwap();
      };

      setSource(standby, nextSrc);
      if(standby.complete && standby.naturalWidth){
        prepare();
      } else {
        standby.onload = () => {
          standby.onload = null;
          prepare();
        };
      }
    };

    const start = () => {
      if(this.timer || (this._motionQuery && this._motionQuery.matches)) return;
      this.timer = window.setInterval(() => show(this.index + 1), this.intervalMs);
    };

    const stop = () => {
      if(!this.timer) return;
      window.clearInterval(this.timer);
      this.timer = null;
    };

    if(!this._motionQuery){
      this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._motionHandler = () => {
        if(this._motionQuery.matches){
          stop();
        } else {
          start();
        }
      };
      if(typeof this._motionQuery.addEventListener === 'function'){
        this._motionQuery.addEventListener('change', this._motionHandler);
      } else if(typeof this._motionQuery.addListener === 'function'){
        this._motionQuery.addListener(this._motionHandler);
      }
    }

    if(!this._visibilityHandler){
      this._visibilityHandler = () => {
        if(document.hidden){
          stop();
        } else {
          start();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    if(!(this._motionQuery && this._motionQuery.matches)){
      start();
    }

    return { next: () => show(this.index + 1) };
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
  window.Wedding.gallery.mount('gallery-current');
  window.Wedding.countdown.start();
  window.Wedding.miniCal.mount('mini-calendar', 'calendar-month', 'calendar-year');

  const palette = document.querySelector('.dresscode-palette');
  const examples = document.getElementById('dresscode-examples');
  if (palette && examples) {
    const createRipple = (target, event) => {
      if (!target || !event) return;
      if (typeof event.button === 'number' && event.button !== 0) return;
      if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const diagonal = Math.sqrt((rect.width ** 2) + (rect.height ** 2)) || Math.max(rect.width, rect.height);
      const size = diagonal * 1.05;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      Array.from(target.querySelectorAll('.ripple')).forEach((node) => {
        if (node !== ripple) node.remove();
      });
      target.appendChild(ripple);
      ripple.addEventListener('animationend', () => {
        ripple.remove();
      }, { once: true });
    };

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
      config.items.forEach((item, index) => {
        if (config.type === 'color') {
          const tone = typeof item === 'string' ? item : item?.tone;
          const toneName = typeof item === 'object' ? item?.name : '';
          const photoName = typeof item === 'object' ? item?.photo : undefined;
          if (!tone || !photoName) return;
          const block = document.createElement('button');
          block.type = 'button';
          block.className = 'color-card dresscode-card';
          block.style.setProperty('--tone', tone);
          block.style.setProperty('--tone-base', tone);
          block.setAttribute('aria-pressed', 'false');
          const ariaName = toneName ? ` — ${toneName}` : '';
          block.setAttribute('aria-label', `${config.label} ${index + 1}${ariaName}`);

          const inner = document.createElement('span');
          inner.className = 'color-card-inner';

          const front = document.createElement('span');
          front.className = 'color-card-face color-card-front';
          const caption = document.createElement('span');
          caption.className = 'visually-hidden';
          caption.textContent = `${config.label} ${index + 1}: ${toneName || tone}`;
          front.appendChild(caption);

          const chip = document.createElement('span');
          chip.className = 'dresscode-tone-chip';
          chip.setAttribute('aria-hidden', 'true');
          front.appendChild(chip);

          if (toneName || tone) {
            const title = document.createElement('span');
            title.className = 'dresscode-tone-name';
            title.textContent = toneName || tone;
            front.appendChild(title);
          }

          const back = document.createElement('span');
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
      const button = event.target instanceof HTMLElement ? event.target.closest('.swatch') : null;
      if (!button) return;
      const key = button.dataset.palette;
      if (!key || !(key in palettes)) return;
      setActiveSwatch(button);
      renderPalette(key);
    });

    palette.addEventListener('pointerdown', (event) => {
      const button = event.target instanceof HTMLElement ? event.target.closest('.swatch') : null;
      if (!button) return;
      createRipple(button, event);
    });

    examples.addEventListener('click', (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('.dresscode-card') : null;
      if (!target) return;
      const isNowFlipped = target.classList.toggle('is-flipped');
      target.setAttribute('aria-pressed', String(isNowFlipped));
      if (isNowFlipped) {
        const others = examples.querySelectorAll('.dresscode-card.is-flipped');
        others.forEach((card) => {
          if (card === target) return;
          card.classList.remove('is-flipped');
          card.setAttribute('aria-pressed', 'false');
        });
      }
    });

    examples.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('.dresscode-card') : null;
      if (!target) return;
      const surface = target.querySelector('.color-card-inner');
      createRipple(surface || target, event);
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

    const syncPills = () => {
      rsvp.querySelectorAll('.choice-pill input[type="checkbox"]').forEach((input) => {
        const pill = input.closest('.choice-pill');
        if (!pill) return;
        pill.classList.toggle('is-selected', input.checked);
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
        const pill = target.closest('.choice-pill');
        if (pill) {
          pill.classList.toggle('is-selected', target.checked);
        }
        ensureDrinksValidity();
      }
      if (target instanceof HTMLInputElement && target === drinkNote) {
        ensureDrinksValidity();
      }
    });

    drinkNote?.addEventListener('input', ensureDrinksValidity);

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
