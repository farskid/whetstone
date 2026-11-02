/** A rect measured before the drag started. */
export interface Rect {
  top: number;
  height: number;
}

/** One node of a tree stored as a flat preorder list. Roots have `parentId: null`. */
export interface TreeItem {
  id: string;
  parentId: string | null;
}

export interface TreeDrop {
  depth: number;
  parentId: string | null;
  /** Position among the new parent's children. */
  index: number;
}

export interface TreeDropOptions {
  /** Pixels per depth level. Default 20. */
  indent?: number;
  /** Deepest allowed depth for any node. Default Infinity. */
  maxDepth?: number;
}
