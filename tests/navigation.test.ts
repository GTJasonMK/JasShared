import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContentHostProvider } from "../packages/content-ui/src/ContentHost";
import { NoteView } from "../packages/content-ui/src/DetailViews";
import { NoteCard } from "../packages/content-ui/src/ListViews";
import { MarkdownRenderer } from "../packages/content-ui/src/MarkdownRenderer";

const note = { slug: 'synthetic', title: 'Synthetic', date: '2026-11-12', excerpt: '', tags: ['react'], content: '' };
test('shared views navigate only through host-provided routes or callbacks', () => {
  const preview = renderToStaticMarkup(createElement(NoteView, { note }));
  assert.ok(preview.includes('react'));
  assert.doesNotMatch(preview, /href=/);
  const blog = renderToStaticMarkup(createElement(ContentHostProvider, { tagHref: (tag) => `/host-tags/${tag}`, contentHref: (_type, slug) => `/host-content/${slug}` }, [createElement(NoteView, { note, key: 'view' }), createElement(NoteCard, { note, key: 'card' })]));
  assert.match(blog, /href="\/host-tags\/react"/);
  assert.match(blog, /href="\/host-content\/synthetic"/);
  const editor = renderToStaticMarkup(createElement(NoteCard, { note, onOpen: () => {} }));
  assert.match(editor, /<button/);
  assert.doesNotMatch(editor, /href=/);
});

test('code scroll regions accept keyboard focus without changing their source text', () => {
  const output = renderToStaticMarkup(createElement(MarkdownRenderer, { content: '```text\nsource text with a long line\n```' }));
  assert.match(output, /<pre tabindex="0">/);
  assert.match(output, /source text with a long line/);
});
