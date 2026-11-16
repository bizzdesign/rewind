/** Who did something. Imports and integrations are accounts too; `person` tells them apart. */
export interface Actor {
  id: string;
  name: string;
  /** NATIVE users (or unknown origin); false for EXTERNAL / SYSTEM accounts such as imports. */
  person: boolean;
  /** Every user id merged into this one (a person can have two accounts with one name). */
  ids?: string[];
}

/** Times are epoch milliseconds. */
export interface RawElement {
  id: string;
  name: string;
  type: string;
  createdAt: number;
  createdBy?: Actor;
  /** Unify keeps only the last edit, so this is the latest one, by its editor. */
  updatedAt: number;
  updatedBy?: Actor;
  hiddenAt?: number;
  hiddenBy?: Actor;
}

export interface RawRelation {
  id: string;
  sourceId: string;
  targetId: string;
  createdAt: number;
  createdBy?: Actor;
}

export interface RawView {
  id: string;
  name: string;
  createdAt: number;
  createdBy?: Actor;
}

export interface RawData {
  /** Elements created, edited or hidden in the year, and any others the year's links need (the demo sends all). */
  elements: RawElement[];
  /** Only the relations created in the year being played back. */
  relations: RawRelation[];
  views: RawView[];
  /** A list stopped at its cap, so the numbers are a lower bound. */
  truncated: boolean;
  /**
   * Visible elements on 1 January and at the end, counted by the tenant. Without
   * it (the demo, which has every element) they're worked out from `elements`.
   */
  size?: { start: number; end: number };
  /** The tenant wouldn't list views, so there are none in the story. */
  viewsFailed?: boolean;
  /** Types that already had an element before 1 January; worked out from `elements` when absent. */
  typesBefore?: string[];
}

export interface Progress {
  elements: number;
  relations: number;
  views: number;
  /** How many there are to read, once the counts are in. */
  expected?: { elements: number; relations: number };
}

/** Where the year comes from: a signed-in tenant, or the built-in demo. */
export interface Source {
  label: string;
  demo: boolean;
  /** The signed-in person's user id, when known. */
  me?: string;
  load(year: number, onProgress: (p: Progress) => void): Promise<RawData>;
}
