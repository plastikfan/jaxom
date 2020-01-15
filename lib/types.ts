
// Element Parse Info
//
export interface IElementInfo {
  readonly id?: string;
  readonly recurse?: string;
  readonly discards?: ReadonlyArray<string>;
  readonly descendants?: {
    readonly by?: string;
    readonly id?: string;
    readonly throwIfCollision?: boolean;
    readonly throwIfMissing?: boolean;
  };
}

export interface IParseInfo {
  readonly elements: ReadonlyMap<string, IElementInfo>;
  readonly common?: IElementInfo;
  readonly def?: IElementInfo;
}

// Spec
//

export interface IAssociativeCollection { // {DEF}
  delim?: string;
  keyType?: string | string[];
  valueType?: string | string[];
}

export interface ITextNodeCollection { // {DEF}
  assoc?: IAssociativeCollection;
}

export interface IAttributeNodeCollection { // {DEF}
  delim?: string;
  open?: string;
  close?: string;
  assoc?: IAssociativeCollection;
}

export type ContextType = 'attributes' | 'textNodes';
export type MatcherType = 'number' | 'boolean' | 'primitives' | 'collection' | 'date' | 'symbol' | 'string';

// The primitive that are allowed to be defined inside the primitives matcher array
//
export type PrimitiveType = 'number' | 'boolean';

export interface IMatchers { // {DEF}
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
  number?: any; // (number matcher doesn't need a config value)
  boolean?: any; // (boolean matcher doesn't need a config value)
}

export interface IAttributesMatchers extends IMatchers {
  collection?: IAttributeNodeCollection;
}

export interface ITextNodesMatchers extends IMatchers {
  collection?: ITextNodeCollection;
}
export interface ICoercionEntity<T extends IMatchers> {
  matchers?: T;
}

export interface IMandatorySpecLabels {
  // NB: attributes is always optional, since it is used as a switch to
  // activate/deactivate attributes stored as members or array
  //
  attributes?: string; // NOT DEFAULT-ABLE
  element: string;
  descendants: string;
  text: string;
}

type IPartialSpecLabels = Partial<IMandatorySpecLabels>;

export interface ISpec {
  name: string;
  labels?: IPartialSpecLabels; // DEF
  attributes?: {
    trim?: boolean; // {DEF}
    // coercion NOT DEFAULT-ABLE. If not present, then coercion is turned off
    // (also applies to textNodes)
    //
    coercion?: ICoercionEntity<IAttributesMatchers>
  };
  textNodes?: {
    trim?: boolean;
    coercion?: ICoercionEntity<ITextNodesMatchers>
  };
}

export type SelectResult = string | number | boolean | Node | Node[];
export type SelectNodeResult = Node | Node[];
export type NullableNode = Node | null;
export interface IConverter {
  build (elementNode: Node, parseInfo: IParseInfo): any;
}

export interface INormaliser {
  combineDescendants (subject: string, parent: {}): {};
  normaliseDescendants (subject: string, parentElement: any, elementInfo: IElementInfo): any;
}

export interface ITransformer {
  coerceAttributeValue (subject: string, matchers: IMatchers, rawValue: any, attributeName: string): {};
}

export interface ISpecService {
  fetchOption (path: string, fallBack?: boolean): any;
  readonly elementLabel: string;
  readonly descendantsLabel: string;
  readonly textLabel: string;
  getSpec (): ISpec;
}
