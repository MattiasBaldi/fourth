import { uniform } from "three/tsl";
import * as boiler from "./boiler";
import * as THREE from "three/webgpu";


// cursor NDC uniform
export const uCursor = uniform(new THREE.Vector3(0, 0, 0));

// --- throttle setup ---
let lastUpdate = 0;
const throttleFPS = 100; // updates per second
const throttleInterval = 1000 / throttleFPS; // ms per update

function updateCursor(clientX: number, clientY: number) {
  const now = performance.now();
  if (now - lastUpdate < throttleInterval) return;
  lastUpdate = now;

  const nx = (clientX / window.innerWidth) * 2 - 1;
  const ny = -(clientY / window.innerHeight) * 2 + 1;

  const ndc = new THREE.Vector3(nx, ny, 0.5);
  ndc.unproject(boiler.camera);

  const dir = ndc.clone().sub(boiler.camera.position).normalize();
  const distance = -boiler.camera.position.z / dir.z;
  const worldPos = boiler.camera.position.clone().add(dir.multiplyScalar(distance));

  uCursor.value.copy(worldPos);
}

// --- unified event listeners ---
boiler.canvas.addEventListener("mousemove", (e) => updateCursor(e.clientX, e.clientY));

boiler.canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault(); // prevent scrolling
    if (e.touches[0]) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false }
);
