/* ============================================================
   Lumina Noir — immersive effects
   1. Liquid metal shader background (hero)
   2. 3D geometric artifact (services)
   3. Cyber particle system (about)
   4. Contact form micro-interaction (mailto)
   All effects respect prefers-reduced-motion and pause offscreen.
   ============================================================ */
(() => {
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

// run a rAF loop only while the element is on screen and the tab is visible
function animateWhileVisible(el, draw) {
  let onScreen = false, rafId = 0, running = false;
  const tick = (t) => {
    if (!running) return;
    draw(t);
    rafId = requestAnimationFrame(tick);
  };
  const update = () => {
    const should = onScreen && !document.hidden;
    if (should && !running) { running = true; rafId = requestAnimationFrame(tick); }
    if (!should && running) { running = false; cancelAnimationFrame(rafId); }
  };
  new IntersectionObserver(es => {
    onScreen = es[0].isIntersecting;
    update();
  }).observe(el);
  document.addEventListener('visibilitychange', update);
}

// shared, smoothed pointer position in [0,1] — drives shader + artifact
const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
window.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX / window.innerWidth;
  pointer.y = e.clientY / window.innerHeight;
}, { passive: true });
function smoothPointer(k) {
  pointer.sx += (pointer.x - pointer.sx) * k;
  pointer.sy += (pointer.y - pointer.sy) * k;
}

/* ============ 1. LIQUID METAL SHADER (hero) ============ */
(function liquidMetal() {
  const canvas = document.getElementById('liquid-bg');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { canvas.remove(); return; }

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=uv*vec2(uRes.x/uRes.y,1.)*2.6;
  vec2 m=(uMouse-.5)*.55;
  float t=uTime*.055;
  vec2 q=vec2(fbm(p+t), fbm(p-t*.7+3.2));
  float f=fbm(p+q*1.6+m+vec2(t*.4,-t*.25));
  float ridge=pow(.5+.5*sin(f*11.+t*1.6),3.);
  vec3 base=vec3(.055,.075,.082);
  vec3 steel=vec3(.5,.62,.66);
  vec3 cyan=vec3(.024,.714,.831);
  vec3 col=base+ridge*.085*mix(steel,cyan,.45);
  col+=cyan*.06*smoothstep(.55,.95,f)*ridge;
  col*=1.-.55*distance(uv,vec2(.5,.55));
  gl_FragColor=vec4(col,1.);
}`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(1, w * DPR);
    canvas.height = Math.max(1, h * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(t) {
    smoothPointer(0.035);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t / 1000);
    gl.uniform2f(uMouse, pointer.sx, 1 - pointer.sy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (REDUCED) { draw(0); return; }   // single static frame
  animateWhileVisible(canvas, draw);
})();

/* ============ 2. 3D GEOMETRIC ARTIFACT (services) ============ */
(function artifact() {
  const canvas = document.getElementById('artifact');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const SIZE = 190;
  canvas.width = SIZE * DPR;
  canvas.height = SIZE * DPR;
  ctx.scale(DPR, DPR);

  // icosahedron: 12 vertices from cyclic permutations of (0, ±1, ±φ)
  const PHI = (1 + Math.sqrt(5)) / 2;
  const verts = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) {
    verts.push([0, a, b], [a, b, 0], [b, 0, a]);
  }
  const len = Math.hypot(1, PHI);
  verts.forEach(v => { v[0] /= len; v[1] /= len; v[2] /= len; });

  // edges = vertex pairs at the minimum distance
  const edges = [];
  const minD = 2 / len;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const d = Math.hypot(verts[i][0]-verts[j][0], verts[i][1]-verts[j][1], verts[i][2]-verts[j][2]);
      if (d < minD * 1.05) edges.push([i, j]);
    }
  }

  let rx = 0.4, ry = 0.2;
  function draw(t) {
    smoothPointer(0.035);
    ry = t * 0.00028 + (pointer.sx - 0.5) * 0.9;
    rx = 0.45 + Math.sin(t * 0.00016) * 0.25 + (pointer.sy - 0.5) * 0.6;

    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const pts = verts.map(([x, y, z]) => {
      let X = x * cy + z * sy, Z = -x * sy + z * cy;      // rotate Y
      let Y = y * cx - Z * sx; Z = y * sx + Z * cx;       // rotate X
      const s = (SIZE * 0.36) / (Z + 2.6) * 2.6;
      return [SIZE / 2 + X * s, SIZE / 2 + Y * s, Z];
    });

    ctx.clearRect(0, 0, SIZE, SIZE);

    // orbital ring
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE * 0.46, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6,182,212,.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // wireframe edges, alpha keyed to depth
    for (const [i, j] of edges) {
      const depth = ((pts[i][2] + pts[j][2]) / 2 + 1) / 2;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.strokeStyle = `rgba(6,182,212,${0.14 + depth * 0.5})`;
      ctx.lineWidth = 0.8 + depth * 0.6;
      ctx.stroke();
    }

    // glowing vertices
    ctx.shadowColor = 'rgba(6,182,212,.9)';
    for (const [x, y, z] of pts) {
      const depth = (z + 1) / 2;
      ctx.shadowBlur = 3 + depth * 6;
      ctx.beginPath();
      ctx.arc(x, y, 1 + depth * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,235,245,${0.35 + depth * 0.6})`;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  if (REDUCED) { draw(8000); return; }
  animateWhileVisible(canvas, draw);
})();

/* ============ 3. CYBER PARTICLE SYSTEM (about) ============ */
(function particles() {
  const canvas = document.getElementById('cyber-particles');
  if (!canvas) return;
  const section = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, motes = [];

  function build() {
    W = section.clientWidth; H = section.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.max(25, Math.min(80, Math.round((W * H) / 26000)));
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.14,
      vy: -0.04 - Math.random() * 0.14,
      base: 0.12 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.9,
      cyan: Math.random() > 0.25,
    }));
  }
  build();
  window.addEventListener('resize', build);

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy;
      if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
      if (m.x < -4) m.x = W + 4;
      if (m.x > W + 4) m.x = -4;
      const a = m.base * (0.55 + 0.45 * Math.sin(t * 0.001 * m.speed + m.phase));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      if (m.r > 1.4) { ctx.shadowColor = 'rgba(6,182,212,.8)'; ctx.shadowBlur = 8; }
      ctx.fillStyle = m.cyan ? `rgba(6,182,212,${a})` : `rgba(232,237,238,${a * 0.8})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  if (REDUCED) { draw(1000); return; }
  animateWhileVisible(canvas, draw);
})();

/* ============ 4. CONTACT FORM → MAILTO ============ */
(function contactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cf-name').value.trim();
    const email = document.getElementById('cf-email').value.trim();
    const msg = document.getElementById('cf-msg').value.trim();
    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    window.location.href = `mailto:aletamarklemer13@gmail.com?subject=${subject}&body=${body}`;
  });
})();

})();
