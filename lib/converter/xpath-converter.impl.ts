
import * as R from 'ramda';
import * as xpath from 'xpath-ts';
import { functify } from 'jinxed';

import * as types from '../types';
import * as e from '../exceptions';
import { Transformer } from '../transformer/transformer.class';
import { SpecOptionService } from '../specService/spec-option-service.class';
import { Normaliser } from '../normaliser/normaliser.class';
import * as utils from '../utils/utils';

export interface IConverterImpl {
  build (elementNode: Node, parseInfo: types.IParseInfo, previouslySeen: string[]): any;
  buildElement (elementNode: Node, parseInfo: types.IParseInfo, previouslySeen: string[]): any;
}

/**
 * @export
 * @class XpathConverterImpl
 * @implements {types.IConverter}
 */
export class XpathConverterImpl implements IConverterImpl {
  /**
   * Creates an instance of XpathConverterImpl.
   * @param {types.ISpec} [spec=Specs.default] The XpathConverterImpl uses a spec to define
   * the conversion behaviour. A user may wish to override some of these settings, in which
   * case, they can pass in a partial spec (Partial here means that the custom spec does
   * not have to repeat all of the default fields that it does not wish to override). If
   * a setting is not found in the custom spec, that setting will be taken from the default
   * except where that setting is not default-able; please see the ISpec interface.
   *
   * @memberof XpathConverterImpl
   */
  constructor (private options: types.ISpecService = new SpecOptionService()) {
    // Control freak!
    //
    this.transformer = new Transformer(options);
    this.normaliser = new Normaliser(options);
  }

  readonly transformer: types.ITransformer;
  readonly normaliser: types.INormaliser;

  /**
   * @method build
   * @description builds the native object representing an element, and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   * @private
   * @param {Node} elementNode
   * @param {types.IParseInfo} parseInfo
   * @param {string[]} [previouslySeen=[]]
   * @returns
   * @memberof XpathConverterImpl
   */
  build (elementNode: Node, parseInfo: types.IParseInfo,
    previouslySeen: string[] = []): any {

    const abstractValue = getAttributeValue(elementNode, 'abstract');

    if (abstractValue && abstractValue === 'true') {
      const { id } = utils.composeElementInfo(elementNode.nodeName, parseInfo);
      const subject = composeElementPath(elementNode, id);

      throw new e.JaxConfigError(
        `Attempt to directly build abstract entity is prohibited. (Please remove "abstract")`,
          subject);
    }

    return this.buildElement(elementNode, parseInfo, previouslySeen);
  } // build

  /**
   * @method buildElement
   * @description builds the native object representing an element, and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   * @private
   * @param {Node} elementNode
   * @param {types.IParseInfo} parseInfo
   * @param {string[]} [previouslySeen=[]]
   * @returns
   * @memberof XpathConverterImpl
   */
  buildElement (elementNode: Node, parseInfo: types.IParseInfo, previouslySeen: string[]): any {

    const elementInfo = utils.composeElementInfo(elementNode.nodeName, parseInfo);
    const { recurse = '', discards = [], id = '' } = elementInfo;
    const subject = composeElementPath(elementNode, id);
    let element: any = this.buildLocalAttributes(subject, elementNode, id);

    element[this.options.elementLabel] = elementNode.nodeName;

    if ((recurse !== '') && (elementNode instanceof Element)) {
      element = this.recurseThroughAttribute(subject, element, elementNode,
        parseInfo, previouslySeen);
    }

    if (elementNode.hasChildNodes()) {
      element = this.buildChildren(subject, element, elementNode, parseInfo, previouslySeen);

      if (this.isCombinable(subject, recurse, element)) {
        element = this.normaliser.combineDescendants(
          subject,
          element,
          parseInfo
        );
      }

      if (this.isNormalisable(subject, elementInfo, element)) {
        element = this.normaliser.normaliseDescendants(subject, element, elementInfo);
      }
    }

    // Finally, filter out attributes we don't need on the final built native element
    //
    R.forEach(at => {
      element = R.dissoc(at, element);
    }, discards);

    type AttrObjType = { [key: string]: string };
    type AttributesType = Array<AttrObjType>;

    const attributesLabel = this.options.fetchOption('labels/attributes', false) as string;
    if (R.has(attributesLabel, element)) {
      let attributes = R.prop(attributesLabel)(element);

      attributes = R.filter((attrObj: AttrObjType): boolean => {
        return !R.includes(R.head(R.keys(attrObj)), discards);
      })(attributes as AttributesType);

      element = R.set(R.lensProp(attributesLabel), attributes)(element);
    }

    return element;
  } // buildElement

  /**
   * @method buildLocalAttributes
   * @description Selects all the attributes from the "localNode"
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {Node} localNode
   * @returns
   * @memberof XpathConverterImpl
   */
  private buildLocalAttributes (subject: string, localNode: Node, id: string): {} {
    // First collect all the attributes (@*) -> create attribute nodes
    // node.nodeType = 2 (ATTRIBUTE_NODE). By implication of the xpath query
    // (ie, we're selecting all attributes) all the nodeTypes of the nodes
    // returned should all be = 2; we could check with a ramda call, but is this
    // necessary?
    //
    const attributeNodes: types.SelectResult = xpath.select('@*', localNode);
    let element: any = {};

    if (attributeNodes instanceof Array) {
      const attributesLabel = this.options.fetchOption('labels/attributes', false) as string;
      const coercionOption = this.options.fetchOption('attributes/coercion', false);
      const doCoercion: boolean = R.is(Object)(coercionOption);
      const matchers = this.options.fetchOption('attributes/coercion/matchers');

      if (attributesLabel && attributesLabel !== '') {
        // Retain the "id" attribute as a member so that normalisation can proceed
        //
        const idAttributeNode: any = R.find((attrNode: any) => {
          return attrNode['name'] === id;
        })(attributeNodes);

        if (idAttributeNode) {
          let attributePair = R.props(['name', 'value'])(idAttributeNode); // => [attrKey, attrValue]
          const attributeName = R.head(attributePair) as string;
          const rawAttributeValue = R.last(attributePair) as string;
          element[attributeName] = rawAttributeValue;
        }

        // Build attributes as an array identified by labels.attributes
        //
        const attributes = R.reduce((acc: any, attrNode: any) => {
          const attributeName = attrNode['name'];
          const attributeSubject = `${subject}/[@${attributeName}]`;
          const attributeValue = doCoercion
            ? this.transformer.coerceMatcherValue(attributeSubject, matchers, attrNode['value'], attributeName)
            : attrNode['value'];

          return R.append(R.objOf(attributeName, attributeValue), acc);
        }, [])(attributeNodes);

        if (!R.isEmpty(attributes)) {
          element[attributesLabel] = attributes;
        }
      } else {
        // Build attributes as members.
        // Attribute nodes have name and value properties on them
        //
        const coerce = (attrNode: any) => {
          // coercion is active
          //
          let attributePair = R.props(['name', 'value'])(attrNode); // => [attrKey, attrValue]
          const attributeName = R.head(attributePair) as string;
          const attributeSubject = `${subject}/[@${attributeName}]`;
          const rawAttributeValue = R.last(attributePair) as string;
          const coercedValue = this.transformer.coerceMatcherValue(attributeSubject, matchers,
            rawAttributeValue, attributeName);

          attributePair[1] = coercedValue;
          return attributePair;
        };
        const verbatim = (attrNode: any) => {
          // proceed without coercion
          //
          return R.props(['name', 'value'])(attrNode);
        };

        const extractPair = doCoercion ? coerce : verbatim;

        element = R.fromPairs(
          R.map(extractPair, attributeNodes) as []
        );
      }
    }

    return element;
  } // buildLocalAttributes

  /**
   * @method recurseThroughAttribute
   * @description Implements element inheritance via the id attribute
   *
   * @private
   * @param {string} subject: Identifies the current xml entity
   * @param {*} element
   * @param {Element} elementNode
   * @param {types.IParseInfo} parseInfo
   * @param {string[]} previouslySeen
   * @returns {{}}
   * @memberof XpathConverterImpl
   */
  private recurseThroughAttribute (subject: string, element: any, elementNode: Element,
    parseInfo: types.IParseInfo, previouslySeen: string[]): {} {

    const ei = utils.composeElementInfo(elementNode.nodeName, parseInfo);
    const { id = '', recurse = '' } = ei;

    if (id === '' || recurse === '') {
      return element;
    }

    const identifier = element[id];

    if (identifier === '') {
      return element;
    }

    if (R.includes(identifier, previouslySeen)) {
      throw new e.JaxConfigError(`Circular reference detected, element '${identifier}', has already been encountered.`,
        subject);
    } else {
      previouslySeen = R.append(identifier, previouslySeen);
    }
    const { nodeName } = elementNode;

    // First get the recurse element(s), which is a csv inside @inherits.
    //
    const recurseAttr = elementNode.getAttribute(recurse) ?? '';

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
        const inheritedElements = R.map(at => {
          const inheritedElementNode = selectElementNodeById(nodeName, id, at, elementNode.parentNode);

          if (!inheritedElementNode) {
            throw new e.JaxConfigError(`Could not find element of type: '${nodeName}', id: '${id}'='${at}'`,
              subject);
          }
          this.validateInheritedElement(subject, inheritedElementNode);

          // Horizontal recursion/merging eg: (at => base-command|domain-command|uni-command)
          //
          return this.buildElement(inheritedElementNode, parseInfo, previouslySeen);
        }, recurseAttributes);

        // Now merge one by one. On the first iteration a={} and b=first-element. This means
        // we are merging as expected, with b taking precedence over a. So the last item
        // in the list takes precedence.
        //
        const doMergeElements = (a: any, b: any) => {
          let merged;

          if (R.includes(this.options.descendantsLabel, R.keys(a) as string[])
            && R.includes(this.options.descendantsLabel, R.keys(b) as string[])) {
            // Both a and b have children, therefore we must merge in such a way as to
            // not to lose any properties of a by calling R.mergeAll
            //
            const mergedChildren = R.concat(a[this.options.descendantsLabel], b[this.options.descendantsLabel]); // save a
            const allMergedWithoutChildrenOfA = R.mergeAll([a, b]); // This is where we lose the children of a

            // Restore the lost properties of a
            //
            const childrenLens = R.lensProp(this.options.descendantsLabel);
            merged = R.set(childrenLens, mergedChildren, allMergedWithoutChildrenOfA);
          } else {
            // There is no clash between the children of a or b, therefore we can
            // use R.mergeAll safely.
            //
            merged = R.mergeAll([a, b]);
          }

          return merged;
        };

        const mergedInheritedElements = R.reduce(doMergeElements, {}, inheritedElements);

        // Now combine with this element
        //
        const mergeList = [mergedInheritedElements, element];

        // NB: This mergeAll is safe here, because we haven't yet built the children of this
        // element yet; this will happen later and is resolved in buildChildren.
        //
        element = R.mergeAll(mergeList);
      } else {
        // Now build the singular inherited element
        //
        const inheritedElementName: string = recurseAttributes[0];
        const inheritedElementNode = selectElementNodeById(nodeName, id, inheritedElementName, elementNode.parentNode);

        if (!inheritedElementNode) {
          throw new e.JaxConfigError(
            `Could not find element of type: '${nodeName}', id: '${id}'='${inheritedElementName}'`,
            subject);
        }
        this.validateInheritedElement(subject, inheritedElementNode);

        // Vertical recursion/merging to the base element
        //
        const inheritedElement = this.buildElement(inheritedElementNode, parseInfo, previouslySeen);

        // Now we need to perform a merge of this element with the inherited element
        // ensuring that any properties in this element take precedence.
        //
        element = R.mergeAll([inheritedElement, element]);
      }
    } // else recursion ends

    return element;
  } // recurseThroughAttribute

  /**
   * @method buildChildren
   *
   * @param {string} subject: Identifies the current xml entity
   * @param {*} element: The native object being built that represents "elementNode"
   * @param {Node} elementNode: The XML node being built into JSON
   * @param {types.IParseInfo} parseInfo: Element parsing info
   * @param {string[]} previouslySeen: Used internally to guard against circular references.
   * @returns {*}: The JSON representing the elementNode
   *
   * @memberof XpathConverterImpl
   */
  public buildChildren (subject: string, element: any, elementNode: Node, parseInfo: types.IParseInfo,
    previouslySeen: string[]): {} {
    const selectionResult: any = xpath.select('./*', elementNode);

    if (selectionResult && selectionResult.length > 0) {
      const getElementsFn: any = R.filter((child: Node) => (child.nodeType === child.ELEMENT_NODE));
      const elements: any = getElementsFn(selectionResult);

      const children: any = R.reduce((acc: Array<{}>, childElement: Element): any => {
        const child = this.buildElement(childElement, parseInfo, previouslySeen);
        return R.append(child, acc);
      }, [])(elements);

      if (R.includes(this.options.descendantsLabel, R.keys(element) as string[])) {
        // Prior to normalisation, descendants is an array
        //
        const merged = this.normaliser.mergeDescendants(children, element[this.options.descendantsLabel]);
        element[this.options.descendantsLabel] = merged;
      } else {
        element[this.options.descendantsLabel] = children;
      }
    }

    let elementText: string = this.composeText(elementNode);

    if (elementText && elementText !== '') {
      element[this.options.textLabel] = elementText;
    }

    return element;
  } // buildChildren

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
  public composeText (elementNode: any): string {
    let text = '';
    let currentChild = elementNode.firstChild;
    const doTrim = this.options.fetchOption('textNodes/trim') as boolean;

    while (currentChild !== null) {
      if (currentChild.data && currentChild.data !== null) {
        text = doTrim ? R.concat(text, currentChild.data.trim()) : R.concat(text, currentChild.data);
      }
      currentChild = currentChild.nextSibling;
    }

    return text;
  } // composeText

  /**
   * @method isCombinable
   * @description Determines if an element's descendants are combinable. This would be
   * the case when inheritance causes the collections of attributes and descendants from base
   * elements that would be more useful and easier to deal with by the client if they were
   * re-organised based upon element types.
   *
   * @param {string} subject
   * @param {string} recurse
   * @param {{}} element
   * @returns {boolean}
   * @memberof XpathConverterImpl
   */
  public isCombinable (subject: string, recurse: string, element: {}): boolean {
    return recurse !== '' && !this.isAbstract(subject, element);
  } // isCombinable

  /**
   * @method isNormalisable
   * @description
   *
   * @param {string} subject
   * @param {types.IElementInfo} elementInfo
   * @param {{}} element
   * @returns {boolean}
   * @memberof XpathConverterImpl
   */
  public isNormalisable (subject: string, elementInfo: types.IElementInfo, element: {}): boolean {
    return R.hasPath(['descendants', 'by'], elementInfo);
  } // isNormalisable

  /**
   * @method isAbstract
   * @description Determines wether an element is marked as abstract.
   *
   * @param {string} subject
   * @param {{}} element
   * @returns {boolean}
   * @memberof XpathConverterImpl
   */
  public isAbstract (subject: string, element: {}): boolean {
    const attributesLabel: string = this.options.fetchOption('labels/attributes');
    let result = false;

    if (attributesLabel) {
      const attributes = R.view(R.lensProp(attributesLabel))(element);
      result = R.includes('abstract')(attributes as []);
    } else {
      result = R.has('abstract')(element);
    }

    return result;
  } // isAbstract

  /**
   * @method validateInheritedElement
   * @description Ensure that element being inherited from is marked as abstract.
   *
   * @param {string} subject
   * @param {Node} inheritedNode
   * @memberof XpathConverterImpl
   */
  public validateInheritedElement (subject: string, inheritedNode: Node): void {
    const inheritedAbstractValue = getAttributeValue(inheritedNode, 'abstract');
    if (!inheritedAbstractValue || inheritedAbstractValue === 'false') {
      throw new e.JaxConfigError(
        `Can't inherit from non abstract element: ${inheritedNode.nodeName}`,
          subject);
    }
  }
} // class XpathConverterImpl

/**
 * @function selectElementNodeById
 * @description performs Xpath query to retrieve an element with an attribute of the
 * name and value specified.
 *
 * @param {string} elementName
 * @param {string} id
 * @param {string} name
 * @param {((Node & ParentNode) | null)} rootNode
 * @returns {types.NullableNode}
 */
function selectElementNodeById (elementName: string, id: string, name: string,
  rootNode: types.NullableNode): types.NullableNode {
  // Typescript warning:
  //
  // WARN: This function makes the assumption that if you're selecting an element by an identifier,
  // then that identifier is unique and so is the element which also means that it should only
  // ever return a single item or nothing. If the following select statement is missing the true
  // flag to indicate that only a single item should be returned, then the select will return the
  // single item inside an array, which is compatible with it's declared return signature:
  // xpath/api.d.ts:
  // * declare function select(e: string, doc?: Node, single?: boolean): string | number | boolean | Node | Node[];
  //
  // The problem however is this: 'selectElementNodeById' has declared it's return type to be
  // Node | null (types.NullableNode). There is no scope for a Node[], so how does this get pass the
  // TS type-checker? How is Node[] assignable to Node or null? Given all the other problems I have
  // found when declaring the correct types, how is it that this particular example is not flagged as
  // an error?
  //

  if (rootNode instanceof Node) {
    const result: types.SelectResult = xpath.select(`.//${elementName}[@${id}="${name}"]`, rootNode, true);

    return result instanceof Node ? result : null;
  }
  /* istanbul ignore next */
  return null;
} // selectElementNodeById

/**
 * @function composeElementPath
 * @description Creates a string representing the full path of the element within the
 * document.
 *
 * @export
 * @param {types.NullableNode} node
 * @returns {string}
 */
export function composeElementPath (localNode: types.NullableNode, id: string = ''): string {
  return composeElementSegment(localNode) + composeIdQualifierPathSegment(localNode, id);
}

/**
 * @function composeElementSegment
 * @description creates a path segment
 *
 * @param {types.NullableNode} node
 * @returns {string}
 */
function composeElementSegment (node: types.NullableNode): string {
  if (!node) {
    return '/';
  } else if (node instanceof Document) {
    return '';
  } else {
    return `${composeElementSegment(node.parentNode)}/${node.nodeName}`;
  }
} // composeElementSegment

/**
 * @function composeIdQualifierPathSegment
 * @description creates a path segment that denotes the element id. Allows
 * distinguishing of elements of the same type via it's id, if it has one.
 *
 * @export
 * @param {types.NullableNode} localNode
 * @param {string} id
 * @returns {string}
 */
export function composeIdQualifierPathSegment (localNode: types.NullableNode, id: string): string {
  let idSegment = getAttributeValue(localNode, id);

  if (idSegment) {
    idSegment = `[@${id}="${idSegment}"]`;
  }

  return idSegment;
} // composeIdQualifierPathSegment

/**
 * @function getAttributeValue
 * @description gets the value of the specified attribute for a particular Node.
 *
 * @param {types.NullableNode} localNode
 * @param {string} attributeName
 * @returns {string}
 */
function getAttributeValue (localNode: types.NullableNode, attributeName: string): string {
  let attributeValue = '';
  if (attributeName !== '' && localNode) {
    const attributeNode: types.SelectResult = xpath.select(`@${attributeName}`, localNode, true);

    if (attributeNode && (attributeNode instanceof Node) && attributeNode.nodeValue) {
      attributeValue = attributeNode.nodeValue;
    }
  }

  return attributeValue;
} // getAttributeValue
