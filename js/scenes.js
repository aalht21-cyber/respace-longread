(() => {
  'use strict';
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const wide = matchMedia('(min-width: 1024px)');
  const HEADER = 65;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  document.querySelectorAll('[data-stagger]').forEach((list => {
    [ ...list.children ].forEach(((child, i) => child.style.setProperty('--i', i)));
  }));
  const makeFrames = (name, {mobileOnly: mobileOnly = null} = {}) => ({
    list: null,
    imgs: [],
    n: 0,
    started: false,
    async load() {
      if (this.started) return;
      this.started = true;
      let m;
      try {
        const res = await fetch(`assets/frames/${name}/manifest.json`, {
          cache: 'no-cache'
        });
        if (!res.ok) return;
        m = await res.json();
      } catch {
        return;
      }
      const mobile = !wide.matches;
      const set = mobile && m.mobile ? m.mobile : m.desktop;
      const n = set.count;
      const pad = k => String(k).padStart(4, '0');
      const url = i => `assets/frames/${name}/${set.dir}/${pad(i + 1)}.${set.ext || 'webp'}`;
      this.n = n;
      this.imgs = new Array(n);
      const all = [ ...Array(n).keys() ];
      const ids = mobile && mobileOnly ? mobileOnly(n) : all;
      const order = [ ...new Set([ ids[0], ids[ids.length - 1], ...ids.filter((i => i % 8 === 0)), ...ids ]) ];
      const fetchOne = i => new Promise((resolve => {
        const img = new Image;
        img.decoding = 'async';
        img.onload = () => {
          this.imgs[i] = img;
          resolve();
        };
        img.onerror = resolve;
        img.src = url(i);
      }));
      await Promise.all([ fetchOne(order[0]), fetchOne(order[1]) ]);
      if (!this.imgs[ids[0]]) return;
      this.list = this.imgs;
      document.body.classList.add(`has-frames-${name}`);
      invalidate();
      for (let k = 2; k < order.length; k += 6) {
        await Promise.all(order.slice(k, k + 6).map(fetchOne));
        invalidate();
      }
    },
    pick(t) {
      const want = Math.round(clamp(t) * (this.n - 1));
      for (let d = 0; d < this.n; d += 1) {
        if (this.imgs[want - d]) return this.imgs[want - d];
        if (this.imgs[want + d]) return this.imgs[want + d];
      }
      return null;
    },
    draw(canvas, t) {
      if (!this.list || !canvas) return;
      const img = this.pick(t);
      if (!img) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.shown = null;
      }
      if (canvas.shown === img) return;
      canvas.shown = img;
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      canvas.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
  });
  const frames = makeFrames('flythrough', {
    mobileOnly: n => [ 0, Math.round((n - 1) / 2), n - 1 ]
  });
  const wardrobe = makeFrames('wardrobe');
  const scenes = [];
  const define = (name, setup = () => ({})) => {
    const el = document.querySelector(`[data-scene="${name}"]`);
    if (!el) return;
    const sc = {
      el: el,
      name: name,
      ...setup(el),
      last: -1
    };
    if (!sc.update) sc.targets = el.querySelectorAll('[data-p]').length ? [ ...el.querySelectorAll('[data-p]') ] : [ el ];
    scenes.push(sc);
  };
  define('hall', (el => {
    const lights = [ ...el.querySelectorAll('.facade__lights rect') ];
    const facade = el.querySelector('.facade');
    const fades = el.querySelectorAll('[data-fade]');
    const room = el.querySelector('.hall__room');
    const WIN = {
      x: 1225 / 1600,
      y: 270 / 900
    };
    let dx = 0;
    let dy = 0;
    facade.style.transformOrigin = `${WIN.x * 100}% ${WIN.y * 100}%`;
    return {
      measure(pinned) {
        if (!pinned) return;
        const prev = facade.style.transform;
        facade.style.transform = 'none';
        const r = facade.getBoundingClientRect();
        const stage = el.querySelector('.stage').getBoundingClientRect();
        facade.style.transform = prev;
        dx = innerWidth / 2 - (r.left + WIN.x * r.width);
        dy = (innerHeight - HEADER) / 2 - (r.top - stage.top + WIN.y * r.height);
      },
      update(p, pinned) {
        lights.forEach(((r, i) => {
          r.style.opacity = (.85 * seg(p, .02 + i * .024, .06 + i * .024)).toFixed(3);
        }));
        if (!pinned) {
          facade.style.transform = '';
          fades.forEach((f => {
            f.style.opacity = '';
          }));
          room.style.opacity = 0;
          return;
        }
        const z = ease(seg(p, .4, .9));
        fades.forEach((f => {
          f.style.opacity = (1 - seg(p, .36, .5)).toFixed(3);
        }));
        facade.style.transform = `translate3d(${(dx * z).toFixed(1)}px, ${(dy * z).toFixed(1)}px, 0) scale(${(1 + 13 * z * z).toFixed(3)})`;
        const r = ease(seg(p, .78, .95));
        room.style.opacity = r.toFixed(3);
        room.style.transform = `scale(${(1.08 - .08 * r).toFixed(4)})`;
      }
    };
  }));
  define('hall-m', (el => {
    const zoom = el.querySelector('.facade__zoom');
    const room = el.querySelector('.facade__room');
    zoom.style.transformOrigin = `${1225 / 1600 * 100}% ${270 / 900 * 100}%`;
    return {
      update(p, pinned, active) {
        if (!active) {
          zoom.style.transform = '';
          room.style.opacity = '';
          return;
        }
        const z = ease(seg(p, .2, .4));
        zoom.style.transform = `scale(${(1 + 3 * z).toFixed(3)})`;
        room.style.opacity = ease(seg(p, .6, .75)).toFixed(3);
      }
    };
  }));
  define('wardrobe', (el => {
    const canvas = el.querySelector('.wardrobe__canvas');
    const open = el.querySelector('.wardrobe__open');
    return {
      update(p) {
        const t = ease(seg(p, .05, .85));
        if (wardrobe.list) {
          canvas.style.opacity = 1;
          wardrobe.draw(canvas, t);
          return;
        }
        open.style.opacity = t.toFixed(3);
      }
    };
  }));
  [ 'kettle', 'table', 'morning', 'drawers', 'opposite', 'respace' ].forEach((n => define(n)));
  define('before', (el => {
    const items = [ ...el.querySelectorAll('.conflicts li') ];
    const marks = [ ...el.querySelectorAll('.photo-mark') ];
    const after = el.querySelector('.photo__after');
    let tops = [];
    return {
      read() {
        tops = items.map((li => li.getBoundingClientRect().top));
      },
      update(p, pinned, mpinned) {
        let c;
        let t;
        if (mpinned) {
          const line = innerHeight * .62;
          c = tops.map((top => clamp((line - top) / 120)));
          t = ease(seg(p, .78, .97));
        } else {
          c = [ 0, 1, 2, 3 ].map((i => seg(p, .04 + i * .11, .1 + i * .11)));
          t = ease(seg(p, .56, .9));
        }
        items.forEach(((li, i) => {
          li.style.opacity = (.75 + .25 * c[i]).toFixed(3);
        }));
        marks.forEach(((m, i) => {
          m.style.opacity = (c[i] * (1 - t)).toFixed(3);
        }));
        after.style.opacity = t.toFixed(3);
        window.RoomPlan?.setMorph(el.querySelector('.plan-box svg'), c, t);
      }
    };
  }));
  define('evenings', (el => {
    const figs = [ ...el.querySelectorAll('.evening figure') ];
    const texts = [ ...el.querySelectorAll('.evening > p') ];
    let tops = [];
    return {
      read() {
        tops = texts.map((t => t.getBoundingClientRect().top));
      },
      update(p, pinned, mpinned) {
        if (!pinned && !mpinned) {
          figs.forEach((f => {
            f.style.opacity = '';
          }));
          texts.forEach((t => t.classList.remove('is-current')));
          return;
        }
        let s = p * 4.6 - .3;
        if (mpinned) {
          const line = innerHeight * .62;
          s = clamp(tops.reduce(((acc, top) => acc + clamp((line - top) / 160)), 0) - 1, 0, 4);
        }
        figs.forEach(((f, i) => {
          const d = Math.abs(s - i);
          f.style.opacity = (d < .3 ? 1 : d > .7 ? 0 : (.7 - d) / .4).toFixed(3);
        }));
        const cur = clamp(Math.round(s), 0, 4);
        texts.forEach(((t, i) => t.classList.toggle('is-current', i === cur)));
      }
    };
  }));
  define('stay', (el => {
    const room = el.querySelector('.stay__room');
    const win = el.querySelector('.stay__win');
    const canvas = el.querySelector('.fly');
    return {
      update(p) {
        if (frames.list) {
          canvas.style.opacity = (seg(p, .12, .22) * (1 - seg(p, .82, .92))).toFixed(3);
          frames.draw(canvas, 1 - seg(p, .2, .8));
          room.style.opacity = (1 - seg(p, .2, .3)).toFixed(3);
          win.style.opacity = seg(p, .8, .9).toFixed(3);
          win.style.transform = '';
          return;
        }
        const z = ease(seg(p, .25, .9));
        room.style.transform = `scale(${(1 - .75 * z).toFixed(3)})`;
        room.style.opacity = (1 - seg(p, .5, .8)).toFixed(3);
        win.style.opacity = seg(p, .45, .75).toFixed(3);
        win.style.transform = `scale(${(4 - 3 * z).toFixed(3)})`;
      }
    };
  }));
  const STYLE = {
    s2: {
      h: 'mask',
      p: 'rise',
      s: 'ink'
    },
    s3: {
      h: 'slide_h',
      p: 'rise',
      s: 'ink'
    },
    s4: {
      h: 'words',
      p: 'rise',
      s: 'ink'
    },
    s5: {
      h: 'drop_h',
      p: 'drop',
      s: 'ink'
    },
    s6: {
      h: 'split',
      p: 'rise',
      s: 'words'
    },
    s7: {
      h: 'words',
      p: 'rise',
      s: 'ink'
    },
    s8: {
      h: 'flicker',
      p: 'fade',
      s: 'ink'
    },
    s9: {
      h: 'type',
      p: 'rise',
      s: 'ink'
    },
    s10: {
      h: 'pen',
      p: 'rise',
      s: 'pen'
    },
    s11: {
      h: 'glow',
      p: 'fade',
      s: 'ink'
    }
  };
  const texts = [];
  const skip = '[data-pin], [data-fade], .notes, .steps, .figures, .timeline, .builder, .bars';
  const splitWords = (el, {mask: mask = false, chars: chars = false} = {}) => {
    const words = [];
    const letters = [];
    const whole = el.textContent.replace(/\s+/g, ' ').trim();
    [ ...el.childNodes ].forEach((node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/( +)/).forEach((part => {
          if (!part) return;
          if (/^ +$/.test(part)) {
            frag.append(part);
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          if (chars) {
            [ ...part ].forEach((ch => {
              const c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              w.append(c);
              letters.push(c);
            }));
          } else {
            w.textContent = part;
          }
          if (mask) {
            const m = document.createElement('span');
            m.className = 'w-mask';
            m.setAttribute('aria-hidden', 'true');
            m.append(w);
            frag.append(m);
          } else {
            w.setAttribute('aria-hidden', 'true');
            frag.append(w);
          }
          words.push(w);
        }));
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('sr-only')) {
        node.classList.add('w');
        words.push(node);
        if (chars) letters.push(node);
      }
    }));
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = whole;
    el.append(sr);
    return {
      words: words,
      letters: letters
    };
  };
  const order = (n, seed) => {
    const idx = [ ...Array(n).keys() ];
    let x = seed;
    for (let i = n - 1; i > 0; i -= 1) {
      x = (x * 9301 + 49297) % 233280;
      const k = Math.floor(x / 233280 * (i + 1));
      [idx[i], idx[k]] = [ idx[k], idx[i] ];
    }
    const rank = [];
    idx.forEach(((v, r) => {
      rank[v] = r;
    }));
    return rank;
  };
  const add = (el, kind) => {
    if (el.closest(skip) || texts.some((t => t.el === el))) return;
    const t = {
      el: el,
      kind: kind,
      last: -1
    };
    if (![ 'rise', 'slide', 'drop', 'fade', 'pen' ].includes(kind)) {
      Object.assign(t, splitWords(el, {
        mask: kind === 'mask',
        chars: kind === 'type'
      }));
      if (kind === 'flicker') t.rank = order(t.words.length, t.words.length * 7 + 3);
    }
    texts.push(t);
  };
  if (motion) {
    Object.entries(STYLE).forEach((([id, st]) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('h2, .subhead').forEach((el => add(el, st.h)));
      sec.querySelectorAll('.statement').forEach((el => add(el, st.s)));
      sec.querySelectorAll('.prose > p, .intro, .lead').forEach((el => add(el, st.p)));
    }));
  }
  const measureTexts = () => {
    texts.forEach((t => {
      const prev = t.el.style.transform;
      t.el.style.transform = 'none';
      const r = t.el.getBoundingClientRect();
      t.el.style.transform = prev;
      t.top = r.top + scrollY;
      t.h = r.height;
      t.last = -1;
    }));
  };
  const px = v => v.toFixed(2);
  const RENDER = {
    rise: (t, g) => {
      t.el.style.opacity = (.6 + .4 * g).toFixed(3);
      t.el.style.transform = `translate3d(0, ${px((1 - g) * 24)}px, 0)`;
    },
    slide: (t, g) => {
      t.el.style.opacity = (.6 + .4 * g).toFixed(3);
      t.el.style.transform = `translate3d(${px((1 - g) * 48)}px, 0, 0)`;
    },
    drop: (t, g) => {
      t.el.style.opacity = (.6 + .4 * g).toFixed(3);
      t.el.style.transform = `translate3d(0, ${px((g - 1) * 20)}px, 0)`;
    },
    fade: (t, g) => {
      t.el.style.opacity = (.6 + .4 * g).toFixed(3);
    },
    pen: (t, g) => {
      t.el.style.clipPath = g >= 1 ? '' : `inset(-0.3em ${((1 - g) * 100).toFixed(2)}% -0.3em -0.3em)`;
    },
    words: (t, p) => t.words.forEach(((w, i, a) => {
      const g = ease(seg(p, i / a.length * .45, i / a.length * .45 + .55));
      w.style.opacity = g.toFixed(3);
      w.style.transform = `translate3d(0, ${px((1 - g) * .4)}em, 0)`;
    })),
    mask: (t, p) => t.words.forEach(((w, i, a) => {
      const g = ease(seg(p, i / a.length * .4, i / a.length * .4 + .6));
      w.style.transform = `translate3d(0, ${px((1 - g) * 110)}%, 0)`;
    })),
    slide_h: (t, p) => t.words.forEach(((w, i, a) => {
      const g = ease(seg(p, i / a.length * .5, i / a.length * .5 + .5));
      w.style.opacity = g.toFixed(3);
      w.style.transform = `translate3d(${px((1 - g) * 1.6)}em, 0, 0)`;
    })),
    drop_h: (t, p) => t.words.forEach(((w, i, a) => {
      const g = ease(seg(p, i / a.length * .5, i / a.length * .5 + .5));
      w.style.opacity = g.toFixed(3);
      w.style.transform = `translate3d(0, ${px((g - 1) * .7)}em, 0)`;
    })),
    split: (t, p) => t.words.forEach(((w, i, a) => {
      const side = i < a.length / 2 ? -1 : 1;
      const g = ease(seg(p, .1, .9));
      w.style.opacity = g.toFixed(3);
      w.style.transform = `translate3d(${px(side * (1 - g) * 1.2)}em, 0, 0)`;
    })),
    flicker: (t, p) => t.words.forEach(((w, i, a) => {
      const start = t.rank[i] / a.length * .7;
      w.style.opacity = (.08 + .92 * seg(p, start, start + .12)).toFixed(3);
    })),
    type: (t, p) => t.letters.forEach(((c, i, a) => {
      c.style.opacity = clamp(p * 1.15 * a.length - i).toFixed(2);
    })),
    glow: (t, p) => t.words.forEach(((w, i, a) => {
      w.style.opacity = seg(p, i / a.length * .6, i / a.length * .6 + .4).toFixed(3);
    })),
    ink: (t, p) => t.words.forEach(((w, i, a) => {
      w.style.opacity = (.6 + .4 * clamp((p * (a.length + 4) - i) / 4)).toFixed(3);
    }))
  };
  const updateTexts = (y, vh) => {
    texts.forEach((t => {
      const top = t.top - y;
      if (top > vh * 1.2 || top + t.h < -vh * .2) return;
      const p = t.kind === 'ink' ? clamp((vh * .95 - top) / (vh * .2 + t.h)) : t.kind === 'glow' ? clamp((vh * .95 - top) / (vh * .55)) : clamp((vh * .95 - top) / (vh * .35));
      if (Math.abs(p - t.last) < .002) return;
      t.last = p;
      const whole = [ 'rise', 'slide', 'drop', 'fade', 'pen' ].includes(t.kind);
      RENDER[t.kind](t, whole ? ease(p) : p);
    }));
  };
  const clock = document.getElementById('clock');
  const first = document.getElementById('s1');
  const lastScreen = document.getElementById('s11');
  let span = [ 0, 1 ];
  let shownTime = '';
  let pinned = false;
  const measure = () => {
    pinned = motion && wide.matches;
    const mpinned = motion && !wide.matches;
    root.classList.toggle('is-pinned', pinned);
    root.classList.toggle('is-mpinned', mpinned);
    scenes.forEach((sc => {
      const track = sc.el.dataset.mtrack === 'parent' && mpinned ? sc.el.parentElement : sc.el;
      const r = track.getBoundingClientRect();
      sc.top = r.top + scrollY;
      sc.h = r.height;
      sc.pin = pinned && sc.el.hasAttribute('data-pin');
      sc.mpin = mpinned && sc.el.hasAttribute('data-mpin');
      sc.pass = sc.el.dataset.range === 'pass';
      sc.track = sc.el.dataset.range === 'track';
      sc.measure?.(sc.pin);
      sc.last = -1;
    }));
    span = [ first.getBoundingClientRect().top + scrollY, lastScreen.getBoundingClientRect().top + scrollY ];
    measureTexts();
  };
  const progress = (sc, y, vh) => {
    if (sc.pin) return clamp((y + HEADER - sc.top) / Math.max(1, sc.h - (vh - HEADER)));
    if (sc.mpin) return clamp((y + HEADER - sc.top) / Math.max(1, sc.h - vh * .5));
    if (sc.pass) return clamp((y + vh - sc.top) / (sc.h + vh));
    if (sc.track) return clamp((y + vh * .65 - sc.top) / Math.max(1, sc.h - vh * .3));
    const start = Math.max(0, sc.top - vh * .85);
    const end = sc.top + Math.min(sc.h, vh * .9) - vh * .6;
    return clamp((y - start) / Math.max(1, end - start));
  };
  let queued = false;
  function tick() {
    queued = false;
    const y = scrollY;
    const vh = innerHeight;
    scenes.forEach((sc => {
      if (sc.mpin && sc.read) sc.read();
    }));
    scenes.forEach((sc => {
      const p = motion ? progress(sc, y, vh) : Number(sc.el.dataset.static ?? 1);
      if (Math.abs(p - sc.last) < 5e-4 && !(sc.mpin && p > 0 && p < 1)) return;
      sc.last = p;
      if (sc.targets) sc.targets.forEach((t => t.style.setProperty('--p', p.toFixed(4))));
      sc.update?.(p, sc.pin, sc.mpin);
    }));
    if (motion) updateTexts(y, vh);
    if (clock) {
      const t = clamp((y - span[0]) / Math.max(1, span[1] - span[0]));
      const minutes = 19 * 60 + Math.round(t * 240 / 5) * 5;
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      const text = `${hh}:${mm}`;
      if (text !== shownTime) {
        shownTime = text;
        clock.textContent = text;
        clock.setAttribute('datetime', text);
      }
    }
  }
  const request = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(tick);
    }
  };
  function invalidate() {
    scenes.forEach((sc => {
      sc.last = -1;
    }));
    request();
  }
  const remeasure = () => {
    measure();
    request();
  };
  addEventListener('scroll', request, {
    passive: true
  });
  addEventListener('resize', remeasure);
  wide.addEventListener('change', remeasure);
  addEventListener('load', remeasure);
  if (document.fonts) document.fonts.ready.then(remeasure);
  new ResizeObserver(remeasure).observe(document.body);
  remeasure();
  if (motion) {
    const io5 = new IntersectionObserver((entries => {
      if (entries.some((e => e.isIntersecting))) {
        io5.disconnect();
        wardrobe.load();
      }
    }), {
      rootMargin: '150% 0px'
    });
    io5.observe(document.getElementById('s5'));
  }
  if (motion) {
    const near = document.getElementById('s10') || lastScreen;
    const io = new IntersectionObserver((entries => {
      if (entries.some((e => e.isIntersecting))) {
        io.disconnect();
        frames.load();
      }
    }), {
      rootMargin: '100% 0px'
    });
    io.observe(near);
  }
})();