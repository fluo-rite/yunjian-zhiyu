export type PlaceholderStreamEvent = {
  type: "todo";
};

export function createPlaceholderStreamEvent(): PlaceholderStreamEvent {
  return { type: "todo" };
}
