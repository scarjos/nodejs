// Actions
const ACTIONS = Object.freeze({
  MOVE_UP: 'moveUp',
  MOVE_DOWN: 'moveDown',
  MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight',
  START_OF_LINE: 'startOfLine',
  END_OF_LINE: 'endOfLine',
  START_OF_DOCUMENT: 'startOfDocument',
  END_OF_DOCUMENT: 'endOfDocument',
  DELETE_LINE: 'deleteLine',
  DELETE_WORD: 'deleteWord',
  YANK_LINE: 'yankLine',
  YANK_WORD: 'yankWord',
  MOVE_WORD_FORWARD: 'moveWordForward',
  MOVE_WORD_BACKWARD: 'moveWordBackward',
  INSERT_CHAR: 'insertChar',
  SELECT_LEFT: 'selectLeft',
  SELECT_RIGHT: 'selectRight',
  SELECT_UP: 'selectUp',
  SELECT_DOWN: 'selectDown',
  EXECUTE_COMMAND: 'executeCommand',
  APPEND_COMMAND_CHAR: 'appendCommandChar',
  // Add other actions as needed
});

// States
const STATES = Object.freeze({
  NORMAL: 'normal',
  INSERT: 'insert',
  VISUAL: 'visual',
  COMMAND: 'command',
  G_PRESSED: 'g_pressed',
  D_PRESSED: 'd_pressed',
  Y_PRESSED: 'y_pressed',
  // Add other states as needed
});

// State machine definition
const stateChart = {
  initial: STATES.NORMAL,
  states: {
    [STATES.NORMAL]: {
      on: {
        'h': ACTIONS.MOVE_LEFT,
        'j': ACTIONS.MOVE_DOWN,
        'k': ACTIONS.MOVE_UP,
        'l': ACTIONS.MOVE_RIGHT,
        'w': ACTIONS.MOVE_WORD_FORWARD,
        'b': ACTIONS.MOVE_WORD_BACKWARD,
        '0': ACTIONS.START_OF_LINE,
        '$': ACTIONS.END_OF_LINE,
        'i': STATES.INSERT,
        'v': STATES.VISUAL,
        ':': STATES.COMMAND,
        'g': STATES.G_PRESSED,
        'd': STATES.D_PRESSED,
        'y': STATES.Y_PRESSED,
        // Define other key transitions
      },
    },
    [STATES.INSERT]: {
      on: {
        'Escape': STATES.NORMAL,
        '*': ACTIONS.INSERT_CHAR,
      },
    },
    [STATES.VISUAL]: {
      on: {
        'h': ACTIONS.SELECT_LEFT,
        'j': ACTIONS.SELECT_DOWN,
        'k': ACTIONS.SELECT_UP,
        'l': ACTIONS.SELECT_RIGHT,
        'Escape': STATES.NORMAL,
        // Handle other keys in visual mode
      },
    },
    [STATES.G_PRESSED]: {
      on: {
        'g': ACTIONS.START_OF_DOCUMENT,
        '*': STATES.NORMAL,
      },
    },
    [STATES.D_PRESSED]: {
      on: {
        'd': ACTIONS.DELETE_LINE,
        'w': ACTIONS.DELETE_WORD,
        '*': STATES.NORMAL,
      },
    },
    [STATES.Y_PRESSED]: {
      on: {
        'y': ACTIONS.YANK_LINE,
        'w': ACTIONS.YANK_WORD,
        '*': STATES.NORMAL,
      },
    },
    [STATES.COMMAND]: {
      on: {
        'Enter': ACTIONS.EXECUTE_COMMAND,
        'Escape': STATES.NORMAL,
        '*': ACTIONS.APPEND_COMMAND_CHAR,
      },
    },
  },
};

// KeyStateMachine class
class KeyStateMachine {
  constructor(stateChart, editor) {
    this.stateChart = stateChart;
    this.currentState = stateChart.initial;
    this.editor = editor;
    this.timeoutId = null;
    this.commandBuffer = '';
  }

  handleEvent(event) {
    clearTimeout(this.timeoutId);

    const keyName = this.getKeyName(event);
    const stateDefinition = this.stateChart.states[this.currentState];
    const transitions = stateDefinition.on || {};

    let actionOrState = transitions[keyName] || transitions['*'];

    if (actionOrState) {
      if (Object.values(STATES).includes(actionOrState)) {
        this.currentState = actionOrState;
        console.log(`Transitioned to state: ${this.currentState}`);
      } else if (Object.values(ACTIONS).includes(actionOrState)) {
        this.performAction(actionOrState, event);
        // Don't reset to initial state if in INSERT or COMMAND mode
        if (![STATES.INSERT, STATES.COMMAND].includes(this.currentState)) {
          this.currentState = this.stateChart.initial;
        }
      }
    } else {
      console.log(`No action for key ${keyName} in state ${this.currentState}`);
      this.currentState = this.stateChart.initial;
    }

    // Reset state after timeout (except for INSERT and COMMAND modes)
    if (![STATES.INSERT, STATES.COMMAND].includes(this.currentState)) {
      this.timeoutId = setTimeout(() => {
        if (this.currentState !== this.stateChart.initial) {
          this.currentState = this.stateChart.initial;
          console.log(`State reset to: ${this.currentState} due to timeout`);
        }
      }, 1000); // 1-second timeout
    }
  }

  getKeyName(event) {
    return event.key;
  }

  performAction(actionName, event) {
    console.log(`Performing action: ${actionName}`);
    if (this.editor && typeof this.editor[actionName] === 'function') {
      this.editor[actionName](event);
    }
  }
}

// Editor class
class Editor {
  static shortcuts = {
    'Ctrl+S': 'saveDocument',
    'Ctrl+Z': 'undoAction',
    'Ctrl+Y': 'redoAction',
    'Ctrl+Shift+P': 'printPreview',
  };

  constructor() {
    this.canvas = document.querySelector('canvas') || document.createElement('canvas');
    this._selection = { onchange: null };
    this.keyStateMachine = new KeyStateMachine(stateChart, this);
    this.bindEvents();
    this.commandBuffer = '';
    }

    bindMethods(methodNames) {
        methodNames.forEach((method) => {
            this[method] = this[method].bind(this);
        });
    }

  // Define action methods
  moveUp() { console.log('Moving up'); }
  moveDown() { console.log('Moving down'); }
  moveLeft() { console.log('Moving left'); }
  moveRight() { console.log('Moving right'); }
  moveWordForward() { console.log('Moving word forward'); }
  moveWordBackward() { console.log('Moving word backward'); }
  startOfLine() { console.log('Moved to start of line'); }
  endOfLine() { console.log('Moved to end of line'); }
  startOfDocument() { console.log('Moved to start of document'); }
  endOfDocument() { console.log('Moved to end of document'); }
  deleteLine() { console.log('Line deleted'); }
  deleteWord() { console.log('Word deleted'); }
  yankLine() { console.log('Line yanked'); }
  yankWord() { console.log('Word yanked'); }
  insertChar(event) { console.log(`Inserted character: ${event.key}`); }
  selectLeft() { console.log('Selecting left'); }
  selectRight() { console.log('Selecting right'); }
  selectUp() { console.log('Selecting up'); }
  selectDown() { console.log('Selecting down'); }
  executeCommand() { console.log(`Executing command: ${this.commandBuffer}`); this.commandBuffer = ''; }
  appendCommandChar(event) { this.commandBuffer += event.key; console.log(`Command buffer: ${this.commandBuffer}`); }

  handleKeyDown(event) {
    this.keyStateMachine.handleEvent(event);
  }

  handleKeyUp(event) {
    // Handle keyup if needed
  }

  saveDocument() { console.log('Document saved.'); }
  undoAction() { console.log('Undo action performed.'); }
  redoAction() { console.log('Redo action performed.'); }
  printPreview() { console.log('Print preview opened.'); }
  clearKeyModifiers() { }

  // Placeholder methods for the event handlers
  handleMouseDown() {}
  handleMouseMove() {}
  handleMouseUp() {}
  handleTouchStart() {}
  handleTouchMove() {}
  handleTouchEnd() {}
  render() {}
  selectionChange() {}

  bindEvents() {
 const bind = (target, events) => {
        for (const [type, handler, options] of events) {
            const resolvedHandler = typeof handler === 'string' ? this[handler].bind(this) : handler;
            target.addEventListener(type, resolvedHandler, options || false);
        }
    };

    bind(this.canvas, [
        ['mousedown', 'handleMouseDown'],
        ['mousemove', 'handleMouseMove'],
        ['mouseup', 'handleMouseUp'],
        ['mouseleave', 'handleMouseUp'],
        ['touchstart', 'handleTouchStart'],
        ['touchmove', 'handleTouchMove'],
        ['touchend', 'handleTouchEnd'],
    ]);

    bind(document, [
        ['keydown', 'handleKeyDown', true],
        ['keyup', 'handleKeyUp', true],
    ]);
    const {
        clearKeyModifiers,
        render,
        selectionChange,
    } = this;

    // Window events
    bind(window, [
      ['focus', () => {
        clearKeyModifiers();
        render();
      }, true],
    ]);

    this._selection.onchange = selectionChange.bind(this);
  }
}

// Utility functions
const bind = (target, events) => {
  for (const [type, handler, options] of events) {
    target.addEventListener(type, handler, options || false);
  }
};


const bindLocal = (target, events) => {
  for (const [type, handler, options] of events) {
    target.addEventListener(type, handler, options || false);
  }
};

// Create the editor instance
const editor = new Editor();

// Local binding for extra events
bindLocal(editor.canvas, [
  ['click', (e) => console.log('Canvas clicked')],
]);

// Function to simulate key presses
function simulateKeyPress(key, shiftKey = false) {
  const event = new KeyboardEvent('keydown', {
    key: key,
    shiftKey: shiftKey,
    ctrlKey: false,
    altKey: false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

// Simulate pressing 'g' then 'g' to go to the start of the document
simulateKeyPress('g');
simulateKeyPress('g');

// Simulate pressing 'd' then 'd' to delete a line
simulateKeyPress('d');
simulateKeyPress('d');

// Function to test key names
function testKeyCodes() {
  const testKeys = ['a', 'b', 'c', 'd', 'e', 'f', 'g',
    'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u',
    'v', 'w', 'x', 'y', 'z', 'Escape', ':'];
  for (const key of testKeys) {
    const event = { key: key, shiftKey: false };
    console.log(`Key: ${key}, KeyName: ${editor.keyStateMachine.getKeyName(event)}`);
  }
}
testKeyCodes();
