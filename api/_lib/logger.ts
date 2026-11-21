const fmt = (a: unknown[]) => a.map((x) => (typeof x === "string" ? x : JSON.stringify(x, (_k, v) => (v instanceof Error ? v.message : v)))).join(" ");
export const logger = {
  info: (...a: unknown[]) => console.log(fmt(a)),
  warn: (...a: unknown[]) => console.warn(fmt(a)),
  error: (...a: unknown[]) => console.error(fmt(a)),
};
