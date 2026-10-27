import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const host = document.querySelector("#webgl-canvas");
if (host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7eff0);
  scene.fog = new THREE.Fog(0xe7eff0, 5.4, 9.5);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 30);
  camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.2;
  controls.maxDistance = 6.2;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.screenSpacePanning = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x728087, 2.15));
  const key = new THREE.DirectionalLight(0xfff8ed, 3.1);
  key.position.set(-2.2, -3, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8d2dd, 1.15);
  fill.position.set(3, 2, 3.5);
  scene.add(fill);

  const interactive = [];
  const descriptions = {
    robot: ["双臂协作机器人", "两条6DOF机械臂共享基座，主臂执行操作，辅臂稳定工件或设施。", "双臂避碰"],
    table: ["扩展检修工作台", "不同颜色对应拆装、检测、绝缘防护和剥线接线工位。", "区域映射"],
    hazard: ["随机带电区域", "禁止区域位于准备区与目标工位之间，要求轨迹从侧方安全绕行。", "禁止穿越"],
    lines: ["上方高压线", "架空导线限制机械臂无限抬高末端，是路径规划的高度约束。", "高度限制"],
    stationA: ["拆装工位", "用于熔断器轴向插装、端子精密插入及母排就位。", "目标对准"],
    stationC: ["检测操作工位", "用于验电笔检测和绝缘操作杆定向操作。", "工具姿态"],
    stationE: ["剥线接线协作工位", "左臂固定导线，右臂完成简化剥线，随后进行端接。", "双臂协作"]
  };

  const material = (color, opacity = 1, metalness = 0.08) => new THREE.MeshStandardMaterial({
    color, roughness: 0.48, metalness, transparent: opacity < 1, opacity
  });
  const addInteractive = (object, name) => {
    object.name = name;
    object.userData.infoKey = name;
    interactive.push(object);
    return object;
  };
  const box = (size, position, color, opacity = 1) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, opacity));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const localBox = (parent, size, position, color) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, 1, 0.18));
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sphere = (parent, radius, position, color) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), material(color, 1, 0.25));
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const capsule = (parent, start, end, radius, color) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.02, a.distanceTo(b) - radius * 2), 8, 20),
      material(color, 1, 0.16)
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  box([6.2, 5.2, 0.07], [0.2, 0, -0.12], 0xd9e2e2);
  addInteractive(box([3.75, 3.12, 0.16], [0.45, 0, 0.02], 0x4b5e63), "table");

  const stations = [
    ["stationA", 0.70, 0.70, 0x4385a3], ["stationB", 1.06, 0.17, 0x69777c],
    ["stationC", 0.84, -0.80, 0xd16d39], ["stationD", 0.45, 0.15, 0xd1b63e],
    ["stationE", 0.62, -0.35, 0x7164bb]
  ];
  stations.forEach(([name, x, y, color]) => {
    const pad = box([0.48, 0.38, 0.045], [x, y, 0.12], color, 0.72);
    if (descriptions[name]) addInteractive(pad, name);
  });

  const robot = new THREE.Group();
  robot.position.set(-1.15, 0, 0);
  scene.add(robot);
  addInteractive(robot, "robot");
  localBox(robot, [0.42, 0.48, 0.14], [0, 0, 0.04], 0x27373e);
  localBox(robot, [0.30, 0.42, 0.48], [0, 0, 0.31], 0xd9dfe0);

  const buildArm = side => {
    const arm = new THREE.Group();
    arm.position.set(0, side * 0.29, 0.56);
    robot.add(arm);
    sphere(arm, 0.13, [0, 0, 0], 0x354147);
    const points = [[0, 0, 0], [0.30, side * 0.10, 0.20], [0.60, side * 0.07, 0.27], [0.82, side * 0.03, 0.15], [1.0, 0, 0.11]];
    points.slice(0, -1).forEach((point, index) => {
      capsule(arm, point, points[index + 1], index < 2 ? 0.075 : 0.055, 0xd8ddde);
      sphere(arm, index < 2 ? 0.09 : 0.068, points[index + 1], 0x39444a);
    });
    const grip = new THREE.Group();
    grip.position.set(...points.at(-1));
    arm.add(grip);
    localBox(grip, [0.12, 0.13, 0.055], [0, 0, 0], 0x202b30);
    localBox(grip, [0.12, 0.025, 0.12], [0.02, 0.065, -0.07], 0xaeb8ba);
    localBox(grip, [0.12, 0.025, 0.12], [0.02, -0.065, -0.07], 0xaeb8ba);
  };
  buildArm(1);
  buildArm(-1);

  const hazard = addInteractive(box([0.42, 0.48, 0.42], [0.25, 0.48, 0.33], 0xee6b32, 0.23), "hazard");
  const hazardEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(hazard.geometry),
    new THREE.LineDashedMaterial({ color: 0xf08a37, dashSize: 0.08, gapSize: 0.045 })
  );
  hazardEdge.computeLineDistances();
  hazard.add(hazardEdge);

  const lines = new THREE.Group();
  scene.add(lines);
  addInteractive(lines, "lines");
  [-0.32, 0, 0.32].forEach((offset, index) => {
    capsule(lines, [-0.05, -1.45, 1.35 + Math.abs(index - 1) * 0.08], [-0.05, 1.45, 1.35 + Math.abs(index - 1) * 0.08], 0.025, index === 1 ? 0xde4b3f : 0xc33b45);
  });
  [-1.34, 1.34].forEach(y => [-0.32, 0, 0.32].forEach((offset, index) => {
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 24), material(0xf2f4f2));
    support.position.set(-0.05, y, 1.49 + Math.abs(index - 1) * 0.08);
    support.rotation.x = Math.PI / 2;
    lines.add(support);
  }));

  const views = {
    overview: { position: [3.8, -4.2, 3.1], target: [0.05, 0, 0.38] },
    top: { position: [0.35, -0.01, 5.5], target: [0.25, 0, 0] },
    robot: { position: [1.65, -3.2, 1.65], target: [-0.65, 0, 0.45] },
    hazard: { position: [2.55, -2.4, 2.15], target: [0.35, 0.18, 0.38] }
  };
  const selectInfo = key => {
    const content = descriptions[key] || descriptions.robot;
    document.querySelector("#webgl-title").textContent = content[0];
    document.querySelector("#webgl-copy").textContent = content[1];
    document.querySelector("#webgl-tag").textContent = content[2];
  };
  const setView = name => {
    const view = views[name];
    camera.position.set(...view.position);
    controls.target.set(...view.target);
    controls.update();
    document.querySelectorAll("[data-webgl-view]").forEach(button => button.classList.toggle("active", button.dataset.webglView === name));
  };
  document.querySelectorAll("[data-webgl-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.webglView)));
  setView("overview");

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener("pointerdown", event => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, true)[0];
    if (!hit) return;
    let object = hit.object;
    while (object && !object.userData.infoKey) object = object.parent;
    if (object?.userData.infoKey) selectInfo(object.userData.infoKey);
  });

  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(host);
  resize();
  document.querySelector("#webgl-loading")?.classList.add("is-hidden");

  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hazard.material.opacity = 0.19 + 0.045 * (1 + Math.sin(clock.getElapsedTime() * 2.1));
    }
    renderer.render(scene, camera);
  };
  animate();
}
