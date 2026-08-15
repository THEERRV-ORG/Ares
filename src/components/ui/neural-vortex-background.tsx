"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  precision mediump float;
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_ratio;
  uniform vec2 u_pointer_position;
  uniform float u_scroll_progress;

  vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float neuro_shape(vec2 uv, float t, float p) {
    vec2 sine_acc = vec2(0.);
    vec2 res = vec2(0.);
    float scale = 8.;
    for (int j = 0; j < 15; j++) {
      uv = rotate(uv, 1.);
      sine_acc = rotate(sine_acc, 1.);
      vec2 layer = uv * scale + float(j) + sine_acc - t;
      sine_acc += sin(layer) + 2.4 * p;
      res += (.5 + .5 * cos(layer)) / scale;
      scale *= (1.2);
    }
    return res.x + res.y;
  }

  void main() {
    vec2 uv = .5 * vUv;
    uv.x *= u_ratio;
    vec2 pointer = vUv - u_pointer_position;
    pointer.x *= u_ratio;
    float p = clamp(length(pointer), 0., 1.);
    p = .5 * pow(1. - p, 2.);
    float t = .001 * u_time;
    vec3 color = vec3(0.);
    float noise = neuro_shape(uv, t, p);
    noise = 1.2 * pow(noise, 3.);
    noise += pow(noise, 10.);
    noise = max(.0, noise - .5);
    noise *= (1. - length(vUv - .5));
    color = vec3(0.5, 0.15, 0.65);
    color = mix(color, vec3(0.02, 0.7, 0.9), 0.32 + 0.16 * sin(2.0 * u_scroll_progress + 1.2));
    color += vec3(0.15, 0.0, 0.6) * sin(2.0 * u_scroll_progress + 1.5);
    color = color * noise;
    gl_FragColor = vec4(color, noise);
  }
`;

function compileShader(gl: WebGLRenderingContext, source: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Full-bleed animated WebGL background — a mouse-reactive swirling "neural" pattern. */
export function NeuralVortexBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, tX: 0, tY: 0 });

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const parent = canvasEl?.parentElement;
    if (!canvasEl || !parent) return;

    const gl = canvasEl.getContext("webgl") ?? canvasEl.getContext("experimental-webgl");
    if (!gl || !("createShader" in gl)) return;
    const glContext = gl as WebGLRenderingContext;

    const vertexShader = compileShader(glContext, VERTEX_SHADER, glContext.VERTEX_SHADER);
    const fragmentShader = compileShader(glContext, FRAGMENT_SHADER, glContext.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = glContext.createProgram();
    if (!program) return;
    glContext.attachShader(program, vertexShader);
    glContext.attachShader(program, fragmentShader);
    glContext.linkProgram(program);
    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      console.error("Program link error:", glContext.getProgramInfoLog(program));
      return;
    }
    glContext.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);

    const positionLocation = glContext.getAttribLocation(program, "a_position");
    glContext.enableVertexAttribArray(positionLocation);
    glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

    const uTime = glContext.getUniformLocation(program, "u_time");
    const uRatio = glContext.getUniformLocation(program, "u_ratio");
    const uPointerPosition = glContext.getUniformLocation(program, "u_pointer_position");
    const uScrollProgress = glContext.getUniformLocation(program, "u_scroll_progress");

    let animationId: number;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      glContext.viewport(0, 0, canvasEl.width, canvasEl.height);
      glContext.uniform1f(uRatio, canvasEl.width / canvasEl.height);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(parent);

    const render = () => {
      const currentTime = performance.now();
      pointer.current.x += (pointer.current.tX - pointer.current.x) * 0.2;
      pointer.current.y += (pointer.current.tY - pointer.current.y) * 0.2;

      glContext.uniform1f(uTime, currentTime);
      glContext.uniform2f(
        uPointerPosition,
        pointer.current.x / parent.clientWidth,
        1 - pointer.current.y / parent.clientHeight,
      );
      glContext.uniform1f(uScrollProgress, 0);

      glContext.drawArrays(glContext.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };
    render();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      pointer.current.tX = e.clientX - rect.left;
      pointer.current.tY = e.clientY - rect.top;
    };
    parent.addEventListener("pointermove", handlePointerMove);

    return () => {
      resizeObserver.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(animationId);
      glContext.deleteProgram(program);
      glContext.deleteShader(vertexShader);
      glContext.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`} />
  );
}
