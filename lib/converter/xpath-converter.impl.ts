import { EmptyElementInfo } from './../types';

import * as R from 'ramda';
import * as xpath from 'xpath-ts';
import { functify } from 'jinxed';

import * as types from '../types';
import * as e from '../exceptions';
import { Transformer } from '../transformer/transformer.class';
import { SpecOptionService } from '../specService/spec-option-service.class';
import { Normaliser } from '../normaliser/normaliser.class';

/**
 * @export
 * @class XpathConverterImpl
 * @implements {types.IConverter}
 */
export class XpathConverterImpl implements types.IConverterImpl {
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
    if (!options) {
      throw new Error('null spec option service not permitted');
    }

    // Control freak!
    //
    this.transformer = new Transformer(options);
    this.normaliser = new Normaliser(options);
  }

  transformer: types.ITransformer;
  normaliser: Normaliser;

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
  buildElement (elementNode: Node, parseInfo: types.IParseInfo,
    previouslySeen: string[] = []): any {

    const { recurse = '', discards = [], id = '' } = this.getElementInfo(elementNode.nodeName, parseInfo);
    const subject = composeElementPath(elementNode);
    let element: any = this.buildLocalAttributes(subject, elementNode);
    const elementLabel = this.options.fetchOption('labels/element') as string;

    element[elementLabel] = elementNode.nodeName;

    if ((recurse !== '') && (elementNode instanceof Element)) {
      element = this.recurseThroughAttribute(subject, element, elementNode,
        parseInfo, previouslySeen);
    }

    if (elementNode.hasChildNodes()) {
      element = this.buildChildren(subject, element, elementNode, parseInfo, previouslySeen);
    }

    if (this.isCombinable(subject, element, recurse)) {
      console.log(`??? subject: "${id === '' ? subject : (subject + '[@' + id + '=' + element[id])}']'" is combinable`);
      element = this.normaliser.combineDescendants(subject, element);
    }

    // Finally, filter out attributes we don't need on the final built native element
    //
    R.forEach(at => {
      element = R.dissoc(at, element);
    }, discards);

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
  private buildLocalAttributes (subject: string, localNode: Node): {} {
    // First collect all the attributes (@*) -> create attribute nodes
    // node.nodeType = 2 (ATTRIBUTE_NODE). By implication of the xpath query
    // (ie, we're selecting all attributes) all the nodeTypes of the nodes
    // returned should all be = 2; we could check with a ramda call, but is this
    // necessary?
    //
    const attributeNodes: types.SelectResult = xpath.select('@*', localNode);
    let element: any = {};

    if (attributeNodes && attributeNodes instanceof Array) {
      const attributesLabel = this.options.fetchOption('labels/attributes', false) as string;
      const doCoercion: boolean = R.is(Object)(this.options.fetchOption('attributes/coercion', false));
      const matchers = this.options.fetchOption('attributes/coercion/matchers');

      if (attributesLabel && attributesLabel !== '') {
        // Build attributes as an array identified by labels.attributes
        //
        element[attributesLabel] = R.reduce((acc: any, attrNode: any) => {
          const attributeName = attrNode['name'];
          const attributeSubject = `${subject}/[@${attributeName}]`;
          const attributeValue = doCoercion
            ? this.transformer.coerceAttributeValue(attributeSubject, matchers, attrNode['value'], attributeName)
            : attrNode['value'];

          return R.append(R.objOf(attributeName, attributeValue), acc);
        }, [])(attributeNodes);

      } else {
        // Build attributes as members.
        // Attribute nodes have name and value properties on them
        //
        const coerce = (node: any) => {
          // coercion is active
          //
          let attributePair = R.props(['name', 'value'])(node); // => [attrKey, attrValue]
          const attributeName = R.head(attributePair) as string;
          const attributeSubject = `${subject}/[@${attributeName}]`;
          const rawAttributeValue = R.last(attributePair) as string;
          const coercedValue = this.transformer.coerceAttributeValue(attributeSubject, matchers,
            rawAttributeValue, attributeName);

          attributePair[1] = coercedValue;
          return attributePair;
        };
        const verbatim = (node: any) => {
          // proceed without coercion
          //
          return R.props(['name', 'value'])(node);
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

    const { id, recurse = '' } = this.getElementInfo(elementNode.nodeName, parseInfo);
    const identifier = element[id] ?? '';

    if (identifier === '') {
      return element;
    }

    if (recurse !== '') {
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
            // select element bode by id
            //
            const inheritedElementNode: Node = selectElementNodeById(
              nodeName, id, at, elementNode.parentNode) as Node;

            if (!inheritedElementNode) {
              throw new e.JaxConfigError(`Could not find element of type: '${nodeName}', id: '${id}'='${at}'`,
                subject);
            }

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

            const descendantsLabel = this.options.fetchOption('labels/descendants') as string;

            if (R.includes(descendantsLabel, R.keys(a) as string[])
              && R.includes(descendantsLabel, R.keys(b) as string[])) {
              // Both a and b have children, therefore we must merge in such a way as to
              // not to lose any properties of a by calling R.mergeAll
              //
              const mergedChildren = R.concat(a[descendantsLabel], b[descendantsLabel]); // save a
              const allMergedWithoutChildrenOfA = R.mergeAll([a, b]); // This is where we lose the children of a

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
          const inheritedElementNode = selectElementNodeById(
            nodeName, id, inheritedElementName, elementNode.parentNode) as Node;

          if (!inheritedElementNode) {
            throw new e.JaxConfigError(
              `Could not find element of type: '${nodeName}', id: '${id}'='${inheritedElementName}'`,
                subject);
          }

          // Vertical recursion/merging to the base element
          //
          const inheritedElement = this.buildElement(inheritedElementNode, parseInfo, previouslySeen);

          // Now we need to perform a merge of this element with the inherited element
          // ensuring that any properties in this element take precedence.
          //
          element = R.mergeAll([inheritedElement, element]);
        }
      } // else recursion ends
    }

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
  buildChildren (subject: string, element: any, elementNode: Node, parseInfo: types.IParseInfo,
    previouslySeen: string[]): {} {
    const selectionResult: any = xpath.select('./*', elementNode);

    const descendantsLabel = this.options.fetchOption(`labels/descendants`) as string;

    if (selectionResult && selectionResult.length > 0) {
      const getElementsFn: any = R.filter((child: any) => (child.nodeType === child.ELEMENT_NODE));
      const elements: any = getElementsFn(selectionResult);

      const children: any = R.reduce((acc, childElement: Element): any => {
        const child = this.buildElement(childElement, parseInfo, previouslySeen);
        return R.append(child, acc);
      }, [])(elements);

      if (R.includes(descendantsLabel, R.keys(element) as string[])) {
        const merged = R.concat(children, element[descendantsLabel]);
        element[descendantsLabel] = merged;
      } else {
        element[descendantsLabel] = children;
      }

      const elementLabel = this.options.fetchOption(`labels/element`) as string;
      const elementInfo: types.IElementInfo = this.getElementInfo(
        element[elementLabel], parseInfo);

      if (R.hasPath(['descendants', 'by'], elementInfo)) {
        const descendants = element[descendantsLabel];

        if (R.all(R.has(elementInfo.id))(children)) {
          if (R.pathEq(['descendants', 'by'], 'index', elementInfo)) {
            if (elementInfo?.descendants?.throwIfMissing) {
              // We need a new version of ramda's indexBy function that can take an extra
              // parameter being a function which is invoked to handle duplicate keys. In
              // its absence, we can find duplicates via a reduce ...
              //
              R.reduce((acc: any, val: any) => {
                if (R.includes(val[elementInfo.id], acc)) {
                  throw new e.JaxSolicitedError(`Element collision found: ${functify(val)}`,
                  subject);
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
        } else if (elementInfo?.descendants?.throwIfMissing) {
          const missing: any = R.find(
            R.complement(R.has(elementInfo.id))
          )(children) ?? {};
          throw new e.JaxSolicitedError(
            `Element is missing key attribute "${elementInfo.id}": (${functify(missing)})`,
              subject);
        }
      }
    }

    let elementText: string = this.composeText(elementNode);

    if (elementText && elementText !== '') {
      const textLabel = this.options.fetchOption(`labels/text`) as string;
      element[textLabel] = elementText;
    }

    return element;
  } // buildChildren

  /**
   * @method getElementInfo
   * @description Retrieves the elementInfo for the name specified.
   *
   * @param {string} elementName
   * @param {types.IParseInfo} parseInfo
   * @returns {types.IElementInfo}
   * @memberof XpathConverterImpl
   */
  getElementInfo (elementName: string, parseInfo: types.IParseInfo): types.IElementInfo {
    const namedOrDefaultElementInfo: types.IElementInfo | undefined = parseInfo.elements.get(
      elementName) ?? parseInfo.def;

    let result: types.IElementInfo = types.EmptyElementInfo;

    if (namedOrDefaultElementInfo) {
      result = parseInfo.common
        ? R.mergeDeepRight(parseInfo.common, namedOrDefaultElementInfo)
        : namedOrDefaultElementInfo;
    } else {
      if (parseInfo.common) {
        result = parseInfo.common;
      }
    }

    return result;
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

  public isAbstract (subject: string, element: {}): boolean {
    const attributesLabel: string = this.options.fetchOption('labels/attributes');
    let result = false;

    if (attributesLabel) {
      const attributes = R.view(R.lensProp(attributesLabel))(element);
      if (attributes instanceof Array) {
        result = R.includes('abstract')(attributes);
      } else {
        throw new e.JaxInternalError('item in spec at "labels/attributes" is not an array',
          'XpathConverterImpl.isAbstract');
      }

    } else {
      result = R.has('abstract')(element);
    }

    return result;
  }

  public isCombinable (subject: string, element: {}, recurse: string): boolean {
    return recurse !== '' && !this.isAbstract(subject, element);
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
  rootNode: (Node & ParentNode) | null): types.NullableNode {
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

  if (rootNode && rootNode instanceof Node) {
    const result: types.SelectResult = xpath.select(`.//${elementName}[@${id}="${name}"]`, rootNode, true);

    return result instanceof Node ? result : null;
  }
  return null;
}

/**
 * @function composeElementPath
 * @description Creates a string representing the full path of the element within the
 * document.
 *
 * @export
 * @param {types.NullableNode} node
 * @returns {string}
 */
export function composeElementPath (node: types.NullableNode): string {
  if (!node) {
    return '/';
  } else if (node instanceof Document) {
    return '';
  } else {
    return `${composeElementPath(node.parentNode)}/${node.nodeName}`;
  }
}
