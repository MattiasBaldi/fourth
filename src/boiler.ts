import * as THREE from "three/webgpu";
import { Inspector } from "three/addons/inspector/Inspector.js";

// Canvas setup
const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.style.cssText =
  "display: block; position: fixed; inset: 0; width: 100%; height: 100%;";
document.body.appendChild(canvas);

// Renderer setup
const renderer: THREE.WebGPURenderer = new THREE.WebGPURenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight, false);
renderer.inspector = new Inspector();

// Shadow configuration
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Camera
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 15);

// Scene
const scene: THREE.Scene = new THREE.Scene();

// --- Animation loop ---
type AnimationCallback = () => void;
const animationCallbacks: Set<AnimationCallback> = new Set();

function addAnimation(callback: AnimationCallback): () => void {
  animationCallbacks.add(callback);
  return () => animationCallbacks.delete(callback);
}

// --- Resize handler ---
function handleResize(): void {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

window.addEventListener("resize", handleResize);

// --- Init ---
async function init(): Promise<void> {
  await renderer.init();

  renderer.setAnimationLoop(() => {
    animationCallbacks.forEach((cb: AnimationCallback) => cb());
    renderer.render(scene, camera);
  });
}

init();

export { canvas, camera, renderer, scene, addAnimation };
