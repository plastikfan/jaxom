
import * as R from 'ramda';
import * as fs from 'fs';
import * as memfs from 'memfs';
import * as xiberia from 'xiberia';

// =============================================================================

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

// Matcher definitions represents all matchers that can be configured in the spec. So
// this comprises of all primitive types and compound values.
//
export type MatcherStr = 'collection' | 'date' | 'primitives' | PrimitiveStr;
export const MatcherStrArray = R.union(PrimitiveStrArray, ['collection', 'date', 'primitives']);

export type SelectResult = string | number | boolean | Node | Node[];
export type SelectNodeResult = Node | Node[];
export type NullableNode = Node | null;

export type Descendants = xiberia.PlainObject | xiberia.PlainObject[];
export type ConversionResult = xiberia.PlainObject | xiberia.PlainObject[];

export type VirtualFS = typeof fs | memfs.IFs;

// ============================================================== Components ===

/**
 * @description Represents the top level component of this library. A client can
 * convert an XML document (or fragment specified by an XPath expression) into
 * a json blob.
 *
 * @export
 * @interface IConverter
 */
export interface IConverter {
  build(elementNode: Node, parseInfo: xiberia.IParseInfo): xiberia.PlainObject;
}

/**
 * @description Performs normalisation of json objects. When jaxom performs XML/json
 * conversions, the raw output produced may not be in its most useful form for clients.
 * As a convenience to clients and to remove the necessity of creating normalisation
 * boiler plate, the result of the initial conversion is normalised. A typical normalisation
 * would be to take an array of objects, all of whom can be identified by a unique id (as
 * specified by the client defined parse/element info) and translate this into a map like
 * object indexed byy those unique ids.
 *
 * @export
 * @interface INormaliser
 */
export interface INormaliser {
  combineDescendants (subject: string, parentElement: any,
    parseInfo: xiberia.IParseInfo): any;
  normaliseDescendants (subject: string, parentElement: any,
    elementInfo: xiberia.IElementInfo): any;
  mergeDescendants (local: [], inherited: Descendants): any[];
}

/**
 * @description Represents a component responsible for coercing values depending client
 * defined configuration.
 * @export
 * @interface ITransformer
 */
export interface ITransformer {
  coerceMatcherValue(subject: string, matchers: xiberia.IMatchers,
    rawValue: string, attributeName: string): {};
}
