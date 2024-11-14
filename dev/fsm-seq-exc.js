const PHASE_STATES = {
  INITIALIZE: 'initialize',
  LOAD: 'load',
  RUN: 'run',
  CLEANUP: 'cleanup',
};

const RUNTIME_STATES = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
};

const ENVIRONMENT_STATES = {
  NORMAL: 'normal',
  DEBUG: 'debug',
  MOBILE: 'mobile',
};

// Improved StateMachine class
class StateMachine {
  constructor(config) {
    this.stateChart = config;
    this.context = { ...config.context };
    this.currentState = config.initial;
  }

  getState() {
    return this.currentState;
  }

  transition(event, eventData = {}) {
    const stateConfig = this.stateChart.states[this.currentState];
    const transitionConfig = stateConfig.on?.[event];

    if (!transitionConfig) {
      console.warn(
        `No transition defined for event '${event}' in state '${this.currentState}'`
      );
      return;
    }

    const { target, actions = [], cond } = transitionConfig;

    // Evaluate guard condition
    if (cond && !cond(this.context, eventData)) {
      console.warn(
        `Guard condition failed for transition on event '${event}' in state '${this.currentState}'`
      );
      return;
    }

    // Execute exit actions
    stateConfig.exit?.forEach((action) => action(this.context, eventData));

    // Execute transition actions
    actions.forEach((action) => action(this.context, eventData));

    // Update state
    this.currentState = target;

    // Execute entry actions
    const nextStateConfig = this.stateChart.states[this.currentState];
    nextStateConfig.entry?.forEach((action) => action(this.context, eventData));
  }

  send(event, data) {
    this.transition(event, data);
  }
}

// Phase State Chart
const phaseStateChart = {
  initial: PHASE_STATES.INITIALIZE,
  context: {
    progress: 0,
  },
  states: {
    [PHASE_STATES.INITIALIZE]: {
      entry: [(ctx) => console.log('Entering INITIALIZE')],
      on: {
        LOAD: {
          target: PHASE_STATES.LOAD,
          actions: [(ctx) => console.log('Transitioning to LOAD')],
        },
      },
    },
    [PHASE_STATES.LOAD]: {
      entry: [(ctx) => console.log('Entering LOAD')],
      on: {
        RUN: {
          target: PHASE_STATES.RUN,
          actions: [(ctx) => console.log('Transitioning to RUN')],
        },
      },
    },
    [PHASE_STATES.RUN]: {
      entry: [(ctx) => console.log('Entering RUN')],
      on: {
        CLEANUP: {
          target: PHASE_STATES.CLEANUP,
          actions: [(ctx) => console.log('Transitioning to CLEANUP')],
        },
      },
    },
    [PHASE_STATES.CLEANUP]: {
      entry: [(ctx) => console.log('Entering CLEANUP')],
      on: {
        INITIALIZE: {
          target: PHASE_STATES.INITIALIZE,
          actions: [(ctx) => console.log('Restarting')],
        },
      },
    },
  },
};

// Runtime State Chart
const runtimeStateChart = {
  initial: RUNTIME_STATES.IDLE,
  context: {
    operationCount: 0,
    activeLayer: null,
  },
  states: {
    [RUNTIME_STATES.IDLE]: {
      on: {
        ACTIVATE: {
          target: RUNTIME_STATES.ACTIVE,
          actions: [
            (ctx, eventData) => {
              ctx.activeLayer = eventData.activeLayer;
            },
            (ctx) => console.log('Activated runtime with layer:', ctx.activeLayer),
          ],
        },
      },
    },
    [RUNTIME_STATES.ACTIVE]: {
      entry: [(ctx) => console.log('Runtime is now ACTIVE')],
      on: {
        PAUSE: {
          target: RUNTIME_STATES.PAUSED,
          actions: [(ctx) => console.log('Pausing runtime')],
        },
        IDLE: {
          target: RUNTIME_STATES.IDLE,
          actions: [(ctx) => console.log('Runtime is now IDLE')],
        },
      },
    },
    [RUNTIME_STATES.PAUSED]: {
      on: {
        RESUME: {
          target: RUNTIME_STATES.ACTIVE,
          actions: [(ctx) => console.log('Resuming runtime')],
        },
      },
    },
  },
};

// Environment State Chart
const environmentStateChart = {
  initial: ENVIRONMENT_STATES.NORMAL,
  context: {
    screenSize: 'large',
    debugMode: false,
  },
  states: {
    [ENVIRONMENT_STATES.NORMAL]: {
      on: {
        ENTER_DEBUG: {
          target: ENVIRONMENT_STATES.DEBUG,
          actions: [
            (ctx) => {
              ctx.debugMode = true;
            },
            (ctx) => console.log('Entering DEBUG mode'),
          ],
        },
        ENTER_MOBILE: {
          target: ENVIRONMENT_STATES.MOBILE,
          actions: [
            (ctx) => {
              ctx.screenSize = 'small';
            },
            (ctx) => console.log('Entering MOBILE mode'),
          ],
        },
      },
    },
    [ENVIRONMENT_STATES.DEBUG]: {
      on: {
        EXIT_DEBUG: {
          target: ENVIRONMENT_STATES.NORMAL,
          actions: [
            (ctx) => {
              ctx.debugMode = false;
            },
            (ctx) => console.log('Exiting DEBUG mode'),
          ],
        },
      },
    },
    [ENVIRONMENT_STATES.MOBILE]: {
      on: {
        EXIT_MOBILE: {
          target: ENVIRONMENT_STATES.NORMAL,
          actions: [
            (ctx) => {
              ctx.screenSize = 'large';
            },
            (ctx) => console.log('Exiting MOBILE mode'),
          ],
        },
      },
    },
  },
};

// StateMachineManager
class StateMachineManager {
  constructor(stateMachines) {
    this.stateMachines = stateMachines;
  }

  getState(chartName) {
    return this.stateMachines[chartName].getState();
  }

  send(chartName, event, data) {
    this.stateMachines[chartName].send(event, data);
  }
}

// Instantiate state machines
const phaseSM = new StateMachine(phaseStateChart);
const runtimeSM = new StateMachine(runtimeStateChart);
const environmentSM = new StateMachine(environmentStateChart);

// Manager to coordinate them
const smManager = new StateMachineManager({
  phase: phaseSM,
  runtime: runtimeSM,
  environment: environmentSM,
});

// Transition phase state machine
smManager.send('phase', 'LOAD');
console.log(smManager.getState('phase')); // Outputs: 'load'

// Handle runtime
smManager.send('runtime', 'ACTIVATE', { activeLayer: 'ui-layer' });
console.log(smManager.getState('runtime')); // Outputs: 'active'
console.log(runtimeSM.context); // Outputs runtime context

// Adaptation
smManager.send('environment', 'ENTER_DEBUG');
console.log(smManager.getState('environment')); // Outputs: 'debug'
console.log(environmentSM.context); // Outputs environment context

// Multilevel orchestration
if (smManager.getState('phase') === PHASE_STATES.RUN) {
  if (smManager.getState('environment') === ENVIRONMENT_STATES.DEBUG) {
    console.log('Running in debug mode');
  }
  smManager.send('runtime', 'ACTIVATE', { activeLayer: 'main-layer' });
}

// Text Groups Constants
const TEXT_GROUPS = {
  VISIBLE: 'visible',
  OFF_SCREEN: 'offScreen',
  TOP: 'top',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
};

// TextBatch Class
class TextBatch {
  constructor() {
    this.texts = []; // Array of text objects: { content, x, y, style }
  }

  addText(content, x, y, style = {}) {
    this.texts.push({ content, x, y, style });
  }

  clear() {
    this.texts = [];
  }
}

// TextRenderer Class
class TextRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentInput = ''; // Store the current input text
    this.caretPosition = 0; // Position of the caret in the input
    this.cursorVisible = true; // For blinking cursor
    this.blinkInterval = null; // Interval for blinking cursor

    this.groups = {
      [TEXT_GROUPS.VISIBLE]: new TextBatch(),
      [TEXT_GROUPS.OFF_SCREEN]: new TextBatch(),
      [TEXT_GROUPS.TOP]: new TextBatch(),
      [TEXT_GROUPS.LEFT]: new TextBatch(),
      [TEXT_GROUPS.RIGHT]: new TextBatch(),
      [TEXT_GROUPS.BOTTOM]: new TextBatch(),
    };
  }
  startCursorBlink() {
    this.blinkInterval = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.render();
    }, 500); // Blink every 500ms
  }

  stopCursorBlink() {
    clearInterval(this.blinkInterval);
    this.cursorVisible = true;
    this.render();
  }
 render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const visibleBatch = this.groups[TEXT_GROUPS.VISIBLE];

    // Render existing texts
    for (const text of visibleBatch.texts) {
      if (text.visible) {
        this.applyStyle(text.style);
        this.ctx.fillText(text.content, text.x, text.y);
      }
    }
  }

  renderInput(currentInput, cursorPosition) {
    this.render(); // Clear and render existing texts

    // Render current input
    this.applyStyle({}); // Default style
    this.ctx.fillText(currentInput, cursorPosition.x, cursorPosition.y);

    // Render cursor
    if (this.cursorVisible) {
      const textWidth = this.ctx.measureText(currentInput).width;
      const caretX = cursorPosition.x + textWidth;
      const caretY = cursorPosition.y;
      this.ctx.beginPath();
      this.ctx.moveTo(caretX, caretY - parseInt(this.ctx.font, 10));
      this.ctx.lineTo(caretX, caretY);
      this.ctx.stroke();
    }
  }
  applyStyle(style) {
    const defaultStyle = {
      font: '48px serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      direction: 'ltr',
    };
    const finalStyle = { ...defaultStyle, ...style };

    this.ctx.font = finalStyle.font;
    this.ctx.textAlign = finalStyle.textAlign;
    this.ctx.textBaseline = finalStyle.textBaseline;
    this.ctx.direction = finalStyle.direction;
    // Note: letterSpacing, wordSpacing, fontKerning, and textRendering are not directly supported in Canvas API
  }

  moveToGroup(content, fromGroup, toGroup) {
    const fromBatch = this.groups[fromGroup];
    const toBatch = this.groups[toGroup];

    const textIndex = fromBatch.texts.findIndex((t) => t.content === content);
    if (textIndex >= 0) {
      const [text] = fromBatch.texts.splice(textIndex, 1);
      toBatch.addText(text.content, text.x, text.y, text.style);
    }
  }
}

// SharedContext
const SharedContext = (() => {
  const context = {
    // Canvas-related data
    container: null,
    canvases: [],
    dimensions: { width: 800, height: 600 },

    // Text processing data
    textData: [],
    processedTextData: [],

    // Pipeline configuration
    pipeline: [],
  };

  return {
    getContext: () => context,
    update: (key, value) => {
      if (context.hasOwnProperty(key)) {
        context[key] = value;
      }
    },
    reset: () => {
      context.canvases = [];
      context.textData = [];
      context.processedTextData = [];
      context.pipeline = [];
    },
  };
})();

// InitializationManager
const InitializationManager = (() => {
  function createCanvas({ id, zIndex, width, height }) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas, { id, width, height });
    canvas.style.cssText = `
      position: absolute;
      z-index: ${zIndex};
    `;
    return canvas;
  }

  function createContainer(id, width, height) {
    const container = document.createElement('div');
    container.id = id || 'stage';
    container.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      position: relative;
      border: 2px solid black;
    `;
    return container;
  }

  function initializeStage(containerId, width, height, layers) {
    const container = createContainer(containerId, width, height);
    const canvases = layers.map((layer) =>
      createCanvas({ ...layer, width, height })
    );
    canvases.forEach((canvas) => container.appendChild(canvas));
    document.body.appendChild(container);

    // Store in SharedContext
    const context = SharedContext.getContext();
    context.container = container;
    context.canvases = canvases;

    return { container, canvases };
  }

  return { initializeStage };
})();

// RuntimeManager
const RuntimeManager = (() => {
  function setCanvasSize(canvas, width, height, dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    Object.assign(canvas.style, {
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  function setStageScale(stage, width, height) {
    const scaleToFit = Math.min(
      window.innerWidth / width,
      window.innerHeight / height
    );
    Object.assign(stage.style, {
      transformOrigin: '0 0',
      transform: `scale(${scaleToFit})`,
    });
  }

  function processTextPipeline() {
    const context = SharedContext.getContext();
    const pipeline = context.pipeline;
    const textData = context.textData;

    const processedData = pipeline.reduce((data, step) => step(data), textData);
    context.processedTextData = processedData;

    console.log('Pipeline processed text:', processedData);
  }

  function setupScaling() {
    const context = SharedContext.getContext();
    const { container, canvases, dimensions } = context;
    const { width, height } = dimensions;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvases.forEach((canvas) => setCanvasSize(canvas, width, height, dpr));
      setStageScale(container, width, height);
    };

    // Initial setup
    resize();
    window.addEventListener('resize', resize);
  }

  return { setupScaling, processTextPipeline };
})();

// TextProcessingPipeline
const TextProcessingPipeline = (() => {
  function tokenize(data) {
    return data.map((item) => item.split(' '));
  }

  function convertToUpperCase(data) {
    return data.map((item) => item.map((word) => word.toUpperCase()));
  }

  function batchStore(data) {
    console.log('Storing batch:', data);
    return data;
  }

  return { tokenize, convertToUpperCase, batchStore };
})();

// Initialization and Setup
function initialize() {
  InitializationManager.initializeStage('dynamic-stage', 800, 600, [
    { id: 'foreground-layer', zIndex: 4 },
    { id: 'middle-layer', zIndex: 3 },
    { id: 'background-layer', zIndex: 2 },
  ]);
}

function runPipeline() {
  const context = SharedContext.getContext();

  // Add pipeline steps
  context.pipeline = [
    TextProcessingPipeline.tokenize,
    TextProcessingPipeline.convertToUpperCase,
    TextProcessingPipeline.batchStore,
  ];

  // Add text data
  context.textData = ['hello world', 'canvas editing is fun'];

  // Process pipeline
  RuntimeManager.processTextPipeline();
}

function setup() {
  initialize();
  RuntimeManager.setupScaling();
  runPipeline();
}

setup();
