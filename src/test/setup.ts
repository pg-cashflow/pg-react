import { afterEach } from "vitest";
import { transferableAbortController } from "node:util";

// Node's fetch/MSW Request validates native signals. Use the Node constructors
// for both globals instead of mixing jsdom signals with Node Request objects.
const nativeController = transferableAbortController();
globalThis.AbortController = nativeController.constructor as typeof AbortController;
globalThis.AbortSignal = nativeController.signal.constructor as typeof AbortSignal;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  localStorage.clear();
});

