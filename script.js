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
  mount(imgId){
    const img = document.getElementById(imgId);
    if(!img) return;
    const show = (i) => {
      this.index = (i + this.photos.length) % this.photos.length;
      img.classList.remove('is-visible');
      const nextSrc = this.photos[this.index];
      const currentSrc = img.getAttribute('data-src');
      if(currentSrc === nextSrc){
        requestAnimationFrame(() => img.classList.add('is-visible'));
        return;
      }
      img.onload = () => {
        img.classList.add('is-visible');
        img.setAttribute('data-src', nextSrc);
      };
      img.src = nextSrc;
      if(img.complete){
        requestAnimationFrame(() => {
          img.classList.add('is-visible');
          img.setAttribute('data-src', nextSrc);
        });
      }
    };
    show(0);
    this.timer = setInterval(() => show(this.index + 1), 3000);
    document.addEventListener('visibilitychange', () => {
      if(document.hidden){
        this.timer && clearInterval(this.timer);
        this.timer = null;
      } else if(!this.timer){
        this.timer = setInterval(() => show(this.index + 1), 3000);
      }
    });
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

  const rsvp = document.querySelector('.rsvp-form');
  if (rsvp) {
    rsvp.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const btn = rsvp.querySelector('button[type="submit"]');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Спасибо!';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
          rsvp.reset();
        }, 2200);
      }
    });
  }

  const anon = document.querySelector('.anon-form');
  if (anon) {
    anon.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const btn = anon.querySelector('button[type="submit"]');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Мы всё прочитаем!';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
          anon.reset();
        }, 2200);
      }
    });
  }
});
