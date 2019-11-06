
export interface IElementInfo {
  // 'id' is optional so that user can specify an object without an id for default
  //
  readonly id: string;
  readonly recurse?: string;
  readonly discards?: ReadonlyArray<string>;
  readonly descendants?: {
    readonly by?: string;
    readonly throwIfCollision?: boolean;
    readonly throwIfMissing?: boolean;
  };
}

export const EmptyElementInfo: IElementInfo = { id: 'name' };

export interface IParseInfo {
  readonly elements: ReadonlyMap<string, IElementInfo>;
  readonly default?: IElementInfo;
}

interface IAssociativeCollection {
  delim?: string;
  keyType?: string;
  valueType?: string;
}

interface ITextNodeCollection {
  assoc?: IAssociativeCollection;
}

interface IAttributeNodeCollection {
  delim?: string;
  open?: string;
  close?: string;
  assoc?: IAssociativeCollection;
}

export type ContextType = 'attributes' | 'textNodes';
export type MatcherType = 'number' | 'boolean' | 'primitives' | 'collection' | 'date' | 'symbol' | 'string';
export type PrimitiveType = 'number' | 'boolean' | 'date' | 'symbol' | 'string';

interface IMatchers {
  primitives?: ReadonlyArray<PrimitiveType>;
  // collection
  date?: {
    format?: string
  };
  symbol?: {
    prefix?: string,
    global?: boolean
  };
  string?: boolean;
}

interface IAttributesMatchers extends IMatchers {
  collection?: IAttributeNodeCollection;
}

interface ITextNodesMatchers extends IMatchers {
  collection?: ITextNodeCollection;
}
interface ICoercionEntity<T extends IMatchers> {
  trim?: boolean;
  matchers?: T;
}

export interface ISpec {
  labels?: {
    element?: string;
    descendants?: string;
    text?: string;
  };
  coercion?: {
    attributes?: ICoercionEntity<IAttributesMatchers>,
    textNodes?: ICoercionEntity<ITextNodesMatchers>
  };
}

export interface IConverter {
  // Need to figure out the correct Node type
  //
  buildElement (elementNode: any, parentNode: any, parseInfo: IParseInfo): any;
}
