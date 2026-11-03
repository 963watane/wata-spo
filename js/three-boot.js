// Loads three.js (the 3D engine) and the extras the action battles use, then
// tells the rest of the game it is ready. The game itself is plain scripts, so
// everything is exposed on window: THREE, and THREE_X for the add-ons.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js/+esm';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js/+esm';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js/+esm';

window.THREE = THREE;
window.THREE_X = { GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, SkeletonUtils };
window.dispatchEvent(new Event('three-ready'));
