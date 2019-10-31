
export interface IElementInfo {
  // 'id' is optional so that user can specify an object without an id for default
  //
  readonly id?: string;
  readonly recurse?: string;
  readonly discards?: ReadonlyArray<string>;
  readonly descendants?: {
    readonly by?: string;
    readonly throwIfCollision?: boolean;
    readonly throwIfMissing?: boolean;
  };
}

export interface IParseInfo {
  readonly elements: ReadonlyArray<IElementInfo>;
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

interface IMatcher {
  primitives?: ReadonlyArray<string>;
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

interface IAttributesMatcher extends IMatcher {
  collection?: IAttributeNodeCollection;
}

interface ITextNodesMatcher extends IMatcher {
  collection?: ITextNodeCollection;
}
interface ICoercionEntity<T extends IMatcher> {
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
    attributes?: ICoercionEntity<IAttributesMatcher>,
    textNodes?: ICoercionEntity<ITextNodesMatcher>
  };
}

export interface IConverter {
  buildElement (elementNode: Node, parentNode: Node, parseInfo: IParseInfo): any;
}
