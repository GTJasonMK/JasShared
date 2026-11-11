import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "../packages/content-ui/src/MarkdownRenderer";
import { assignHeadingIds } from "../packages/content-ui/src/headingIds";

test('heading IDs remain stable across repeated processing, inline formatting and rendering', () => {
  const heading = () => ({ type: 'element', tagName: 'h2', children: [{ type: 'text', value: 'Repeated' }], properties: {} });
  const tree = { type: 'root', children: [heading(), heading()] };
  const process = assignHeadingIds({ idPrefix: 'entry-' });
  process(tree);
  assert.deepEqual(tree.children.map((node) => node.properties), [{ id: 'entry-repeated' }, { id: 'entry-repeated-1' }]);
  process(tree);
  assert.deepEqual(tree.children.map((node) => node.properties), [{ id: 'entry-repeated' }, { id: 'entry-repeated-1' }]);
  const props = { content: '## **Repeated**\n\n```graph\nnot JSON\n```\n\n## Repeated\n', idPrefix: 'entry-' };
  const first = renderToStaticMarkup(createElement(MarkdownRenderer, props));
  assert.equal(first, renderToStaticMarkup(createElement(MarkdownRenderer, props)));
  assert.match(first, /id="entry-repeated"/);
  assert.match(first, /id="entry-repeated-1"/);
  assert.match(first, /not JSON/);
  assert.match(first, /role="alert"/);
});
