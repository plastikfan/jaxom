
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

// Coercion definitions are for those primitive types that require a coercion from
// raw string value. 'date' is not part of this list because there is no reasonable
// default for a date (eg what format should be used) and as such is not deemed a
// simple type. Also, of note, these types can be configured as part of the 'primitives'
// collection as opposed to be defined as a separate matcher in themselves.
//
export type CoercivePrimitiveStr = 'boolean' | 'number' | 'symbol';
export const CoercivePrimitiveStrArray = ['boolean', 'number', 'symbol'];
export type CoercivePrimitiveType = boolean | number | symbol;

// Primitive definitions that represent any simple singular values that can also be
// used as the type of key in associative collections.
//
export type PrimitiveStr = 'string' | CoercivePrimitiveStr;
export const PrimitiveStrArray = R.union(CoercivePrimitiveStrArray, ['string']);
export type PrimitiveType = string | CoercivePrimitiveType;

export type ObjectType = Object | {};

// Matcher definitions represents all matchers that can be configured in the spec. So
// this comprises of all primitive types and compound values.
//
export type MatcherStr = 'collection' | 'date' | 'primitives' | PrimitiveStr;
export const MatcherStrArray = R.union(PrimitiveStrArray, ['collection', 'date', 'primitives']);
export interface IAssociativeCollection { // {DEF}
  delim?: string;
  keyType?: string | string[];
  valueType?: string | string[];
}

export interface ITextNodeCollection { // {DEF}
  assoc?: IAssociativeCollection;
  elementTypes?: ReadonlyArray<CoercivePrimitiveStr>;
}

export interface IAttributeNodeCollection { // {DEF}
  delim?: string;
  open?: string;
  close?: string;
  assoc?: IAssociativeCollection;
  elementTypes?: ReadonlyArray<CoercivePrimitiveStr>;
}

export interface IMatchers { // {DEF}
  boolean?: any; // (boolean matcher doesn't need a config value)
  // collection
  date?: {
    format?: string
  };
  number?: any; // (number matcher doesn't need a config value)
  primitives?: ReadonlyArray<CoercivePrimitiveStr>;
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

export type SpecContext = 'attributes' | 'textNodes';

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
