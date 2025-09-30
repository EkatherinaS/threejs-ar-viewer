const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.5 })
);
const viewer = new window.Site3dAR();
viewer.on(box, (options = { heightRange: { min: -3, max: 3 } }));
