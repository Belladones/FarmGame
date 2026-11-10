export const level = (s: { unlocks: string[] }, id: string, max = 3) => {
  let n = s.unlocks.includes(id) ? 1 : 0;
  for (let i = 2; i <= max; i++) if (s.unlocks.includes(id + i)) n = i;
  return n;
};
