import assert from "node:assert/strict";
import test from "node:test";
import { NODE_COLORS } from "../packages/graph-core/src/index";
import { getNodePalette } from "../packages/graph-ui/src/nodePalette";

test("default graph nodes follow the host while explicit node colors retain their meaning", () => {
  assert.deepEqual(getNodePalette("default"), getNodePalette(undefined));
  assert.equal(getNodePalette("default").bg, "var(--color-surface)");
  for (const name of Object.keys(NODE_COLORS) as Array<keyof typeof NODE_COLORS>) {
    if (name === "default") continue;
    const palette = getNodePalette(name);
    assert.equal(palette.bg, NODE_COLORS[name].bg);
    assert.equal(palette.text, NODE_COLORS[name].text);
  }
});
