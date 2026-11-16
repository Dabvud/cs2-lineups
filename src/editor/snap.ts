type Point = { x: number; y: number };

export function snapPoint(p: Point, others: Point[], radius = 2): Point {
  let nearest = p;
  let distance = radius;
  for (const other of others) {
    const nextDistance = Math.hypot(p.x - other.x, p.y - other.y);
    if (nextDistance <= distance) {
      nearest = other;
      distance = nextDistance;
    }
  }
  return { x: nearest.x, y: nearest.y };
}
