// post.js — Nachbearbeitung wie im Film: Bloom, Farbkorrektur (warm/kühl), Vignette, feines Korn, Blende auf Schwarz.
// Alles reine Funktion von Zeit/Bildnummer, damit das Rendern reproduzierbar bleibt.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GRADE = {
  uniforms: { tDiffuse: { value: null }, blende: { value: 1 }, korn: { value: 0.035 }, bild: { value: 0 }, vig: { value: 0.32 }, kontrast: { value: 1.07 }, saett: { value: 1.08 }, waerme: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blende, korn, bild, vig, kontrast, saett, waerme; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, saett);
      c = (c - 0.5) * kontrast + 0.5;
      c += vec3(0.03, 0.005, -0.03) * waerme * (0.4 + l);         // warme Lichter
      c += vec3(-0.012, 0.0, 0.025) * waerme * (1.0 - l);         // kühle Schatten
      vec2 d = vUv - 0.5; d.x *= 0.85; float v = smoothstep(0.78, 0.18, length(d)); c *= mix(1.0 - vig, 1.0, v);
      c += (hash(vUv * 900.0 + bild * 1.7) - 0.5) * korn;
      gl_FragColor = vec4(c * blende, 1.0);
    }`
};

export function nachbearbeitung(renderer, scene, cam, W, H, opt = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: opt.samples ?? 4 });
  const comp = new EffectComposer(renderer, rt); comp.setPixelRatio(1); comp.setSize(W, H);
  comp.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), opt.bloom ?? 0.22, 0.6, 0.92); comp.addPass(bloom);
  comp.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE); comp.addPass(grade);
  return {
    comp, bloom, grade,
    /** z. B. setze({ blende: 0.5, bild: 17, waerme: 0.6 }) */
    setze(o) { for (const k of Object.keys(o)) if (grade.uniforms[k]) grade.uniforms[k].value = o[k]; },
    render() { comp.render(); renderer.getContext().finish(); }
  };
}
