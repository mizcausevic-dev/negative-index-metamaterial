import * as THREE from "three";
import "./style.css";
import { AudioEngine } from "./audio";

const DURATION = 34, FPS = 30;
const COLORS = { ink: 0x0d1018, board: 0x25364b, copper: 0xb97848, cyan: 0x00e5ff, violet: 0x9d4edd, gold: 0xffd166, bone: 0xf2f4f8 };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $("scene") as unknown as HTMLCanvasElement;
const captionTitle = $("captionTitle"), captionBody = $("captionBody"), shotLabel = $("shotLabel"), chips = $("chips"), scaleBadge = $("scaleBadge");
const scrub = $("scrub") as unknown as HTMLInputElement, timeOut = $("timeOut"), playBtn = $("playBtn"), muteBtn = $("muteBtn");
const chartWrap = $("chartWrap"), compare = $("compare"), chart = $("chart") as unknown as HTMLCanvasElement;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch {
  $("fallback").hidden = false; throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(COLORS.ink);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(COLORS.ink, 12, 24);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.AmbientLight(0x8899bb, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-4, 6, 5); scene.add(key);
const rim = new THREE.PointLight(COLORS.cyan, 12, 12); rim.position.set(-3, 2, 3); scene.add(rim);

const copper = new THREE.MeshStandardMaterial({ color: COLORS.copper, metalness: 0.85, roughness: 0.32 });
const boardMat = new THREE.MeshStandardMaterial({ color: COLORS.board, transparent: true, opacity: 0.82, roughness: 0.65, metalness: 0.1 });
const cyanMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.9 });
const violetMat = new THREE.MeshBasicMaterial({ color: COLORS.violet, transparent: true, opacity: 0.9 });
const goldMat = new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.75 });

function box(w: number, h: number, d: number, mat: THREE.Material) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
function arrow(dir: THREE.Vector3, origin: THREE.Vector3, len: number, color: number) {
  const a = new THREE.ArrowHelper(dir.clone().normalize(), origin, len, color, 0.22, 0.13); scene.add(a); return a;
}
function beam(from: THREE.Vector3, dir: THREE.Vector3, len: number, color: number, radius = 0.16) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 24, 1, true), mat);
  cyl.position.copy(from).addScaledVector(dir, len / 2);
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.add(cyl);
  const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 20), coneMat);
  cone.position.copy(from).addScaledVector(dir, len * 0.62);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.add(cone); scene.add(g);
  return { group: g, mat, coneMat };
}

// Slab cells -------------------------------------------------------------
const slab = new THREE.Group(); scene.add(slab);
const cellMats: THREE.Material[] = [];
function makeCell(isHero = false) {
  const g = new THREE.Group();
  const bm = boardMat.clone(); cellMats.push(bm);
  const board = box(0.06, 0.82, 0.82, bm); g.add(board);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.78, 12), copper);
  wire.rotation.x = Math.PI / 2; wire.position.set(-0.07, -0.22, 0); g.add(wire);
  const ringGeo = new THREE.TorusGeometry(0.24, 0.032, 12, 72, 5.55);
  ringGeo.rotateY(Math.PI / 2); ringGeo.rotateX(2.45);
  const ring = new THREE.Mesh(ringGeo, copper); ring.position.set(-0.07, 0.14, 0); g.add(ring);
  if (isHero) { g.userData.wire = wire; g.userData.ring = ring; g.userData.board = board; }
  return g;
}
for (const x of [0, 0.75, 1.5]) for (const y of [-1.35, -0.45, 0.45, 1.35]) for (const z of [-0.9, 0, 0.9]) {
  if (x === 0.75 && y === 0.45 && z === 0) continue;
  const c = makeCell(); c.position.set(x, y, z); slab.add(c);
}
const hero = makeCell(true); hero.position.set(0.75, 0.45, 0); slab.add(hero);

// Interface planes and normal
for (const x of [0, 1.5]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.6), new THREE.MeshBasicMaterial({ color: 0x5f7fa6, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
  p.rotation.y = Math.PI / 2; p.position.set(x, 0.35, 0); scene.add(p);
}
const P0 = new THREE.Vector3(0, 0.45, 0), di = new THREE.Vector3(0.848, -0.53, 0).normalize(), dr = new THREE.Vector3(-0.848, -0.53, 0).normalize(), ds = new THREE.Vector3(0.848, 0.53, 0).normalize();
const P1 = P0.clone().addScaledVector(ds, 1.5 / ds.x);
const normalMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.8 });
const normalLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([P0.clone().add(new THREE.Vector3(-1.5, 0, 0)), P0.clone().add(new THREE.Vector3(3.2, 0, 0))]), normalMat);
normalLine.computeLineDistances(); scene.add(normalLine);

const incidentBeam = beam(P0.clone().addScaledVector(di, -3.4), di, 3.4, COLORS.gold, 0.2);
const reflectedBeam = beam(P0, dr, 2.7, COLORS.gold, 0.13);
const internalBeam = beam(P0, ds, P0.distanceTo(P1), COLORS.gold, 0.19);
const exitBeam = beam(P1, di, 3.0, COLORS.gold, 0.18);

// Field arrows: E along Z, H in X-Y plane, k dashed white, S gold cone already in beams
const eArrow = arrow(new THREE.Vector3(0, 0, 1), P0.clone().addScaledVector(di, -2.1).add(new THREE.Vector3(0, 0, -0.55)), 1.1, COLORS.cyan);
const hDir = new THREE.Vector3(di.y, -di.x, 0); // E x H parallel to di
const hArrow = arrow(hDir, P0.clone().addScaledVector(di, -2.1), 1.0, COLORS.violet);
const heroE = arrow(new THREE.Vector3(0, 0, 1), hero.position.clone().add(new THREE.Vector3(-0.45, -0.2, -0.55)), 1.1, COLORS.cyan);
const heroH = arrow(hDir, hero.position.clone().add(new THREE.Vector3(-0.5, 0.35, 0)), 1.0, COLORS.violet);

// Phase fronts (neutral white translucent planes, distinct from gold energy)
type Front = { mesh: THREE.Mesh; from: THREE.Vector3; dir: THREE.Vector3; len: number; idx: number; reverse: boolean };
const fronts: Front[] = [];
function addFronts(from: THREE.Vector3, dir: THREE.Vector3, len: number, reverse = false) {
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
    m.lookAt(from.clone().add(dir)); scene.add(m); fronts.push({ mesh: m, from, dir, len, idx: i, reverse });
  }
}
addFronts(P0.clone().addScaledVector(di, -3.4), di, 3.4);
addFronts(P0, ds, P0.distanceTo(P1), true);
addFronts(P1, di, 3.0);

// Hero overlays: wire dots, ring dots, gap charge, displacement current
const wireDots: THREE.Mesh[] = [], ringDots: THREE.Mesh[] = [];
for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), cyanMat); scene.add(d); wireDots.push(d); }
for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), violetMat); scene.add(d); ringDots.push(d); }
const gapPlus = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), cyanMat); scene.add(gapPlus);
const gapMinus = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), violetMat); scene.add(gapMinus);
const dispMat = new THREE.LineDashedMaterial({ color: COLORS.cyan, dashSize: 0.07, gapSize: 0.05, transparent: true, opacity: 0 });
const gapCenter = hero.position.clone().add(new THREE.Vector3(-0.07, 0.14, 0));
const gapDir = new THREE.Vector3(0, Math.sin(2.45), Math.cos(2.45));
const gapA = gapCenter.clone().addScaledVector(gapDir, 0.24), gapB = gapCenter.clone().addScaledVector(gapDir, -0.24);
const dispLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([gapA, gapB]), dispMat); dispLine.computeLineDistances(); scene.add(dispLine);
const dipole = arrow(new THREE.Vector3(-1, 0, 0), hero.position.clone().add(new THREE.Vector3(0.15, 0.14, 0)), 0.65, COLORS.violet);

// Captions ---------------------------------------------------------------
const shots = [
  { title: "A slab built from repeated unit cells", body: "An obliquely incident microwave beam meets a finite circuit-board slab. Propagation lies in the X-Y plane, the electric field points along Z, and the magnetic field lies in the X-Y plane. Phase fronts are neutral. Gold shows energy flow only.", chips: ["Designed frequency band and polarization", "Microwave-scale structure", "Entrance-face normal shown"] },
  { title: "One representative unit cell, enlarged", body: "The wire runs approximately along Z, parallel to the electric field. The split ring sits in the Y-Z plane, so the X component of the in-plane magnetic field threads its enclosed area. Both planes are explicit because in-plane for incidence is not the same as in-plane for the ring.", chips: ["Representative unit-cell mechanism", "Conducting wire", "Split-ring resonator", "Capacitive gap", "Geometry enlarged for explanation"] },
  { title: "Two responses, one shared excitation", body: "Cyan current oscillates along the connected wire. Violet current circulates around the metal ring but does not cross the empty gap. Charge gathers at the gap edges, the field concentrates there, and any continuity across the gap is displacement current, shown dashed.", chips: ["Wire array: effective electric response", "Electric response", "Magnetic resonance", "Displacement current (dashed, across gap only)"] },
  { title: "Idealized effective-medium refraction", body: "At slab scale the animation switches models. In the selected low-loss, isotropic idealization, gold energy enters the slab and bends to the negative-refraction side of the inward normal. White phase fronts progress opposite the bulk energy flow. That opposition describes phase, not information travelling backward.", chips: ["Idealized effective-medium refraction", "Idealized double-negative operating band", "Re(eff) < 0 and Re(mu eff) < 0: effective responses", "k: phase propagation", "<S>: time-averaged energy flow"] },
  { title: "A parallel slab, and the limits of the band", body: "The outgoing beam leaves parallel to the incident beam with a lateral offset. A parallel slab is not a prism. Move outside the overlap band and the negative-refraction picture stops being valid. Reflection can dominate, transmission can fall, and the response remains passive and lossy.", chips: ["Frequency-selective", "Polarization-dependent", "Passive and lossy", "Microwave geometry does not scale directly to visible optics", "No perfect-lens claim"] },
];
function shotIndex(t: number) { return t < 5 ? 0 : t < 10 ? 1 : t < 17 ? 2 : t < 25 ? 3 : 4; }

// Camera keys ------------------------------------------------------------
const camKeys: [number, THREE.Vector3, THREE.Vector3][] = [
  [0, new THREE.Vector3(-4.6, 3.1, 6.6), new THREE.Vector3(0.75, 0.3, 0)],
  [5, new THREE.Vector3(-3.9, 2.5, 5.6), new THREE.Vector3(0.75, 0.35, 0)],
  [10, new THREE.Vector3(-1.7, 1.25, 4.3), new THREE.Vector3(0.75, 0.45, 0)],
  [17, new THREE.Vector3(-2.4, 1.7, 5.4), new THREE.Vector3(0.75, 0.45, 0)],
  [25, new THREE.Vector3(-3.8, 2.7, 5.8), new THREE.Vector3(0.85, 0.55, 0)],
  [33, new THREE.Vector3(-5.2, 3.7, 7.4), new THREE.Vector3(1.0, 0.55, 0)],
  [34, new THREE.Vector3(-5.2, 3.7, 7.4), new THREE.Vector3(1.0, 0.55, 0)],
];
const smooth = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const fade = (t: number, a: number, b: number, c: number, d: number) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

const chartCtx = chart.getContext("2d")!;
function drawChart(t: number) {
  const w = chart.width, h = chart.height; chartCtx.clearRect(0, 0, w, h);
  chartCtx.fillStyle = "#0D1018"; chartCtx.fillRect(0, 0, w, h);
  const x0 = 48, x1 = w - 18, y0 = 28, y1 = h - 42, mid = (y0 + y1) / 2;
  const fx = (u: number) => x0 + u * (x1 - x0), fy = (v: number) => mid - v * 72;
  chartCtx.fillStyle = "rgba(0,229,255,.13)"; chartCtx.fillRect(fx(0.42), y0, fx(0.58) - fx(0.42), y1 - y0);
  chartCtx.strokeStyle = "rgba(255,255,255,.35)"; chartCtx.beginPath(); chartCtx.moveTo(x0, mid); chartCtx.lineTo(x1, mid); chartCtx.moveTo(x0, y0); chartCtx.lineTo(x0, y1); chartCtx.stroke();
  const curve = (fn: (u: number) => number, color: string) => { chartCtx.strokeStyle = color; chartCtx.lineWidth = 3; chartCtx.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120, x = fx(u), y = fy(Math.max(-1.15, Math.min(1.15, fn(u)))); i ? chartCtx.lineTo(x, y) : chartCtx.moveTo(x, y); } chartCtx.stroke(); };
  curve((u) => (u < 0.48 ? 0.75 - u * 0.4 : -0.85 + (u - 0.48) * 1.1), "#00E5FF");
  curve((u) => 0.65 - 1.7 * Math.exp(-Math.pow((u - 0.52) / 0.085, 2)) + (u > 0.62 ? 0.35 : 0), "#9D4EDD");
  chartCtx.lineWidth = 1; chartCtx.fillStyle = "#F2F4F8"; chartCtx.font = "12px monospace";
  chartCtx.fillText("Re(eps eff) cyan", fx(0.05), fy(0.95)); chartCtx.fillText("Re(mu eff) violet", fx(0.68), fy(0.95));
  chartCtx.fillText("normalized frequency", fx(0.36), h - 14); chartCtx.fillText("overlap", fx(0.445), y0 + 14);
  const markerU = t < 29 ? 0.5 : 0.5 + Math.min(0.3, (t - 29) * 0.11);
  chartCtx.strokeStyle = "#FFD166"; chartCtx.lineWidth = 3; chartCtx.beginPath(); chartCtx.moveTo(fx(markerU), y0); chartCtx.lineTo(fx(markerU), y1); chartCtx.stroke();
  chartCtx.fillStyle = "#FFD166"; chartCtx.beginPath(); chartCtx.arc(fx(markerU), fy(-0.2), 6, 0, Math.PI * 2); chartCtx.fill();
  chartCtx.fillText(markerU < 0.58 ? "operating point" : "outside overlap", Math.min(fx(markerU) - 38, w - 118), y1 + 28);
}

// Timeline state ---------------------------------------------------------
let t = 0, playing = false, last = performance.now(), reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const audio = new AudioEngine();
function setCaption(si: number) {
  shotLabel.textContent = `SHOT ${si + 1} / 5`;
  captionTitle.textContent = shots[si].title; captionBody.textContent = shots[si].body;
  chips.innerHTML = shots[si].chips.map((c) => `<span>${c}</span>`).join("");
  scaleBadge.textContent = si < 3 ? "UNIT-CELL / SLAB CONTEXT" : "IDEALIZED EFFECTIVE-MEDIUM MODEL";
  chartWrap.hidden = si !== 4; compare.hidden = si !== 3;
}
let lastShot = -1;
function render(time: number) {
  const si = shotIndex(time); if (si !== lastShot) { setCaption(si); lastShot = si; }
  const phase = reduced ? 1.2 : Math.PI * 2 * 0.8 * time; // slowed visible cycle, shared excitation phase
  // camera
  let a = camKeys[0], b = camKeys[camKeys.length - 1];
  for (let i = 0; i < camKeys.length - 1; i++) if (time >= camKeys[i][0] && time <= camKeys[i + 1][0]) { a = camKeys[i]; b = camKeys[i + 1]; break; }
  const u = smooth((time - a[0]) / Math.max(0.001, b[0] - a[0]));
  camera.position.lerpVectors(a[1], b[1], u); camera.lookAt(new THREE.Vector3().lerpVectors(a[2], b[2], u));

  const unitFocus = fade(time, 4.5, 6, 16, 18);
  cellMats.forEach((m) => { (m as THREE.MeshStandardMaterial).opacity = 0.82 - unitFocus * 0.62; });
  const explode = fade(time, 5.5, 7, 8.6, 9.8);
  const wire = hero.userData.wire as THREE.Mesh, ring = hero.userData.ring as THREE.Mesh;
  wire.position.x = -0.07 - explode * 0.38; ring.position.x = -0.07 + explode * 0.38;
  hero.scale.setScalar(1 + explode * 0.55);

  const outsideBand = time > 29 ? clamp01((time - 29) / 1.5) : 0;
  const negValid = (si >= 3 ? 1 : 0) * (1 - outsideBand);
  incidentBeam.mat.opacity = 0.1 + (si === 0 ? 0.1 : 0.05); incidentBeam.coneMat.opacity = si <= 3 ? 0.95 : 0.95;
  reflectedBeam.group.visible = si === 4 || si === 3; reflectedBeam.mat.opacity = 0.05 + outsideBand * 0.14; reflectedBeam.coneMat.opacity = 0.35 + outsideBand * 0.6;
  internalBeam.group.visible = si >= 3; internalBeam.mat.opacity = 0.05 + negValid * 0.13; internalBeam.coneMat.opacity = negValid;
  exitBeam.group.visible = si === 4; exitBeam.mat.opacity = 0.16 * (1 - outsideBand * 0.75); exitBeam.coneMat.opacity = 1 - outsideBand * 0.75;

  const response = fade(time, 9.5, 11, 16.5, 17.5);
  cyanMat.opacity = 0.25 + response * 0.75; violetMat.opacity = 0.25 + response * 0.75;
  wireDots.forEach((d, i) => {
    d.visible = response > 0.03;
    d.position.set(hero.position.x - 0.07 - explode * 0.38, hero.position.y - 0.22, hero.position.z + 0.3 * Math.sin(phase - i * 0.55));
    d.scale.setScalar(0.7 + 0.3 * Math.sin(phase - i * 0.55));
  });
  ringDots.forEach((d, i) => {
    d.visible = response > 0.03;
    const ang = i * 1.35 + 0.55 * Math.sin(phase - 1.05);
    d.position.set(hero.position.x - 0.07 + explode * 0.38, hero.position.y + 0.14 + 0.24 * Math.sin(ang), hero.position.z + 0.24 * Math.cos(ang));
  });
  const q = Math.sin(phase - 1.05);
  gapPlus.visible = gapMinus.visible = response > 0.03;
  gapPlus.position.copy(gapA).add(new THREE.Vector3(explode * 0.38, 0, 0)); gapMinus.position.copy(gapB).add(new THREE.Vector3(explode * 0.38, 0, 0));
  gapPlus.scale.setScalar(0.7 + 0.5 * Math.max(0, q)); gapMinus.scale.setScalar(0.7 + 0.5 * Math.max(0, -q));
  dispMat.opacity = response * 0.95; dipole.visible = response > 0.03;
  (dipole as THREE.ArrowHelper).setLength(0.45 + 0.2 * Math.abs(q), 0.16, 0.09);

  fronts.forEach((f) => {
    const cyc = reduced ? 0.3 : (time * 0.8) % 1;
    let frac = (cyc + f.idx / 4) % 1; if (f.reverse) frac = 1 - frac;
    f.mesh.position.copy(f.from).addScaledVector(f.dir, frac * f.len);
    f.mesh.visible = si !== 1 && si !== 2;
    (f.mesh.material as THREE.MeshBasicMaterial).opacity = f.reverse ? 0.28 * negValid + (si >= 3 ? 0.05 : 0) : 0.18;
  });
  eArrow.visible = hArrow.visible = si === 0 || si === 1;
  heroE.visible = heroH.visible = si === 1 || si === 2;
  if (si === 4) drawChart(time);
  scrub.value = String(time); timeOut.textContent = `t = ${time.toFixed(3)} s / frame ${Math.min(1019, Math.floor(time * FPS))}`;
  renderer.render(scene, camera);
}
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) { t = Math.min(DURATION, t + dt); if (t >= DURATION) { playing = false; playBtn.innerHTML = "&#9654;"; audio.pause(); } }
  render(t); requestAnimationFrame(loop);
}
playBtn.addEventListener("click", async () => {
  if (t >= DURATION) t = 0;
  playing = !playing; playBtn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
  if (playing) { await audio.start(t); } else audio.pause();
});
$("replayBtn").addEventListener("click", async () => { t = 0; playing = true; playBtn.innerHTML = "&#10074;&#10074;"; await audio.start(0); });
scrub.addEventListener("input", () => { t = Number(scrub.value); if (playing) void audio.start(t); render(t); });
muteBtn.addEventListener("click", () => { const m = muteBtn.textContent?.includes("off"); audio.setMuted(!!m); muteBtn.textContent = m ? "Sound: muted" : "Sound: off"; if (!m) muteBtn.textContent = "Sound: on"; });
$("motionBtn").addEventListener("click", (e) => { reduced = !reduced; (e.target as HTMLElement).textContent = `Reduced motion: ${reduced ? "on" : "off"}`; });
$("fsBtn").addEventListener("click", () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); });
addEventListener("keydown", (e) => {
  if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); playBtn.click(); }
  if (e.key === "ArrowRight") t = Math.min(DURATION, t + 1 / FPS);
  if (e.key === "ArrowLeft") t = Math.max(0, t - 1 / FPS);
  if (e.key.toLowerCase() === "r") t = 0;
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
addEventListener("pointermove", (e) => { document.documentElement.style.setProperty("--mx", `${e.clientX / innerWidth * 100}%`); document.documentElement.style.setProperty("--my", `${e.clientY / innerHeight * 100}%`); });
if (reduced) ($("motionBtn") as HTMLElement).textContent = "Reduced motion: on";
setCaption(0); render(0); requestAnimationFrame(loop);
