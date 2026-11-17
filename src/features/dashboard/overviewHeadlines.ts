export const overviewHeadlines = [
  "Let’s make something.",
  'Shape your own design language.',
  'Every detail has a purpose.',
  'Explore. Experiment. Create.',
  'Make interfaces feel different.',
  'Your ideas, beautifully realized.',
  'Find your visual language.',
  'Design with intention.',
] as const

export function getNextOverviewHeadlineIndex(currentIndex: number) {
  return (Math.trunc(currentIndex) + 1 + overviewHeadlines.length) % overviewHeadlines.length
}
