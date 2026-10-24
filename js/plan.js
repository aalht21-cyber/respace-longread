(() => {
  'use strict';
  const W = 590;
  const H = 424;
  const STUDIO = 25;
  const rect = (x, y, w, h, cls, label, lx, ly) => ({
    type: 'rect',
    x: x,
    y: y,
    w: w,
    h: h,
    cls: cls,
    label: label,
    lx: lx,
    ly: ly
  });
  const circle = (cx, cy, r, cls, label) => ({
    type: 'circle',
    cx: cx,
    cy: cy,
    r: r,
    cls: cls,
    label: label
  });
  const chair = ([x, y]) => rect(x, y, 45, 45, 'f f--move');
  const STATIC = [ rect(0, 0, 60, 180, 'f', 'шкаф'), rect(330, 0, 260, 60, 'f kitchen', 'кухня', 368, 30), rect(0, 262, 200, 12, 'f'), rect(0, 284, 200, 140, 'f', 'кровать'), rect(270, 344, 80, 80, 'f', 'кресло'), circle(245, 365, 15, 'f') ];
  const STATIC_AREA = 1.08 + 1.56 + 2.8 + .64;
  const CHAIR_AREA = .45 * .45;
  const TABLE = {
    desk: rect(130, 0, 90, 80, 'f f--move', 'стол'),
    console: rect(550, 160, 40, 90, 'f f--move'),
    dining: rect(250, 150, 160, 90, 'f f--move', 'стол'),
    craft: rect(110, 0, 160, 90, 'f f--move', 'стол')
  };
  const LAYOUTS = {
    good: {
      table: 'desk',
      chairs: [ [ 130, 90 ], [ 178, 90 ] ],
      curtain: false
    },
    work: {
      table: 'desk',
      chairs: [ [ 152, 90 ] ],
      curtain: true
    },
    rest: {
      table: 'console',
      chairs: [ [ 495, 182 ] ],
      rug: [ 250, 170, 180, 60 ],
      curtain: false
    },
    guests: {
      table: 'dining',
      chairs: [ [ 200, 172 ], [ 415, 172 ], [ 265, 100 ], [ 350, 100 ], [ 265, 245 ], [ 350, 245 ] ],
      curtain: true
    },
    craft: {
      table: 'craft',
      chairs: [ [ 167, 100 ] ],
      zone: [ 290, 140, 200, 150, 'свободный пол 2,0 × 1,5 м' ],
      curtain: false
    },
    empty: {
      table: 'console',
      chairs: [],
      zone: [ 230, 100, 300, 220, 'свободно 3,0 × 2,2 м' ],
      curtain: false
    }
  };
  const BEFORE = [ rect(0, 0, 60, 180, 'f', 'шкаф'), rect(330, 0, 260, 60, 'f kitchen', 'кухня', 368, 30), rect(90, 40, 140, 200, 'f', 'кровать'), rect(230, 364, 120, 60, 'f', 'стол'), rect(268, 314, 45, 45, 'f'), rect(330, 250, 230, 90, 'f', 'диван'), circle(440, 170, 40, 'f clutter') ];
  const LABELS = {
    good: 'Чертёж студии 590 на 424 сантиметра: шкаф, стол-трансформер под левым окном, кухня вдоль верхней стены, стеллаж и кровать слева, кресло с торшером, дверь в правой стене.',
    morph: 'Чертёж расстановки месяц назад и сейчас: кровать переезжает от шкафа к левой стене, диван, письменный и круглый стол уходят, появляются стеллаж, кресло с торшером и стол-трансформер у окна.',
    before: 'Чертёж расстановки месяц назад: кровать в 30 сантиметрах от шкафа, стол у глухой стены в 3,5 метра от окна, диван в 30 сантиметрах от правой стены, круглый стол завален вещами.',
    work: 'Чертёж вечера «работаю»: стол у левого окна, один стул, штора закрыта.',
    rest: 'Чертёж вечера «отдыхаю»: стол сложен в консоль у правой стены, на полу коврик.',
    guests: 'Чертёж вечера «жду гостей»: стол разложен посреди комнаты, шесть стульев, штора закрыта.',
    craft: 'Чертёж вечера «делаю что-то руками»: большой стол у окна, свободный пол 2,0 на 1,5 метра.',
    empty: 'Чертёж вечера «ничего не делаю»: стол сложен в консоль, стулья на стене, свободно 3,0 на 2,2 метра.'
  };
  const fmt = n => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  function area(name) {
    const l = LAYOUTS[name];
    if (!l) return null;
    const t = TABLE[l.table];
    const occupied = STATIC_AREA + t.w * t.h / 1e4 + l.chairs.length * CHAIR_AREA;
    return {
      occupied: fmt(occupied),
      free: fmt(STUDIO - occupied)
    };
  }
  const shape = s => {
    let out = s.type === 'rect' ? `<rect class="${s.cls}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>` : `<circle class="${s.cls}" cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`;
    if (s.label) {
      const cx = s.lx ?? (s.type === 'rect' ? s.x + s.w / 2 : s.cx);
      const cy = s.ly ?? (s.type === 'rect' ? s.y + s.h / 2 : s.cy);
      out += `<text class="lbl" x="${cx}" y="${cy}">${s.label}</text>`;
    }
    return out;
  };
  const dim = (x1, y1, x2, y2, text, side = -1) => {
    const v = x1 === x2;
    const t = 6;
    const ticks = v ? `M${x1 - t} ${y1}h${t * 2}M${x2 - t} ${y2}h${t * 2}` : `M${x1} ${y1 - t}v${t * 2}M${x2} ${y2 - t}v${t * 2}`;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label = v ? `<text class="dim-t" x="${mx + side * 10}" y="${my}" transform="rotate(-90 ${mx + side * 10} ${my})">${text}</text>` : `<text class="dim-t" x="${mx}" y="${my + side * 10}">${text}</text>`;
    return `<g class="dim"><path d="M${x1} ${y1}L${x2} ${y2}${ticks}"/>${label}</g>`;
  };
  const shell = () => [ `<rect class="floor" x="0" y="0" width="${W}" height="${H}"/>`, `<rect class="wall" x="-5" y="-5" width="${W + 10}" height="${H + 10}"/>`, `<g class="win"><rect x="120" y="-10" width="140" height="10"/><path d="M120 -5h140"/></g>`, `<g class="win"><rect x="360" y="-10" width="140" height="10"/><path d="M360 -5h140"/></g>`, `<rect class="door-gap" x="${W}" y="340" width="10" height="80"/>`, `<path class="door-arc" d="M590 340A80 80 0 0 0 510 420"/>`, `<path class="door-leaf" d="M590 420H510"/>` ].join('');
  const kitchenDetails = () => '<rect class="fx" x="410" y="10" width="54" height="40"/>' + '<rect class="fx" x="500" y="8" width="62" height="44"/><circle class="fx" cx="517" cy="30" r="10"/><circle class="fx" cx="545" cy="30" r="10"/>';
  const curtain = closed => closed ? '<path class="curtain" d="M0 236H220V424"/>' : '<path class="track" d="M0 236H220V424"/><path class="curtain" d="M200 262V300"/>';
  const outerDims = () => dim(0, -22, W, -22, '590') + dim(-30, 0, -30, H, '424');
  const BED_FROM = [ 90, 40, 140, 200 ];
  const BED_TO = [ 0, 284, 200, 140 ];
  const CONFLICTS = [ () => dim(560, 300, 590, 300, '30', -1) + '<g class="mark"><circle cx="575" cy="365" r="14"/><text x="575" y="365">01</text></g>', () => dim(60, 120, 90, 120, '30', -1) + '<g class="mark"><circle cx="75" cy="215" r="14"/><text x="75" y="215">02</text></g>', () => dim(255, 0, 255, 364, '3,5 м', 1) + '<g class="mark"><circle cx="290" cy="395" r="14"/><text x="290" y="395">03</text></g>', () => '<g class="mark"><circle cx="500" cy="125" r="14"/><text x="500" y="125">04</text></g>' ];
  function renderMorph() {
    const good = LAYOUTS.good;
    const [x, y, w, h] = BED_FROM;
    return [ shell(), shape(STATIC[0]), shape(STATIC[1]), kitchenDetails(), '<g class="m-old">', BEFORE.slice(3).map(shape).join(''), '<path class="door-arc" d="M60 50A50 50 0 0 0 110 0M60 130A50 50 0 0 1 110 180"/>', '<path class="fx" d="M415 160h20v-12h-20zM440 178h22v16h-22zM425 190h12"/>', '</g>', '<g class="m-new" style="opacity:0">', [ STATIC[2], STATIC[4], STATIC[5] ].map(shape).join(''), '<path class="rail" d="M270 4H350"/>', shape(TABLE[good.table]), good.chairs.map(chair).map(shape).join(''), curtain(false), '</g>', `<rect class="f m-bed" x="${x}" y="${y}" width="${w}" height="${h}"/><text class="lbl m-bed-t" x="${x + w / 2}" y="${y + h / 2}">кровать</text>`, CONFLICTS.map(((c, i) => `<g class="m-c" data-i="${i}">${c()}</g>`)).join('') ].join('');
  }
  function setMorph(svg, c, t) {
    if (!svg) return;
    const lerp = (a, b) => a + (b - a) * t;
    const [x, y, w, h] = BED_FROM.map(((v, i) => lerp(v, BED_TO[i])));
    const bed = svg.querySelector('.m-bed');
    const label = svg.querySelector('.m-bed-t');
    if (bed) {
      bed.setAttribute('x', x);
      bed.setAttribute('y', y);
      bed.setAttribute('width', w);
      bed.setAttribute('height', h);
    }
    if (label) {
      label.setAttribute('x', x + w / 2);
      label.setAttribute('y', y + h / 2);
    }
    svg.querySelector('.m-old').style.opacity = (1 - t).toFixed(3);
    svg.querySelector('.m-new').style.opacity = t.toFixed(3);
    svg.querySelectorAll('.m-c').forEach((g => {
      g.style.opacity = (c[g.dataset.i] * (1 - t)).toFixed(3);
    }));
  }
  function render(name, opts = {}) {
    const parts = name === 'morph' ? [ renderMorph() ] : [ shell() ];
    if (name === 'morph') {} else if (name === 'before') {
      parts.push(BEFORE.map(shape).join(''), kitchenDetails());
      parts.push('<path class="door-arc" d="M60 50A50 50 0 0 0 110 0M60 130A50 50 0 0 1 110 180"/>');
      parts.push('<path class="fx" d="M415 160h20v-12h-20zM440 178h22v16h-22zM425 190h12"/>');
      if (opts.conflicts) {
        parts.push(dim(560, 300, 590, 300, '30', -1), dim(60, 120, 90, 120, '30', -1), dim(255, 0, 255, 364, '3,5 м', 1), `<g class="mark"><circle cx="575" cy="365" r="14"/><text x="575" y="365">01</text></g>`, `<g class="mark"><circle cx="75" cy="215" r="14"/><text x="75" y="215">02</text></g>`, `<g class="mark"><circle cx="290" cy="395" r="14"/><text x="290" y="395">03</text></g>`, `<g class="mark"><circle cx="500" cy="125" r="14"/><text x="500" y="125">04</text></g>`);
      }
    } else {
      const l = LAYOUTS[name];
      if (l.zone) {
        const [x, y, w, h, text] = l.zone;
        parts.push(`<rect class="zone" x="${x}" y="${y}" width="${w}" height="${h}"/><text class="zone-t" x="${x + w / 2}" y="${y + h / 2}">${text}</text>`);
      }
      if (opts.passage) {
        parts.push('<rect class="zone" x="330" y="60" width="260" height="90"/><text class="zone-t" x="430" y="105">проход 90 см</text>');
        parts.push(dim(570, 60, 570, 150, '90', -1));
      }
      if (l.rug) parts.push(`<rect class="rug" x="${l.rug[0]}" y="${l.rug[1]}" width="${l.rug[2]}" height="${l.rug[3]}"/>`);
      parts.push(STATIC.map(shape).join(''), kitchenDetails());
      parts.push('<path class="rail" d="M270 4H350"/>');
      parts.push(shape(TABLE[l.table]), l.chairs.map(chair).map(shape).join(''));
      parts.push(curtain(l.curtain));
      if (opts.distance) parts.push(dim(110, 80, 110, 284, '204 см', 1));
    }
    if (opts.dims) parts.push(outerDims());
    const cls = [ 'plan-svg', opts.kitchen ? 'is-kitchen' : '', opts.focus ? `focus-${opts.focus}` : '' ].filter(Boolean).join(' ');
    return `<svg class="${cls}" viewBox="-135 -40 860 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${LABELS[name] || ''}">${parts.join('')}</svg>`;
  }
  function mount(root = document) {
    root.querySelectorAll('[data-plan]').forEach((el => {
      const opts = {};
      (el.dataset.opts || '').split(/\s+/).filter(Boolean).forEach((o => {
        const [k, v] = o.split('=');
        opts[k] = v ?? true;
      }));
      el.innerHTML = render(el.dataset.plan, opts);
    }));
    root.querySelectorAll('[data-area]').forEach((el => {
      const a = area(el.dataset.area);
      if (!a) return;
      el.querySelector('[data-occupied]').textContent = a.occupied;
      el.querySelector('[data-free]').textContent = a.free;
    }));
  }
  window.RoomPlan = {
    render: render,
    area: area,
    mount: mount,
    setMorph: setMorph,
    LAYOUTS: LAYOUTS
  };
})();