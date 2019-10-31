
import * as R from 'ramda';
import * as types from './types';
// import { Node } from 'xpath-ts';
import * as xpath from 'xpath-ts';
import * as xmldom from 'xmldom-ts';

import { functify } from 'jinxed';

const CollectionTypePlaceholder = '<type>';

const fullSpecWithDefaults: types.ISpec = Object.freeze({
  name: 'full-spec-with-defaults',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  coercion: {
    attributes: {
      trim: true,
      matchers: {
        primitives: ['number', 'boolean'],
        collection: {
          delim: ',',
          open: `!${CollectionTypePlaceholder}[`,
          close: ']',
          assoc: {
            delim: '=',
            keyType: 'string',
            valueType: 'string'
          }
        },
        date: {
          format: 'YYYY-MM-DD'
        },
        symbol: {
          prefix: '$',
          global: true
        },
        string: true
      }
    },
    textNodes: {
      trim: true
    }
  }
});

const missing: R.Pred = x => x === undefined;
const optional = (fn: R.Pred) => R.either(missing, fn);

export default class XpathConverter implements types.IConverter {
  constructor (private spec: types.ISpec) {
    if (!spec) {
      throw new Error('null spec not permitted');
    }

    this.validateSpec();
  }

  buildElement (elementNode: Node, parentNode: Node, parseInfo: types.IParseInfo) {
    throw new Error('not implemented');
  }

  private validateSpec () {

    // more functionality to follow ...
    //
  }
}

// Should this be a static member on the class?
//
// export function validateSpec (spec: types.ISpec) {
//   const throwIfMissing: types.IValidateSpecThrowIfMissingFn = (
//     labelName,
//     from,
//     container
//   ) => {
//     if (!R.has(labelName)(container)) {
//       throw new Error(
//         `"${labelName}" property missing from ${from}, spec: ${functify(spec)}`
//       );
//     }
//   };
// }
