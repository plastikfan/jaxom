
import * as R from 'ramda';
import * as xiberia from 'xiberia';

/**
 * @method composeElementInfo
 * @description Retrieves the elementInfo for the name specified.
 *
 * @param {string} elementName
 * @param {xiberia.IParseInfo} parseInfo
 * @returns {xiberia.IElementInfo}
 */
export function composeElementInfo (elementName: string, parseInfo: xiberia.IParseInfo): xiberia.IElementInfo {
  const namedOrDefaultElementInfo: xiberia.IElementInfo | undefined = parseInfo.elements.get(
    elementName) ?? parseInfo.def;

  let result: xiberia.IElementInfo = {};

  if (namedOrDefaultElementInfo) {
    result = parseInfo.common
      ? R.mergeDeepRight(parseInfo.common, namedOrDefaultElementInfo)
      : namedOrDefaultElementInfo;
  } else if (parseInfo.common) {
    result = parseInfo.common;
  }

  return result;
} // composeElementInfo

// why is this functionality not part of the standard js library
//
export function isNumeric (n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * @description Type safe version of Ramda's prop function
 *
 * @export
 * @template R
 * @param {string} key: The name of the property in the container object
 * @param {{ [_k: string]: any }} container
 * @returns {R}
 */
export function prop<R> (key: string, container: { [_k: string]: any }): R {
  return (key in container) ? R.prop(key, container) : R.empty(key);
}
