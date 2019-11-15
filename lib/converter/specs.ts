
import * as types from './types';

export const CollectionTypeLabel = 'type';
export const CollectionTypePlaceHolder = `<type>`;

// This is the spec used by the converter when the user does not supply a custom or
// specify a predefined one. By default, we don't want to use symbol and date matchers
// which are applicable for specialised scenarios and we shouldn't pay the overhead of
// using them for general scenarios.
//
const defaultSpec: types.ISpec = Object.freeze({
  name: 'default-spec',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  // 'coercion' is NOT default-able, if missing then coercion is disabled and everything is a
  // string. If the user wants coercion but is happy with all the defaults, then they can provide a
  // spec with an empty coercion property: coercion: {} (assuming of course that other non-coercion
  // properties are going to be overridden; otherwise just use the default spec).
  //
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
        string: true  // if false, then throw;
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
        string: true // if false, then throw;
      }
    }
  }
});

const _defaultSpec: unknown = Object.freeze({
  name: 'default-spec',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  // 'coercion' is NOT default-able, if missing then coercion is disabled and everything is a
  // string. If the user wants coercion but is happy with all the defaults, then they can provide a
  // spec with an empty coercion property: coercion: {} (assuming of course that other non-coercion
  // properties are going to be overridden; otherwise just use the default spec).
  //
  attributes: {
    trim: true,
    coercion: {
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
        string: true  // if false, then throw;
      }
    }
  },
  textNodes: {
    trim: true,
    coercion: {
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
        string: true // if false, then throw;
      }
    }
  }
});

// This is used as the fall-back spec; ie, when the custom spec is missing a particular
// field, then it will be retrieved from this one.
//
const fallBackSpec: types.ISpec = Object.freeze({
  name: 'full-with-defaults-spec',
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
        string: true  // if false, then throw;
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
        string: true // if false, then throw;
      }
    }
  }
});

const _fallBackSpec: unknown = Object.freeze({
  name: 'full-with-defaults-spec',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  attributes: {
    trim: true,
    coercion: {
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
        string: true  // if false, then throw;
      }
    }
  },
  textNodes: {
    trim: true,
    coercion: {
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
        string: true // if false, then throw;
      }
    }
  }
});

const withoutCoercionSpec: types.ISpec = Object.freeze({
  name: 'without-coercion-spec'
});

const attributesAsArraySpec: types.ISpec = Object.freeze({
  name: 'attributes-as-array-spec',
  labels: {
    attributes: '_attributes',
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  coercion: {} // coercion enabled with coercion defaults
});

const _attributesAsArraySpec: unknown = Object.freeze({
  name: 'attributes-as-array-spec',
  labels: {
    attributes: '_attributes',
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  attributes: {
    coercion: {} // coercion enabled with coercion defaults
  },
  textNodes: {
    coercion: {} // coercion enabled with coercion defaults
  }
});

const attributesAsArrayWithoutCoercionSpec: types.ISpec = Object.freeze({
  name: 'attributes-as-array-without-coercion-spec',
  labels: {
    attributes: '_attributes',
    element: '_',
    descendants: '_children',
    text: '_text'
  }
});

export const Specs = Object.freeze({
  default: defaultSpec,
  fallBack: fallBackSpec,
  withoutCoercion: withoutCoercionSpec,
  attributesAsArray: attributesAsArraySpec,
  attributesAsArrayWithoutCoercion: attributesAsArrayWithoutCoercionSpec
});
