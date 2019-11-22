
import * as R from 'ramda';
import { functify } from 'jinxed';
let moment = require('moment'); // why doesn't normal TS import work?
import * as types from '../types';
import * as specs from '../specs';
import * as e from '../exceptions';

export class Transformer {

  constructor (private options: types.ISpecService) {

  }

  // Ideally this would be static, but can't add non-static methods to a static
  // collection!
  //
  private readonly transformers = new Map<string, ITransformFunction<any>>([
    ['number', this.transformNumber],
    ['boolean', this.transformBoolean],
    ['primitives', this.transformPrimitives],
    ['collection', this.transformCollection],
    ['date', this.transformDate],
    ['symbol', this.transformSymbol],
    ['string', this.transformString]
  ]);

  private static readonly typeExpr = /\<(?<type>[\w\[\]]+)\>/;

  /**
   * @method getTransform
   * @description Dynamically retrieves the method for the matcher type specified.
   * (Remember when invoking the resultant method, the this reference may not be correct
   * depending on the invocation). function.call may be required.
   *
   * @param {types.MatcherType} name
   * @returns {ITransformFunction<any>}
   * @memberof Transformer
   */
  public getTransform (name: types.MatcherType): ITransformFunction<any> {
    const result = this.transformers.get(name);

    if (!result) {
      throw new e.JaxInternalError(`Couldn't get transformer for matcher: ${name}`,
        'getTransform');
    }
    return result;
  }

  // ---------------------------------------------------- ITransformer interface

  /**
   * @method coerceAttributeValue
   * @description Top level function that implements value type coercion.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity: Identifies the current xml entity
   * @param {*} matchers
   * @param {*} rawValue
   * @param {string} attributeName
   * @returns
   * @memberof Transformer
   */
  coerceAttributeValue (subject: string, matchers: any, rawValue: any, attributeName: string): {} {
    let resultValue = rawValue;

    if (R.is(Object)(matchers)) {
      // insertion order of keys is preserved, because key types of symbol
      // and string are iterated in insertion order. Iterative only whilst
      // we don't have a successful coercion result.
      //
      R.keys(matchers).some((mt: types.MatcherType) => {
        const transform = this.getTransform(R.toLower(mt) as types.MatcherType);
        const result = transform.call(this, subject, rawValue, 'attributes');

        if (result.succeeded) {
          resultValue = result.value;
        }
        return result.succeeded;
      });
    } else {
      throw new e.JaxInternalError(
        `invalid matchers: ${functify(matchers)}, for attribute: ${attributeName} / raw value: ${rawValue}`,
          'coerceAttributeValue');
    }

    return resultValue;
  }

  // ITransformer interface ====================================================

  /**
   * @method transformCollection
   * @description Coerces a value representing a collection into the implied native collection.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string} collectionValue
   * @param {types.ContextType} context
   * @returns {ITransformResult<any[]>}
   * @memberof Transformer
   */
  private transformCollection (subject: string, collectionValue: string,
    context: types.ContextType): ITransformResult<any[]> {
    let succeeded = false;
    let value: any = null;

    const delim = this.options.fetchOption(`${context}/coercion/matchers/collection/delim`) as string;
    const open = this.options.fetchOption(`${context}/coercion/matchers/collection/open`) as string;

    const collectionType = this.extractTypeFromCollectionValue(collectionValue);

    if (collectionType) {
      const openExpression: string = open.replace(specs.CollectionTypePlaceHolder, ('<' + collectionType + '>'));
      const openExpr = new RegExp('^' + (this.escapeRegExp(openExpression)));

      const close = this.options.fetchOption(`${context}/coercion/matchers/collection/close`) as string;
      const closeExpr = new RegExp(this.escapeRegExp(close) + '$');

      const openIsMatch = openExpr.test(collectionValue);
      const closeIsMatch = closeExpr.test(collectionValue);

      if (openIsMatch && closeIsMatch) {
        let temp = openExpr.exec(collectionValue);
        const capturedOpen: string = (temp) ? temp[0] : '';
        if (capturedOpen === '') {
          throw new e.JaxParseError(`open expression fails match for value '${collectionValue}'`,
            subject);
        }

        temp = closeExpr.exec(collectionValue);
        const capturedClose: string = (temp) ? temp[0] : '';
        if (capturedClose === '') {
          throw new e.JaxParseError(`close expression fails match for value '${collectionValue}'`,
            subject);
        }

        // Now look for the collection type which should be captured as '<type>'
        // So the default open pattern is: "!<[]>[", and close pattern is: "]"
        //
        // This allows values like
        // "!<[]>[1,2,3,4]" => [1,2,3,4]
        // "!<[Int8Array]>[1,2,3,4]" => [1,2,3,4]
        //
        const coreValue: string = this.extractCoreCollectionValue(capturedOpen, capturedClose, collectionValue);
        const arrayElements: any[] = coreValue.split(delim);

        return this.isUnaryCollection(collectionType)
          ? this.transformUnaryCollection(subject, context, arrayElements)
          : this.transformAssociativeCollection(subject, context, collectionType, arrayElements);
      }
    }

    return {
      value: value,
      succeeded: succeeded
    };
  } // transformCollection

  /**
   * @method extractTypeFromCollectionValue
   * @description XML source can contain something like: !<Int8Array>[1,2,3,4]
   * to recognise sequences like "!<[]>[" or "!<Int8Array>[" which should
   * return "[]" and "Int8Array" respectively.
   *
   * NB: typeRegExp should be a member on the class, but only used by this method.
   * ideally, this would be a private internal static member of this method.
   *
   * @private
   * @param {string} open
   * @returns {string}
   * @memberof Transformer
   */
  private extractTypeFromCollectionValue (open: string): string {
    let result = '';

    if (Transformer.typeExpr.test(open)) {

      const match = Transformer.typeExpr.exec(open);
      const collectionType = R.view(R.lensPath(['groups', specs.CollectionTypeLabel]))(match);

      if (collectionType) {
        result = collectionType as string;
      }
    }

    return result;
  } // extractTypeFromCollectionValue

  /**
   * @method transformUnaryCollection
   * @description A unary collection is one where each item is created by a single
   * value; ie its the opposite of an associative collection where each entry in the
   * collection requires 2 values: the key and the value. Each item in the collection
   * is treated as a primitive and are transformed according to the primitives
   * directive in the spec.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {types.ContextType} context
   * @param {any[]} sourceCollection
   * @returns {ITransformResult<any[]>}
   * @memberof Transformer
   */
  private transformUnaryCollection (subject: string, context: types.ContextType,
    sourceCollection: any[]): ITransformResult<any[]> {
    const value: any[] = R.map((item: types.PrimitiveType) => {
      const itemResult = this.transformPrimitives(subject, item, context);
      return (itemResult.succeeded) ? itemResult.value : item;
    })(sourceCollection);

    return {
      value: value,
      succeeded: true
    };
  } // transformUnaryCollection

  /**
   * @method transformAssociativeCollection
   * @description Coerces the items in the associative collection passed in according
   * to the assoc.keyType and assoc.valueType defined in the spec.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {types.ContextType} context
   * @param {string} collectionType
   * @param {any[]} sourceCollection
   * @returns {ITransformResult<any[]>}
   * @memberof Transformer
   */
  private transformAssociativeCollection (subject: string, context: types.ContextType,
    collectionType: string, sourceCollection: any[]): ITransformResult<any[]> {

    const assocDelim = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/delim`) as string;

    const assocKeyType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/keyType`) as string;

    const assocValueType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/valueType`) as string;

    // Split out the values into an array of pairs
    //
    const transformValue: any[] = R.reduce((acc: any[], collectionPair: string) => {
      const elements: string[] = R.split(assocDelim)(collectionPair);
      if (elements.length === 2) {
        const coercedKeyResult = this.transformAssoc(subject, assocKeyType, context, elements[0]);
        const coercedValueResult = this.transformAssoc(subject, assocValueType, context, elements[1]);

        if (coercedKeyResult.succeeded && coercedValueResult.succeeded) {
          return R.append([coercedKeyResult.value, coercedValueResult.value])(acc);
        }
      } else {
        throw new e.JaxParseError(`Malformed map entry: ${collectionPair}`,
          subject);
      }

      return acc;
    }, [])(sourceCollection);

    let succeeded = true;
    let result: any;

    // Create the collection wrapper. We need to apply the coercion to individual
    // values here; transformAssoc ...
    //
    result = R.includes(R.toLower(collectionType), ['object', '{}'])
      ? R.fromPairs(transformValue)
      : this.createTypedCollection(R.toLower(collectionType), transformValue);

    return {
      value: result,
      succeeded: succeeded
    };
  } // transformAssociativeCollection

  /**
   * @method transformAssoc
   * @description Attempts to coerce a value from an associative collection
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {*} assocType
   * @param {types.ContextType} context
   * @param {string} assocValue
   * @returns {ITransformResult<any>}
   * @memberof Transformer
   */
  private transformAssoc (subject: string, assocType: any,
    context: types.ContextType, assocValue: string): ITransformResult<any> {

    let coercedValue = null;
    let succeeded = false;

    let assocTypes = assocType;

    if (R.is(String)(assocType)) {
      assocTypes = [assocType];
    }

    if (R.is(Array)(assocTypes)) {
      let self = this;
      assocTypes.some((val: types.PrimitiveType) => {
        if (R.includes(val, ['number', 'boolean', 'symbol', 'string'])) {
          const transform = self.getTransform(val);
          const coercedResult = transform.call(self, subject, assocValue, context);

          if (coercedResult.succeeded) {
            succeeded = coercedResult.succeeded;
            coercedValue = coercedResult.value;
          }

          return coercedResult.succeeded;
        } else {
          throw new e.JaxConfigError(`Invalid value type for associative collection found: ${val}`,
            subject);
        }
      });
    } else {
      throw new e.JaxConfigError(`Invalid associative value type: ${functify(assocTypes)}`,
        subject);
    }

    return {
      succeeded: succeeded,
      value: coercedValue
    };
  } // transformAssoc

  /**
   * @method transformNumber
   * @description Attempts to coerce value to number
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {number} numberValue
   * @param {types.ContextType} context
   * @returns {ITransformResult<number>}
   * @memberof Transformer
   */
  private transformNumber (subject: string, numberValue: number,
    context: types.ContextType): ITransformResult<number> {

    let result = Number(numberValue);

    const succeeded = !(isNaN(result));
    if (!succeeded) {
      result = numberValue;
    }

    return {
      value: result,
      succeeded: succeeded
    };
  } // transformNumber

  /**
   * @method transformBoolean
   * @description Attempts to coerce value to boolean
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {(string | boolean)} booleanValue
   * @param {types.ContextType} context
   * @returns {ITransformResult<boolean>}
   * @memberof Transformer
   */
  private transformBoolean (subject: string, booleanValue: string | boolean,
    context: types.ContextType): ITransformResult<boolean> {

    let value;
    let succeeded = false;

    if (R.is(Boolean)(booleanValue)) {
      succeeded = true;
      value = booleanValue as boolean;
    } else if (R.is(String)(booleanValue)) {
      const lowerBooleanValue = R.toLower(booleanValue as string);
      if (R.either(R.equals('true'), R.equals('false'))(lowerBooleanValue)) {
        succeeded = true;
        value = true;

        if (R.equals('false')(lowerBooleanValue)) {
          value = false;
        }
      } else {
        value = false;
      }
    } else {
      // This value is not significant and should not be used, since the transform function
      // has failed; however, we can't leave value to be unset.
      //
      value = false;
    }

    return {
      value: value,
      succeeded: succeeded
    };
  } // transformBoolean

  /**
   * @method transformPrimitives
   * @description Attempts to coerce value according to the primitives defined in the spec
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {types.PrimitiveType} primitiveValue
   * @param {types.ContextType} context
   * @returns {ITransformResult<any>}
   * @memberof Transformer
   */
  private transformPrimitives (subject: string, primitiveValue: types.PrimitiveType,
    context: types.ContextType): ITransformResult<any> {

    const primitives = this.options.fetchOption(`${context}/coercion/matchers/primitives`) as [];

    if (R.includes(R.toLower(primitiveValue), ['primitives', 'collection'])) {
      throw new e.JaxConfigError(`primitives matcher cannot contain: ${primitiveValue}`,
        subject);
    }

    let coercedValue = null;
    let succeeded = false;

    primitives.some((val: types.PrimitiveType) => {
      const transform = this.getTransform(val);
      const coercedResult = transform(subject, primitiveValue, context);
      succeeded = coercedResult.succeeded;

      if (succeeded) {
        coercedValue = coercedResult.value;
      }

      return succeeded;
    });

    return {
      succeeded: succeeded,
      value: coercedValue
    };
  } // transformPrimitives

  /**
   * @method transformDate
   * @description Attempts to coerce a value to a date
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string} dateValue
   * @param {types.ContextType} context
   * @returns {ITransformResult<Date>}
   * @memberof Transformer
   */
  private transformDate (subject: string, dateValue: string,
    context: types.ContextType): ITransformResult<Date> {

    const format = this.options.fetchOption(`${context}/coercion/matchers/date/format`) as string;

    let momentDate;
    let succeeded;

    try {
      momentDate = moment(dateValue, format);
      succeeded = momentDate.isValid();
    } catch (err) {
      succeeded = false;
      momentDate = dateValue;
    }

    return {
      value: momentDate,
      succeeded: succeeded
    };
  } // transformDate

  /**
   * @method transformSymbol
   * @description: coerces string to a symbol.
   *
   * @param {string} subject: Identifies the current xml entity
   * @param {Symbol} symbolValue
   * @param {contextType} context
   * @returns
   * @memberof Transformer
   */
  transformSymbol (subject: string, symbolValue: string,
    context: types.ContextType): ITransformResult<Symbol> {

    const prefix = this.options.fetchOption(
      `${context}/coercion/matchers/symbol/prefix`) as string;

    const global = this.options.fetchOption(
      `${context}/coercion/matchers/symbol/global`) as string;

    const expr = new RegExp('^' + this.escapeRegExp(prefix));

    const succeeded = expr.test(symbolValue);

    return {
      value: global ? Symbol.for(symbolValue.toString()) : Symbol(symbolValue),
      succeeded: succeeded
    };
  } // transformSymbol

  /**
   * @method transformString
   * @description: Simply returns the value directly from the source. This transform
   *    can be explicitly defined to force an exception to be thrown if other defined
   *    transforms also fail. To achieve this, just define the "string" matcher in the
   *    spec with a value of false.
   *
   * @param {string} subject: Identifies the current xml entity
   * @param {string} stringValue
   * @param {contextType} context
   * @returns: { value: the transformed string, succeeded: flag to indicate transform result }
   * @memberof Transformer
   */
  transformString (subject: string, stringValue: string, context: types.ContextType)
    : ITransformResult<string> {
    const stringCoercionAcceptable = this.options.fetchOption(
      `${context}/coercion/matchers/string`) as boolean;

    if (!stringCoercionAcceptable) {
      throw new e.JaxSolicitedError(`matching failed, terminated by string matcher.`,
        subject);
    }

    return {
      value: stringValue,
      succeeded: true
    };
  } // transformString

  /**
   * @function createTypedCollection
   *
   * @param {string} t
   * @param {*} collectionElements: the source to create the typed collection from
   * @returns {*}
   * @memberof Transformer
   */
  createTypedCollection (t: string, collectionElements: any): any {
    let collection: any;

    switch (t) {
      case 'int8array': collection = Int8Array.from(collectionElements); break;
      case 'uint8array': collection = Uint8Array.from(collectionElements); break;
      case 'uint8clampedarray': collection = Uint8ClampedArray.from(collectionElements); break;
      case 'int16array': collection = Int16Array.from(collectionElements); break;
      case 'uint16array': collection = Uint16Array.from(collectionElements); break;
      case 'int32array': collection = Int32Array.from(collectionElements); break;
      case 'uint32array': collection = Uint32Array.from(collectionElements); break;
      case 'float32array': collection = Float32Array.from(collectionElements); break;
      case 'float64array': collection = Float64Array.from(collectionElements); break;
      case 'set': collection = new Set(collectionElements); break;
      case 'weakset': collection = new WeakSet(collectionElements); break;
      case 'map': collection = new Map(collectionElements); break;
      case 'weakmap': collection = new WeakMap(collectionElements); break;

      default:
        collection = Array.from(collectionElements);
    }

    return collection;
  } // createTypedCollection

  /**
   * @function extractCoreCollectionValue
   * @description The raw value in the xml that represents a collection value for example:
   * '!<int8array>[1, 2, 3, 4]'. This function extracts the payload value stripping out
   * the meta data that identifies this as a collection value; so in this case, '1, 2, 3, 4'
   * would be returned.
   *
   * @param {string} open
   * @param {string} close
   * @param {string} collectionValue
   * @returns {string}
   * @memberof Transformer
   */
  extractCoreCollectionValue (open: string, close: string, collectionValue: string): string {
    if (collectionValue.startsWith(open) && collectionValue.endsWith(close)) {
      const coreValue = collectionValue.replace(open, '');
      return coreValue.slice(0, coreValue.length - close.length);
    }

    return collectionValue;
  } // extractCoreCollectionValue

  /**
   * @function: escapeRegExp
   *
   * @see: https: //developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
   * @param {String} inputString: input to escape.
   * @returns: escaped String.
   */
  escapeRegExp (inputString: string): string {
    return inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  /**
   * @function isUnaryCollection
   *
   * @param {string} definedType
   * @returns {boolean}
   */
  isUnaryCollection (definedType: string): boolean {
    return R.includes(R.toLower(definedType), ['[]', 'int8array', 'uint8array', 'uint8clampedarray', 'int16array',
      'int16array', 'int32array', 'uint32array', 'float32array', 'float64array', 'set']);
  }
} // Transformer class

/**
 * @description Internal implementation interface which is required due to the fact that
 * transform operations are chained together (a bit like chain of responsibility). That
 * is to say, that for a particular value being parsed from the xml (either from a text
 * node or attribute value), each transform function may succeed or fail. When a fail occurs
 * by a particular transform function, that doesn't mean a real error. All it means is that
 * that transform function is not applicable to that value, so we should just try the next
 * transform in the chain. This is why we can't throw an exception from a transform function
 * and instead need a boolean flag (@value) as well as the transformed result (@succeeded).
 * The only time we can throw an exception is if the user has defined the string transform
 * (via the string boolean flag) to be false. All values in xml source are clearly a string
 * therefore but if the user has defined various other transforms one of which must succeed,
 * we can prevent a raw string representation being returned if that's required.
 *
 * @export
 * @interface ITransformResult
 * @template T
 */
export interface ITransformResult<T> {
  value: T;
  succeeded: boolean;
}

/**
 * @description Defines the signature of transform functions.
 *
 * @export
 * @interface ITransformFunction
 * @template T The type of the transform result payload.
 */
export interface ITransformFunction<T> {
  (s: string, v: any, c: types.ContextType): ITransformResult<T>;
}
