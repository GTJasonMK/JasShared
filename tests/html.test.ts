import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "../packages/graph-ui/src/sanitize-html";

test("graph HTML uses the same parser in every host and removes executable markup", () => {
  const result = sanitizeHtml('<p onclick="steal()">keep <strong>bold</strong></p><script>steal()</script><svg><a xlink:href="javascript:steal()">unsafe</a></svg><a href="jav&#x61;script:steal()" target="_blank">link</a><img src="https://example.org/image.png" onerror=steal()>');
  assert.match(result, /<strong>bold<\/strong>/);
  assert.match(result, /rel="noopener noreferrer"/);
  assert.match(result, /src="https:\/\/example.org\/image.png"/);
  assert.doesNotMatch(result, /script|onclick|onerror|<svg|xlink/);
});
