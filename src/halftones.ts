import { color, mix, normalWorld , Fn, uniform, vec4, rotate, screenCoordinate, screenSize } from 'three/tsl';
import * as THREE from 'three';
import * as boiler from './boiler';

// Setup Inspector GUI
const halftoneGui = (boiler.renderer.inspector as any).createParameters("Halftone");
halftoneGui.close();


interface HalftoneSettings {
  count: number;
  color: string;
  direction: THREE.Vector3;
  start: number;
  end: number;
  mixLow: number;
  mixHigh: number;
  radius: number;
  uniforms?: {
    count: ReturnType<typeof uniform>;
    color: ReturnType<typeof uniform>;
    direction: ReturnType<typeof uniform>;
    start: ReturnType<typeof uniform>;
    end: ReturnType<typeof uniform>;
    mixLow: ReturnType<typeof uniform>;
    mixHigh: ReturnType<typeof uniform>;
    radius: ReturnType<typeof uniform>;
  };
}

let halftoneSettings: HalftoneSettings[] = [
  {
    count: 100,
    color: 'yellow',
    direction: new THREE.Vector3(0.5, 0.5, 1),
    start: 0.55,
    end: 0.2,
    mixLow: 0.5,
    mixHigh: 1,
    radius: 0.8
  },
];

for (const settings of halftoneSettings) {
  const uniforms = {
    count: uniform(settings.count),
    color: uniform(color(settings.color)),
    direction: uniform(settings.direction),
    start: uniform(settings.start),
    end: uniform(settings.end),
    mixLow: uniform(settings.mixLow),
    mixHigh: uniform(settings.mixHigh),
    radius: uniform(settings.radius),
  };
  settings.uniforms = uniforms;

  const folder = halftoneGui.addFolder(`⚪️ halftone`);
  folder.close();

  folder.addColor({ color: uniforms.color.value }, 'color');
  folder.add(uniforms.count, 'value', 1, 200, 1).name('count');
  folder.add(uniforms.direction.value, 'x', -1, 1, 0.01).listen();
  folder.add(uniforms.direction.value, 'y', -1, 1, 0.01).listen();
  folder.add(uniforms.direction.value, 'z', -1, 1, 0.01).listen();
  folder.add(uniforms.start, 'value', -1, 1, 0.01).name('start');
  folder.add(uniforms.end, 'value', -1, 1, 0.01).name('end');
  folder.add(uniforms.mixLow, 'value', 0, 1, 0.01).name('mix low');
  folder.add(uniforms.mixHigh, 'value', 0, 1, 0.01).name('mix high');
  folder.add(uniforms.radius, 'value', 0, 1, 0.01).name('radius');
}

export const halftone = Fn(
  ([count, color, direction, start, end, radius, mixLow, mixHigh]: [
    any, any, any, any, any, any, any, any
  ]) => {
    let gridUv = screenCoordinate.xy.div(screenSize.yy).mul(count);
    gridUv = rotate(gridUv, Math.PI * 0.25).mod(1);

    const orientationStrength = normalWorld
      .dot(direction.normalize())
      .remapClamp(end, start, 0, 1);

    const mask = orientationStrength
      .mul(radius)
      .mul(0.5)
      .step(gridUv.sub(0.5).length())
      .mul(mix(mixLow, mixHigh, orientationStrength));

    return vec4(color, mask);
  }
);

export const halftones = Fn(([input]: [any]) => {
  const halftonesOutput = input;

  for (const settings of halftoneSettings) {
    if (!settings.uniforms) continue;

    const halfToneOutput = halftone(
      settings.uniforms.count,
      settings.uniforms.color,
      settings.uniforms.direction,
      settings.uniforms.start,
      settings.uniforms.end,
      settings.uniforms.radius,
      settings.uniforms.mixLow,
      settings.uniforms.mixHigh
    );

    halftonesOutput.rgb.assign(mix(halftonesOutput.rgb, halfToneOutput.rgb, halfToneOutput.a));
  }

  return halftonesOutput;
});
