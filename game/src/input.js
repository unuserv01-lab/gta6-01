// SPDX-License-Identifier: MIT
// Live Heist — keyboard + mouse input.
// One tiny object owns every key and click so the game loop never
// touches the DOM events directly.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    pressed: new Set(),
    anyKey: false,
  };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    input.anyKey = true;
  });

  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.pressed.clear();
    input.mouse.down = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });

  canvas.addEventListener('mousedown', (e) => {
    input.mouse.down = true;
    input.mouse.clicked = true;
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });

  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function isDown(input, ...names) {
  return names.some((n) => input.keys.has(n));
}

export function wasPressed(input, name) {
  return input.pressed.has(name);
}

export function endFrame(input) {
  input.pressed.clear();
  input.mouse.clicked = false;
  input.anyKey = false;
}
