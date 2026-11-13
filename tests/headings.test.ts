import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "../packages/content-ui/src/MarkdownRenderer";
import { assignHeadingIds } from "../packages/content-ui/src/headingIds";
import { extractHeadingsFromContent } from '../packages/content-core/src/heading-content';

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

test('generated footnote labels retain the IDs referenced by accessible descriptions', () => {
  const markup = renderToStaticMarkup(createElement(MarkdownRenderer, { content: '## Ordinary heading\n\nBody with a footnote.[^1]\n\n[^1]: A footnote definition.\n' }));
  const describedBy = markup.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(describedBy);
  assert.ok(markup.includes(`id="${describedBy}"`));
});

test('TOC targets match rendered headings across Markdown syntax, fences and colliding suffixes', () => {
  const content = '# Same\n\n## **Same**\n\n## Same-1\n\n> ### [Same](https://example.org)\n\nSetext &amp; ~~strike~~ `code`\n---\n\n````md\n```\n## hidden\n```\n````\n\n## Math $x$ & ![alt](https://example.org/img.png)\n\nBody[^one]\n\n[^one]: footnote';
  const headings = extractHeadingsFromContent(content);
  assert.deepEqual(headings.slice(0, 3).map((heading) => heading.id), ['same-1', 'same-1-1', 'same-2']);
  assert.ok(!headings.some((heading) => /hidden|Footnotes/.test(heading.text)));
  const markup = renderToStaticMarkup(createElement(MarkdownRenderer, { content, idPrefix: 'entry-' }));
  const rendered = [...markup.matchAll(/<h[2-4]\s+id="entry-([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(rendered, headings.map((heading) => heading.id));
  assert.equal(new Set(headings.map((heading) => heading.id)).size, headings.length);
});

test('ordinary headings cannot collide with IDs reserved by GFM footnotes', () => {
  const content = '## Footnote label\n\nBody[^one]\n\n[^one]: Definition';
  const markup = renderToStaticMarkup(createElement(MarkdownRenderer, { content }));
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(extractHeadingsFromContent(content)[0].id, 'footnote-label-1');
});

test('Markdown tables expose a named keyboard scroll region and preserve their cells', () => {
  const markup = renderToStaticMarkup(createElement(MarkdownRenderer, { content: '| Product | Use |\n| --- | --- |\n| PostgreSQL | Transactions |' }));
  assert.match(markup, /role="region" aria-label="表格" tabindex="0"/);
  assert.match(markup, /<th>Product<\/th>/);
  assert.match(markup, /<td>PostgreSQL<\/td>/);
  assert.match(markup, /<td>Transactions<\/td>/);
});
