import { clamp, screenToCanvas } from './utils.js';

export default class InputManager {
  constructor({ screenWidth, screenHeight, cursorX = screenWidth * 0.5, cursorY = screenHeight * 0.5 }) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.cursor = {
      x: cursorX,
      y: cursorY,
      active: false,
      down: false,
    };
    this.keys = Object.create(null);
    this.actions = Object.create(null);
    this.pressed = Object.create(null);
    this.pointerPressed = false;
    this.pointerFramePressed = false;
    this.canvas = null;
    this.listeners = [];
  }

  attach(canvas) {
    this.detach();
    this.canvas = canvas;

    this.addListener(globalThis, 'keydown', (event) => {
      this.keys[event.code] = true;
    });

    this.addListener(globalThis, 'keyup', (event) => {
      this.keys[event.code] = false;
    });

    this.addListener(globalThis, 'blur', () => {
      this.clearState();
    });

    this.addListener(canvas, 'contextmenu', (event) => {
      event.preventDefault();
    });

    this.addListener(canvas, 'mousemove', (event) => {
      this.updateCursor(event.clientX, event.clientY);
      this.cursor.active = true;
    });

    this.addListener(canvas, 'mouseenter', () => {
      this.cursor.active = true;
    });

    this.addListener(canvas, 'mouseleave', () => {
      this.cursor.active = false;
      this.cursor.down = false;
    });

    this.addListener(canvas, 'mousedown', (event) => {
      this.updateCursor(event.clientX, event.clientY);
      this.cursor.active = true;
      this.cursor.down = true;
      this.pointerPressed = true;
      event.preventDefault();
    });

    this.addListener(globalThis, 'mouseup', () => {
      this.cursor.down = false;
    });

    this.addListener(canvas, 'touchstart', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.updateCursor(touch.clientX, touch.clientY);
      this.cursor.active = true;
      this.cursor.down = true;
      this.pointerPressed = true;
      event.preventDefault();
    }, { passive: false });

    this.addListener(canvas, 'touchmove', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.updateCursor(touch.clientX, touch.clientY);
      this.cursor.active = true;
      event.preventDefault();
    }, { passive: false });

    this.addListener(canvas, 'touchend', () => {
      this.cursor.down = false;
    }, { passive: false });

    this.addListener(canvas, 'touchcancel', () => {
      this.cursor.down = false;
    }, { passive: false });
  }

  detach() {
    for (const listener of this.listeners) {
      listener.target.removeEventListener(listener.type, listener.handler, listener.options);
    }
    this.listeners.length = 0;
  }

  addListener(target, type, handler, options = undefined) {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler, options });
  }

  update(dt) {
    const previousActions = this.actions;
    const nextActions = Object.create(null);
    const gamepad = this.getPrimaryGamepad();

    let moveX = 0;
    let moveY = 0;

    if (this.keys.ArrowLeft || this.keys.KeyA) moveX -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) moveX += 1;
    if (this.keys.ArrowUp || this.keys.KeyW) moveY -= 1;
    if (this.keys.ArrowDown || this.keys.KeyS) moveY += 1;

    moveX += this.getAxis(gamepad, 0) + this.getAxis(gamepad, 2);
    moveY += this.getAxis(gamepad, 1) + this.getAxis(gamepad, 3);

    if (moveX !== 0 || moveY !== 0) {
      const speed = 0.24 * dt;
      this.cursor.x = clamp(this.cursor.x + moveX * speed, 0, this.screenWidth - 1);
      this.cursor.y = clamp(this.cursor.y + moveY * speed, 0, this.screenHeight - 1);
      this.cursor.active = true;
    }

    nextActions.confirm = Boolean(this.keys.Enter || this.keys.Space || this.pointerPressed || this.getButton(gamepad, 0) || this.getButton(gamepad, 9));
    nextActions.fire = Boolean(this.keys.Space || this.keys.Enter || this.pointerPressed || this.getButton(gamepad, 0));
    nextActions.back = Boolean(this.keys.Escape || this.keys.Backspace || this.getButton(gamepad, 1));
    nextActions.pause = Boolean(this.keys.Escape || this.getButton(gamepad, 8) || this.getButton(gamepad, 9));
    nextActions.instructions = Boolean(this.keys.KeyI || this.getButton(gamepad, 3));
    nextActions.nextBattery = Boolean(this.keys.KeyE || this.keys.BracketRight || this.getButton(gamepad, 5));
    nextActions.prevBattery = Boolean(this.keys.KeyQ || this.keys.BracketLeft || this.getButton(gamepad, 4));
    nextActions.battery1 = Boolean(this.keys.Digit1);
    nextActions.battery2 = Boolean(this.keys.Digit2);
    nextActions.battery3 = Boolean(this.keys.Digit3);

    this.pressed = Object.create(null);
    for (const action of Object.keys(nextActions)) {
      this.pressed[action] = Boolean(nextActions[action] && !previousActions[action]);
    }

    this.actions = nextActions;
    this.pointerFramePressed = this.pointerPressed;
    this.pointerPressed = false;
  }

  clearState() {
    this.keys = Object.create(null);
    this.actions = Object.create(null);
    this.pressed = Object.create(null);
    this.cursor.down = false;
    this.pointerPressed = false;
    this.pointerFramePressed = false;
  }

  updateCursor(clientX, clientY) {
    if (!this.canvas) return;
    const point = screenToCanvas(clientX, clientY, this.canvas.getBoundingClientRect(), this.screenWidth, this.screenHeight);
    this.cursor.x = point.x;
    this.cursor.y = point.y;
  }

  isDown(action) {
    return Boolean(this.actions[action]);
  }

  wasPressed(action) {
    return Boolean(this.pressed[action]);
  }

  getPrimaryGamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad) return pad;
    }
    return null;
  }

  getButton(gamepad, index) {
    if (!gamepad || !gamepad.buttons[index]) return false;
    return gamepad.buttons[index].pressed;
  }

  getAxis(gamepad, index) {
    if (!gamepad || typeof gamepad.axes[index] !== 'number') return 0;
    const value = gamepad.axes[index];
    return Math.abs(value) >= 0.2 ? value : 0;
  }
}