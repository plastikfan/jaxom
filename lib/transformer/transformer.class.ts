
import * as R from 'ramda';
import { functify } from 'jinxed';
let moment = require('moment'); // why doesn't normal TS import work?
import * as types from '../types';
import {
  CollectionTypePlaceHolder,
  CollectionTypeLabel
} from '../specService/spec-option-service.class';

import * as e from '../exceptions';
import * as utils from '../utils/utils';

export class Transformer {

  constructor (private options: types.ISpecService) {

  }

  // Ideally this would be static, but can't add non-static methods to a static
  // collection!
  //
  private readonly transformers = new Map<string, ITransformFunction<any>>([
    ['boolean', this.transformBoolean],
    ['collection', this.transformCollection],
    ['date', this.transformDate],
    ['number', this.transformNumber],
    ['primitives', this.transformPrimitiveValue],
    ['string', this.transformString],
    ['symbol', this.transformSymbol]
  ]);

  // The invocation of these functions is the point at which type conversion of each array element
  // occurs from the original type to numeric type. This is the reason why we don't have to explicity
  // use the transformPrimitive / transformNumber functions to perform the type conversion.
  //
  private numericArrayCollections = new Map<string, (c: Iterable<number>, s: string, sc: types.SpecContext) => ArrayCollectionType>([
    ['int8array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Int8Array, c, s, sc)],
    ['uint8array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Uint8Array, c, s, sc)],
    ['uint8clampedarray', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Uint8ClampedArray, c, s, sc)],
    ['int16array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Int16Array, c, s, sc)],
    ['uint16array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Uint16Array, c, s, sc)],
    ['int32array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Int32Array, c, s, sc)],
    ['uint32array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Uint32Array, c, s, sc)],
    ['float32array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Float32Array, c, s, sc)],
    ['float64array', (c: Iterable<number>, s: string, sc: types.SpecContext) => this.create(Float64Array, c, s, sc)]
  ]);

  private static readonly typeExpr = /\<(?<type>[\w\[\]]+)\>/;

  /**
   * @method getTransform
   * @description Dynamically retrieves the method for the matcher type specified.
   * (Remember when invoking the resultant method, the this reference may not be correct
   * depending on the invocation). function.call may be required.
   *
   * @param {types.MatcherStr} name
   * @returns {ITransformFunction<any>}
   * @memberof Transformer
   */
  public getTransform (name: types.MatcherStr): ITransformFunction<any> {
    const result = this.transformers.get(name);
    /* istanbul ignore next: un-testable name is protected by type */
    if (!result) {
      throw new e.JaxInternalError(`Couldn't get transformer for matcher: ${name}`,
        'getTransform');
    }
    return result;
  } // getTransform

  // ---------------------------------------------------- ITransformer interface

  /**
   * @method coerceMatcherValue
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
  coerceMatcherValue (subject: string, matchers: types.IMatchers, rawValue: string, attributeName: string): {} {
    let resultValue = rawValue;

    // insertion order of keys is preserved, because key types of symbol
    // and string are iterated in insertion order. Iterate only whilst
    // we don't have a successful coercion result.
    //
    R.keys(matchers).some((mt: types.MatcherStr) => {
      const transform = this.getTransform(mt);
      const result = transform.call(this, subject, rawValue, 'attributes');

      if (result.succeeded) {
        resultValue = result.value;
      }
      return result.succeeded;
    });

    return resultValue;
  } // coerceMatcherValue

  // ITransformer interface ====================================================

  /**
   * @method transformCollection
   * @description Coerces a value representing a collection into the implied native collection.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string} collectionValue
   * @param {types.SpecContext} context
   * @returns {ITransformResult<any[]>}
   * @memberof Transformer
   */
  private transformCollection (subject: string, collectionValue: string,
    context: types.SpecContext): ITransformResult<any> { // any collection!
    let succeeded = false;
    let value: any = null;

    const delim = this.options.fetchOption(`${context}/coercion/matchers/collection/delim`) as string;
    const open = this.options.fetchOption(`${context}/coercion/matchers/collection/open`) as string;

    const collectionType = this.extractTypeFromCollectionValue(collectionValue);

    if (collectionType) {
      const openExpression: string = open.replace(CollectionTypePlaceHolder, ('<' + collectionType + '>'));
      const openExpr = new RegExp('^' + (this.escapeRegExp(openExpression)));

      const close = this.options.fetchOption(`${context}/coercion/matchers/collection/close`) as string;
      const closeExpr = new RegExp(this.escapeRegExp(close) + '$');

      const openIsMatch = openExpr.test(collectionValue);
      const closeIsMatch = closeExpr.test(collectionValue);

      if (openIsMatch && closeIsMatch) {
        let temp = openExpr.exec(collectionValue);
        const capturedOpen: string = temp![0];

        temp = closeExpr.exec(collectionValue);
        const capturedClose: string = temp![0];

        // Now look for the collection type which should be captured as '<type>'
        // So the default open pattern is: "!<[]>[", and close pattern is: "]"
        //
        // This allows values like
        // "!<[]>[1,2,3,4]" => [1,2,3,4]
        //
        const coreValue: string = this.extractCoreCollectionValue(capturedOpen, capturedClose, collectionValue);
        const collectionElements: any[] = coreValue.split(delim);

        if (collectionType === '[]') {
          // mixed type collection
          //
          const resultMix = this.transformMixedCollection(subject, context, collectionElements);
          value = resultMix.value;
          succeeded = resultMix.succeeded;
        } else if (R.includes(R.toLower(collectionType), ['object', '{}'])) {
          // object
          //
          const resultObj = this.transformObject(subject, context, collectionType, collectionElements);
          value = resultObj.value;
          succeeded = resultObj.succeeded;
        } else if (R.toLower(collectionType) === 'map') {
          // map
          //
          const resultMap = this.transformMap(subject, context, collectionType, collectionElements);
          value = resultMap.value;
          succeeded = resultMap.succeeded;
        } else if (this.numericArrayCollections.has(R.toLower(collectionType))) {
          // typed numeric array
          //
          value = this.numericArrayCollections.get(R.toLower(collectionType))!(
            collectionElements, subject, context);
          succeeded = true;
        } else if (R.toLower(collectionType) === 'set') {
          // set
          //
          const resultSet = this.transformSet(subject, context, collectionElements);
          value = resultSet.value;
          succeeded = resultSet.succeeded;

        } else {
          throw new Error(`[${subject}]: Couldn't create ${collectionType} collection`);
        }
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

      // Best explanation of RegExp named capturing group functionality:
      // https://javascript.info/regexp-groups
      //
      const collectionType = R.view(R.lensPath(['groups', CollectionTypeLabel]))(match);

      /* istanbul ignore next: reg-ex has already been tested above so can't be falsy */
      if (collectionType) {
        result = collectionType as string;
      }
    }

    return result;
  } // extractTypeFromCollectionValue

  /**
   * @method transformObject
   * @description Coerces the items in the associative collection passed in according
   * to the assoc.keyType and assoc.valueType defined in the spec.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {types.SpecContext} context
   * @param {string} collectionType
   * @param {any[]} sourceCollection
   * @returns {ITransformResult<any[]>}
   * @memberof Transformer
   */
  private transformObject (subject: string, context: types.SpecContext,
    collectionType: string, sourceCollection: any[]): ITransformResult<types.ObjectType> {

    const assocDelim = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/delim`) as string;

    const assocKeyType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/keyType`) as string;

    const assocValueType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/valueType`) as string;

    // Split out the values into an array of pairs
    //
    const transformValue: any[] = R.reduce((acc: types.PrimitiveType[], collectionPair: string) => {
      const elements: string[] = R.split(assocDelim)(collectionPair);
      let resultAcc = acc;
      if (elements.length === 2) {
        const coercedKeyResult = this.transformAssocValue(subject, assocKeyType, context, elements[0]);
        const coercedValueResult = this.transformAssocValue(subject, assocValueType, context, elements[1]);

        if (coercedKeyResult.succeeded && coercedValueResult.succeeded) {
          resultAcc = R.append([coercedKeyResult.value, coercedValueResult.value])(acc);
        } else {
          const keyMessage = `[KEY; type: "${assocKeyType}", val: "${coercedKeyResult.value.toString()}]"`;
          const valMessage = `[VAL; type: "${assocValueType}", val: "${coercedValueResult.value.toString()}]"`;
          throw new e.JaxParseError(
            `Coercion: ${keyMessage}, ${valMessage}`, subject);
        }
      } else {
        throw new e.JaxParseError(`Malformed object entry: ${collectionPair}`,
          subject);
      }

      return resultAcc;
    }, [])(sourceCollection);

    let succeeded = transformValue.length > 0;
    let result: types.ObjectType = R.fromPairs(transformValue);

    return {
      value: result,
      succeeded: succeeded
    };
  } // transformAssociativeCollection

  /**
   * @method transformMap
   * @description Coerces the items in the associative collection passed in according
   * to the assoc.keyType and assoc.valueType defined in the spec.
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {types.SpecContext} context
   * @param {string} collectionType
   * @param {any[]} sourceCollection
   * @returns {ITransformResult<Map<types.PrimitiveType, types.PrimitiveType>>}
   * @memberof Transformer
   */
  private transformMap (subject: string, context: types.SpecContext,
    collectionType: string, sourceCollection: any[]): ITransformResult<Map<types.PrimitiveType, types.PrimitiveType>> {

    const assocDelim = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/delim`) as string;

    const assocKeyType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/keyType`) as string;

    const assocValueType = this.options.fetchOption(
      `${context}/coercion/matchers/collection/assoc/valueType`) as string;

    // Split out the values into an array of pairs
    //
    const init = new Map<types.PrimitiveType, types.PrimitiveType>();

    const resultMap: Map<types.PrimitiveType, types.PrimitiveType> = R.reduce(
      (acc: Map<types.PrimitiveType, types.PrimitiveType>, collectionPair: string) => {
        const elements: string[] = R.split(assocDelim)(collectionPair);
        let result = acc;
        if (elements.length === 2) {
          const coercedKeyResult = this.transformAssocValue(subject, assocKeyType, context, elements[0]);
          const coercedValueResult = this.transformAssocValue(subject, assocValueType, context, elements[1]);

          if (coercedKeyResult.succeeded && coercedValueResult.succeeded) {
            result = acc.set(coercedKeyResult.value, coercedValueResult.value);
          }
        } else {
          throw new e.JaxParseError(`Malformed map entry: ${collectionPair}`,
            subject);
        }

        return result;
      }, init)(sourceCollection);

    let succeeded = resultMap.size > 0;

    return {
      value: resultMap,
      succeeded: succeeded
    };
  } // transformMap

  /**
   * @method transformAssocValue
   * @description Attempts to coerce a value from an associative collection
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string | string[]} assocType: The textual specifier of the type(s) to be tried. When
   * this function is invoked as part of primitive processing, the configured type can be an array
   * of types. When invoked from other contexts (eg key/value items in an associate collection), the
   * type descriptor here will simply be a string.
   * @param {types.SpecContext} context
   * @param {string} assocValue
   * @returns {ITransformResult<any>}
   * @memberof Transformer
   */
  private transformAssocValue (subject: string, assocType: string | string[],
    context: types.SpecContext, assocValue: string): ITransformResult<types.PrimitiveType> {

    let coercedValue: types.PrimitiveType = assocValue;
    let succeeded = false;
    let assocTypes = assocType;

    // If invoked from processing associative key/value pairs that are configured as a
    // string, we do not need to attempt coercion. We can't leave it to the string transform
    // because this is overkill, and we should not be subject to having a string matcher set
    // to 'false', which is meant for a different purpose altogether. So we check for this and
    // bypass the coercion attempt.
    //
    if (assocType === 'string') {
      coercedValue = assocValue;
      succeeded = true;
    } else {
      if (typeof assocType === 'string') {
        assocTypes = [assocType];
      }

      /* istanbul ignore next: type guard so we can call .some() */
      if (assocTypes instanceof Array) {
        let self = this;
        assocTypes.some((val: types.PrimitiveStr) => {
          if (R.includes(val, types.PrimitiveStrArray)) {
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
      }
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
   * @param {types.SpecContext} context
   * @returns {ITransformResult<number>}
   * @memberof Transformer
   */
  private transformNumber (subject: string, numberValue: number,
    context: types.SpecContext): ITransformResult<number> {

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
   * @param {types.SpecContext} context
   * @returns {ITransformResult<boolean>}
   * @memberof Transformer
   */
  private transformBoolean (subject: string, booleanValue: string | boolean,
    context: types.SpecContext): ITransformResult<boolean> {

    let value = false;
    let succeeded = false;

    if (R.is(Boolean)(booleanValue)) {
      succeeded = true;
      value = booleanValue as boolean;
    } else {
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
    }

    return {
      value: value,
      succeeded: succeeded
    };
  } // transformBoolean

  /**
   * @method transformPrimitiveValue
   * @description Attempts to coerce value according to the primitives defined in the spec
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string} primitiveValue: the raw primitive text value to be transformed
   * @param {types.SpecContext} context
   * @returns {ITransformResult<any>}
   * @memberof Transformer
   */
  private transformPrimitiveValue (subject: string, primitiveValue: string,
    context: types.SpecContext): ITransformResult<types.CoercivePrimitiveType> {

    const primitives = this.options.fetchOption(`${context}/coercion/matchers/primitives`) as [];

    let coercedValue = 0;
    let succeeded = false;

    primitives.some((val: types.CoercivePrimitiveStr) => {
      const validatedPrimitiveStr = R.toLower(val);
      if (R.includes(validatedPrimitiveStr, types.CoercivePrimitiveStrArray)) {
        const transform = this.getTransform(val);
        const coercedResult = transform(subject, primitiveValue, context);
        succeeded = coercedResult.succeeded;

        if (succeeded) {
          coercedValue = coercedResult.value;
        }
      } else {
        throw new e.JaxConfigError(
          `Invalid primitives config "${context}/coercion/matchers/primitives = ${primitives}"`,
            subject);
      }

      return succeeded;
    });

    return {
      succeeded: succeeded,
      value: coercedValue
    };
  } // transformPrimitiveValue

  /**
   * @method transformElementValue
   * @description Transforms a single element value
   *
   * @private
   * @param {string} subject
   * @param {types.CoercivePrimitiveType} elementValue
   * @param {types.SpecContext} context
   * @returns {ITransformResult<types.CoercivePrimitiveType>}
   * @memberof Transformer
   */
  private transformElementValue (subject: string, elementValue: types.PrimitiveType,
    context: types.SpecContext): ITransformResult<types.PrimitiveType> {

    const elementTypes = this.options.fetchOption(`${context}/coercion/matchers/collection/elementTypes`) as [];

    let coercedValue = elementValue;
    let succeeded = false;

    elementTypes.some((val: types.PrimitiveStr) => {
      const validatedElementStr = R.toLower(val);
      if (R.includes(validatedElementStr, types.CoercivePrimitiveStrArray)) {
        const transform = this.getTransform(val);
        const coercedResult = transform(subject, elementValue, context);
        succeeded = coercedResult.succeeded;

        if (succeeded) {
          coercedValue = coercedResult.value;
        }
      } else {
        throw new e.JaxConfigError(
          `Invalid elementTypes config "${context}/coercion/matchers/elementTypes = ${elementTypes}"`,
            subject);
      }

      return succeeded;
    });

    return {
      succeeded: succeeded,
      value: coercedValue
    };
  } // transformElementValue

  /**
   * @method transformDate
   * @description Attempts to coerce a value to a date
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {string} dateValue
   * @param {types.SpecContext} context
   * @returns {ITransformResult<Date>}
   * @memberof Transformer
   */
  private transformDate (subject: string, dateValue: string,
    context: types.SpecContext): ITransformResult<Date> {

    const format = this.options.fetchOption(`${context}/coercion/matchers/date/format`) as string;
    const momentDate = moment(dateValue, format);
    const succeeded = momentDate.isValid();

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
    context: types.SpecContext): ITransformResult<Symbol> {

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
   * can be explicitly defined to force an exception to be thrown if other defined
   * transforms also fail. To achieve this, just define the "string" matcher in the
   * spec with a value of false. If the string matcher is missing from the spec then
   * we just default to accepting the raw value as the coercion result.
   *
   * @param {string} subject: Identifies the current xml entity
   * @param {string} stringValue
   * @param {contextType} context
   * @returns: { value: the raw string verbatim, succeeded: flag to indicate transform result }
   * @memberof Transformer
   */
  transformString (subject: string, stringValue: string, context: types.SpecContext)
    : ITransformResult<string> {
    const optionStr = this.options.fetchOption(`${context}/coercion/matchers/string`);

    const stringCoercionAcceptable: boolean = optionStr === undefined ? true : optionStr as boolean;
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
  private extractCoreCollectionValue (open: string, close: string, collectionValue: string): string {
    // Assumption: the open and close have already been matched against the collection value,
    // so collectionValue must start with open and end with close, so we don't need to check.
    //
    const coreValue = collectionValue.replace(open, '');
    return coreValue.slice(0, coreValue.length - close.length);
  } // extractCoreCollectionValue

  /**
   * @function: escapeRegExp
   *
   * @see: https: //developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
   * @param {String} inputString: input to escape.
   * @returns: escaped String.
   */
  private escapeRegExp (inputString: string): string {
    return inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  /**
   * @method create
   * @description Creates the typed collection. Whilst creating the collection, we need to ensure that
   *  each element is actually numeric. Since the user may accidentally add a non numeric element to the
   *  array, it would be bad to silently convert this value to 0, as is the case by default. There is no
   *  sensible scenario in which a user may request that a compound value declared to be created with a
   *  typed collection, should specify a non numeric value so let's just throw in all cases; and it
   *  doesn't even make sense to make this behaviour to be configurable via a spec or IElementInfo setting.
   *
   * @private
   * @template CT the type of collection to create
   * @param {IFrom<CT>} collectionClass
   * @param {Iterable<number>} c: the collection being converted
   * @param {string} s: the subject
   * @param {types.SpecContext} sc: the context
   * @returns {CT}
   * @memberof Transformer
   */
  private create<CT> (collectionClass: IFrom<CT>, c: Iterable<number>, s: string, sc: types.SpecContext): CT {
    const collection = collectionClass.from(c, (v: any, i: number): number => {
      if (!utils.isNumeric(v)) {
        const message = `[${s}]: Can't add non numeric ${sc} item: "${v}", to collection: "${collectionClass.name}".`;
        throw new TypeError(message);
      }
      return v;
    });

    return collection;
  }

  /**
   * @method transformMixedCollection
   * @description Creates a mixed type collection. Each element is coerced by trying each transform
   * defined in ../coercion/matchers/collection/elementTypes.
   *
   * @private
   * @param {string} subject
   * @param {types.SpecContext} context
   * @param {any[]} c: the collection instance to convert
   * @returns {ITransformResult<types.CoercivePrimitiveType[]>}
   * @memberof Transformer
   */
  private transformMixedCollection (subject: string, context: types.SpecContext, c: any[])
    : ITransformResult<types.CoercivePrimitiveType[]> {

    const value = Array.from(c, (val: any, i: number): any => {
      const transformResult = this.transformElementValue(subject, val, context);
      return transformResult.succeeded ? transformResult.value : val;
    });

    return {
      value: value,
      succeeded: true
    };
  }

  /**
   * @method transformSet
   * @description Creates a Set instance with coerced element contents
   * @private
   * @param {string} subject
   * @param {types.SpecContext} context
   * @param {types.PrimitiveType[]} c: the collection instance to convert
   * @returns {ITransformResult<Set<types.PrimitiveType>>}
   * @memberof Transformer
   */
  private transformSet (subject: string, context: types.SpecContext, c: types.PrimitiveType[])
    : ITransformResult<Set<types.PrimitiveType>> {

    const init = new Set<types.CoercivePrimitiveType>();
    const resultSet = R.reduce((acc: Set<types.PrimitiveType>, val: types.PrimitiveType)
      : Set<types.PrimitiveType> => {
      const transformResult = this.transformElementValue(subject, val, context);
      return acc.add(transformResult.value);
    }, init)(c);

    return {
      value: resultSet,
      succeeded: true
    };
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
  (subject: string, rawValue: T, c: types.SpecContext): ITransformResult<T>;
}

/**
 * @interface IFrom
 * @template CT represents the collection type, eg Int8Array
 * @description used as a constraint for the create method and also allowing create
 * to invoke the from method for creation of the typed collection from an iterable.
 */
interface IFrom<CT> { // definitions taken from iterable.d.ts
  new(elements: Iterable<number>): CT;
  from (arrayLike: Iterable<number>, mapfn?: (v: number, k: number) => number, thisArg?: any): CT;
}

type ArrayCollectionType = [] | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array |
  Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

// Extend the Function interface to enable proper reporting of collection in "create<CT>"
//
interface Function {
  name: string;
}
