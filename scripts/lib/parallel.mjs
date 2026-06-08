/**
 * Run async work over items with a fixed concurrency limit.
 */
export async function runWithConcurrency(items, limit, worker) {
  if (items.length === 0) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  const poolSize = Math.min(Math.max(1, limit), items.length);

  async function runner() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: poolSize }, runner));
  return results;
}
