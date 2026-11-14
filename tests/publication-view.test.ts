import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicationTime } from "../packages/content-ui/src/PublicationTime";

test("发布信息保留可读日期与机器时间，草稿不显示发布记录，历史缺失明确标记", () => {
  const day = renderToStaticMarkup(createElement(PublicationTime, { metadata: { publication: "published", publishedAt: "2026-11-12" } }));
  assert.match(day, /dateTime="2026-11-12"/i);
  assert.doesNotMatch(day, /00:00/);
  const time = renderToStaticMarkup(createElement(PublicationTime, { metadata: { publication: "published", publishedAt: "2026-11-13T20:30:00Z" } }));
  assert.match(time, /2026-11-14 04:30/);
  assert.equal(renderToStaticMarkup(createElement(PublicationTime, { metadata: { publication: "draft" } })), "");
  assert.match(renderToStaticMarkup(createElement(PublicationTime, { metadata: { publication: "published" } })), /发布时间待补录/);
});
