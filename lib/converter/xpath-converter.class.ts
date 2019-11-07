
import * as R from 'ramda';
let moment = require('moment'); // why doesn't normal TS import work?

import * as types from './types';
import * as xpath from 'xpath-ts';
import { XRegExp } from 'xregexp';
import { Specs, CollectionTypePlaceHolder, CollectionTypeLabel } from './specs';
import { functify } from 'jinxed';

// Typescript the safe navigation operator ( ?. ) or (!.) and null property paths
// https://stackoverflow.com/questions/40238144/typescript-the-safe-navigation-operator-or-and-null-property-paths
//

// TODO:!!! Need to convert all object property references to use ramda views, since the !.
// typescript operator is not doing what I thought. Essentially, all it means is that the object
// is not null, but they are generally optional properties so this is unsafe. We can avert this by
// using lenses, but these are not type safe.
//
// May have to use ts-optchain as an alternative to using ramda lenses. This is preferable
// to ramda because it is type-safe. The problem with ramda lenses is that they use field names
// represented as string elements of an array, which can't be type-checked. HOWEVER, oc is not
// suitable to be used to extract named groups from .exec results, since this groups are run time
// constructs that can never be used to check at compile time. Therefore, the ts-optchain can't
// be used. We need to revert back to ramda lenses for get capture groups. I suppose, what we could
// do is for those examples where the named capture group is a hard static name, we can define an
// interface for it and use that to constrain the result of exec on the regular expression.
//

interface ITransformResult<T> {
  value: T;
  succeeded: boolean;
}

/**
 * @export
 * @class XpathConverter
 * @implements {types.IConverter}
 */
export class XpathConverter implements types.IConverter {
  /**
   * Creates an instance of XpathConverter.
   * @param {types.ISpec} [spec=Specs.default] The XpathConverter uses a spec to define
   * the conversion behaviour. A user may wish to override some of these settings, in which
   * case, they can pass in a partial spec (Partial here means that the custom spec does
   * not have to repeat all of the default fields that it does not wish to override). If
   * a setting is not found in the custom spec, that setting will be taken from the default
   * except where that setting is not default-able; please see the ISpec interface.
   *
   * @memberof XpathConverter
   */
  constructor (private spec: types.ISpec = Specs.default) {
    if (!spec) {
      throw new Error('null spec not permitted');
    }

    this.makeTransformers();
  }

  /**
   * @method buildElement
   * @description builds the native object representing an element and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   * The structure of the JSON object is defined by the Spec object passed as the spec param.
   * buildElement uses the default spec. To use a different spec, use buildElementWithSpec
   * and pass in another one. Predefined specs are available as members on the exported specs
   * object, or users can define their own.
   * @param {*} elementNode
   * @param {*} parentNode
   * @param {types.IParseInfo} parseInfo
   * @returns
   * @memberof XpathConverter
   */
  buildElement (elementNode: any, parentNode: any, parseInfo: types.IParseInfo): any {
    return this.buildElementImpl(elementNode, parentNode, parseInfo);
  }

  /**
   * @method initialise
   * @description Performs static initialisation of the class (Does NOT need to be called by
   * the client, even though it is public)
   * @static
   * @memberof XpathConverter
   */
  static initialise () {
    console.log('!!!! static INITIALISATION of XpathConverter');
    this.typeRegExp = new RegExp(`<(?${CollectionTypePlaceHolder}[\w\[\]]+)>`);
  }

  /**
   * @method buildElementImpl
   * @description builds the native object representing an element, and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   * @private
   * @param {*} elementNode
   * @param {*} parentNode
   * @param {types.IParseInfo} parseInfo
   * @param {string[]} [previouslySeen=[]]
   * @returns
   * @memberof XpathConverter
   */
  private buildElementImpl (elementNode: any, parentNode: any, parseInfo: types.IParseInfo,
    previouslySeen: string[] = []) {

    console.log(`*** buildElementImpl --> elementName: ${elementNode.nodeName}`);

    let element: any = this.buildLocalAttributes(elementNode);
    const elementLabel = this.fetchSpecOption('labels/element') as string;

    element[elementLabel] = elementNode.nodeName;

    const { recurse = '', discards = [] } = this.getElementInfo(elementNode.nodeName, parseInfo);

    if (recurse !== '') {
      element = this.recurseThroughAttribute(element, elementNode, parentNode,
        parseInfo, previouslySeen);
    }

    // Finally, filter out attributes we don't need on the final built native element
    //
    R.forEach(at => {
      element = R.dissoc(at, element);
    }, discards);

    if (elementNode.hasChildNodes()) {
      element = this.buildChildren(element, elementNode, parseInfo, previouslySeen);
    }

    return element;
  } // buildElementImpl

  /**
   * @method buildLocalAttributes
   * @description Selects all the attributes from the "localNode"
   * @private
   * @param {*} localNode
   * @returns
   * @memberof XpathConverter
   */
  private buildLocalAttributes (localNode: any) {
    // First collect all the attributes (@*) -> create attribute nodes
    // node.nodeType = 2 (ATTRIBUTE_NODE). By implication of the xpath query
    // (ie, we're selecting all attributes) all the nodeTypes of the nodes
    // returned should all be = 2; we could check with a ramda call, but is this
    // necessary?
    //
    const attributeNodes: any = xpath.select('@*', localNode) || [];
    let element: any = {};

    const attributesLabel = this.fetchSpecOption('labels/attributes', false) as string;

    if (attributesLabel && attributesLabel !== '') {
      // Build attributes as an array identified by labels.attributes
      //
      element[attributesLabel] = R.reduce((acc: any, attrNode: any) => {
        const rawAttributeValue = attrNode['value'];
        return R.append(R.objOf(attrNode['name'], rawAttributeValue), acc);
      }, [])(attributeNodes);
    } else {
      console.log(`*** buildLocalAttributes --> spec: ${functify(this.spec)}`);

      let nameValuePropertyPair = R.props(['name', 'value']);
      const coercePair = (node: any) => {
        // Build attributes as members.
        // Attribute nodes have name and value properties on them
        //
        let attributePair = nameValuePropertyPair(node); // => [attrKey, attrValue]
        const attributeName = R.head(attributePair) as string;
        const rawAttributeValue = R.last(attributePair);

        const matchers = this.fetchSpecOption('coercion/attributes/matchers');
        console.log(`*** buildLocalAttributes --> attrName: ${attributeName}, attrValue: ${rawAttributeValue}`);
        const coercedValue = this.coerceAttributeValue(matchers, rawAttributeValue, attributeName);
        attributePair[1] = coercedValue;
        return attributePair;
      };

      element = R.fromPairs(
        R.map(coercePair, attributeNodes) as []
      );
    }

    return element;
  } // buildLocalAttributes

  /**
   * @method coerceAttributeValue
   * @description Top level function that implements value type coercion.
   * @private
   * @param {*} matchers
   * @param {*} rawValue
   * @param {string} attributeName
   * @returns
   * @memberof XpathConverter
   */
  private coerceAttributeValue (matchers: any, rawValue: any, attributeName: string): any {
    let resultValue = rawValue;
    console.log(`*** coerceAttributeValue --> rawValue: ${rawValue}, attributeName: ${attributeName}`);

    if (R.is(Object)(matchers)) {
      // insertion order of keys is preserved, because key types of symbol
      // and string are iterated in insertion order. Iterative only whilst
      // we don't have a successful coercion result.
      //
      R.keys(matchers).some((mt: types.MatcherType) => {
        const transform = this.getTransformer(R.toLower(mt) as types.MatcherType);
        console.log(`+++ find matcher iteration .... m: ${mt}`);
        const result = transform.call(this, rawValue, 'attributes');

        if (result.succeeded) {
          resultValue = result.value;
        }
        return result.succeeded;
      });
    } else {
      throw new Error(
        `coerceAttributeValue: Internal error, invalid matchers: ${functify(matchers)}, for attribute: ${attributeName} / raw value: ${rawValue}`);
    }

    console.log(`^^^ coerceAttributeValue --> resultValue: ${resultValue}`);

    return resultValue;
  }

  private recurseThroughAttribute (element: any, elementNode: any, parentNode: any,
      parseInfo: types.IParseInfo, previouslySeen: string[]) {

    const { id, recurse = '' } = this.getElementInfo(elementNode.nodeName, parseInfo);
    const identifier = element[id] || '';

    if (identifier === '') {
      return element;
    }

    if (recurse !== '') {
      if (R.includes(identifier, previouslySeen)) {
        throw new Error(`Circular reference detected, element '${identifier}', has already been encountered.`);
      } else {
        previouslySeen = R.append(identifier, previouslySeen);
      }
      const { nodeName } = elementNode;

      // First get the recurse element(s), which is a csv inside @inherits.
      //
      const recurseAttr = elementNode.getAttribute(recurse) || '';

      // No attempt needs to be made to correctly merge inheritance chains, because the
      // inheritance chain is stripped off at the end anyway, since the concrete element
      // will have no use for it.
      //
      if (recurseAttr !== '') {
        // This is where horizontal merging occurs. IE, if this element inherits
        // from multiple commands (eg @inherits="base-command,domain-command,uni-command").
        // Usually, we'd expect that commands that are being merged horizontally, will not
        // contain clashes in properties, but that doesn't mean it can't occur. Also
        // this is where vertical merging could be required.
        //
        const recurseAttributes = R.split(',', recurseAttr);

        if (recurseAttributes.length > 1) {
          // Just need to map the at to a built element => array which we pass to merge
          //
          let inheritedElements = R.map(at => {
            // select element bode by id
            //
            let inheritedElementNode = selectElementNodeById(nodeName, id, at, parentNode);

            // Horizontal recursion/merging eg: (at => base-command|domain-command|uni-command)
            //
            return this.buildElementImpl(inheritedElementNode, parentNode, parseInfo,
              previouslySeen);
          }, recurseAttributes);

          // Now merge one by one. On the first iteration a={} and b=first-element. This means
          // we are merging as expected, with b taking precedence over a. So the last item
          // in the list takes precedence.
          //
          let doMergeElements = (a: any, b: any) => {
            let merged;

            const descendantsLabel = this.fetchSpecOption('labels/descendants');

            if (R.includes(descendantsLabel, R.keys(a) as string[])
              && R.includes(descendantsLabel, R.keys(b) as string[])) {
              // Both a and b have children, therefore we must merge in such a way as to
              // not to lose any properties of a by calling R.mergeAll
              //
              let mergedChildren = R.concat(a[descendantsLabel], b[descendantsLabel]); // save a
              let allMergedWithoutChildrenOfA = R.mergeAll([a, b]); // This is where we lose the children of a

              // Restore the lost properties of a
              //
              const childrenLens = R.lensProp(descendantsLabel);
              merged = R.set(childrenLens, mergedChildren, allMergedWithoutChildrenOfA);
            } else {
              // There is no clash between the children of a or b, therefore we can
              // use R.mergeAll safely.
              //
              merged = R.mergeAll([a, b]);
            }

            return merged;
          };

          let mergedInheritedElements = R.reduce(doMergeElements, {}, inheritedElements);

          // Now combine with this element
          //
          let mergeList = [mergedInheritedElements, element];

          // NB: This mergeAll is safe here, because we haven't yet built the children of this
          // element yet; this will happen later and is resolved in buildChildren.
          //
          element = R.mergeAll(mergeList);
        } else {
          // Now build the singular inherited element
          //
          const inheritedElementName = recurseAttributes[0];
          const inheritedElementNode = selectElementNodeById(nodeName, id, inheritedElementName, parentNode);

          // Vertical recursion/merging to the base element
          //
          let inheritedElement = this.buildElementImpl(inheritedElementNode, parentNode, parseInfo,
            previouslySeen);

          // Now we need to perform a merge of this element with the inherited element
          // ensuring that any properties in this element take precedence.
          //
          let mergeList = [inheritedElement, element];
          element = R.mergeAll(mergeList);
        }
      } // else recursion ends
    }

    return element;
  } // recurseThroughAttribute

  // This really should be a static, but there is no way to add a class's methods to a static
  // binding.
  //
  private makeTransformers () {
    this.transformers = new Map<string, any>();
    this.transformers.set('number', this.transformNumber);
    this.transformers.set('boolean', this.transformBoolean);
    this.transformers.set('primitives', this.transformPrimitives);
    this.transformers.set('collection', this.transformCollection);
    this.transformers.set('date', this.transformDate);
    this.transformers.set('symbol', this.transformSymbol);
    this.transformers.set('string', this.transformString);
  }

  private transformers: Map<string, any>;

  private getTransformer (name: types.MatcherType) {
    return this.transformers.get(name);
  }

  private transformNumber (numberValue: number,
    context: types.ContextType): ITransformResult<number> {

    console.log(`=== transformNumber, value: '${numberValue}'`);
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

  private transformBoolean (booleanValue: string | boolean,
    context: types.ContextType): ITransformResult<boolean> {

    console.log(`=== transformBoolean, value: '${booleanValue}'`);

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

  private transformPrimitives (primitiveValue: types.PrimitiveType,
    context: types.ContextType): ITransformResult<any> {

    console.log(`transformPrimitives --> primitiveValue: ${primitiveValue}`);
    const primitives = this.fetchSpecOption(`coercion/${context}/matchers/primitives`) as [];

    if (R.includes(R.toLower(primitiveValue), ['primitives', 'collection'])) {
      throw new Error(`"primitives matcher cannot contain: ${primitiveValue}`);
    }

    let coercedValue = null;
    let succeeded = false;

    primitives.some((val: types.PrimitiveType) => {
      const transform = this.getTransformer(val);
      console.log(`transformPrimitives --> primitiveValue: ${primitiveValue}, context:${context}`);
      const coercedResult = transform(primitiveValue, context);
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

  private transformAssoc (assocType: any,
    context: types.ContextType, assocValue: string): ITransformResult<any> {

    let coercedValue = null;
    let succeeded = false;

    let assocTypes = assocType;

    if (R.is(String)(assocType)) {
      assocTypes = [assocType];
    }

    if (R.is(Array)(assocTypes)) {
      assocTypes.some((val: types.PrimitiveType) => {
        if (R.includes(val, ['number', 'boolean', 'symbol', 'string'])) {
          const transform = this.getTransformer(val);
          const coercedResult = transform(assocValue);

          if (coercedResult.succeeded) {
            succeeded = coercedResult.succeeded;
            coercedValue = coercedResult.value;
          }

          return coercedResult.succeeded;
        } else {
          throw new Error(`Invalid value type for associative collection found: ${val}`);
        }
      });
    } else {
      throw new Error(`Invalid associative value type: ${functify(assocTypes)}`);
    }

    return {
      succeeded: succeeded,
      value: coercedValue
    };
  } // transformAssoc

  private transformDate (dateValue: string,
    context: types.ContextType): ITransformResult<Date> {

    const format = R.defaultTo(Specs.fallBack.coercion!.attributes!.matchers!.date!.format)(
      R.view(R.lensPath(['coercion', context, 'matchers', 'date', 'format']))(this.spec)
    );

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

  // TODO: reconsider redesigning this ... (collectionElements depends on 't')
  //
  createTypedCollection (t: string, collectionElements: any, context: types.ContextType): any {
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

  private extractCoreCollectionValue (open: string, close: string, collectionValue: string): string {
    if (collectionValue.startsWith(open) && collectionValue.endsWith(close)) {
      let coreValue = collectionValue.replace(open, '');
      return coreValue.slice(0, coreValue.length - close.length);
    }

    return collectionValue;
  } // extractCoreCollectionValue

  private static typeRegExp: RegExp;

  private extractTypeFromCollectionValue (open: string): string {
    // XML source can contain something like: !<Int8Array>[1,2,3,4]
    // to recognise sequences like "!<[]>[" or "!<Int8Array>[" which should
    // return "[]" and "Int8Array" respectively.
    //
    // NB: typeRegExp should be a member on the class, but only used by this method.
    // ideally, this would be a private internal static member of this method.
    //

    let result = '';

    if (XpathConverter.typeRegExp.test(open)) {
      let match = XRegExp.exec(open, XpathConverter.typeRegExp);
      const collectionType = R.view(R.lensPath(['groups', CollectionTypeLabel]))(match);

      if (collectionType) {
        result = collectionType as string;
      }
    }

    return result;
  } // extractTypeFromCollectionValue

  private transformCollection (collectionValue: string, context: types.ContextType): ITransformResult<any[]> {
    let succeeded = true;
    let value; // = collectionValue;

    // this.fetchSpecOption(`coercion/${context}/matchers/primitives`)

    const delim = this.fetchSpecOption(`coercion/${context}/matchers/collection/delim`) as string;
    const open = this.fetchSpecOption(`coercion/${context}/matchers/collection/open`) as string;

    const collectionType = this.extractTypeFromCollectionValue(collectionValue);

    if (collectionType) {
      const openExpression: string = open.replace(CollectionTypePlaceHolder, ('<' + collectionType + '>'));
      const openExpr: RegExp = new RegExp('^' + (escapeRegExp(openExpression)));

      const close = this.fetchSpecOption(`coercion/${context}/matchers/collection/close`) as string;
      const closeExpr = new RegExp(escapeRegExp(close) + '$');

      if (openExpr.test(collectionValue) && closeExpr.test(collectionValue)) {
        let temp = openExpr.exec(collectionValue);
        const capturedOpen: string = (temp) ? temp[0] : '';
        if (capturedOpen === '') {
          throw new Error('THIS CANT HAPPEN');
        }

        temp = closeExpr.exec(collectionValue);
        const capturedClose: string = (temp) ? temp[0] : '';
        if (capturedClose === '') {
          throw new Error('THIS CANT HAPPEN');
        }

        // Now look for the collection type which should be captured as '<type>'
        // So the default open pattern is: "!<[]>[", and close pattern is: "]"
        //
        // This allows values like
        // "!<[]>[1,2,3,4]" => [1,2,3,4]
        // "!<[Int8Array]>[1,2,3,4]" => [1,2,3,4]
        //
        const coreValue: string = this.extractCoreCollectionValue(capturedOpen, capturedClose, collectionValue);
        let arrayElements: any = coreValue.split(delim);

        if (collectionType === '[]') {
          // map/transformPrimitive?
          //
          value = arrayElements.map((item: types.PrimitiveType) => {
            const itemResult = this.transformPrimitives(item, context);
            return (itemResult.succeeded) ? itemResult.value : item;
          });
        } else {
          // Check for associative types
          //
          if (R.includes(R.toLower(collectionType), ['map', 'weakmap', 'object', '{}'])) {

            const assocDelim = this.fetchSpecOption(
              `coercion/${context}/matchers/collection/assoc/delim`) as string;

            const assocKeyType = this.fetchSpecOption(
              `coercion/${context}/matchers/collection/assoc/keyType`) as string;

            const assocValueType = this.fetchSpecOption(
              `coercion/${context}/matchers/collection/assoc/valueType`) as string;

            // Split out the values into an array of pairs
            //
            arrayElements = R.reduce((acc: [], collectionPair: string) => {
              let elements: string[] = R.split(assocDelim)(collectionPair);
              if (elements.length === 2) {
                const coercedKeyResult = this.transformAssoc(assocKeyType, context, elements[0]);
                const coercedValueResult = this.transformAssoc(assocValueType, context, elements[1]);

                if (coercedKeyResult.succeeded && coercedValueResult.succeeded) {
                  return R.append([coercedKeyResult.value, coercedValueResult.value])(acc);
                }
              } else {
                throw new Error(`Malformed map entry: ${collectionPair}`);
              }

              return acc;
            }, [])(arrayElements);
          }

          if (R.includes(R.toLower(collectionType), ['object', '{}'])) {
            value = R.fromPairs(arrayElements);
          } else {
            try {
              // Now do the collection transformation
              //
              value = this.createTypedCollection(R.toLower(collectionType), arrayElements, context);
            } catch (err) {
              value = arrayElements;
              succeeded = false;
            }
          }
        }
      } else {
        succeeded = false;
      }
    } else {
      succeeded = false;
    }

    return {
      value: value,
      succeeded: succeeded
    };
  } // transformCollection

  /**
   * @method transformSymbol
   * @description: coerces string to a symbol.
   *
   * @param {Symbol} symbolValue
   * @param {contextType} context
   * @returns
   * @memberof XpathConverter
   */
  transformSymbol (symbolValue: string, context: types.ContextType): ITransformResult<Symbol> {

    const prefix = this.fetchSpecOption(
      `coercion/${context}/matchers/symbol/prefix`) as string;

    const global = this.fetchSpecOption(
      `coercion/${context}/matchers/symbol/global`) as string;

    let expr = new RegExp('^' + escapeRegExp(prefix));

    let succeeded = expr.test(symbolValue);

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
   * @param {string} stringValue
   * @param {contextType} context
   * @returns: { value: the transformed string, succeeded: flag to indicate transform result }
   * @memberof XpathConverter
   */
  transformString (stringValue: string, context: types.ContextType): ITransformResult<string> {
    const stringCoercionAcceptable = this.fetchSpecOption(
      `coercion/${context}/matchers/string`) as boolean;

    if (!stringCoercionAcceptable) {
      throw new Error(`matching failed, terminated by string matcher.`);
    }

    return {
      value: stringValue,
      succeeded: true
    };
  } // transformString

  /**
   * @method buildChildren
   *
   * @param {*} element: The native object being built that represents "elementNode"
   * @param {*} elementNode: The XML node being built into JSON
   * @param {types.IParseInfo} parseInfo: Element parsing info
   * @param {string[]} previouslySeen: Used internally to guard against circular references.
   * @returns {*}: The JSON representing the elementNode
   *
   * @memberof XpathConverter
   */
  buildChildren (element: any, elementNode: any, parseInfo: types.IParseInfo, previouslySeen: string[]): any {
    let selectionResult: any = xpath.select('./*', elementNode);

    const descendantsLabel = this.fetchSpecOption(`labels/descendants`) as string;

    if (selectionResult && selectionResult.length > 0) {
      let getElementsFn: any = R.filter((child: any) => (child.nodeType === child.ELEMENT_NODE));
      let elements: any = getElementsFn(selectionResult);

      let children: any = R.reduce((acc, childElement): any => {
        let child = this.buildElementImpl(childElement, elementNode, parseInfo, previouslySeen);
        return R.append(child, acc);
      }, [])(elements);

      if (R.includes(descendantsLabel, R.keys(element) as string[])) {
        let merged = R.concat(children, element[descendantsLabel]);
        element[descendantsLabel] = merged;
      } else {
        element[descendantsLabel] = children;
      }

      const elementLabel = this.fetchSpecOption(`labels/element`) as string;
      const elementInfo: types.IElementInfo = this.getElementInfo(
        element[elementLabel], parseInfo);

      if (R.hasPath(['descendants', 'by'], elementInfo)) {
        const descendants = element[descendantsLabel];

        if (R.all(R.has(elementInfo.id))(children)) {
          if (R.pathEq(['descendants', 'by'], 'index', elementInfo)) {
            if (elementInfo.descendants!.throwIfCollision) {
              // We need a new version of ramda's indexBy function that can take an extra
              // parameter being a function which is invoked to handle duplicate keys. In
              // its absence, we can find duplicates via a reduce ...
              //
              R.reduce((acc: any, val: any) => {
                if (R.includes(val[elementInfo.id], acc)) { // TODO: contains -> includes; please check
                  throw new Error(`Element collision found: ${functify(val)}`);
                }
                return R.append(val[elementInfo.id], acc);
              }, [])(descendants);
            }

            element[descendantsLabel] = R.indexBy(R.prop(elementInfo.id),
              descendants);
          } else if (R.pathEq(['descendants', 'by'], 'group', elementInfo)) {
            element[descendantsLabel] = R.groupBy(R.prop(elementInfo.id),
              descendants);
          }
        } else if (elementInfo.descendants!.throwIfMissing) {
          // TODO: fix this up
          //
          // const missing: any = R.find(
          //   R.not(
          //     R.has(elementInfo.id)
          //   )
          // )(children) || {};
          // throw new Error(
          //   `Element is missing key attribute "${elementInfo.id}": (${functify(missing)})`);
        }
      }
    }

    let elementText: string = this.composeText(elementNode);

    if (elementText && elementText !== '') {
      const textLabel = this.fetchSpecOption(`labels/text`) as string;
      element[textLabel] = elementText;
    }

    return element;
  } // buildChildren

  /**
   * @method getElementInfo
   *
   * @private
   * @param {string} elementName
   * @param {types.IParseInfo} parseInfo
   * @returns {types.IElementInfo}
   * @memberof XpathConverter
   */
  private getElementInfo (elementName: string, parseInfo: types.IParseInfo): types.IElementInfo {
    return parseInfo.elements.get(elementName) || parseInfo.default || types.EmptyElementInfo;
  }

  /**
   * @method composeText
   * @description: The text of an XML element can be accessed only by using .firstChild and
   *    .nextSibling. Both raw text (appearing inside the opening and closing element tags)
   *    and CDATA text are supported. Unfortunately, comment text is also read in. Comment
   *    text is not going to cause problems, because the comment text doesn't appear in any
   *    location. Every element has the potential to have text on it so it has to be invoked
   *    for every element processed. NB: It is not possible to select all the Text nodes from an
   *    element based upon the nodeType.
   *
   * @param {XMLNode} elementNode: The XML node being built
   * @returns {String} The text collected from the immediate children of the elementNode being
   *    built.
   */
  private composeText (elementNode: any): string {
    let text = '';
    let currentChild = elementNode.firstChild;
    const doTrim = this.fetchSpecOption('coercion/textNodes/trim') as boolean;

    while (currentChild !== null) {
      if (currentChild.data && currentChild.data !== null) {
        text = doTrim ? R.concat(text, currentChild.data.trim()) : R.concat(text, currentChild.data);
      }
      currentChild = currentChild.nextSibling;
    }

    return text;
  } // composeText

  /**
   * @method fetchSpecOption
   * @description Fetches the option denoted by the path. If the option requested does
   * not appear in spec the provided, the option will be fetched from the fallBack
   * spec (with caveats see fallBack parameter). The path specified must be treated
   * as absolute and relates to the base spec.
   *
   * @private
   * @param {string} path delimited string containing the segments used to build a lens
   * for inspecting the spec.
   * @param {boolean} [fallBack=true] The setting of this value depends from where it is
   * being called as well as the item being requested. Eg, labels.attribute is an optional
   * and its presence acts like a flag. For items with flag like behaviour, then it is
   * ok to set fallBack to false, as we should return nothing in this scenario instead of
   * looking into the fallBack spec. Also, if called from a transform function and a value
   * is being retrieved from under ./coercion, then its ok allow fallBack = true, because
   * all transform functions are activated as a result of coercion being active.
   *
   * @returns {*}
   * @memberof XpathConverter
   */
  private fetchSpecOption (path: string, fallBack: boolean = true): any {
    const segments: string[] = R.split('/')(path);
    const itemLens: R.Lens = R.lensPath(segments);

    const result = fallBack
      ? R.defaultTo(R.view(itemLens)(Specs.fallBack), R.view(itemLens)(this.spec))
      : R.view(itemLens)(this.spec);

    console.log(`fetchSpecOption --> result: ${functify(result)}`);
    return result;
  }
} // class XpathConverter

XpathConverter.initialise();

/**
 * @function: escapeRegExp
 * @description:
 * @see: https: //developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 * @param {String} inputString: input to escape.
 * @returns: escaped String.
 */
function escapeRegExp (inputString: string) {
  return inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function selectElementNodeById (elementName: string, id: string, name: string, parentNode: any) {
  let elementResult: any = xpath.select(`.//${elementName}[@${id}="${name}"]`, parentNode); //  || {};
  let elementNode = {};

  if (elementResult && elementResult.length > 0) {
    elementNode = elementResult[0];
  }

  return elementNode;
}
