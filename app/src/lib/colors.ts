function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function appColor(app: string): string {
  const hue = hash(app) % 360;
  return `hsl(${hue} 65% 55%)`;
}

export function appColorMuted(app: string): string {
  const hue = hash(app) % 360;
  return `hsl(${hue} 45% 35%)`;
}
