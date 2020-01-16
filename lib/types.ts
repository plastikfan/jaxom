
import * as R from 'ramda';

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

// The primitive that are allowed to be defined inside the primitives matcher array
//
// PrimitiveType should be number | boolean | symbol
// unless we define a new type: PrimitiveValueType
// rename PrimitiveType to PrimitiveMatcherType
export type PrimitiveStr = 'boolean' | 'number' | 'symbol';
// export type PrimitiveType = boolean | number | symbol;
export const PrimitiveStrArray = ['boolean', 'number', 'symbol'];

// Config Types (string) should include Token (PrimitiveStr)
// Native types (type) should include Type suffix (PrimitiveType)

// export type CoercivePrimitiveType = boolean | number | symbol;
// export type CoercivePrimitiveStr = 'boolean' | 'number' | 'symbol';
// export const CoercivePrimitiveStrArray = ['boolean', 'number', 'symbol'];

export type MatcherStr = 'collection' | 'date' | 'primitives' | 'string' | PrimitiveStr;
export const MatcherStrArray = R.union(PrimitiveStrArray, ['collection', 'date', 'primitives', 'string']);

// COLLECTION TYPE / PRIMITIVE

// MATCHER TYPE

export type SpecContext = 'attributes' | 'textNodes';

// export type PrimitiveValueType = boolean | number | string | symbol;

export interface IMatchers { // {DEF}
  boolean?: any; // (boolean matcher doesn't need a config value)
  // collection
  date?: {
    format?: string
  };
  number?: any; // (number matcher doesn't need a config value)
  primitives?: ReadonlyArray<PrimitiveStr>;
  symbol?: {
    prefix?: string,
    global?: boolean
  };
  string?: boolean;
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
  coerceMatcherValue (subject: string, matchers: IMatchers, rawValue: string, attributeName: string): {};
}

export interface ISpecService {
  fetchOption (path: string, fallBack?: boolean): any;
  readonly elementLabel: string;
  readonly descendantsLabel: string;
  readonly textLabel: string;
  getSpec (): ISpec;
}
