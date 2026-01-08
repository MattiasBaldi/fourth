import "./style.css";
import * as boiler from "./boiler";
import * as THREE from "three/webgpu";
import { texture, vec3, exp, uniform, positionLocal, vec4, output } from "three/tsl";
import { texLoader } from "./main";
import { halftones } from "./halftones";
import { uCursor } from "./cursor";


// --- GUI ---
export const letterGui = boiler.renderer.inspector.createParameters("Letter");

// GUI-controlled deformation uniforms
export const uRadius = uniform(15.0);
export const uStrength = uniform(4.0);
export const uFalloff = uniform(10.0);

export const letter = (l: string) => {
  const mat = new THREE.MeshStandardNodeMaterial();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(25, 25, 64, 64), mat);

  mat.transparent = true;
  mat.roughness = 1;

  // --- Letter alpha mask ---
  const aMap = texLoader.load(`./textures/${l}.png`);
  const alphaMask = texture(aMap).r; // use red channel as mask

  // --- Cursor-based deformation ---
  const dist = positionLocal.distance(uCursor);
  const deformation = exp(dist.pow(2).div(uRadius.pow(2)).mul(uFalloff.mul(-1))).mul(uStrength);
  const displacedPosition = positionLocal.add(vec3(0, 0, deformation));

  mat.positionNode = displacedPosition;
  mat.opacityNode = alphaMask

  // --- Halftone output ---
  const ht = halftones(output); // returns vec4(color, alpha)

  // --- Combine halftones with letter alpha mask in OutputNode ---
  mat.outputNode = ht

  return mesh;
};

letterGui.add(uRadius, "value", 1, 50).name("radius");
letterGui.add(uStrength, "value", 0, 30).name("strength");
letterGui.add(uFalloff, "value", 1, 30).name("falloff");


// const l = letter("d");
// const create letter

