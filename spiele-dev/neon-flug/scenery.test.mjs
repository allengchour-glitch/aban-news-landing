import test from "node:test";
import assert from "node:assert/strict";
import {
  wallNode,
  wallSegment,
  wallIndices,
  clipNear,
  splitWall,
  WALL_SPAN,
  WALL_OFFSET,
  NEAR_Z,
} from "../../js/neon-flug/scenery.mjs";
test("Felsen wechseln beim Recycling nur ihre relative Tiefe, nicht Form oder Texturkoordinaten", () => {
  const boundary = WALL_OFFSET + 12 * WALL_SPAN;
  for (const side of [-1, 1]) {
    const a = wallSegment(boundary - 0.001, 14, side),
      b = wallSegment(boundary + 0.001, 14, side);
    a.face.forEach((p, i) => {
      assert.equal(p.x, b.face[i].x);
      assert.equal(p.y, b.face[i].y);
      assert.equal(p.u, b.face[i].u);
      assert.equal(p.v, b.face[i].v);
      assert(Math.abs(b.face[i].z - p.z - 0.002) < 1e-9);
    });
  }
});
test("Benachbarte Wände und Bergrücken teilen dieselben Anschlusskanten", () => {
  for (let i = -2; i < 80; i++)
    for (const side of [-1, 1]) {
      const a = wallSegment(120, i, side),
        b = wallSegment(120, i + 1, side);
      assert.deepEqual(a.face[2], b.face[1]);
      assert.deepEqual(a.face[3], b.face[0]);
      assert.deepEqual(a.roof[2], b.roof[1]);
    }
});
test("Am Kamerarand wird eine noch sichtbare Wand abgeschnitten statt komplett entfernt", () => {
  const face = wallSegment(20, 0, 1).face;
  assert(face.some((p) => p.z > NEAR_Z));
  assert(face.some((p) => p.z < NEAR_Z));
  const clipped = clipNear(face);
  assert(clipped.length >= 3);
  assert(clipped.every((p) => p.z <= NEAR_Z));
  assert(clipped.some((p) => p.z === NEAR_Z));
  assert(
    clipped.every((p) =>
      ["x", "y", "z", "u", "v"].every((k) => Number.isFinite(p[k])),
    ),
  );
});
test("Entfernte Abschnitte sind bereits vollständig hinter der Kamera", () => {
  for (let n = 0; n < 80; n++) {
    const t = WALL_OFFSET + n * WALL_SPAN,
      old = wallIndices(t - 0.001),
      next = wallIndices(t + 0.001);
    for (const i of old.filter((i) => !next.includes(i)))
      assert.equal(clipNear(wallSegment(t - 0.001, i, 1).face).length, 0);
  }
});
test("Textur-Unterteilungen teilen UVs und erzeugen keine Lücken", () => {
  const pieces = splitWall(wallSegment(123, 15, -1).face, 3);
  assert.deepEqual(pieces[0][2], pieces[1][1]);
  assert.deepEqual(pieces[0][3], pieces[1][0]);
  assert.deepEqual(pieces[1][2], pieces[2][1]);
});
test("Weltgitter bleibt begrenzt und ausserhalb der spielbaren Fluglinien", () => {
  for (let t = 0; t < 3000; t += 17) {
    const indices = wallIndices(t);
    assert(indices.length <= 33);
    for (const index of indices)
      for (const side of [-1, 1]) {
        const n = wallNode(index, side, 2);
        assert(Math.abs(n.x) > 19);
        assert(n.height > 0);
      }
  }
});
