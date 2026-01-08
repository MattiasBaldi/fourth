import {
  vec2, vec3, vec4, texture, exp, float, uniform, positionLocal, uv, time, hash
} from "three/tsl";
import * as THREE from "three/webgpu";
import * as boiler from "./boiler";
import { uCursor } from "./cursor";
import { simplexNoise } from "tsl-textures";
import fogNoise from "/fognoise.jpg"
import { texLoader } from "./main";

// --- GUI ---
const bgGui = boiler.renderer.inspector.createParameters("Background");

// --- Settings config ---
let bgSettings = [
  {

    speed: 1, 

    uvScale: 200,
    stripeCount: 100,
    decay: 0.96,

    radius: 1.0,
    strength: 0.25,
    falloff: 8.0,

    // Noise parameters
    noiseScale: 0.5,
    noiseStrength: 0,
    noiseBalance: 0.25,
    noiseContrast: 0,
    noiseSeed: 0,
  },
];

// --- Build uniforms + inspector ---
for (const index in bgSettings) {
  const settings = bgSettings[index];
  const uniforms: any = {};

  uniforms.speed     = uniform(settings.speed);

  uniforms.uvScale     = uniform(settings.uvScale);
  uniforms.stripeCount = uniform(settings.stripeCount);
  uniforms.decay       = uniform(settings.decay);

  uniforms.radius   = uniform(settings.radius);
  uniforms.strength = uniform(settings.strength);
  uniforms.falloff  = uniform(settings.falloff);

  // Noise uniforms
  uniforms.noiseScale    = uniform(settings.noiseScale);
  uniforms.noiseStrength = uniform(settings.noiseStrength);
  uniforms.noiseBalance  = uniform(settings.noiseBalance);
  uniforms.noiseContrast = uniform(settings.noiseContrast);
  uniforms.noiseSeed     = uniform(settings.noiseSeed);

  settings.uniforms = uniforms;

  const bgFolder = bgGui.addFolder(`🌌 background ${index}`);


  bgFolder.add(uniforms.speed, "value", 0, 10, 0.001).name("speed");

  bgFolder.add(uniforms.uvScale, "value", 1, 200, 1).name("UV Scale");
  bgFolder.add(uniforms.stripeCount, "value", 1, 200, 1).name("Stripe Count");
  bgFolder.add(uniforms.decay, "value", 0.5, 1.0, 0.01).name("Decay");

  bgFolder.add(uniforms.radius, "value", 0, 10, 0.01).name("Radius");
  bgFolder.add(uniforms.strength, "value", 0, 2, 0.01).name("Strength");
  bgFolder.add(uniforms.falloff, "value", 1, 20, 0.1).name("Falloff");


  const noiseFolder = bgGui.addFolder(`noise`);

  noiseFolder.add(uniforms.noiseScale, "value", 0, 10, 0.1).name("Noise Scale");
  noiseFolder.add(uniforms.noiseStrength, "value", 0.0, 1.0, 0.01).name("Noise Opacity");
  noiseFolder.add(uniforms.noiseBalance, "value", -1.0, 1.0, 0.01).name("Noise Balance");
  noiseFolder.add(uniforms.noiseContrast, "value", 0.0, 2.0, 0.01).name("Noise Contrast");
  noiseFolder.add(uniforms.noiseSeed, "value", 0, 1000, 1).name("Noise Seed");
}

// --- Background mesh ---
export const background = (prevTexture?: THREE.Texture) => {
  const mat = new THREE.MeshBasicNodeMaterial();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50, 1, 1),
    mat
  );

  // uniforms
  const s = bgSettings[0].uniforms;


  const speed = time.mul(s.speed)

  // UV + stripes
  const scaledUV   = uv().mul(s.uvScale);
  const snapped    = speed.mul(10).floor();
  const stripeId   = scaledUV.y.mul(s.stripeCount).floor();
  const glitchedUV = vec2(scaledUV.x.add(stripeId.add(snapped)), scaledUV.y);

  // grain
  const grain = hash(glitchedUV.add(speed)).mul(0.08);

  // Noise
  const fogNoiseTex = texLoader.load(`./fognoise.jpg`);
  const fogNoiseMap = texture( fogNoiseTex, uv().mul( s.noiseScale ) );
  const n01 = fogNoiseMap.add(float(1.0).mul(s.noiseBalance)).mul(0.5).add(0.5); // 0..1
  const maskAlpha = n01.mix(1.0, s.noiseStrength);

  // Cursor deformation (optional, additive)
  const dist = positionLocal.distance(uCursor);
  const deformation = exp(dist.pow(2).div(s.radius.pow(2)).mul(s.falloff.mul(-1))).mul(s.strength); //prettier-ignore

  // Base color with noise mask applied globally
  let baseColor = vec3(0.0, 0.0, 0.0).add(grain).mul(maskAlpha);

  // Feedback trail
  if (prevTexture) {
    const prevColor = new THREE.TextureNode(prevTexture);
    baseColor = baseColor.add(prevColor.mul(s.decay).add(deformation.mul(100)));
  }

  mat.colorNode = vec4(baseColor, 1.0);
  return mesh;
};


/*

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AppSettings, ShaderUniforms } from '../types';

const dampen = (
  obj: { value: number; velocity: number },
  target: number,
  smoothing: number = 0.25,
  dt: number = 0.016
) => {
  const l = 0.001;
  if (Math.abs(obj.value - target) <= l) {
    obj.value = target;
    return false;
  }
  const omega = 2 / Math.max(1e-4, smoothing);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = obj.value - target;
  const originalTarget = target;
  
  const maxChange = 100 * smoothing;
  change = Math.min(Math.max(change, -maxChange), maxChange);
  const temp = (obj.velocity + omega * change) * dt;
  obj.velocity = (obj.velocity - omega * temp) * exp;
  let res = (obj.value - change) + (change + temp) * exp;

  if (originalTarget - obj.value > 0 === res > originalTarget) {
    res = originalTarget;
    obj.velocity = (res - originalTarget) / dt;
  }
  obj.value = res;
  return true;
};

const COMMON_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const SIM_FRAGMENT_SHADER = `
  uniform sampler2D uPrev;
  uniform vec2 uMouse;
  uniform vec2 uRes;
  uniform float uSize;
  uniform float uDecay;
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoiseFreq;
  uniform float uNoiseAmp;

  varying vec2 vUv;

  float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
  }

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0 * vec3(x0.x,x12.x,x12.z) + h * vec3(x0.y,x12.y,x12.w);
    return 130.0 * dot(m, g);
  }

  float circle(vec2 uv, vec2 pos, vec2 res, float radius, float scale, float s1, float s2) {
      uv -= pos;
      uv.x *= res.x / res.y;
      return 1. - smoothstep(s1, s2, dot(uv, uv) * radius / scale);
  }

  void main() {
    float h = hash12(vUv * 100.0 + uTime);
    float noiseOffset = snoise(vUv * 5.0 + uTime * 0.2) * uNoiseAmp;
    vec2 offset = vec2(0.002 + noiseOffset, noiseOffset * 0.1);
    vec4 p = texture2D(uPrev, vUv + offset + (h - 0.5) * 0.001);

    float radius = 1000.0;
    float scale = uSize * uProgress;
    float circ = circle(vUv, (uMouse + 1.0) * 0.5, uRes, radius, scale, 0.0, 0.4);
    circ = pow(circ, 0.3);

    float streaks = 0.0;
    for(float i = 0.0; i < 30.0; i++) {
        float yPos = hash12(vec2(i * 123.456, 78.91));
        float drift = snoise(vec2(uTime * 0.05, i)) * 0.02;
        float speed = 0.1 + i * 0.04;
        float xNoise = snoise(vec2(vUv.x * (1.2 + i * 0.15) - uTime * speed, i * 40.0));
        float yDiff = abs(vUv.y - (yPos + drift));
        float thickness = 0.001 + 0.008 * hash12(vec2(i, i * 2.0));
        float streakLine = smoothstep(thickness, 0.0, yDiff) * smoothstep(0.1, 0.9, xNoise);
        streaks += streakLine * 0.04;
    }

    float final = (p.r * 1.0) - (uDecay * 0.5);
    float grit = (h - 0.5) * 0.015;
    float inputIntensity = clamp(circ * 0.12 + streaks + grit, 0.0, 1.0);
    final += clamp(inputIntensity - 0.092 * smoothstep(0.4, 1.0, final), 0.0, 1.0);
    final = clamp(final, 0.0, 0.98);

    gl_FragColor = vec4(final, final, final, 1.0);
  }
`;

const DISPLAY_FRAGMENT_SHADER = `
  uniform sampler2D uPrev;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uPixelScale;
  uniform float uGrain;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 pRes = uRes / uPixelScale;
    vec2 pUv = floor(vUv * pRes) / pRes;
    vec4 fbo = texture2D(uPrev, pUv);
    float val = fbo.r;
    float grain = (hash12(vUv * 1000.0 + uTime * 15.0) - 0.5) * uGrain;
    
    vec3 color = mix(vec3(0.002), uColorB, smoothstep(0.02, 0.7, val));
    color = mix(color, uColorA, smoothstep(0.3, 0.95, val));
    color += pow(val, 2.2) * 0.7;
    color += grain;
    color.r += val * 0.06;
    color.b -= val * 0.03;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface Props {
  settings: AppSettings;
}

const ShaderScene: React.FC<Props> = ({ settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rt1Ref = useRef<THREE.WebGLRenderTarget | null>(null);
  const rt2Ref = useRef<THREE.WebGLRenderTarget | null>(null);
  const simMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const displayMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const isMovingRef = useRef(false);
  const progressStateRef = useRef({ value: 0.05, velocity: 0 });
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const rtOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    };
    
    rt1Ref.current = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
    rt2Ref.current = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);

    const simUniforms: ShaderUniforms = {
      uPrev: { value: null },
      uMouse: { value: mouseRef.current },
      uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uSize: { value: settings.brushSize },
      uDecay: { value: settings.decay },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uNoiseFreq: { value: settings.noiseFreq },
      uNoiseAmp: { value: settings.noiseAmp },
      uPixelScale: { value: settings.pixelScale },
      uGrain: { value: settings.grain },
      uColorA: { value: new THREE.Color(settings.colorA) },
      uColorB: { value: new THREE.Color(settings.colorB) },
    };

    const simMaterial = new THREE.ShaderMaterial({
      vertexShader: COMMON_VERT,
      fragmentShader: SIM_FRAGMENT_SHADER,
      uniforms: simUniforms,
    });
    simMaterialRef.current = simMaterial;

    const displayMaterial = new THREE.ShaderMaterial({
      vertexShader: COMMON_VERT,
      fragmentShader: DISPLAY_FRAGMENT_SHADER,
      uniforms: {
        uPrev: { value: null },
        uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
        uPixelScale: { value: settings.pixelScale },
        uGrain: { value: settings.grain },
        uColorA: { value: new THREE.Color(settings.colorA) },
        uColorB: { value: new THREE.Color(settings.colorB) },
      },
    });
    displayMaterialRef.current = displayMaterial;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, simMaterial);
    scene.add(mesh);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (1 - e.clientY / window.innerHeight) * 2 - 1;
      isMovingRef.current = true;
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      rt1Ref.current?.setSize(w, h);
      rt2Ref.current?.setSize(w, h);
      simMaterial.uniforms.uRes.value.set(w, h);
      displayMaterial.uniforms.uRes.value.set(w, h);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    let time = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      time += 0.016;

      if (!rt1Ref.current || !rt2Ref.current || !rendererRef.current) return;

      dampen(progressStateRef.current, isMovingRef.current ? 1.0 : 0.05, 0.35, 0.016);
      isMovingRef.current = false;

      const currentRT = rt1Ref.current;
      const nextRT = rt2Ref.current;

      mesh.material = simMaterial;
      simMaterial.uniforms.uTime.value = time;
      simMaterial.uniforms.uProgress.value = progressStateRef.current.value;
      simMaterial.uniforms.uPrev.value = currentRT.texture;
      
      renderer.setRenderTarget(nextRT);
      renderer.render(scene, camera);
      
      mesh.material = displayMaterial;
      displayMaterial.uniforms.uTime.value = time;
      displayMaterial.uniforms.uPrev.value = nextRT.texture;
      
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      rt1Ref.current = nextRT;
      rt2Ref.current = currentRT;
    };

    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      rt1Ref.current?.dispose();
      rt2Ref.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (simMaterialRef.current) {
      simMaterialRef.current.uniforms.uSize.value = settings.brushSize;
      simMaterialRef.current.uniforms.uDecay.value = settings.decay;
      simMaterialRef.current.uniforms.uNoiseFreq.value = settings.noiseFreq;
      simMaterialRef.current.uniforms.uNoiseAmp.value = settings.noiseAmp;
    }
    if (displayMaterialRef.current) {
      displayMaterialRef.current.uniforms.uPixelScale.value = settings.pixelScale;
      displayMaterialRef.current.uniforms.uGrain.value = settings.grain;
      displayMaterialRef.current.uniforms.uColorA.value.set(settings.colorA);
      displayMaterialRef.current.uniforms.uColorB.value.set(settings.colorB);
    }
  }, [settings]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#050505]" />;
};

export default ShaderScene;

*/