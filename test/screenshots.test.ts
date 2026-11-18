import assert from 'node:assert';
import {
  computeClip,
  outlineCss,
  PILL_PALETTE,
  pillColor,
  pillColorIndex,
  pillCss,
  renderPillsCss,
} from '../scripts/screenshots.js';

const viewport = { width: 1440, height: 900 };

describe('screenshots', () => {
  describe('pill colours', () => {
    it('gives one colour per number and repeats after 20', () => {
      assert.strictEqual(PILL_PALETTE.length, 20);
      assert.strictEqual(new Set(PILL_PALETTE).size, 20);
      assert.strictEqual(pillColor(1), '#e5322d');
      assert.strictEqual(pillColorIndex(11), 11);
      assert.strictEqual(pillColorIndex(21), 1);
      assert.strictEqual(pillColor(22), pillColor(2));
    });
    it('generates a CSS class per colour', () => {
      const css = renderPillsCss();
      assert.match(css, /\.bf-pill-c1 \{\n {2}background-color: #e5322d;\n\}/);
      assert.match(css, /\.bf-pill-c20 \{/);
      assert.doesNotMatch(css, /\.bf-pill-c21 /);
    });
  });

  describe('computeClip()', () => {
    it('frames the controls with a margin and a minimum size', () => {
      assert.deepStrictEqual(computeClip([{ x: 600, y: 400, width: 100, height: 20 }], [], viewport), {
        x: 170,
        y: 360,
        width: 960,
        height: 420,
      });
    });
    it('stays inside the viewport', () => {
      const clip = computeClip([{ x: 1400, y: 880, width: 30, height: 15 }], [], viewport);
      assert.deepStrictEqual(clip, { x: 480, y: 480, width: 960, height: 420 });
    });
    it('takes the context as it is, without margin', () => {
      const clip = computeClip(
        [{ x: 500, y: 300, width: 100, height: 20 }],
        [{ x: 240, y: 200, width: 1180, height: 600 }],
        viewport,
      );
      assert.deepStrictEqual(clip, { x: 240, y: 200, width: 1180, height: 600 });
    });
    it('keeps the whole viewport when there is nothing to frame', () => {
      assert.deepStrictEqual(computeClip([], [], viewport), { x: 0, y: 0, width: 1440, height: 900 });
    });
  });

  describe('pillCss()', () => {
    it('anchors the pill right of its control by default, with fallbacks', () => {
      const css = pillCss(3);
      assert.match(css, /position-anchor: --bf-pill-3;/);
      assert.match(css, /position-area: right; position-try-fallbacks: left, top, bottom;/);
      assert.match(css, new RegExp(`background: ${pillColor(3)};`));
    });
    it('follows the position of the capture, without fallbacks', () => {
      assert.match(pillCss(1, 'left'), /position-area: left;/);
      assert.doesNotMatch(pillCss(1, 'inside'), /position-try-fallbacks/);
      assert.match(pillCss(1, 'inside'), /position-area: center; justify-self: unsafe end;/);
    });
  });

  it('outlineCss() covers the control of the pill in its colour', () => {
    const css = outlineCss(2);
    assert.match(css, /position-anchor: --bf-pill-2;/);
    assert.match(css, /width: anchor-size\(width\);/);
    assert.match(css, new RegExp(`outline: 3px solid ${pillColor(2)};`));
  });
});
