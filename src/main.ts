import "./style.css";
import * as boiler from "./boiler";
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import { letter } from "./letter.js";
import { background} from "./background.js";

export const texLoader = new THREE.TextureLoader();

const l = letter("d");
const bg = background();

boiler.scene.add(l, bg);
