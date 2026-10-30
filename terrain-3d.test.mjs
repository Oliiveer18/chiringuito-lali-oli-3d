/* Geometry regression: desktop/mobile, dry beach, sea boundary and deck support. */
import assert from 'node:assert/strict';
import * as THREE from './lib/three.module.js';
import {
  buildCoastMeshes, sampleSandHeight, sampleWalkableHeight,
  sampleCharacterFootY, SHORE_WORLD_Z, KIOSK_DECK
} from './coast-materials.js?v=28.17.2-flat-sand';

const near = (a,b,label) => assert.ok(Math.abs(a-b)<1e-5, `${label}: ${a} vs ${b}`);
for (const coarse of [false,true]) {
  const scene = new THREE.Scene();
  const coast = buildCoastMeshes(scene,{
    coarse, sandSegments:coarse?[24,16]:[48,32],
    waterSegments:coarse?[26,13]:[52,26], pixelRatioCap:coarse?1.5:2
  });
  scene.updateMatrixWorld(true);
  const sand=coast.sandMesh, pos=sand.geometry.attributes.position;
  let shoreVertices=0;
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i);
    near(pos.getY(i)+sand.position.y,sampleSandHeight(x,z),'sampler/mesh');
    if(z>=SHORE_WORLD_Z-1e-5) near(pos.getY(i),0,'dry vertex');
    if(Math.abs(z-SHORE_WORLD_Z)<1e-5) shoreVertices++;
  }
  assert.ok(shoreVertices>0,'explicit shore row in sand');
  const ray=new THREE.Raycaster();
  for(let x=-12;x<=21;x+=1.1) for(let z=SHORE_WORLD_Z+.001;z<=10;z+=.53) {
    ray.set(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(sand)[0];
    assert.ok(hit,'dry beach ray hits mesh');
    near(hit.point.y,0,'flat rendered triangle, not only vertices');
  }
  const wp=coast.waterMesh.geometry.attributes.position;
  let waterShore=0;
  for(let i=0;i<wp.count;i++) {
    if(Math.abs(wp.getZ(i)+coast.waterMesh.position.z-SHORE_WORLD_Z)<1e-5) waterShore++;
  }
  assert.ok(waterShore>0,'explicit shore row in water');
  assert.ok(coast.waterMat.vertexShader.includes('uShoreZ - 3.0, uShoreZ'));
  assert.ok(coast.waterMat.vertexShader.includes('gerstner(pos.xz, t, w) * shoreWaveScale(pos.xz)'));
  assert.ok(coast.waterMesh.position.y<0,'calm landward water lies below dry sand');
  assert.equal(coast.waterMat.uniforms.uShoreZ.value,SHORE_WORLD_Z);
  for(const mesh of [coast.sandMesh,coast.waterMesh]) {
    mesh.geometry.dispose();mesh.material.dispose();
  }
  console.log('OK:',coarse?'mobile':'desktop','flat dry triangles, shared shore, water attenuation');
}
const d=KIOSK_DECK, cx=d.originX+d.centerX, cz=d.originZ;
for(const x of [cx-d.width/2+.001,cx,cx+d.width/2-.001])
  for(const z of [cz-d.depth/2+.001,cz,cz+d.depth/2-.001]) {
    near(sampleWalkableHeight(x,z),d.height,'whole deck support');
    near(sampleCharacterFootY(x,z),d.height+.035,'feet on deck');
  }
for(const [x,z] of [[cx-d.width/2-.001,cz],[cx+d.width/2+.001,cz],[cx,cz+d.depth/2+.001]]) {
  near(sampleWalkableHeight(x,z),0,'outside deck');
  near(sampleCharacterFootY(x,z),.035,'feet on sand');
}
// Full footprint of all eight loungers stays on dry, level sand.
for(let i=0;i<8;i++) for(const dz of [-.8,.8])
  near(sampleSandHeight(4.8+(i%4)*1.9,-2.6-Math.floor(i/4)*1.6+dz),0,'lounger support');
assert.ok(sampleSandHeight(0,SHORE_WORLD_Z-4)<-.5,'submerged seabed does not hide the sea');
console.log('OK: deck footprint, feet on both surfaces, all loungers and submerged seabed');
