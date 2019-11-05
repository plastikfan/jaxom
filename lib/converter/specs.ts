
import * as types from './types';

export const CollectionTypeLabel = 'type';
export const CollectionTypePlaceHolder = `<${CollectionTypeLabel}>`;

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
          open: `!${CollectionTypePlaceHolder}[`,
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

const defaultSpec: types.ISpec = Object.freeze({
  name: 'default-spec',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  trim: true
});

const attributesAsArraySpec: types.ISpec = Object.freeze({
  name: 'attributes-as-array-spec',
  labels: {
    attributes: '_attributes',
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  trim: true
});

const fullSpec: types.ISpec = Object.freeze({
  name: 'full-spec',
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
          open: '!<type>[',
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
      trim: true,
      matchers: {
        collection: {
          // The following properties are not appropriate for textNodes, because the
          // constituents are already natively split: "delim", "open", "close"
          //
          assoc: {
            delim: '=', // required for map types (key/value pair) collection types
            // valueType: the name (or an array of) of a primitive type(s)
            //
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
        string: true // if false, then throw; defaults to true
      }
    }
  }
});

export const Specs = Object.freeze({
  default: defaultSpec,
  attributesAsArraySpec: attributesAsArraySpec,
  fullSpec: fullSpec,
  fullSpecWithDefaults: fullSpecWithDefaults
});
