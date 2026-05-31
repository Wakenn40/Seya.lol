;(() => {
const canvas = document.getElementById('shader-bg-canvas')
if (!canvas) return

const gl = canvas.getContext('webgl2', { alpha: false, antialias: false })
if (!gl) { console.warn('WebGL2 not supported'); return }

function resize() {
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
  gl.viewport(0, 0, canvas.width, canvas.height)
}
addEventListener('resize', resize)
resize()

const vsSrc = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const fsSrc = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uRes;

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= aspect;

  float t = uTime * 0.25;

  float dist = length(p);
  float angle = atan(p.y, p.x);

  float wave1 = sin(dist * 4.0 - t * 1.5) * 0.5 + 0.5;
  float wave2 = sin((p.x * 2.5 + p.y * 1.8) + t * 1.2) * 0.5 + 0.5;
  float wave3 = sin((p.y * 2.0 - p.x * 3.0) + t * 0.9 + 1.2) * 0.5 + 0.5;
  float wave4 = sin(angle * 3.0 + dist * 3.0 + t * 0.7) * 0.5 + 0.5;

  float blend = wave1 * 0.35 + wave2 * 0.25 + wave3 * 0.25 + wave4 * 0.15;

  vec3 dark  = vec3(0.02, 0.02, 0.02);
  vec3 mid1  = vec3(0.12, 0.12, 0.12);
  vec3 mid2  = vec3(0.22, 0.22, 0.22);
  vec3 light = vec3(0.40, 0.40, 0.40);

  vec3 color = dark;
  color = mix(color, mid1, smoothstep(0.15, 0.45, blend));
  color = mix(color, mid2, smoothstep(0.40, 0.65, blend));
  color = mix(color, light, smoothstep(0.60, 0.90, blend));

  float glow = exp(-dist * 1.2);
  color += light * glow * 0.15;

  float vignette = 1.0 - dist * 0.6;
  color *= smoothstep(0.0, 0.5, vignette);

  fragColor = vec4(color, 1.0);
}`

function makeShader(type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s))
    return null
  }
  return s
}

const vs = makeShader(gl.VERTEX_SHADER, vsSrc)
if (!vs) return
const fs = makeShader(gl.FRAGMENT_SHADER, fsSrc)
if (!fs) return

const prog = gl.createProgram()
gl.attachShader(prog, vs)
gl.attachShader(prog, fs)
gl.linkProgram(prog)
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error('Program link error:', gl.getProgramInfoLog(prog))
  return
}
gl.useProgram(prog)

const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1])
const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

const aPos = gl.getAttribLocation(prog, 'aPos')
gl.enableVertexAttribArray(aPos)
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

const uTime = gl.getUniformLocation(prog, 'uTime')
const uRes = gl.getUniformLocation(prog, 'uRes')

let running = true
function loop(time) {
  if (!running) return
  gl.uniform1f(uTime, time / 1000)
  gl.uniform2f(uRes, canvas.width, canvas.height)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { running = false; return }
  running = true
  requestAnimationFrame(loop)
})
})()