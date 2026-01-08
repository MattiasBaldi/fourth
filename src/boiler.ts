import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { Inspector } from "three/addons/inspector/Inspector.js";

const canvas = document.createElement("canvas");
canvas.style.cssText =
  "display: block; position: fixed; inset: 0; width: 100%; height: 100%;";
document.body.appendChild(canvas);

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight, false);
renderer.inspector = new Inspector();

// --- SHADOW CONFIGURATION ---
// Ensuring shadows are enabled as per your persistent settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);

camera.position.set(0, 0, 15);
const scene = new THREE.Scene();


const animationCallbacks = new Set();
function addAnimation(callback) {
  animationCallbacks.add(callback);
  return () => animationCallbacks.delete(callback);
}

function handleResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

addEventListener("resize", handleResize);

async function init() {
  await renderer.init();

  renderer.setAnimationLoop(() => {
    animationCallbacks.forEach((cb) => cb());
    renderer.render(scene, camera);
  });
}

init();

export { canvas, camera, renderer, scene , addAnimation };
