export function animate() {
  const s = window.__fiberVisScene;
  if (!s) return;
  s.setCanvasSize();
  s.controls.update();
  s.renderer.render(s.scene, s.camera);
  requestAnimationFrame(animate);
}