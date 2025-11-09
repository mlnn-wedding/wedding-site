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

  const storage = (() => {
    const prefix = 'wedding-site-v1';
    const availability = (() => {
      try {
        const test = '__wedding_storage_test__';
        window.localStorage.setItem(test, '1');
        window.localStorage.removeItem(test);
        return true;
      } catch (err) {
        console.warn('localStorage недоступен', err);
        return false;
      }
    })();

    const keyFor = (key) => `${prefix}:${key}`;

    const read = (key) => {
      if (!availability) return [];
      try {
        const raw = window.localStorage.getItem(keyFor(key));
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.warn('Не удалось прочитать данные', err);
        return [];
      }
    };

    const write = (key, value) => {
      if (!availability) return;
      try {
        window.localStorage.setItem(keyFor(key), JSON.stringify(value));
      } catch (err) {
        console.warn('Не удалось сохранить данные', err);
      }
    };

    const append = (key, entry) => {
      const list = read(key);
      list.push(entry);
      write(key, list);
      return list;
    };

    return { available: availability, read, write, append };
  })();

  const counterConfig = {
    rsvp: {
      forms: ['ответ', 'ответа', 'ответов'],
      empty: 'Пока нет сохранённых ответов',
      suffix: 'сохранено'
    },
    anon: {
      forms: ['сообщение', 'сообщения', 'сообщений'],
      empty: 'Пока нет сохранённых пожеланий',
      suffix: 'сохранено'
    }
  };

  const pluralizeRu = (n, [one, few, many]) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };

  const updateCount = (key) => {
    const config = counterConfig[key];
    if (!config) return;
    const counter = document.querySelector(`[data-count="${key}"]`);
    if (!counter) return;
    if (!storage.available) {
      counter.textContent = 'Хранилище в браузере недоступно';
      return;
    }
    const entries = storage.read(key);
    if (!entries.length) {
      counter.textContent = config.empty;
      return;
    }
    const word = pluralizeRu(entries.length, config.forms);
    counter.textContent = `${entries.length} ${word} ${config.suffix}`;
  };

  const updateStorageNote = (key) => {
    const wrapper = document.querySelector(`[data-storage="${key}"]`);
    if (!wrapper) return;
    const note = wrapper.querySelector('.storage-note');
    if (!storage.available) {
      wrapper.classList.add('is-disabled');
      if (note) {
        note.textContent = 'Сохранение отключено: похоже, браузер работает в приватном режиме.';
      }
    } else {
      wrapper.classList.remove('is-disabled');
      if (note) {
        const original = note.getAttribute('data-default');
        if (original) {
          note.textContent = original;
        }
      }
    }
  };

  const downloadCSV = (entries, columns, filename) => {
    if (!entries.length) return false;
    const header = columns.map(col => `"${col.header.replace(/"/g, '""')}"`).join(';');
    const rows = entries.map(entry => {
      return columns.map(col => {
        const value = typeof col.accessor === 'function' ? col.accessor(entry) : entry[col.accessor];
        const safe = value == null ? '' : String(value);
        return `"${safe.replace(/"/g, '""')}"`;
      }).join(';');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      URL.revokeObjectURL(url);
      link.remove();
    });
    return true;
  };

  const showFeedback = (el, message, isError = false) => {
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', Boolean(isError));
  };

  updateCount('rsvp');
  updateCount('anon');
  updateStorageNote('rsvp');
  updateStorageNote('anon');

  const rsvp = document.querySelector('.rsvp-form');
  if (rsvp) {
    const submitBtn = rsvp.querySelector('button[type="submit"]');
    const exportBtn = rsvp.querySelector('[data-export="rsvp"]');
    const feedbackEl = document.getElementById('rsvp-feedback');

    const syncPills = () => {
      rsvp.querySelectorAll('.choice-pill input[type="checkbox"]').forEach((input) => {
        const pill = input.closest('.choice-pill');
        if (!pill) return;
        pill.classList.toggle('is-selected', input.checked);
      });
    };

    rsvp.addEventListener('change', (ev) => {
      const target = ev.target;
      if (target instanceof HTMLInputElement && target.closest('.choice-pill')) {
        const pill = target.closest('.choice-pill');
        if (pill) {
          pill.classList.toggle('is-selected', target.checked);
        }
      }
    });

    syncPills();

    exportBtn?.addEventListener('click', () => {
      if (!storage.available) {
        showFeedback(feedbackEl, 'Экспорт недоступен в этом режиме браузера', true);
        return;
      }
      const entries = storage.read('rsvp');
      if (!entries.length) {
        showFeedback(feedbackEl, 'Пока нечего экспортировать — нет сохранённых ответов', true);
        return;
      }
      const columns = [
        { header: 'Дата/время', accessor: (entry) => new Date(entry.submittedAt).toLocaleString('ru-RU') },
        { header: 'Имя', accessor: 'name' },
        { header: 'Статус присутствия', accessor: 'attendanceLabel' },
        { header: 'Количество гостей', accessor: 'guests' },
        { header: 'Дети до 12', accessor: 'kids' },
        { header: 'Второй день', accessor: 'day2Label' },
        { header: 'Напитки', accessor: (entry) => entry.drinks?.join(', ') || '' },
        { header: 'Пожелания по напиткам', accessor: 'drinksNote' },
        { header: 'Аллергии/особенности', accessor: 'allergy' }
      ];
      const ok = downloadCSV(entries, columns, 'wedding-rsvp.csv');
      if (ok) {
        showFeedback(feedbackEl, 'Файл с ответами скачан');
      }
    });

    rsvp.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!rsvp.reportValidity()) {
        return;
      }
      if (!storage.available) {
        showFeedback(feedbackEl, 'Не удалось сохранить: включите обычный режим браузера', true);
        return;
      }

      const formData = new FormData(rsvp);
      const getSelectLabel = (name) => {
        const option = rsvp.querySelector(`[name="${name}"] option:checked`);
        return option ? option.textContent.trim() : '';
      };
      const entry = {
        submittedAt: new Date().toISOString(),
        name: (formData.get('name') || '').toString().trim(),
        attendance: formData.get('attendance'),
        attendanceLabel: getSelectLabel('attendance'),
        guests: formData.get('guests'),
        kids: formData.get('kids'),
        day2: formData.get('day2'),
        day2Label: getSelectLabel('day2'),
        drinks: formData.getAll('drinks').map((v) => v.toString()),
        drinksNote: (formData.get('drinksNote') || '').toString().trim(),
        allergy: (formData.get('allergy') || '').toString().trim()
      };
      const entries = storage.append('rsvp', entry);
      const count = entries.length;
      updateCount('rsvp');
      showFeedback(feedbackEl, `Ответ сохранён! Сейчас у нас ${count} ${pluralizeRu(count, counterConfig.rsvp.forms)}.`);
      if (submitBtn) {
        const original = submitBtn.textContent;
        submitBtn.textContent = 'Спасибо!';
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.textContent = original;
          submitBtn.disabled = false;
        }, 2200);
      }
      rsvp.reset();
      syncPills();
    });
  }

  const anon = document.querySelector('.anon-form');
  if (anon) {
    const submitBtn = anon.querySelector('button[type="submit"]');
    const exportBtn = anon.querySelector('[data-export="anon"]');
    const feedbackEl = document.getElementById('anon-feedback');

    exportBtn?.addEventListener('click', () => {
      if (!storage.available) {
        showFeedback(feedbackEl, 'Экспорт недоступен в приватном режиме', true);
        return;
      }
      const entries = storage.read('anon');
      if (!entries.length) {
        showFeedback(feedbackEl, 'Пока нет сохранённых пожеланий', true);
        return;
      }
      const columns = [
        { header: 'Дата/время', accessor: (entry) => new Date(entry.submittedAt).toLocaleString('ru-RU') },
        { header: 'Сообщение', accessor: 'message' }
      ];
      const ok = downloadCSV(entries, columns, 'wedding-wishes.csv');
      if (ok) {
        showFeedback(feedbackEl, 'Файл с пожеланиями скачан');
      }
    });

    anon.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!anon.reportValidity()) {
        return;
      }
      if (!storage.available) {
        showFeedback(feedbackEl, 'Сохранение недоступно: отключён localStorage', true);
        return;
      }
      const formData = new FormData(anon);
      const message = (formData.get('anon') || '').toString().trim();
      if (!message) {
        showFeedback(feedbackEl, 'Введите сообщение, пожалуйста', true);
        return;
      }
      const entry = {
        submittedAt: new Date().toISOString(),
        message
      };
      const entries = storage.append('anon', entry);
      const count = entries.length;
      updateCount('anon');
      showFeedback(feedbackEl, `Пожелание сохранено ❤️ (${count} ${pluralizeRu(count, counterConfig.anon.forms)})`);
      if (submitBtn) {
        const original = submitBtn.textContent;
        submitBtn.textContent = 'Мы всё прочитаем!';
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.textContent = original;
          submitBtn.disabled = false;
        }, 2200);
      }
      anon.reset();
    });
  }
});
