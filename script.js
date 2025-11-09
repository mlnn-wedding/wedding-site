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
    'https://i.ibb.co/yFmMfNxN/DSC-3612.jpg',
    'https://i.ibb.co/CsTT9srS/DS-1455.webp',
    'https://i.ibb.co/qLZ74QHP/20240928-130804.webp',
    'https://i.ibb.co/fdQm8s1w/DS-0736.webp',
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

    const setActive = (imgEl, src) => {
      if(!src) return;
      imgEl.setAttribute('data-src', src);
      imgEl.src = src;
    };

    const runTransition = (nextSrc) => {
      let finished = false;
      let fallbackTimer = null;

      const finish = () => {
        if(finished) return;
        finished = true;
        back.removeEventListener('transitionend', onEnd);
        if(fallbackTimer){
          window.clearTimeout(fallbackTimer);
        }
        setActive(front, nextSrc);
        requestAnimationFrame(() => {
          front.classList.add('is-visible');
          back.classList.remove('is-visible');
        });
        back.removeAttribute('data-src');
        back.removeAttribute('src');
      };

      const onEnd = (event) => {
        if(event.target === back && event.propertyName === 'opacity'){
          finish();
        }
      };

      back.addEventListener('transitionend', onEnd);
      fallbackTimer = window.setTimeout(finish, 1800);

      requestAnimationFrame(() => {
        front.classList.remove('is-visible');
        requestAnimationFrame(() => {
          back.classList.add('is-visible');
        });
      });
    };

    const show = (i) => {
      if(!this.photos.length) return;
      this.index = (i + this.photos.length) % this.photos.length;
      const nextSrc = this.photos[this.index];
      if(front.getAttribute('data-src') === nextSrc){
        return;
      }
      back.onload = null;

      const startSwap = () => {
        if(this._motionQuery && this._motionQuery.matches){
          setActive(front, nextSrc);
          front.classList.add('is-visible');
          back.classList.remove('is-visible');
          back.removeAttribute('data-src');
          back.removeAttribute('src');
          return;
        }
        runTransition(nextSrc);
      };

      setActive(back, nextSrc);
      if(back.complete){
        startSwap();
      } else {
        back.onload = () => {
          back.onload = null;
          startSwap();
        };
      }
    };

    setActive(front, this.photos[0]);
    front.classList.add('is-visible');
    this.index = 0;
    back.removeAttribute('data-src');
    back.removeAttribute('src');
    back.classList.remove('is-visible');

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
