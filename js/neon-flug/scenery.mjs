// Festes Weltgitter: Die Kamera bewegt sich, Felsform und Textur bleiben am Ort.
export const WALL_SPAN = 12;
export const WALL_OFFSET = 8;
export const NEAR_Z = 11;
export function wallNode(index, side, level = 0) {
  const phase = index + level * 173;
  return {
    distance: index * WALL_SPAN + WALL_OFFSET,
    x: side * (22 + Math.sin(phase * 0.38 + side * 0.6) * 1.35),
    height:
      12 +
      Math.sin(phase * 0.43 + side * 0.7) * 3 +
      Math.sin(phase * 0.91 + side * 1.8) * 1.4 +
      Math.cos(phase * 0.19) * 2,
    ridgeX: side * (47 + Math.sin(phase * 0.23) * 3),
    ridgeLift: 5 + Math.sin(phase * 0.31) * 2,
  };
}
export function wallSegment(travel, index, side, level = 0) {
  const a = wallNode(index, side, level),
    b = wallNode(index + 1, side, level);
  const vertex = (n, y, x = n.x) => ({
    x,
    y,
    z: travel - n.distance,
    u: n.distance,
    v: -y,
  });
  const near = vertex(a, a.height),
    far = vertex(b, b.height);
  return {
    index,
    face: [vertex(a, -5), near, far, vertex(b, -5)],
    roof: [
      near,
      vertex(a, a.height + a.ridgeLift, a.ridgeX),
      vertex(b, b.height + b.ridgeLift, b.ridgeX),
      far,
    ],
  };
}
export function wallIndices(travel, distance = 360) {
  const first = Math.floor((travel - WALL_OFFSET) / WALL_SPAN) - 1;
  return Array.from(
    { length: Math.ceil(distance / WALL_SPAN) + 3 },
    (_, i) => first + i,
  );
}
export function clipNear(vertices, plane = NEAR_Z) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      insideA = a.z <= plane,
      insideB = b.z <= plane;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (plane - a.z) / (b.z - a.z);
      result.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: plane,
        u: a.u + (b.u - a.u) * t,
        v: a.v + (b.v - a.v) * t,
      });
    }
  }
  return result;
}
export function splitWall(vertices, parts = 2) {
  const [bottomA, topA, topB, bottomB] = vertices,
    lerp = (a, b, t) =>
      Object.fromEntries(
        ["x", "y", "z", "u", "v"].map((k) => [k, a[k] + (b[k] - a[k]) * t]),
      );
  return Array.from({ length: parts }, (_, i) => {
    const a = i / parts,
      b = (i + 1) / parts;
    return [
      lerp(bottomA, bottomB, a),
      lerp(topA, topB, a),
      lerp(topA, topB, b),
      lerp(bottomA, bottomB, b),
    ];
  });
}
