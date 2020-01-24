
import * as R from 'ramda';
import * as types from '../types';

/**
 * @method composeElementInfo
 * @description Retrieves the elementInfo for the name specified.
 *
 * @param {string} elementName
 * @param {types.IParseInfo} parseInfo
 * @returns {types.IElementInfo}
 */
export function composeElementInfo (elementName: string, parseInfo: types.IParseInfo): types.IElementInfo {
  const namedOrDefaultElementInfo: types.IElementInfo | undefined = parseInfo.elements.get(
    elementName) ?? parseInfo.def;

  let result: types.IElementInfo = {};

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
