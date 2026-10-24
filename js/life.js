(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  class Loop {
    constructor(video) {
      this.video = video;
      this.fallback = video.parentElement.querySelector('.life-fallback');
      this.state = 'idle';
      this.failed = false;
      video.addEventListener('error', (() => this.fail()), {
        once: true
      });
    }
    fail() {
      this.failed = true;
      this.video.classList.remove('is-on');
      if (this.state === 'on') this.fallback?.classList.add('is-on');
    }
    start() {
      if (this.state !== 'idle') return;
      this.state = 'on';
      if (this.failed) {
        this.fallback?.classList.add('is-on');
        return;
      }
      const v = this.video;
      if (!v.src) {
        const webm = v.dataset.webm && v.canPlayType('video/webm; codecs="vp9"');
        v.src = webm ? v.dataset.webm : v.dataset.src;
        v.load();
      }
      v.play().then((() => v.classList.add('is-on'))).catch((() => this.fail()));
    }
    resume() {
      if (this.state !== 'paused') return;
      this.state = 'idle';
      this.start();
    }
    pause() {
      if (this.state !== 'on') return;
      this.state = 'paused';
      this.video.pause();
    }
    stop() {
      if (this.state === 'off') return;
      this.state = 'off';
      this.video.classList.remove('is-on');
      this.fallback?.classList.remove('is-on');
      setTimeout((() => this.video.pause()), 650);
    }
  }
  const loop = name => {
    const v = document.querySelector(`video[data-life="${name}"]`);
    return v ? new Loop(v) : null;
  };
  const watch = (el, {onEnter: onEnter, onLeave: onLeave, margin: margin = '0px'}) => {
    let seen = false;
    new IntersectionObserver((entries => {
      entries.forEach((e => {
        if (e.isIntersecting) {
          seen = true;
          onEnter?.();
        } else if (seen) onLeave?.();
      }));
    }), {
      rootMargin: margin,
      threshold: .15
    }).observe(el);
  };
  const windows = loop('windows');
  if (windows) {
    const hall = document.getElementById('s1');
    const stopOnScroll = () => {
      if (scrollY > 8) {
        windows.stop();
        removeEventListener('scroll', stopOnScroll);
      }
    };
    watch(hall, {
      onEnter: () => windows.start(),
      onLeave: () => windows.stop()
    });
    addEventListener('scroll', stopOnScroll, {
      passive: true
    });
    stopOnScroll();
  }
  const steam = loop('steam');
  if (steam) {
    const pot = document.querySelector('.pot');
    watch(pot, {
      onEnter: () => steam.start(),
      onLeave: () => steam.stop()
    });
    watch(document.getElementById('s3'), {
      onEnter: () => steam.stop(),
      margin: '0px 0px -30% 0px'
    });
  }
  const lamp = loop('lamp');
  if (lamp) {
    watch(document.querySelector('.stay__frame'), {
      onEnter: () => lamp.state === 'paused' ? lamp.resume() : lamp.start(),
      onLeave: () => lamp.pause()
    });
  }
  const ring = document.querySelector('[data-life="ring"]');
  if (ring) {
    const tp = ring.querySelector('textPath');
    const path = document.getElementById('oval-path');
    const L = path.getTotalLength() / 2;
    const unit = 'дом помнит, как мы живём · ';
    tp.textContent = unit.repeat(2 * Math.max(1, Math.round(L / (unit.length * 7.4))));
    ring.setAttribute('textLength', (2 * L).toFixed(1));
    ring.setAttribute('lengthAdjust', 'spacing');
    let state = 'idle';
    let offset = 0;
    let boost = 0;
    let lastY = scrollY;
    let lastT = 0;
    let raf = 0;
    const BASE = 14;
    const frame = t => {
      const dt = lastT ? Math.min(.05, (t - lastT) / 1e3) : 0;
      lastT = t;
      boost *= .92;
      offset = (offset - (BASE + boost) * dt) % L;
      tp.setAttribute('startOffset', offset.toFixed(2));
      raf = requestAnimationFrame(frame);
    };
    const onScroll = () => {
      const dy = Math.abs(scrollY - lastY);
      lastY = scrollY;
      if (state === 'on') boost = Math.min(240, boost + dy * .6);
    };
    addEventListener('scroll', onScroll, {
      passive: true
    });
    watch(document.querySelector('.oval'), {
      onEnter: () => {
        if (state !== 'idle') return;
        state = 'on';
        lastT = 0;
        raf = requestAnimationFrame(frame);
      },
      onLeave: () => {
        if (state !== 'on') return;
        state = 'off';
        cancelAnimationFrame(raf);
        removeEventListener('scroll', onScroll);
      }
    });
  }
})();