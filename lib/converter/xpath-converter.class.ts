
import * as R from 'ramda';
import * as types from './types';
import * as xpath from 'xpath-ts';
import * as xmldom from 'xmldom-ts';
import Specs from './specs';

import { functify } from 'jinxed';

// Typescript the safe navigation operator ( ?. ) or (!.) and null property paths
// https://stackoverflow.com/questions/40238144/typescript-the-safe-navigation-operator-or-and-null-property-paths
//

const missing: R.Pred = x => x === undefined;
const optional = (fn: R.Pred) => R.either(missing, fn);

export default class XpathConverter implements types.IConverter {
  constructor (private spec: types.ISpec = Specs.default) {
    if (!spec) {
      throw new Error('null spec not permitted');
    }
  }

  buildElement (elementNode: any, parentNode: any, parseInfo: types.IParseInfo) {
    return this.buildElementImpl(elementNode, parentNode, parseInfo);
  }

  private buildElementImpl (elementNode: any, parentNode: any, parseInfo: types.IParseInfo,
    previouslySeen: string[] = []) {
      //
  }

  buildChildren (element: any, elementNode: any, parseInfo: types.IParseInfo, previouslySeen: string[]) {
    let selectionResult: any = xpath.select('./*', elementNode);

    if (selectionResult && selectionResult.length > 0) {
      let getElementsFn: any = R.filter((child: any) => (child.nodeType === child.ELEMENT_NODE));
      let elements: any = getElementsFn(selectionResult);

      let children: any = R.reduce((acc, childElement): any => {
        let child = this.buildElementImpl(childElement, elementNode, parseInfo, previouslySeen);
        return R.append(child, acc);
      }, [])(elements);

      if (R.includes(this.spec.labels!.descendants, R.keys(element) as string[])) {
        let merged = R.concat(children, element[this.spec.labels!.descendants || '_children']);
        element[this.spec.labels!.descendants || '_children'] = merged;
      } else {
        element[this.spec.labels!.descendants || '_children'] = children;
      }

      const elementInfo: types.IElementInfo = this.getElementInfo(
        element[this.spec.labels!.element || '_'], parseInfo);

      if (R.hasPath(['descendants', 'by'], elementInfo)) {
        const descendants = element[this.spec.labels!.descendants || '_children'];

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

            element[this.spec.labels!.descendants || '_children'] = R.indexBy(R.prop(elementInfo.id),
              descendants);
          } else if (R.pathEq(['descendants', 'by'], 'group', elementInfo)) {
            element[this.spec.labels!.descendants || ''] = R.groupBy(R.prop(elementInfo.id),
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

    let text: string = this.composeText(elementNode);

    if (text && text !== '') {
      element[this.spec.labels!.text || '_text'] = text;
    }

    return element;
  }

  private getElementInfo (elementName: string, parseInfo: types.IParseInfo): types.IElementInfo {
    return parseInfo.elements.get(elementName) || parseInfo.default || types.EmptyElementInfo;
  }

  /**
   * @method: composeText
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
    const doTrim = this.fetchCoercionOption('coercion/textNodes/trim');

    while (currentChild !== null) {
      if (currentChild.data && currentChild.data !== null) {
        text = doTrim ? R.concat(text, currentChild.data.trim()) : R.concat(text, currentChild.data);
      }
      currentChild = currentChild.nextSibling;
    }

    return text;
  }

  /**
   * @method: fetchCoercionOption
   * @description: Fetches the option denoted by the path. If the option requested does
   *    not appear in spec the provided, the option will be fetched from the default
   *    spec. The path specified must be treated as absolute and relates to the base
   *    spec.
   *
   * @param path: delimited string containing the segments used to build a lens
   *    for inspecting the spec.
   */
  private fetchCoercionOption (path: string) {
    // we need to take "path" as a string because the path's segments are not retrievable
    // from a lens. We need access to a segment(the last one) after lens is created,
    // so we take a path and build a lens from it.
    //
    const contextSegmentNo = 1;
    const segments = R.split('/')(path);
    const itemLens = R.lensPath(segments);
    const leafSegment = R.last(segments);
    const context = segments[contextSegmentNo];
    let defaultLens = itemLens;

    if (context === 'textNodes') {
      if (R.includes(leafSegment, ['delim', 'open', 'close'])) {
        throw new Error(`Internal error, leaf property(last), should not be defined under "textNodes": (${path})`);
      }

      // The default lens points to attributes
      //
      defaultLens = R.lensPath(R.update(contextSegmentNo, 'attributes')(segments));
    }

    return R.defaultTo(viewItem(defaultLens, Specs.fullSpecWithDefaults))(viewItem(itemLens, this.spec));
  }
}

/**
 * @function: viewItem
 * @description: Returns the value referred to by the lens applied to source.
 *
 * @param {Ramda lens} itemLens: a ramda lens who focus applies the value to be viewed.
 * @param {Object} source: Object to apply the lens to.
 * @returns: Value inside the source identified by the lens.
 */
function viewItem (itemLens: any, source: any) {
  return R.view(itemLens)(source);
}
