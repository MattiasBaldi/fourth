import { uniform } from "three/tsl";
import * as boiler from "./boiler";
import * as THREE from "three/webgpu";

// cursor NDC uniform
export const uCursor = uniform(new THREE.Vector3(0, 0, 0));

// --- throttle setup ---
let lastUpdate = 0;
const throttleFPS = 100; // updates per second
const throttleInterval = 1000 / throttleFPS; // ms per update

window.addEventListener("mousemove", (e) => {
  const now = performance.now();
  if (now - lastUpdate < throttleInterval) return;
  lastUpdate = now;

  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;

  const ndc = new THREE.Vector3(nx, ny, 0.5); // z=0.5 in NDC space
  ndc.unproject(boiler.camera); // convert to world space

  // If you want the intersection with z=0 plane:
  const dir = ndc.clone().sub(boiler.camera.position).normalize();
  const distance = -boiler.camera.position.z / dir.z;
  const worldPos = boiler.camera.position.clone().add(dir.multiplyScalar(distance));

  uCursor.value.copy(worldPos);
});

// export cursorCircle = Fn