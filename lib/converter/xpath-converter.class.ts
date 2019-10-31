
import * as R from 'ramda';
import * as types from './types';
import * as xpath from 'xpath-ts';
import * as xmldom from 'xmldom-ts';

import { functify } from 'jinxed';

const missing: R.Pred = x => x === undefined;
const optional = (fn: R.Pred) => R.either(missing, fn);

export const duff: types.ISpec = {};

export default class XpathConverter implements types.IConverter {
  constructor (private spec: types.ISpec) {
    if (!spec) {
      throw new Error('null spec not permitted');
    }
  }

  buildElement (elementNode: Node, parentNode: Node, parseInfo: types.IParseInfo) {
    throw new Error('not implemented');
  }
}
