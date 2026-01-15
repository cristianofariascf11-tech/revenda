export function sumCosts(costs: Array<{ amount: number }>) {
  return (costs ?? []).reduce((acc, c) => acc + Number(c.amount || 0), 0);
}
