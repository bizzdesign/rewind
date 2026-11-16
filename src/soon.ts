/**
 * Runs `fn` on the next animation frame, or after a short timer if no frame
 * comes (background tabs and some embedded browsers get none, without
 * reporting themselves as hidden).
 */
export function soon(fn: () => void, fallbackMs = 60): void {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    fn();
  };
  requestAnimationFrame(run);
  setTimeout(run, fallbackMs);
}
