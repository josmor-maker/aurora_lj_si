// Aurora Coworking Ljubljana: interactive 3D map of the space (three.js, WebGL).
// Loaded lazily: three.js (~170 kB gzipped) is only fetched when the map scrolls near the viewport.
// The layout is drawn from photos of the space; desk status comes from /assets/data/desks.json.

const shell = document.querySelector("[data-space-map]");
if (shell) {
  const start = () => boot().catch((e) => { console.error(e); fallback(); });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "600px 0px" });
    io.observe(shell);
  } else start();
}

function fallback() {
  shell.querySelector(".map-loading").textContent = "The 3D map can't run in this browser. Everything in it is listed in “What's inside” above.";
}

const SL = document.documentElement.lang === "sl";
const IMG = "/assets/img/illustrations/";
const POIS = SL ? {
  desks:   { t: "Odprt prostor", d: "Mize ob velikih oknih. Rumene so danes proste za flex člane, temne so fiksne mize.", img: "desk" },
  bohinj:  { t: "Sejna soba Bohinj", d: "Hrastova miza z desetimi rdečimi stoli, zaslon, projektor, tabla in flipchart. Člani jo rezervirajo v skupnem koledarju.", img: "meeting-room" },
  otocec:  { t: "Sejna soba Otočec", d: "Manjša soba za sestanke ena na ena, razgovore in delo v ekipi.", img: "meeting-room" },
  zurich:  { t: "Kabina Zürich", d: "Zvočno izolirana kabina za eno osebo, za klice in video sestanke.", img: "booth" },
  wroclaw: { t: "Kabina Wrocław", d: "Druga kabina za klice, tik ob Zürichu. Rezerviraš jo ali pa vstopiš, ko je prosta.", img: "booth" },
  coffee:  { t: "Kava", d: "Pravi espresso aparat in mlinček v čajni kuhinji. Vključeno v članarino, pri prvem obisku častimo mi.", img: "coffee" },
  fridge:  { t: "Kuhinja in hladilnik", d: "Prinesi kosilo od doma, pijača ostane hladna. Jemo skupaj ali za mizo.", img: "fridge" },
  lounge:  { t: "Lounge", d: "Kotni prostor s steklenimi stenami, velikimi kavči in visoko mizo ob oknih. Za kosilo, odmor in klepet.", img: "welcome" },
  door:    { t: "Vhod, 1. nadstropje", d: "Ko vstopiš: kabini za klice levo, Bohinj desno, lounge naravnost, odprt prostor pa se odpre na desno. Člani imajo dostop 24/7.", img: "open-24-7" },
} : {
  desks:   { t: "The open floor", d: "Desk clusters by big windows, black mesh chairs, acoustic clouds overhead. Yellow desks with a FLEX card are free today; the rest are fixed desks.", img: "desk" },
  bohinj:  { t: "Meeting room Bohinj", d: "An oak table with ten red chairs, a screen, projector, whiteboard and flipchart. Members book it on the shared calendar.", img: "meeting-room" },
  otocec:  { t: "Meeting room Otočec", d: "At the far end of the open floor, behind frosted glass, with two windows and a big white table. For 1:1s, interviews and focused team sessions.", img: "meeting-room" },
  zurich:  { t: "Call booth Zürich", d: "A soundproof one-person booth with a light, a standing desk and a stool. For calls and video meetings.", img: "booth" },
  wroclaw: { t: "Call booth Wrocław", d: "The second booth, right next to Zürich. Book a slot or hop in when it's free.", img: "booth" },
  coffee:  { t: "Coffee corner", d: "A proper espresso machine and grinder in the kitchenette. Included in every membership; on your first visit it's on us.", img: "coffee" },
  fridge:  { t: "Kitchen & fridge", d: "Sink, kettle, dishwasher and a fridge for your lunch. Eat together in the lounge or at your desk.", img: "fridge" },
  lounge:  { t: "Lounge", d: "Straight ahead from the entrance: a glass-walled corner room with big sofas and a high table by the windows. Lunch, breaks and informal chats.", img: "welcome" },
  door:    { t: "Entrance, level 1", d: "Walk in: the call booths are on your left, Bohinj on your right, the lounge straight ahead, and the open floor opens up to the right. Members get in 24/7.", img: "open-24-7" },
};
const CHIP_ORDER = ["desks", "zurich", "wroclaw", "bohinj", "otocec", "coffee", "fridge", "lounge", "door"];

async function boot() {
  const [THREE, data] = await Promise.all([
    import("/assets/vendor/three.module.min.js"),
    fetch("/assets/data/desks.json").then((r) => r.json()).catch(() => ({ clusters: [] })),
  ]);

  const canvas = shell.querySelector("canvas");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch { return fallback(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2dfb5, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(-9, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 10, bottom: -10, near: 1, far: 60 });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4;
  scene.add(sun);

  // ---------- Helpers ----------
  const C = {
    ink: 0x2a2d40, carpet: 0x7a7b83, wall: 0xffffff, sun: 0xf3b11b, cream: 0xe6d6b8, glass: 0xbfd8ea,
    leg: 0xd4d5da, panel: 0xcfc6b4, teal: 0x2f7f92, green: 0x5f9150, pot: 0x2b2c31, dark: 0x3a3e58,
    black: 0x26272d, red: 0xd7372b, oak: 0xd9ba8c, wood: 0x9c7651, counter: 0x3b3c42, steel: 0xc9ccd2,
    frame: 0x2f3138, sofa: 0x9b948d, blue: 0x4c86b8, olive: 0xa39a4a,
  };
  const mats = new Map();
  const mat = (color, extra = {}) => {
    const k = color + JSON.stringify(extra);
    if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, ...extra }));
    return mats.get(k);
  };
  const glassMat = new THREE.MeshLambertMaterial({ color: C.glass, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const frostMat = new THREE.MeshLambertMaterial({ color: 0xf4f6f8, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const lineMat = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.7 });
  const root = new THREE.Group();
  scene.add(root);

  function outline(mesh, angle = 25) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, angle), lineMat);
    mesh.add(l);
    return mesh;
  }
  // box with its base at y
  function box(w, h, d, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.material || mat(color));
    m.position.set(x, y + h / 2, z);
    if (o.ry) m.rotation.y = o.ry;
    m.castShadow = o.cast !== false;
    m.receiveShadow = true;
    if (o.edges !== false) outline(m);
    (o.parent || root).add(m);
    return m;
  }
  function cyl(rt, rb, h, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 16), mat(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    if (o.edges !== false) outline(m, 40);
    (o.parent || root).add(m);
    return m;
  }
  function roundedBox(w, h, d, r, color) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(g, mat(color));
    m.castShadow = true; m.receiveShadow = true;
    outline(m, 30);
    return m;
  }
  function canvasTex(w, h, draw) {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---------- Room shell (24 m × 10 m, floating like a diorama) ----------
  const W = 24, D = 10, X0 = -12, X1 = 12, Z0 = -5, Z1 = 5, H = 2.7;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.6), [
    mat(C.ink), mat(C.ink), mat(C.carpet), mat(C.ink), mat(C.ink), mat(C.ink),
  ]);
  slab.position.y = -0.3; slab.receiveShadow = true;
  root.add(slab);
  { // dark grey speckled carpet, as in the space
    const tex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = "#8a8b92"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(40,41,48,.18)" : "rgba(255,255,255,.12)"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: tex }));
    f.rotation.x = -Math.PI / 2; f.position.y = 0.002; f.receiveShadow = true;
    root.add(f);
  }
  // window glass with half-lowered blinds
  const blindTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = "rgba(196,222,238,.35)"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(60,62,72,.55)";
    for (let y = 0; y < h * 0.42; y += 6) g.fillRect(0, y, w, 3);
  });
  blindTex.wrapS = THREE.RepeatWrapping;
  function windowRun(x0, x1, z) { // back wall with dark-framed windows between white piers
    const len = x1 - x0, cx = (x0 + x1) / 2;
    box(len, 0.85, 0.22, C.wall, cx, 0, z);
    box(len, 0.4, 0.22, C.wall, cx, H - 0.4, z);
    const t = blindTex.clone(); t.needsUpdate = true; t.repeat.set(Math.round(len / 1.5), 1);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 1.25), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.position.set(cx, 0.85 + (H - 1.25) / 2, z); root.add(g);
    for (let x = x0; x <= x1 + 0.01; x += len / Math.round(len / 1.5)) box(0.08, H - 1.25, 0.12, C.frame, Math.min(Math.max(x, x0 + 0.04), x1 - 0.04), 0.85, z, { edges: false, cast: false });
    for (let x = x0 + 3; x < x1 - 0.5; x += 3) box(0.4, H, 0.3, C.wall, x, 0, z); // piers
  }
  // Layout as you walk in (door in the front wall, walking towards the windows):
  // booths on the left, Bohinj on the right, the lounge straight ahead,
  // the open floor opens up to the right along the windows, Otočec at its far end.
  windowRun(X0, X1, Z0 - 0.11);
  const hexGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.03, 6);
  for (const x of [-9.2, 0.5, 6.5]) box(0.9, 0.28, 0.22, C.wall, x, H - 0.75, Z0 + 0.13); // AC units
  // low side and front walls (cut away so you can see in)
  box(0.2, 0.45, D, C.wall, X0 - 0.1, 0, 0);
  box(0.2, 0.45, D, C.wall, X1 + 0.1, 0, 0);
  box(3.3, 0.45, 0.2, C.wall, -10.35, 0, Z1 + 0.1);  // left of the door
  box(19.3, 0.45, 0.2, C.wall, 2.35, 0, Z1 + 0.1);   // right of the door
  box(1.3, 0.02, 0.8, C.sun, -8.0, 0, Z1 - 0.5, { edges: false, cast: false }); // door mat
  box(0.3, H, 0.3, C.wall, 5.7, 0, -0.6);  // structural column on the open floor
  cyl(0.03, 0.03, 1.75, C.oak, -10.0, 0, 4.6, { edges: false }); cyl(0.25, 0.25, 0.02, C.oak, -10.0, 0, 4.6, { edges: false }); // coat stand
  box(0.35, 0.8, 0.2, 0x4d5a3c, -10.0, 0.8, 4.68, { edges: false });

  // ---------- Chairs ----------
  function chair(x, z, ry, color) { // red cantilever chair (Bohinj, Otočec)
    const g = new THREE.Group();
    box(0.44, 0.06, 0.44, color, 0, 0.44, 0, { parent: g });
    const back = box(0.44, 0.48, 0.05, color, 0, 0.5, -0.2, { parent: g }); back.rotation.x = -0.12;
    box(0.4, 0.05, 0.05, color, 0, 0, 0.18, { parent: g, edges: false });
    box(0.05, 0.44, 0.05, color, 0, 0, -0.2, { parent: g, edges: false });
    g.position.set(x, 0, z); g.rotation.y = ry;
    root.add(g);
    return g;
  }
  function officeChair(x, z, ry, color = C.black) { // black mesh office chair with headrest
    const g = new THREE.Group();
    cyl(0.28, 0.28, 0.04, C.black, 0, 0.04, 0, { parent: g, edges: false, seg: 5 });
    cyl(0.03, 0.03, 0.42, C.steel, 0, 0.06, 0, { parent: g, edges: false });
    box(0.5, 0.08, 0.48, color, 0, 0.46, 0, { parent: g });
    box(0.48, 0.62, 0.05, color, 0, 0.58, -0.24, { parent: g });
    box(0.3, 0.14, 0.05, color, 0, 1.24, -0.25, { parent: g, edges: false });
    g.position.set(x, 0, z); g.rotation.y = ry;
    root.add(g);
    return g;
  }
  function stool(x, z, color, h = 0.75) {
    cyl(0.19, 0.17, 0.06, color, x, h, z, { seg: 18 });
    cyl(0.02, 0.02, h, C.steel, x - 0.1, 0, z, { edges: false }); cyl(0.02, 0.02, h, C.steel, x + 0.1, 0, z, { edges: false });
  }

  // ---------- Meeting rooms ----------
  function glassWall(x, z, len, alongX, material = glassMat) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), material);
    g.position.set(x, 1.2, z);
    if (!alongX) g.rotation.y = Math.PI / 2;
    root.add(g);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(alongX ? len : 0.04, 2.4, alongX ? 0.04 : len)), lineMat);
    frame.position.set(x, 1.2, z);
    root.add(frame);
    const n = Math.round(len / 1.2);
    for (let i = 1; i < n; i++) { // aluminium mullions
      const t = -len / 2 + i * (len / n);
      box(0.05, 2.4, 0.05, 0x9ea2ad, alongX ? x + t : x, 0, alongX ? z : z + t, { edges: false, cast: false });
    }
  }
  function plant(x, y, z, s = 1, palm = false) {
    if (palm) { // tall palm: a fan of thin leaves
      cyl(0.03, 0.04, 1.2 * s, 0x6a5a3a, x, y, z, { edges: false });
      for (let i = 0; i < 9; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9 * s, 4), mat(C.green, { flatShading: true }));
        const a = (i / 9) * Math.PI * 2;
        leaf.position.set(x + Math.cos(a) * 0.32 * s, y + 1.25 * s, z + Math.sin(a) * 0.32 * s);
        leaf.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0);
        leaf.castShadow = true; root.add(leaf);
      }
      return;
    }
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), mat(C.green, { flatShading: true }));
    leaves.position.set(x, y + 0.42 * s, z); leaves.scale.y = 1.3; leaves.castShadow = true;
    outline(leaves, 10);
    root.add(leaves);
  }
  // Bohinj: right of the entrance, x -6.6..-1.2, z 1..5. Oak table, red chairs, screen, whiteboard, flipchart, palm.
  glassWall(-6.6, 3.0, 4.0, false);
  glassWall(-3.9, 1.0, 5.4, true);
  box(0.2, 1.7, 4.0, C.wall, -1.2, 0, 3.0);  // solid wall to the kitchen: posters, felt hexagons, whiteboard
  [[0x5b7fa8, 4.4], [0x8a6d9e, 3.65], [0xd08a5e, 2.9]].forEach(([c, z]) => {
    box(0.03, 0.6, 0.48, C.wall, -1.32, 0.95, z, { cast: false });
    box(0.02, 0.5, 0.4, c, -1.34, 1.0, z, { edges: false, cast: false });
  });
  [[2.1, 1.35, C.black], [1.68, 1.1, 0x8e8f95], [1.68, 1.55, 0x6f7076]].forEach(([z, y, c]) => {
    const h = new THREE.Mesh(hexGeo, mat(c)); h.rotation.z = Math.PI / 2; h.position.set(-1.32, y, z); root.add(h);
  });
  {
    const cx = -3.9, cz = 3.0, w = 3.4, d = 1.25;
    box(w, 0.06, d, C.oak, cx, 0.72, cz);
    box(0.1, 0.72, 0.5, C.black, cx - 1.1, 0, cz, { edges: false }); box(0.1, 0.72, 0.5, C.black, cx + 1.1, 0, cz, { edges: false });
    box(0.18, 0.02, 0.1, C.black, cx - 0.6, 0.78, cz, { edges: false }); box(0.18, 0.02, 0.1, C.black, cx + 0.6, 0.78, cz, { edges: false });
    for (let i = 0; i < 4; i++) { const x = cx - w / 2 + (w / 4) * (i + 0.5); chair(x, cz - d / 2 - 0.32, 0, C.red); chair(x, cz + d / 2 + 0.32, Math.PI, C.red); }
    chair(cx - w / 2 - 0.38, cz, Math.PI / 2, C.red);
    officeChair(cx + w / 2 + 0.42, cz, -Math.PI / 2);
    box(3.2, 0.9, 0.45, C.oak, -4.3, 0, Z1 - 0.3);                 // wooden cabinets
    box(0.06, 0.55, 0.9, C.black, -6.2, 0.78, 3.6);                 // screen on a stand
    box(0.06, 0.78, 0.06, C.black, -6.2, 0, 3.6, { edges: false });
    box(0.7, 0.95, 0.03, C.wall, -1.75, 0.75, 1.5, { ry: 0.6 });    // flipchart
    cyl(0.25, 0.2, 0.45, C.pot, -1.65, 0, 4.55); plant(-1.65, 0.45, 4.55, 1.15, true);
    box(0.4, 0.12, 0.3, C.black, cx, H - 0.35, cz, { edges: false }); // ceiling projector
    box(0.02, 0.14, 0.9, 0xb9bcc6, -6.6, 1.5, 1.7, { edges: false }); // "Bohinj" decal on the door
  }
  // Otočec: far end of the open floor, x 8.6..12, z -5..-0.4. Frosted glass, two windows, two white desks pushed together.
  glassWall(8.6, -2.7, 4.6, false, frostMat);
  glassWall(10.3, -0.4, 3.4, true, frostMat);
  {
    box(2.4, 0.05, 1.3, C.wall, 10.3, 0.72, -2.8);
    for (const [x, z] of [[9.2, -3.35], [9.2, -2.25], [11.4, -3.35], [11.4, -2.25]]) cyl(0.025, 0.025, 0.72, C.steel, x, 0, z, { edges: false });
    chair(9.9, -1.75, Math.PI, C.red); chair(10.7, -1.75, Math.PI, C.red);
    officeChair(10.3, -3.85, 0);
    box(0.45, 0.6, 0.55, 0xd8d3c8, 11.6, 0, -4.4);                 // drawer pedestal
    box(0.02, 0.14, 0.9, 0xb9bcc6, 8.6, 1.5, -1.0, { edges: false }); // "Otočec" decal on the door
  }

  // ---------- Kitchenette behind Bohinj: wood cabinets, dark worktop, espresso machine + grinder ----------
  box(0.12, 1.3, 1.6, C.wall, 3.1, 0, Z1 - 0.8);
  box(3.2, 0.88, 0.62, C.wood, 0.5, 0, Z1 - 0.36);
  box(3.25, 0.04, 0.66, C.counter, 0.5, 0.88, Z1 - 0.36);
  box(3.2, 0.7, 0.36, C.wood, 0.5, 1.75, Z1 - 0.2);   // upper cabinets
  for (let i = 0; i < 4; i++) box(0.03, 0.3, 0.02, C.steel, -0.7 + i * 0.8, 1.95, Z1 - 0.37, { edges: false, cast: false });
  box(0.34, 0.38, 0.34, C.steel, 1.0, 0.92, Z1 - 0.4);                        // espresso machine
  box(0.12, 0.05, 0.12, C.black, 1.0, 1.12, Z1 - 0.6, { edges: false });
  cyl(0.08, 0.06, 0.42, C.black, 1.5, 0.92, Z1 - 0.4, { seg: 12 });          // grinder
  cyl(0.09, 0.09, 0.2, C.black, -0.4, 0.92, Z1 - 0.4, { seg: 12 });         // kettle
  box(0.4, 0.02, 0.3, 0x9da1aa, 0.3, 0.92, Z1 - 0.4, { edges: false });    // sink
  cyl(0.07, 0.07, 0.25, C.wall, -0.85, 0.92, Z1 - 0.45, { edges: false }); // paper towel
  box(0.7, 1.9, 0.62, C.wood, 2.55, 0, Z1 - 0.36);                         // tall fridge cabinet
  box(0.03, 0.5, 0.03, C.steel, 2.25, 0.95, Z1 - 0.69, { edges: false });
  box(0.4, 0.55, 0.3, C.steel, 2.6, 0, Z1 - 1.2);                          // bin

  // ---------- Lounge straight ahead: glass walls, corner windows, sofas + high table ----------
  {
    glassWall(-6.4, -3.1, 3.8, false);
    glassWall(-9.2, -1.2, 5.6, true);
    box(2.4, 0.38, 0.85, C.sofa, -9.0, 0, -4.4);
    box(2.4, 0.3, 0.2, C.sofa, -9.0, 0.38, -4.75);
    box(0.85, 0.38, 1.5, C.sofa, -10.6, 0, -3.3);
    box(0.85, 0.06, 0.8, C.blue, -8.6, 0.38, -4.35, { edges: false });
    box(0.5, 0.38, 0.14, C.blue, -8.5, 0.42, -4.6, { ry: -0.1 });
    box(0.5, 0.36, 0.14, 0x7d766f, -9.6, 0.42, -4.6, { ry: 0.12 });
    cyl(0.3, 0.3, 0.04, C.wall, -9.4, 0.42, -3.3, { seg: 24 }); cyl(0.2, 0.25, 0.42, C.wall, -9.4, 0, -3.3, { edges: false });
    box(1.8, 0.05, 0.8, C.counter, -7.9, 1.02, -2.2);   // high table with bar stools
    box(0.06, 1.02, 0.06, C.black, -8.7, 0, -2.2, { edges: false }); box(0.06, 1.02, 0.06, C.black, -7.1, 0, -2.2, { edges: false });
    [[-8.5, -1.6, C.wall], [-7.9, -1.6, C.olive], [-7.3, -1.6, C.wall], [-8.5, -2.8, C.olive], [-7.3, -2.8, C.wall]].forEach(([x, z, c]) => stool(x, z, c));
    box(1.1, 0.26, 0.03, C.sun, -10.6, 0.9, -1.18, { cast: false }); // the yellow Aurora sign
    cyl(0.22, 0.18, 0.45, C.pot, -11.5, 0, -1.7); plant(-11.5, 0.45, -1.7, 0.8);
  }

  // ---------- Printer corner between the booths and the lounge: teal armchairs ----------
  box(0.8, 0.42, 0.8, C.teal, -11.2, 0, 0.5); box(0.16, 0.4, 0.8, C.teal, -11.52, 0.42, 0.5);
  box(0.8, 0.42, 0.8, C.teal, -10.9, 0, -0.45, { ry: 0.5 });
  box(0.6, 0.65, 0.55, 0xd8d3c8, -11.5, 0, 1.45);
  box(0.55, 0.3, 0.48, C.wall, -11.5, 0.65, 1.45);

  // ---------- Call booths, left of the entrance (light inside, standing desk + stool) ----------
  function booth(x, z, ry = Math.PI / 2) {
    const g = new THREE.Group();
    const body = roundedBox(1.15, 2.25, 1.05, 0.24, C.cream);
    body.position.y = 1.125; g.add(body);
    const rim = roundedBox(0.92, 1.95, 0.04, 0.2, C.black); rim.position.set(0, 1.12, -0.52); g.add(rim);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.8), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.85 }));
    door.position.set(0, 1.12, -0.55); door.rotation.y = Math.PI; g.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), mat(C.black)); handle.position.set(0.3, 1.1, -0.58); g.add(handle);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.01), mat(0xe9ecf0)); sign.position.set(0, 1.55, -0.56); g.add(sign);
    g.position.set(x, 0, z); g.rotation.y = ry; // door faces into the room (-x)
    root.add(g);
    return g;
  }
  booth(-11.3, 3.95, -Math.PI / 2);
  booth(-11.3, 2.65, -Math.PI / 2);
  const pl = new THREE.PointLight(0xffc970, 2.2, 3.2, 2); pl.position.set(-10.6, 1.4, 3.3); scene.add(pl);

  // ---------- Plants ----------
  for (const [x, z] of [[11.4, 4.6], [6.4, 4.6], [-6.0, -0.7]]) { cyl(0.24, 0.19, 0.42, C.pot, x, 0, z); plant(x, 0.42, z, 0.9); }

  // ---------- Desks: white tables, beige screens, black mesh chairs; free ones are yellow with a FLEX card ----------
  const deskMeshes = [];
  const flexTex = canvasTex(64, 32, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#2a2d40"; g.font = "bold 18px Poppins, sans-serif"; g.textAlign = "center"; g.fillText("FLEX", w / 2, 23); });
  let free = 0, taken = 0;
  for (const c of data.clusters || []) {
    box(2.88, 0.42, 0.04, C.panel, c.x, 0.74, c.z, { cast: false });
    const box4 = [[-0.72, -0.4], [0.72, -0.4], [-0.72, 0.4], [0.72, 0.4]];
    box4.forEach(([dx, dz], i) => {
      const isFixed = !!(c.fixed && c.fixed[i]);
      isFixed ? taken++ : free++;
      const x = c.x + dx, z = c.z + dz;
      const top = box(1.4, 0.05, 0.75, isFixed ? 0xf2f2ef : C.sun, x, 0.72, z);
      top.userData = { desk: `${c.id}${i + 1}`, fixed: isFixed };
      deskMeshes.push(top);
      box(0.05, 0.72, 0.65, C.leg, x - 0.66, 0, z, { edges: false });
      box(0.05, 0.72, 0.65, C.leg, x + 0.66, 0, z, { edges: false });
      const side = dz < 0 ? 1 : -1; // monitor sits by the screen, chair faces it
      if (isFixed) {
        box(0.62, 0.36, 0.04, C.black, x, 0.92, c.z + dz * 0.45, { edges: false });
        box(0.06, 0.17, 0.06, C.steel, x, 0.77, c.z + dz * 0.45, { edges: false });
        box(0.3, 0.02, 0.12, C.wall, x - 0.1, 0.77, z - side * 0.05, { edges: false, cast: false });
        box(0.42, 0.55, 0.5, 0xd8d3c8, x + 0.4, 0, z + side * 0.05, { edges: false }); // drawer pedestal
      } else {
        const card = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ map: flexTex }));
        card.position.set(x + 0.45, 0.84, c.z + dz * 0.5); if (dz > 0) card.rotation.y = Math.PI; root.add(card);
      }
      officeChair(x, z - side * 0.6, dz < 0 ? 0 : Math.PI);
    });
  }
  shell.parentElement.querySelectorAll("[data-count=free]").forEach((e) => (e.textContent = free ? `(${free})` : ""));
  shell.parentElement.querySelectorAll("[data-count=taken]").forEach((e) => (e.textContent = taken ? `(${taken})` : ""));

  // ---------- Acoustic clouds + linear lights hanging over the open floor ----------
  function cloud(x, z, s = 1) {
    const g = new THREE.Group();
    for (const [dx, dz, r] of [[0, 0, 0.55], [0.5, 0.1, 0.42], [-0.45, 0.05, 0.4], [0.15, -0.3, 0.38]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), mat(0xf7f7f4));
      b.position.set(dx, 0, dz); b.scale.y = 0.22; g.add(b);
    }
    g.position.set(x, H + 0.05, z); g.scale.setScalar(s);
    root.add(g);
    return g;
  }
  const clouds = [cloud(-3.0, -2.3), cloud(0.6, -3.6, 0.9), cloud(4.0, -2.0, 1.1), cloud(6.4, 1.8, 0.9), cloud(1.8, 1.6, 0.85)];
  for (const [x, z] of [[-2.7, -3.1], [4.1, -3.1], [6.3, 1.3]]) box(3.4, 0.05, 0.12, C.wall, x, H + 0.25, z, { cast: false });

  // ---------- Floating stars (from the Aurora illustration) ----------
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 70; i++) sp.push((Math.random() - 0.5) * 34, 3.5 + Math.random() * 6, (Math.random() - 0.5) * 18);
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: C.sun, size: 0.14, transparent: true, opacity: 0.85 }));
  scene.add(stars);

  // ---------- Points of interest: where the camera flies and where the pins sit ----------
  const poi = {
    desks:   { at: [1.5, 1.5, -3.1], view: { az: 0.15, pol: 0.85, r: 0.6, t: [1.8, 0, -1.2] } },
    bohinj:  { at: [-3.9, 2.7, 3.0], view: { az: 0.2, pol: 0.8, r: 0.42, t: [-3.9, 0.5, 2.8] } },
    otocec:  { at: [10.3, 2.7, -2.7], view: { az: 0.2, pol: 0.82, r: 0.42, t: [10.2, 0.5, -2.6] } },
    zurich:  { at: [-11.3, 2.7, 3.95], view: { az: 0.85, pol: 1.0, r: 0.34, t: [-10.7, 1, 3.5] } },
    wroclaw: { at: [-11.3, 2.7, 2.65], view: { az: 1.05, pol: 1.0, r: 0.34, t: [-10.7, 1, 2.4] } },
    coffee:  { at: [1.2, 1.7, Z1 - 0.4], view: { az: 0.05, pol: 0.95, r: 0.32, t: [0.8, 0.9, 4] } },
    fridge:  { at: [2.55, 2.3, Z1 - 0.36], view: { az: 0.25, pol: 0.95, r: 0.34, t: [1.8, 0.9, 4] } },
    lounge:  { at: [-9.0, 2.0, -3.0], view: { az: 0.3, pol: 0.85, r: 0.42, t: [-8.8, 0.4, -2.9] } },
    door:    { at: [-8.0, 1.2, Z1 + 0.2], view: { az: 0.15, pol: 0.78, r: 0.62, t: [-7.5, 0, 1.0] } },
  };

  // ---------- Camera: orbit around a target, framed to fit the canvas ----------
  const portrait = () => canvas.clientWidth / canvas.clientHeight < 1;
  const home = () => portrait() ? { az: Math.PI / 2 - 0.12, pol: 0.62, r: 1, t: [0, 0, 0] } : { az: 0.32, pol: 0.92, r: 1, t: [0.5, 0, 0] };
  const cam = { ...home(), t: new THREE.Vector3(...home().t) };
  let fitR = 40;
  const tmp = new THREE.Vector3();
  const corners = [];
  for (const x of [X0, X1]) for (const y of [0, H]) for (const z of [Z0, Z1]) corners.push(new THREE.Vector3(x, y, z));

  function place(c = cam, R = fitR) {
    const r = R * c.r;
    camera.position.set(
      c.t.x + r * Math.sin(c.pol) * Math.sin(c.az),
      c.t.y + r * Math.cos(c.pol),
      c.t.z + r * Math.sin(c.pol) * Math.cos(c.az));
    camera.lookAt(c.t);
    camera.updateMatrixWorld();
  }
  function fit() { // smallest radius at which the whole room fits the home view
    const h = home();
    const probe = { ...h, t: new THREE.Vector3(...h.t) };
    let lo = 10, hi = 160;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      place(probe, mid);
      const ok = corners.every((p) => { tmp.copy(p).project(camera); return Math.abs(tmp.x) < 0.94 && Math.abs(tmp.y) < 0.9; });
      ok ? (hi = mid) : (lo = mid);
    }
    fitR = hi;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
    if (!focus) Object.assign(cam, home(), { t: new THREE.Vector3(...home().t) });
    dirty = true;
  }

  // ---------- Pins, chips and info card ----------
  const labels = shell.querySelector(".map-labels");
  const card = shell.querySelector(".map-card");
  const tip = shell.querySelector(".map-tip");
  const chips = shell.parentElement.querySelector(".map-chips");
  const pins = {};
  const chipBtns = {};
  const allChip = document.createElement("button");
  allChip.type = "button"; allChip.textContent = SL ? "Celoten prostor" : "Whole space"; allChip.setAttribute("aria-pressed", "true");
  allChip.addEventListener("click", () => select(null));
  chips.appendChild(allChip);
  for (const k of CHIP_ORDER) {
    const p = POIS[k];
    const pin = document.createElement("button");
    pin.type = "button"; pin.className = "map-pin"; pin.textContent = p.t.replace(/^(Call booth|Meeting room|Kabina|Sejna soba) /, "");
    pin.addEventListener("click", () => select(k));
    labels.appendChild(pin);
    pins[k] = pin;
    const chip = document.createElement("button");
    chip.type = "button"; chip.textContent = p.t; chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => select(k));
    chips.appendChild(chip);
    chipBtns[k] = chip;
  }
  card.querySelector(".close").addEventListener("click", () => select(null));

  let focus = null;
  let anim = null;
  function select(k) {
    focus = k;
    clouds.forEach((c) => (c.visible = !k)); // clouds hang in front of the camera when zoomed in
    for (const [key, el] of Object.entries(pins)) el.setAttribute("aria-pressed", String(key === k));
    for (const [key, el] of Object.entries(chipBtns)) el.setAttribute("aria-pressed", String(key === k));
    allChip.setAttribute("aria-pressed", String(!k));
    const active = k ? chipBtns[k] : allChip;
    chips.scrollTo({ left: active.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
    if (k) {
      const p = POIS[k];
      const img = card.querySelector("img");
      img.src = IMG + p.img + ".webp"; img.alt = "";
      card.querySelector("h3").textContent = p.t;
      card.querySelector("p").textContent = p.d;
      card.classList.add("open");
      const v = poi[k].view;
      fly({ az: v.az + (portrait() ? 0.5 : 0), pol: v.pol, r: v.r * (portrait() ? 0.75 : 1), t: new THREE.Vector3(...v.t) });
    } else {
      card.classList.remove("open");
      const h = home();
      fly({ ...h, t: new THREE.Vector3(...h.t) });
    }
  }
  function fly(to) {
    const from = { az: cam.az, pol: cam.pol, r: cam.r, t: cam.t.clone() };
    let daz = to.az - from.az; // shortest way round
    daz = Math.atan2(Math.sin(daz), Math.cos(daz));
    anim = { from, to: { ...to, az: from.az + daz }, t0: performance.now(), dur: reduced ? 1 : 1100 };
    idleUntil = performance.now() + 6000;
    dirty = true;
    visible = !document.hidden; kick();
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // ---------- Pointer: drag to orbit, hover/tap desks ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null, idleUntil = 0, moved = false;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, az: cam.az, pol: cam.pol, id: e.pointerId, touch: e.pointerType === "touch" };
    moved = false;
  });
  addEventListener("pointermove", (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.touch && !moved && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // let the page scroll
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) {
        anim = null;
        cam.az = drag.az - dx * 0.006;
        if (!drag.touch) cam.pol = Math.min(1.25, Math.max(0.35, drag.pol - dy * 0.004));
        idleUntil = performance.now() + 6000;
        dirty = true;
        kick();
      }
    } else if (e.target === canvas && e.pointerType !== "touch") hover(e);
  });
  addEventListener("pointerup", (e) => {
    if (drag && e.pointerId === drag.id && !moved) hover(e, true);
    drag = null;
  });
  canvas.addEventListener("pointerleave", () => tip.classList.remove("on"));

  function hover(e, tap) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(deskMeshes, false)[0];
    if (hit) {
      const u = hit.object.userData;
      tip.innerHTML = `<b>${SL ? "Miza" : "Desk"} ${u.desk}</b> · ${u.fixed ? (SL ? "fiksna, zasedena" : "fixed member") : (SL ? "prosta za flex" : "free for flex")}`;
      tip.style.left = e.clientX - r.left + "px";
      tip.style.top = e.clientY - r.top + "px";
      tip.classList.add("on");
      canvas.style.cursor = "pointer";
      if (tap && !focus) select("desks");
    } else {
      tip.classList.remove("on");
      canvas.style.cursor = "";
    }
  }

  // ---------- Render loop (runs only while the map is on screen) ----------
  let dirty = true, visible = true, raf = 0;
  const v = new THREE.Vector3();
  function frame(now) {
    raf = 0;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k);
      cam.az = anim.from.az + (anim.to.az - anim.from.az) * e;
      cam.pol = anim.from.pol + (anim.to.pol - anim.from.pol) * e;
      cam.r = anim.from.r + (anim.to.r - anim.from.r) * e;
      cam.t.lerpVectors(anim.from.t, anim.to.t, e);
      if (k === 1) anim = null;
      dirty = true;
    }
    const idle = !reduced && !drag && !anim && now > idleUntil;
    if (idle) { cam.az += Math.sin(now / 5200) * 0.0006; dirty = true; }
    if (!reduced) { stars.rotation.y = now / 60000; stars.position.y = Math.sin(now / 2400) * 0.15; dirty = true; }
    if (dirty) {
      place();
      renderer.render(scene, camera);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      for (const [k, el] of Object.entries(pins)) {
        v.set(...poi[k].at).project(camera);
        const hide = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05 || (focus ? focus !== k : w < 560); // phones: chips below do the job
        el.classList.toggle("hidden", !!hide);
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      }
      dirty = false;
    }
    if (visible) raf = requestAnimationFrame(frame);
  }
  // Always re-arm: a frame requested while the tab was in the background can be dropped, which would stall the loop.
  const kick = () => { if (!visible) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; if (visible) { dirty = true; kick(); } }).observe(shell);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; kick(); });
  new ResizeObserver(resize).observe(canvas);

  resize();
  shell.querySelector(".map-loading").remove();
  kick();
}
