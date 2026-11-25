// "Fancy" graphics: HDR rendering with bloom so the sun, rings, lights, candy and fireworks glow.
// (Real ray tracing isn't available in iPad browsers; together with reflective water and sky lighting
// in world/kit.js, this gives a similar glowing, reflective look.)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.composer = null;
  }
  setup(scene, camera, { strength = 0.5, radius = 0.55, threshold = 0.86 } = {}) {
    this.dispose();
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(r, rt);
    c.setPixelRatio(1);
    c.setSize(size.x, size.y);
    c.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), strength, radius, threshold);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }
  resize() {
    if (!this.composer) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer.setSize(size.x, size.y);
  }
  render() { this.composer.render(); }
  dispose() {
    if (this.composer) { this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); this.bloom?.dispose(); }
    this.composer = null;
  }
}
