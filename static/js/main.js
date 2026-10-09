// P³-VLM project page: room overlays, box-guessing quiz, charts.
(() => {
  "use strict";
  const SVG = "http://www.w3.org/2000/svg";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === "text" ? (n.textContent = v) : k === "html" ? (n.innerHTML = v) : n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const svgEl = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmt = v => v.toFixed(1);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------ tooltip
  const tip = $(".tooltip");
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.hidden = false; };
  const hideTip = () => { tip.hidden = true; };
  const bindTip = (node, html) => {
    node.addEventListener("pointermove", e => showTip(typeof html === "function" ? html() : html, e.clientX, e.clientY));
    node.addEventListener("pointerleave", hideTip);
  };

  const onVisible = (node, fn, threshold = 0.35) => {
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); fn(); } }), { threshold });
    io.observe(node);
  };

  // Static bar chart that grows in when scrolled into view. rows: { name, note?, tip, v, fill, best? }
  const barChart = (card, rows, unit, vmax = Math.max(...rows.map(r => r.v)) * 1.15) => {
    const bars = $(".bars", card), pct = v => v / vmax * 100 + "%";
    const items = rows.map((r, i) => {
      const slot = el("div", { class: "bar-slot" + (r.best ? " is-best" : "") }, bars);
      const bar = el("div", { class: "bar", style: `background:${r.fill};transition-delay:${i * 90}ms` }, slot);
      const val = el("span", { class: "val", style: `bottom:0;opacity:0;transition-delay:${i * 90}ms`, text: fmt(r.v) }, slot);
      el("span", { class: "bar-label", html: r.note ? `${r.name}<small>${r.note}</small>` : r.name }, slot);
      bindTip(slot, `<strong>${r.tip}</strong><br>${fmt(r.v)}${unit}`);
      return { bar, val, v: r.v };
    });
    onVisible(card, () => {
      card.classList.add("is-in");
      for (const it of items) { it.bar.style.height = pct(it.v); it.val.style.bottom = pct(it.v); it.val.style.opacity = 1; }
    });
    return pct;
  };

  const dot = (svg, x, y, r = 17) => {
    svgEl("circle", { class: "qdot-halo", cx: x, cy: y, r }, svg);
    return svgEl("circle", { class: "qdot", cx: x, cy: y, r }, svg);
  };

  // ------------------------------------------------------------ video: play on click
  {
    const player = $(".player"), video = $("video", player);
    const start = () => {
      if (player.classList.contains("is-playing")) return;
      player.classList.add("is-playing");
      video.controls = true;
      video.currentTime = 0;
      video.play();
    };
    $(".play", player).addEventListener("click", start);
    video.addEventListener("click", start);
  }

  // ------------------------------------------------------------ caption game: boxes only → reveal the room
  {
    const game = $(".scene-game"), svg = $(".scene-svg", game), input = $(".caption-input", game);
    const answer = $(".scene-answer", game), result = $(".quiz-result", answer), truth = $(".scene-caption", answer);
    const S = 60;  // px per metre (the viewBox is fitted afterwards, so this only sets stroke/detail scale)
    const iso = (x, y, z) => [(x - y) * 0.866 * S, ((x + y) * 0.5 - z) * S];
    const pts = arr => arr.map(p => iso(...p).map(v => v.toFixed(1)).join(",")).join(" ");
    const poly = (g, cls, arr) => svgEl("polygon", { class: cls, points: pts(arr) }, g);
    const seg = (g, cls, a, b) => { const [p, q] = [iso(...a), iso(...b)]; svgEl("line", { class: cls, x1: p[0], y1: p[1], x2: q[0], y2: q[1] }, g); };
    // Cuboid from its min corner and size; draws the three faces visible from the +x/+y side.
    const cuboid = (g, [x, y, z], [w, d, h]) => {
      const X = x + w, Y = y + d, Z = z + h;
      poly(g, "f-left", [[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]]);
      poly(g, "f-right", [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]]);
      poly(g, "f-top", [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]]);
    };
    // Flat ellipse (a circle on a horizontal plane)
    const disc = (g, cls, cx, cy, z, r) =>
      poly(g, cls, Array.from({ length: 16 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 8), cy + r * Math.sin(i * Math.PI / 8), z]));
    const boxOf = o => [o.at, o.size];

    // Floor with a 0.5 m grid and two back walls (y = Y0 and x = X0).
    const drawRoom = ([X0, Y0, X1, Y1], wall) => {
      poly(svg, "scene-floor", [[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]]);
      for (let x = X0 + 0.5; x < X1 - 1e-6; x += 0.5) seg(svg, "scene-grid", [x, Y0, 0], [x, Y1, 0]);
      for (let y = Y0 + 0.5; y < Y1 - 1e-6; y += 0.5) seg(svg, "scene-grid", [X0, y, 0], [X1, y, 0]);
      poly(svg, "scene-wall", [[X0, Y0, 0], [X1, Y0, 0], [X1, Y0, wall], [X0, Y0, wall]]);
      poly(svg, "scene-wall scene-wall-side", [[X0, Y0, 0], [X0, Y1, 0], [X0, Y1, wall], [X0, Y0, wall]]);
    };

    // ---------------- kitchen-dining room. Objects in metres; `depth` orders painting back to front.
    // An object without a box is an extra drawing layer of another object (e.g. a chair's backrest).
    const kitchen = () => {
      const room = [-2.5, -2.1, 2.5, 2.1], WALL = 2.5, [X0, Y0] = room;
      const CH = 0.45, CHAIR_H = 0.92, TUCK = -0.12;  // chairs pushed 12 cm under the table edge
      const TABLE = { at: [0.2, 0.1], size: [1.4, 0.9, 0.75] };
      const tc = [TABLE.at[0] + TABLE.size[0] / 2, TABLE.at[1] + TABLE.size[1] / 2];

      const drawTable = g => {
        const [x0, y0] = TABLE.at, [w, d, h] = TABLE.size, L = 0.07, top = 0.05, i = 0.05;
        for (const [lx, ly] of [[x0 + i, y0 + i], [x0 + w - i - L, y0 + i], [x0 + i, y0 + d - i - L], [x0 + w - i - L, y0 + d - i - L]])
          cuboid(g, [lx, ly, 0], [L, L, h - top]);
        cuboid(g, [x0, y0, h - top], [w, d, top]);
      };
      // Chair facing the table; (dx, dy) points from the table to the chair. Drawn as seat + backrest layers.
      const chair = ({ cx, cy, dx, dy }) => {
        const x0 = cx - CH / 2, y0 = cy - CH / 2, L = 0.045, T = 0.05, seat = 0.43;
        const drawSeat = g => {
          for (const [lx, ly] of [[x0, y0], [x0 + CH - L, y0], [x0, y0 + CH - L], [x0 + CH - L, y0 + CH - L]])
            cuboid(g, [lx, ly, 0], [L, L, seat]);
          cuboid(g, [x0, y0, seat], [CH, CH, T]);
        };
        const bx = dx > 0 ? x0 + CH - T : x0, by = dy > 0 ? y0 + CH - T : y0;  // backrest on the side away from the table
        const drawBack = g => cuboid(g, [bx, by, seat + T], [dx ? T : CH, dy ? T : CH, CHAIR_H - seat - T]);
        const box = [[x0, y0, 0], [CH, CH, CHAIR_H]], t = tc[0] + tc[1];
        // Far chairs sit behind the table: back, then seat, all before the table.
        // Near chairs: the seat slides under the tabletop (drawn before it), the backrest stands in front (after it).
        return dx + dy > 0
          ? [{ depth: t - 0.1, box, draw: drawSeat }, { depth: t + 0.1 + cx + cy, draw: drawBack }]
          : [{ depth: t - 1 + cx + cy, box, draw: g => { drawBack(g); drawSeat(g); } }];
      };

      // Base cabinets in an L along both walls, each run topped by its own countertop; stovetop and sink on the
      // side run, a fridge at the end of the back run.
      const BASE_H = 0.86, TOP_T = 0.04, COUNTER = BASE_H + TOP_T;
      const CAB_B = { at: [X0, Y0, 0], size: [0.58, 2.4, BASE_H] };           // side wall (x = X0)
      const CAB_A = { at: [X0 + 0.6, Y0, 0], size: [1.6, 0.58, BASE_H] };     // back wall (y = Y0)
      const TOP_B = { at: [X0, Y0, BASE_H], size: [0.62, 2.42, TOP_T] };
      const TOP_A = { at: [X0 + 0.58, Y0, BASE_H], size: [1.64, 0.62, TOP_T] };
      const STOVE = { at: [X0 + 0.07, Y0 + 0.9, COUNTER], size: [0.48, 0.6, 0.02] };
      const SINK = { at: [X0 + 0.05, Y0 + 1.7, COUNTER - 0.18], size: [0.52, 0.5, 0.2] };  // the basin, sunk into the top
      const FRIDGE = { at: [X0 + 2.26, Y0, 0], size: [0.7, 0.68, 1.9] };
      // Wall cabinets: one continuous run along each wall, meeting in the corner.
      const UP_Z = 1.45, UP_H = 0.7, UP_D = 0.35;
      const UP_B = { at: [X0, Y0, UP_Z], size: [UP_D, CAB_B.size[1], UP_H] };
      const UP_A = { at: [X0 + UP_D, Y0, UP_Z], size: [CAB_A.at[0] + CAB_A.size[0] - X0 - UP_D, UP_D, UP_H] };

      const drawCabB = g => {
        const [x0, y0] = CAB_B.at, [w, d, h] = CAB_B.size, X = x0 + w;
        cuboid(g, CAB_B.at, CAB_B.size);
        for (let y = y0 + 0.6; y < y0 + d - 0.01; y += 0.6) seg(g, "door", [X, y, 0.06], [X, y, h - 0.04]);
      };
      const drawCabA = g => {
        const [x0, y0] = CAB_A.at, [w, d, h] = CAB_A.size, Y = y0 + d;
        cuboid(g, CAB_A.at, CAB_A.size);
        for (let x = x0 + 0.4; x < x0 + w - 0.01; x += 0.4) seg(g, "door", [x, Y, 0.06], [x, Y, h - 0.04]);
      };
      const drawStove = g => {
        const [x0, y0, z] = STOVE.at, [w, d, h] = STOVE.size, Z = z + h;
        poly(g, "stove", [[x0, y0, Z], [x0 + w, y0, Z], [x0 + w, y0 + d, Z], [x0, y0 + d, Z]]);
        for (const [bx, by] of [[0.12, 0.15], [0.36, 0.15], [0.12, 0.45], [0.36, 0.45]]) disc(g, "burner", x0 + bx, y0 + by, Z, 0.08);
      };
      const drawSink = g => {
        const [x0, y0] = SINK.at, [w, d] = SINK.size, z = COUNTER, cy = y0 + d / 2;
        poly(g, "sink", [[x0 + 0.12, y0 + 0.05, z], [x0 + w - 0.02, y0 + 0.05, z], [x0 + w - 0.02, y0 + d - 0.05, z], [x0 + 0.12, y0 + d - 0.05, z]]);
        cuboid(g, [x0 + 0.02, cy - 0.025, z], [0.05, 0.05, 0.26]);         // tap against the wall
        cuboid(g, [x0 + 0.02, cy - 0.025, z + 0.21], [0.16, 0.05, 0.04]);  // spout
      };
      // door lines on the visible front face: +x face for side-wall units, +y face for back-wall ones
      const drawUpper = (o, alongY) => g => {
        const [x0, y0, z0] = o.at, [w, d, h] = o.size;
        cuboid(g, o.at, o.size);
        if (alongY) for (let y = y0 + 0.4; y < y0 + d - 0.05; y += 0.4) seg(g, "door", [x0 + w, y, z0 + 0.04], [x0 + w, y, z0 + h - 0.04]);
        else for (let x = x0 + 0.4; x < x0 + w - 0.05; x += 0.4) seg(g, "door", [x, y0 + d, z0 + 0.04], [x, y0 + d, z0 + h - 0.04]);
      };
      const drawFridge = g => {
        const [x0, y0] = FRIDGE.at, [w, d, h] = FRIDGE.size, Y = y0 + d;
        cuboid(g, FRIDGE.at, FRIDGE.size);
        seg(g, "door", [x0 + 0.03, Y, 0.72], [x0 + w - 0.03, Y, 0.72]);  // freezer drawer below, fridge door above
        seg(g, "handle", [x0 + 0.1, Y, 0.9], [x0 + 0.1, Y, 1.4]);
        seg(g, "handle", [x0 + 0.12, Y, 0.55], [x0 + w - 0.12, Y, 0.55]);
      };
      const objects = [
        { depth: -9.9, box: boxOf(CAB_B), draw: drawCabB },
        { depth: -9.8, box: boxOf(CAB_A), draw: drawCabA },
        { depth: -9.7, box: boxOf(TOP_B), draw: g => cuboid(g, ...boxOf(TOP_B)) },
        { depth: -9.6, box: boxOf(TOP_A), draw: g => cuboid(g, ...boxOf(TOP_A)) },
        { depth: -9.5, box: boxOf(STOVE), draw: drawStove },
        { depth: -9.4, box: boxOf(SINK), draw: drawSink },
        { depth: -9.35, box: boxOf(UP_B), draw: drawUpper(UP_B, true) },
        { depth: -9.34, box: boxOf(UP_A), draw: drawUpper(UP_A, false) },
        { depth: -9.3, box: boxOf(FRIDGE), draw: drawFridge },
        { depth: tc[0] + tc[1], box: [[...TABLE.at, 0], TABLE.size], draw: drawTable },
        ...[[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap(([dx, dy]) => chair({
          dx, dy, cx: tc[0] + dx * (TABLE.size[0] / 2 + TUCK + CH / 2), cy: tc[1] + dy * (TABLE.size[1] / 2 + TUCK + CH / 2),
        })),
      ];
      return {
        room, wall: WALL, objects,
        label: "An isometric room with fifteen boxes: waist-high boxes along both walls, each topped by a thin slab with two flat boxes on one of them, shallow boxes running along the walls above, a tall box at the end, and a wide low box with four tall narrow boxes tucked into it",
        caption: "A kitchen with an L-shaped counter holding a stovetop and a sink, wall cabinets above it, a fridge, and a dining table with four chairs.",
        kinds: [/table|desk/, /chair|seat|stool/, /kitchen|counter|cabinet|sink|stove|cooktop|hob/, /fridge|refrigerator|freezer/],
        hint: "Waist-high boxes along the walls, each topped by a thin slab: cabinets with a countertop. Two flat boxes on it: a stove and a sink. Shallow boxes running along the walls above: wall cabinets. A tall box at the end: a fridge. A wide, low box with four tall, narrow ones tucked in: a table with chairs.",
      };
    };

    // ---------------- bedroom
    const bedroom = () => {
      const room = [-2, -1.8, 3, 1.8], WALL = 2.5, [X0, Y0] = room;
      // Double bed with its headboard against the back wall, a nightstand on each side.
      const BED = { at: [-0.8, Y0, 0], size: [1.6, 2.05, 0.65] };  // low headboard keeps the far nightstand visible
      const NS = [0.45, 0.4, 0.5], NS_GAP = 0.2;
      const stands = [BED.at[0] - NS_GAP - NS[0], BED.at[0] + BED.size[0] + NS_GAP].map(x => ({ at: [x, Y0, 0], size: NS }));
      // Window on the side wall, curtains pulled to either side, AC mounted above it.
      const WIN = { at: [X0, -0.45, 0.9], size: [0.06, 1.1, 1.05] };
      const CURTAIN = [0.14, 0.34, 1.85], CURTAIN_Z = 0.2;
      const curtains = [WIN.at[1] - CURTAIN[1] - 0.04, WIN.at[1] + WIN.size[1] + 0.04].map(y => ({ at: [X0, y, CURTAIN_Z], size: CURTAIN }));
      const AC = { at: [X0, -0.35, 2.1], size: [0.24, 0.9, 0.3] };
      // A bedside lamp centred on each nightstand, and a wardrobe on the back wall to the right of the bed.
      const LAMP = [0.22, 0.22, 0.42];
      const lamps = stands.map(({ at: [x, y], size: [w, d, h] }) => ({ at: [x + (w - LAMP[0]) / 2, y + (d - LAMP[1]) / 2, h], size: LAMP }));
      const WARDROBE = { at: [stands[1].at[0] + NS[0] + 0.3, Y0, 0], size: [1.1, 0.6, 2.05] };

      const drawBed = g => {
        const [x0, y0] = BED.at, [w, d] = BED.size, HB = 0.08;
        cuboid(g, [x0, y0, 0], [w, HB, BED.size[2]]);                       // headboard
        cuboid(g, [x0, y0 + HB, 0], [w, d - HB, 0.3]);                      // frame
        cuboid(g, [x0 + 0.03, y0 + HB, 0.3], [w - 0.06, d - HB - 0.03, 0.2]);  // mattress
        for (const px of [x0 + 0.12, x0 + w / 2 + 0.06]) cuboid(g, [px, y0 + HB + 0.06, 0.5], [w / 2 - 0.18, 0.36, 0.1]);  // pillows
        cuboid(g, [x0 + 0.01, y0 + 0.7, 0.3], [w - 0.02, d - 0.7, 0.24]);    // duvet
        seg(g, "door", [x0 + 0.01, y0 + 0.95, 0.54], [x0 + w - 0.01, y0 + 0.95, 0.54]);  // duvet fold
      };
      const drawStand = ({ at: [x0, y0], size: [w, d, h] }) => g => {
        cuboid(g, [x0, y0, 0], [w, d, h]);
        for (const z of [h * 0.5, h * 0.8]) seg(g, "door", [x0 + 0.03, y0 + d, z], [x0 + w - 0.03, y0 + d, z]);  // drawers
      };
      const drawLamp = ({ at: [x0, y0, z0], size: [w, d, h] }) => g => {
        const cx = x0 + w / 2, cy = y0 + d / 2;
        cuboid(g, [cx - 0.06, cy - 0.06, z0], [0.12, 0.12, 0.03]);           // base
        cuboid(g, [cx - 0.012, cy - 0.012, z0 + 0.03], [0.024, 0.024, 0.2]);  // stem
        cuboid(g, [x0, y0, z0 + 0.23], [w, d, h - 0.23]);                      // shade
      };
      const drawWardrobe = g => {
        const [x0, y0] = WARDROBE.at, [w, d, h] = WARDROBE.size, Y = y0 + d, mid = x0 + w / 2;
        cuboid(g, WARDROBE.at, WARDROBE.size);
        seg(g, "door", [mid, Y, 0.04], [mid, Y, h - 0.04]);                   // two doors
        for (const hx of [mid - 0.06, mid + 0.06]) seg(g, "handle", [hx, Y, 1.0], [hx, Y, 1.25]);
      };
      const drawWindow = g => {
        const [x0, y0, z0] = WIN.at, [w, d, h] = WIN.size, X = x0 + w, f = 0.06;
        cuboid(g, WIN.at, WIN.size);
        poly(g, "glass", [[X, y0 + f, z0 + f], [X, y0 + d - f, z0 + f], [X, y0 + d - f, z0 + h - f], [X, y0 + f, z0 + h - f]]);
        seg(g, "door", [X, y0 + d / 2, z0 + f], [X, y0 + d / 2, z0 + h - f]);  // mullion
        seg(g, "door", [X, y0 + f, z0 + h * 0.62], [X, y0 + d - f, z0 + h * 0.62]);
      };
      const drawCurtain = ({ at: [x0, y0, z0], size: [w, d, h] }, rod) => g => {
        if (rod) seg(g, "rod", [x0 + 0.1, curtains[0].at[1] - 0.05, z0 + h + 0.03], [x0 + 0.1, curtains[1].at[1] + d + 0.05, z0 + h + 0.03]);
        cuboid(g, [x0, y0, z0], [w, d, h]);
        for (let i = 1; i < 4; i++) seg(g, "fold", [x0 + w, y0 + (d * i) / 4, z0 + 0.04], [x0 + w, y0 + (d * i) / 4, z0 + h - 0.04]);
      };
      const drawAC = g => {
        const [x0, y0, z0] = AC.at, [w, d, h] = AC.size, X = x0 + w;
        cuboid(g, AC.at, AC.size);
        seg(g, "door", [X, y0 + 0.06, z0 + 0.09], [X, y0 + d - 0.06, z0 + 0.09]);  // air vent
        seg(g, "door", [X, y0 + 0.06, z0 + 0.05], [X, y0 + d - 0.06, z0 + 0.05]);
      };
      const objects = [
        { depth: -9, box: boxOf(curtains[0]), draw: drawCurtain(curtains[0], true) },
        { depth: -8.9, box: boxOf(WIN), draw: drawWindow },
        { depth: -8.8, box: boxOf(curtains[1]), draw: drawCurtain(curtains[1], false) },
        { depth: -8.7, box: boxOf(AC), draw: drawAC },
        { depth: -5, box: boxOf(stands[0]), draw: drawStand(stands[0]) },
        { depth: -4.9, box: boxOf(lamps[0]), draw: drawLamp(lamps[0]) },
        { depth: -4, box: boxOf(BED), draw: drawBed },
        { depth: -3, box: boxOf(stands[1]), draw: drawStand(stands[1]) },
        { depth: -2.9, box: boxOf(lamps[1]), draw: drawLamp(lamps[1]) },
        { depth: -2, box: boxOf(WARDROBE), draw: drawWardrobe },
      ];
      return {
        room, wall: WALL, objects,
        label: "An isometric room with ten boxes: a wide, long, low box against the back wall with a small box on each side, each topped by a smaller box, a tall wide box further along the wall, and on the side wall a thin box between two tall slim boxes with a wide shallow box above",
        caption: "A bedroom with a double bed between two nightstands with bedside lamps, a wardrobe beside it, and a window with the curtains pulled to the sides and an air conditioner above it.",
        kinds: [/\bbed\b/, /nightstand|night stand|bedside|side table/, /lamp|light/, /wardrobe|closet|cabinet|cupboard|armoire/, /window|curtain|drape/, /air.?con|conditioner|\bac\b|a\/c/],
        hint: "A wide, long, low box against the wall: a bed. A small box on each side, each with a smaller box on top: nightstands with lamps. A tall, wide box against the wall: a wardrobe. A thin box on the wall between two tall, slim ones: a window with curtains. A wide, shallow box high up: an AC.",
      };
    };

    const SCENES = { kitchen: kitchen(), bedroom: bedroom() };
    let scene;

    const setRevealed = on => {
      game.classList.toggle("revealed", on);
      answer.hidden = !on;
      input.readOnly = on;
      $("[data-act=reveal]", game).hidden = on;
      $("[data-act=reset]", game).hidden = !on;
    };
    const show = name => {
      scene = SCENES[name];
      input.value = "";
      setRevealed(false);  // before redrawing, so the new furniture starts hidden instead of fading out
      svg.replaceChildren();
      drawRoom(scene.room, scene.wall);
      for (const o of [...scene.objects].sort((a, b) => a.depth - b.depth)) {
        o.draw(svgEl("g", { class: "iso-obj" }, svg));
        if (!o.box) continue;
        const g = svgEl("g", { class: "iso-box" }, svg), [[x, y, z], [w, d, h]] = o.box;
        // the three hidden edges meeting at the back-bottom corner, so overlapping boxes still read as separate volumes
        for (const end of [[x + w, y, z], [x, y + d, z], [x, y, z + h]]) seg(g, "hidden", [x, y, z], end);
        cuboid(g, ...o.box);
      }
      const bb = svg.getBBox(), pad = 6;
      svg.setAttribute("viewBox", `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`);
      svg.setAttribute("aria-label", scene.label);
      truth.textContent = `“${scene.caption}”`;
      $$(".scene-switch button", game).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.scene === name)));
    };
    $$(".scene-switch button", game).forEach(b => b.addEventListener("click", () => show(b.dataset.scene)));
    show("bedroom");

    $("[data-act=reveal]", game).addEventListener("click", () => {
      const text = input.value.toLowerCase(), n = scene.kinds.length;
      const named = scene.kinds.filter(re => re.test(text)).length;
      result.innerHTML = named >= n - 1
        ? `You named ${named} of the ${n} kinds of objects from boxes alone. A box-only model does the same: it scores within <strong>0.9 points</strong> of LEO.`
        : `${scene.hint} That <strong>geometric prior</strong> is all a box-only model needs.`;
      setRevealed(true);
    });
    $("[data-act=reset]", game).addEventListener("click", () => { input.value = ""; setRevealed(false); });
  }

  // ------------------------------------------------------------ architectural leakage (paper Tab. 1)
  barChart($(".arch-chart"), [
    { name: "Blind LLM", note: "box coords only", tip: "Blind LLM, box coords only", v: 36.4, fill: "var(--greige)" },
    { name: "Box encoder", note: "+ LLM", tip: "Box encoder + LLM", v: 44.2, fill: "var(--mauve)" },
    { name: "Full OD-VLM", note: "LEO", tip: "Full OD-VLM (LEO)", v: 45.1, fill: "var(--greige)" },
  ], "% class accuracy", 52);

  // ------------------------------------------------------------ reveal room (TL;DR)
  // Query points from the video (4K canvas px), mapped to the cropped 1600×1425 image.
  {
    const fig = $(".room-reveal"), svg = $(".overlay", fig);
    const W = 1600, H = 1425;
    const POINTS = [
      { name: "door",     x: 532,  y: 628, lx: 17, ly: 26 },
      { name: "socket",   x: 789,  y: 560, lx: 45, ly: 22 },
      { name: "window",   x: 1156, y: 510, lx: 66, ly: 5 },
      { name: "painting", x: 1290, y: 565, lx: 92, ly: 14 },
    ];
    for (const p of POINTS) {
      svgEl("line", { class: "leader", x1: p.lx / 100 * W, y1: p.ly / 100 * H, x2: p.x, y2: p.y }, svg);
    }
    for (const p of POINTS) dot(svg, p.x, p.y);
    for (const p of POINTS) el("span", { class: "room-label", style: `left:${p.lx}%;top:${p.ly}%`, text: p.name }, fig);
  }

  // ------------------------------------------------------------ quiz
  {
    const quiz = $(".quiz");
    const fig = $(".room-quiz", quiz), svg = $(".overlay", fig), tags = $(".tags", fig);
    const list = $(".guesses", quiz), result = $(".quiz-result", quiz);
    const W = 1600, H = 1429;
    const OPTIONS = ["door", "socket", "window", "painting"];
    const BOXES = [
      { answer: "door",     poly: [[338, 235], [612, 150], [603, 700], [345, 790]] },
      { answer: "socket",   poly: [[682, 564], [704, 558], [705, 592], [683, 598]], tag: [0, -70] },
      { answer: "window",   poly: [[797, 58], [1165, 238], [1125, 690], [785, 500]] },
      { answer: "painting", poly: [[1222, 350], [1450, 468], [1418, 758], [1195, 625]] },
    ];
    const guesses = new Array(BOXES.length).fill(null);

    const setHot = (i, on) => {
      BOXES[i].shape.classList.toggle("is-hot", on);
      BOXES[i].row.classList.toggle("is-hot", on);
    };

    BOXES.forEach((b, i) => {
      const cx = b.poly.reduce((s, p) => s + p[0], 0) / 4, cy = b.poly.reduce((s, p) => s + p[1], 0) / 4;
      b.shape = svgEl("polygon", { class: "box-shape", points: b.poly.map(p => p.join(",")).join(" ") }, svg);
      const [dx, dy] = b.tag || [0, 0];
      el("span", { class: "tag", style: `left:${(cx + dx) / W * 100}%;top:${(cy + dy) / H * 100}%`, text: i + 1 }, tags);

      b.row = el("li", { class: "guess" }, list);
      el("span", { class: "num", text: i + 1, "aria-hidden": "true" }, b.row);
      const chips = el("div", { class: "chips", role: "group", "aria-label": `Object ${i + 1}` }, b.row);
      b.chips = OPTIONS.map(o => {
        const c = el("button", { type: "button", class: "chip", "aria-pressed": "false", text: o }, chips);
        c.addEventListener("click", () => {
          guesses[i] = o;
          b.chips.forEach(x => x.setAttribute("aria-pressed", String(x === c)));
          if (guesses.every(Boolean)) reveal();
        });
        return c;
      });

      for (const n of [b.shape, b.row]) {
        n.addEventListener("pointerenter", () => setHot(i, true));
        n.addEventListener("pointerleave", () => setHot(i, false));
      }
      b.shape.addEventListener("click", () => b.chips[0].focus());
    });

    const reveal = () => {
      quiz.classList.add("revealed");
      let right = 0;
      BOXES.forEach((b, i) => {
        b.chips.forEach(c => {
          c.classList.toggle("is-answer", c.textContent === b.answer);
          c.classList.toggle("is-wrong", c.textContent === guesses[i] && guesses[i] !== b.answer);
        });
        if (guesses[i] === b.answer) right++;
      });
      const answered = guesses.filter(Boolean).length;
      const lead = answered ? `You got <strong>${right} of ${BOXES.length}</strong>` : "Tall and narrow by the floor: a door. Flat and high on the wall: a painting.";
      result.innerHTML = answered
        ? `${lead}, without seeing a single object. The <strong>shape of the box</strong> did the work. That is <strong>semantic leakage</strong>, and models learn the same shortcut.`
        : `${lead} The <strong>shape of the box</strong> gives it away. That is semantic leakage.`;
      $("[data-act=reveal]", quiz).hidden = true;
      $("[data-act=reset]", quiz).hidden = false;
    };
    const reset = () => {
      guesses.fill(null);
      quiz.classList.remove("revealed");
      BOXES.forEach(b => b.chips.forEach(c => { c.setAttribute("aria-pressed", "false"); c.classList.remove("is-answer", "is-wrong"); }));
      $("[data-act=reveal]", quiz).hidden = false;
      $("[data-act=reset]", quiz).hidden = true;
      result.textContent = "";
    };
    $("[data-act=reveal]", quiz).addEventListener("click", reveal);
    $("[data-act=reset]", quiz).addEventListener("click", reset);
  }

  // ------------------------------------------------------------ box → point drop chart
  {
    const card = $(".drop"), bars = $(".bars", card);
    const VMAX = 55;
    const MODELS = [
      { name: "Blind LLM", note: "no vision", box: 36.4, point: 18.0 },
      { name: "LL3DA", box: 47.7, point: 33.1 },
      { name: "GaussianVLM", box: 46.2, point: 29.3 },
    ];
    let shown = false, touched = false;
    const pct = v => v / VMAX * 100 + "%";

    for (const m of MODELS) {
      const slot = el("div", { class: "bar-slot" }, bars);
      m.ghost = el("div", { class: "ghost", style: `height:${pct(m.box)}` }, slot);
      m.ghostVal = el("span", { class: "val ghost-val", style: `bottom:${pct(m.box)}`, html: `${fmt(m.box)}<span class="delta">−${fmt(m.box - m.point)}</span>` }, slot);
      m.bar = el("div", { class: "bar" }, slot);
      m.val = el("span", { class: "val", style: "bottom:0;opacity:0", text: fmt(m.box) }, slot);
      el("span", { class: "bar-label", html: m.name + (m.note ? `<small>${m.note}</small>` : "") }, slot);
      bindTip(slot, () => `<strong>${m.name}</strong><br>box prompt: ${fmt(m.box)}%<br>point prompt: ${fmt(m.point)}%`);
    }

    const render = () => {
      const mode = card.dataset.mode;
      for (const m of MODELS) {
        const v = shown ? m[mode] : 0;
        m.bar.style.height = pct(v);
        m.val.style.bottom = pct(v);
        m.val.style.opacity = shown ? 1 : 0;
        m.val.textContent = fmt(m[mode]);
      }
      $$(".mode-switch button", card).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === mode)));
    };
    $$(".mode-switch button", card).forEach(btn => btn.addEventListener("click", () => {
      touched = true; shown = true; card.dataset.mode = btn.dataset.mode; render();
    }));
    render();
    onVisible(card, () => {
      shown = true; render();
      setTimeout(() => { if (!touched) { card.dataset.mode = "point"; render(); } }, reduced ? 1500 : 2200);
    });
  }

  // ------------------------------------------------------------ results panels
  {
    const MODELS = [
      { name: "LL3DA", tip: "LL3DA", fill: "var(--greige)" },
      { name: "GSVLM", tip: "GaussianVLM", fill: "var(--greige)" },
      { name: "P³-VLM", note: "box", tip: "P³-VLM, box prompt", fill: "var(--mauve)" },
      { name: "P³-VLM", note: "point", tip: "P³-VLM, point prompt", fill: "var(--mustard)", best: true },
    ];
    const PANELS = {
      performance:    { values: [47.7, 46.2, 52.4, 52.1], unit: "% class accuracy" },
      robustness:     { values: [28.6, 25.3, 36.4, 46.6], unit: "% class accuracy" },
      generalization: { values: [1.5, 9.3, 15.4, 17.3],   unit: "% exact match" },
    };
    for (const card of $$(".panel")) {
      const { values, unit } = PANELS[card.dataset.panel];
      const pct = barChart(card, MODELS.map((m, i) => ({ ...m, v: values[i] })), unit);
      // dotted line at the best baseline, plus the gain of P³-VLM (point) in words
      const bars = $(".bars", card), best = Math.max(values[0], values[1]);
      el("div", { class: "ref-line", style: `bottom:${pct(best)}` }, bars);
      bars.after(el("p", { class: "gain-note", text: `+${fmt(values[3] - best)} over the best baseline, from a point` }));
    }
  }

  // ------------------------------------------------------------ copy BibTeX
  for (const btn of $$("[data-copy]")) {
    btn.addEventListener("click", async () => {
      const text = $(btn.dataset.copy).innerText;
      try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
      catch { btn.textContent = "Select and copy"; }
      setTimeout(() => (btn.textContent = "Copy"), 1600);
    });
  }
})();
