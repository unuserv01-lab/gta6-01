// LIVE HEIST — input.js
// Keyboard + mouse, nothing else. Edge-triggered actions are consumed by takeActions()
// so a single key press never fires twice across frames.

export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_ENTER_CAR = 1 << 2;
export const ACTION_PUNCH = 1 << 3;
export const ACTION_SHOOT = 1 << 4;
export const ACTION_ROB = 1 << 5;
export const ACTION_MISSION = 1 << 6;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM | ACTION_PUNCH,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyE: ACTION_ENTER_CAR | ACTION_ROB,
  KeyM: ACTION_MISSION,
};

/** Create the input state for a canvas. Call takeActions() once per frame. */
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let hadFocus = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('click', () => {
    hadFocus = true;
  });

  return {
    keys,
    mouse,

    /** WASD / arrow movement axis, normalised, in screen space (y down). */
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },

    /** True while the run key (Shift) is held. */
    running() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },

    /** True while E is held (robbery hold, car entry). */
    holdingE() {
      return keys.has('KeyE');
    },

    /** Edge-triggered actions pressed since the last takeActions() call. */
    takeActions() {
      let actions = 0;
      for (const code of pressed) {
        actions |= KEY_ACTIONS[code] ?? 0;
      }
      pressed.clear();
      if (mouse.clicked) {
        actions |= ACTION_CONFIRM | ACTION_SHOOT;
        mouse.clicked = false;
      }
      return actions;
    },

    /** True when the player has clicked or pressed a key at least once (audio unlock). */
    interacted() {
      return hadFocus || keys.size > 0 || mouse.down;
    },
  };
}
