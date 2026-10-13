/**
 * Shared state for a nav glide (a click on an in-page link). While one is in
 * flight, scroll scenes the page passes through hold their React state instead
 * of re-rendering every frame, and layout refreshes wait until it lands.
 */
type Listener = () => void;

const landed = new Set<Listener>();
let active = false;

export const flight = {
  get active() {
    return active;
  },
  start() {
    active = true;
  },
  end() {
    if (!active) return;
    active = false;
    for (const fn of [...landed]) fn();
  },
  /** Runs `fn` each time a glide lands. Returns an unsubscribe function. */
  onLand(fn: Listener) {
    landed.add(fn);
    return () => { landed.delete(fn); };
  },
};
