// Keyboard + mouse input. One object owns every key the game reads, so the
// loop never touches the DOM directly and shots can drive the game by hand.
export const ACTION_UP = 'up';
export const ACTION_DOWN = 'down';
export const ACTION_LEFT = 'left';
export const ACTION_RIGHT = 'right';
export const ACTION_ENTER_CAR = 'enterCar';
export const ACTION_PUNCH = 'punch';
export const ACTION_SHOOT = 'shoot';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_MISSION = 'mission';

const KEY_MAP = {
  KeyW: ACTION_UP,
  ArrowUp: ACTION_UP,
  KeyS: ACTION_DOWN,
  ArrowDown: ACTION_DOWN,
  KeyA: ACTION_LEFT,
  ArrowLeft: ACTION_LEFT,
  KeyD: ACTION_RIGHT,
  ArrowRight: ACTION_RIGHT,
  KeyE: ACTION_ENTER_CAR,
  Space: ACTION_PUNCH,
  KeyF: ACTION_SHOOT,
  Enter: ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  KeyQ: ACTION_MISSION,
};

/** Create the input state and bind it to the window. Returns the live state. */
export function createInput() {
  const held = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;

  function onKeyDown(event) {
    const action = KEY_MAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEY_MAP[event.code];
    if (action) held.delete(action);
  }
  function onMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }
  function onMouseDown(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    mouseClicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);

  return {
    held,
    pressed,
    get mouseX() {
      return mouseX;
    },
    get mouseY() {
      return mouseY;
    },
    /** True only on the frame the mouse was pressed. */
    get mouseClicked() {
      return mouseClicked;
    },
    /** True while the action's key is held down. */
    isHeld(action) {
      return held.has(action);
    },
    /** True only on the frame the action's key went down. */
    wasPressed(action) {
      return pressed.has(action);
    },
    /** Clear the one-frame pressed set; called once per frame by the loop. */
    endFrame() {
      pressed.clear();
      mouseClicked = false;
    },
  };
}
