import assert from "node:assert/strict";
import test from "node:test";
import { scrollToHeading } from "../packages/content-ui/src/ContentHost";

test("heading navigation uses its scroll container and only updates the URL for page navigation", () => {
  const globals = ["HTMLElement", "window", "matchMedia", "history"] as const;
  const previous = globals.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  const calls: unknown[] = [];
  class Element {
    scrollTop = 40;
    getBoundingClientRect() { return { top: 80 }; }
    scrollTo(value: unknown) { calls.push(value); }
  }
  const values = [Element, { scrollY: 20, scrollTo: (value: unknown) => calls.push(value) }, () => ({ matches: true }), { replaceState: (...args: unknown[]) => calls.push(args) }];
  globals.forEach((key, index) => Object.defineProperty(globalThis, key, { value: values[index], configurable: true }));
  try {
    const heading = { id: "章节", getBoundingClientRect: () => ({ top: 300 }) } as HTMLElement;
    scrollToHeading(heading, new Element() as unknown as HTMLElement);
    assert.deepEqual(calls, [{ top: 160, behavior: "instant" }]);
    calls.length = 0;
    scrollToHeading(heading);
    assert.deepEqual(calls, [{ top: 220, behavior: "instant" }, [null, "", "#%E7%AB%A0%E8%8A%82"]]);
    calls.length = 0;
    scrollToHeading(heading, null);
    assert.deepEqual(calls, []);
  } finally {
    globals.forEach((key, index) => { const descriptor = previous[index]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); });
  }
});
