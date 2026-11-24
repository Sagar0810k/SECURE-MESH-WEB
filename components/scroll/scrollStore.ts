export interface ScrollState {
  /** target scroll progress 0..1 */
  target: number;
  /** smoothed scroll progress (damped) */
  smooth: number;
  /** last frame scroll velocity */
  velocity: number;
}

export const scrollStore: ScrollState = {
  target: 0,
  smooth: 0,
  velocity: 0,
};
