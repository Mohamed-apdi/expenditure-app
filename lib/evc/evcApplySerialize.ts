/**
 * Serialize EVC ledger mutations so dedupe read-modify-write cannot race
 * (e.g. two SMS deliveries in parallel).
 */

let chain: Promise<unknown> = Promise.resolve();

export function runSerializedEvcApply<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(() => fn());
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
