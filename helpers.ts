export const delay = (t: number = 100): Promise<void> =>
  new Promise((r) => setTimeout(r, t));
