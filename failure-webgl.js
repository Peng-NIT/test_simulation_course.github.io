import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const host = document.querySelector("#failure-webgl-canvas");
const shell = document.querySelector("#risk-scene");
if (host && shell) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eff0);
  scene.fog = new THREE.Fog(0xe8eff0, 5.3, 9);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.05, 25);
  camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2.1;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.49;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x718086, 2.1));
  const key = new THREE.DirectionalLight(0xfff8ec, 3);
  key.position.set(-2.2, -2.8, 5.2);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaad4de, 1.1);
  fill.position.set(3, 2, 3);
  scene.add(fill);

  const mat = (color, opacity = 1, metalness = 0.08) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness, transparent: opacity < 1, opacity });
  const box = (size, position, color, opacity = 1, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color, opacity));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sphere = (radius, position, color, parent) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 16), mat(color, 1, 0.24));
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const capsule = (start, end, radius, color, parent) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(.02, a.distanceTo(b) - radius * 2), 7, 18), mat(color, 1, .15));
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const pathLine = (points, color) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
    const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color, dashSize: .08, gapSize: .055, linewidth: 2 }));
    line.computeLineDistances();
    scene.add(line);
    return line;
  };

  box([6, 5, .07], [.2, 0, -.12], 0xd9e2e2);
  box([3.7, 3.1, .16], [.45, 0, .02], 0x4a5d63);
  [[.70,.70,0x4385a3],[1.05,.18,0x68767b],[.84,-.80,0xd16c38],[.45,.15,0xd1b63e],[.62,-.35,0x7165bb]].forEach(([x,y,c])=>box([.48,.38,.045],[x,y,.12],c,.7));

  const robot = new THREE.Group();
  robot.position.set(-1.15, 0, 0);
  scene.add(robot);
  box([.42,.48,.14],[0,0,.04],0x26373d,1,robot);
  box([.30,.42,.48],[0,0,.31],0xd9dfe0,1,robot);
  const armGroups = [];
  const tips = [];
  const buildArm = side => {
    const arm = new THREE.Group();
    arm.position.set(0, side*.29, .56);
    robot.add(arm);
    armGroups.push(arm);
    sphere(.13,[0,0,0],0x354147,arm);
    const points=[[0,0,0],[.30,side*.10,.20],[.60,side*.07,.27],[.82,side*.03,.15],[1.0,0,.11]];
    for(let i=0;i<points.length-1;i++){capsule(points[i],points[i+1],i<2?.075:.055,0xd8ddde,arm);sphere(i<2?.09:.067,points[i+1],0x39444a,arm)}
    const tip=sphere(.075,points.at(-1),side>0?0x2f7893:0x43876e,arm);tips.push(tip);
  };
  buildArm(1); buildArm(-1);

  // Place the teaching exclusion volume on the left-arm sweep so the error is
  // shown by the robot itself entering the boundary, not by a detached marker.
  const hazard = box([.50,.56,.46],[-.05,.48,.35],0xee5e2e,.26);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(hazard.geometry),new THREE.LineDashedMaterial({color:0xf08a37,dashSize:.08,gapSize:.045}));
  edge.computeLineDistances(); hazard.add(edge);
  const lines = new THREE.Group(); scene.add(lines);
  [-.32,0,.32].forEach((offset,index)=>capsule([-.05,-1.45,1.35+Math.abs(index-1)*.08],[-.05,1.45,1.35+Math.abs(index-1)*.08],.025,index===1?0xde4b3f:0xc33b45,lines));

  const labels = {
    route:["ROUTE ERROR","路径穿越带电区","route_direct 将在带电区安全边界前暂停"],
    height:["HEIGHT ERROR","安全高度接近高压线","safe_z 过高，末端进入导线安全包络"],
    arms:["CLEARANCE ERROR","双臂间距不足","左右臂进入共享区时连杆净距低于阈值"]
  };
  const stopReasons={
    route:"检测到带电区侵入",
    height:"检测到高压线安全距离不足",
    arms:"检测到双臂安全间距不足"
  };
  const views={route:{p:[1.85,-2.55,1.62],t:[-.22,.35,.46]},height:{p:[3.1,-3.6,2.7],t:[-.05,0,.70]},arms:{p:[1.7,-3.1,1.7],t:[-.55,0,.55]}};
  let active="route", running=false, stopped=false, startTime=0;
  const setCase = name => {
    active=name; running=false; stopped=false;
    armGroups.forEach(arm=>{arm.rotation.set(0,0,0);arm.position.x=0});
    if(name==="route")armGroups[0].rotation.z=-.45;
    hazard.material.opacity=name==="route"?.20:.07;
    lines.children.forEach(child=>child.material.opacity=name==="height"?1:.55);
    const label=labels[name];
    document.querySelector("#failure-scene-type").textContent=label[0];
    document.querySelector("#failure-scene-title").textContent=label[1];
    document.querySelector("#failure-scene-note").textContent=label[2];
    const stopReason=document.querySelector("#failure-stop-reason");
    if(stopReason)stopReason.innerHTML=`${stopReasons[name]}<strong>操作已叫停</strong>`;
    camera.position.set(...views[name].p); controls.target.set(...views[name].t); controls.update();
  };
  const readState = () => {
    const next=["route","height","arms"].find(name=>shell.classList.contains(`case-${name}`))||"route";
    if(next!==active)setCase(next);
    if(shell.classList.contains("is-running")&&!running){running=true;stopped=false;startTime=performance.now()}
    if(shell.classList.contains("is-stopped")){running=false;stopped=true}
  };
  new MutationObserver(readState).observe(shell,{attributes:true,attributeFilter:["class"]});
  setCase("route"); readState();

  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  new ResizeObserver(resize).observe(host); resize();
  document.querySelector("#failure-webgl-loading")?.classList.add("is-hidden");
  const animate=()=>{
    requestAnimationFrame(animate); controls.update();
    let progress=0;
    if(running)progress=Math.min(.78,(performance.now()-startTime)/2450*.78);
    else if(stopped)progress=.78;
    // Three deliberately simple demonstrations.  The arm geometry is the
    // moving subject in every case and freezes at the teaching threshold.
    if(active==="route"){
      // Begin clearly outside the exclusion volume, then sweep the complete
      // left arm through its near face so the violation reads at a glance.
      // At the 0.78 safety stop the gripper is deliberately deep inside the
      // volume centre, making the forbidden intrusion unambiguous.
      armGroups[0].rotation.z=-.45+progress*.81;
      armGroups[0].rotation.y=-progress*.08;
      hazard.material.opacity=stopped?.52:.26+.14*progress;
      edge.material.color.set(stopped?0xff382c:0xf08a37);
    }else if(active==="height"){
      armGroups[1].rotation.y=-progress*.92;
      lines.children.forEach(child=>child.material.opacity=stopped?1:.62+.32*progress);
    }else{
      armGroups[0].rotation.z=-progress*.44;
      armGroups[1].rotation.z=progress*.44;
      armGroups[0].rotation.y=-progress*.08;
      armGroups[1].rotation.y=-progress*.08;
    }
    tips.forEach(tip=>{
      tip.material.emissive=new THREE.Color(stopped?0x8d130d:0x000000);
      tip.material.emissiveIntensity=stopped?.75:0;
    });
    renderer.render(scene,camera);
  };
  animate();
}
