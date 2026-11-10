import assert from 'node:assert';
import {
  annotationStamp,
  computeClip,
  PILL_PALETTE,
  pillColor,
  pillColorIndex,
  placePill,
  renderPillsCss,
  toClip,
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
        y: 200,
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

  describe('placePill()', () => {
    const image = { width: 960, height: 420 };
    it('puts the pill right of its control', () => {
      const pill = placePill({ n: 1, box: { x: 100, y: 100, width: 200, height: 20 } }, image);
      assert.deepStrictEqual([pill.cx, pill.cy, pill.color], [319, 110, pillColor(1)]);
    });
    it('puts it left when the right side is out of the image, then above', () => {
      const left = placePill({ n: 2, box: { x: 700, y: 100, width: 250, height: 20 } }, image);
      assert.deepStrictEqual([left.cx, left.cy], [681, 110]);
      const above = placePill({ n: 3, box: { x: 10, y: 100, width: 940, height: 20 } }, image);
      assert.deepStrictEqual([above.cx, above.cy], [23, 81]);
    });
    it('falls back inside the top left corner of the control', () => {
      const inside = placePill({ n: 4, box: { x: 0, y: 0, width: 960, height: 420 } }, image);
      assert.deepStrictEqual([inside.cx, inside.cy], [15, 15]);
    });
    it('follows a manual position in percent', () => {
      const manual = placePill({ n: 5, box: { x: 100, y: 100, width: 20, height: 20 }, px: 50, py: 10 }, image);
      assert.deepStrictEqual([manual.cx, manual.cy], [480, 42]);
    });
    it('vertically centers small controls and aligns tall ones on their first line', () => {
      const tall = placePill({ n: 1, box: { x: 100, y: 100, width: 200, height: 200 } }, image);
      assert.strictEqual(tall.cy, 115);
    });
  });

  describe('annotationStamp()', () => {
    it('changes with the image, the clip and the pills', () => {
      const clip = { x: 0, y: 0, width: 10, height: 10 };
      const pill = placePill({ n: 1, box: { x: 1, y: 1, width: 2, height: 2 } }, { width: 100, height: 100 });
      const stamp = annotationStamp(Buffer.from('a'), clip, [pill]);
      assert.strictEqual(stamp, annotationStamp(Buffer.from('a'), clip, [pill]));
      assert.notStrictEqual(stamp, annotationStamp(Buffer.from('b'), clip, [pill]));
      assert.notStrictEqual(stamp, annotationStamp(Buffer.from('a'), { ...clip, x: 1 }, [pill]));
      assert.notStrictEqual(stamp, annotationStamp(Buffer.from('a'), clip, [{ ...pill, cx: pill.cx + 1 }]));
    });
  });

  it('toClip() moves a box into the clipped image', () => {
    assert.deepStrictEqual(toClip({ x: 300, y: 200, width: 10, height: 5 }, { x: 240, y: 150, width: 1, height: 1 }), {
      x: 60,
      y: 50,
      width: 10,
      height: 5,
    });
  });
});
