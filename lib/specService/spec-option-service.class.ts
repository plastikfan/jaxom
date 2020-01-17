
import * as R from 'ramda';
import * as types from '../types';
import * as e from '../exceptions';

export class SpecOptionService implements types.ISpecService {
  constructor (private spec: types.ISpec = defaultSpec) {
    this.labels = new MandatoryLabels(this);
    this.elementLabel = this.labels.element;
    this.descendantsLabel = this.labels.descendants;
    this.textLabel = this.labels.text;

    this.validateSpec();
  }
  private readonly labels: MandatoryLabels;

  // ---------------------------------------------------- ISpecService interface

  /**
   * @method fetchOption
   * @description Fetches the option denoted by the path. If the option requested does
   * not appear in spec the provided, the option will be fetched from the fallBack
   * spec (with caveats see fallBack parameter). The path specified must be treated
   * as absolute and relates to the base spec.
   *
   * @public
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
   * @memberof SpecOptionService
   */
  public fetchOption (path: string, fallBack: boolean = true): any {
    const segments: string[] = R.split('/')(path);
    const itemLens: R.Lens = R.lensPath(segments);

    const result = fallBack
      ? R.defaultTo(R.view(itemLens)(Specs.fallBack), R.view(itemLens)(this.spec))
      : R.view(itemLens)(this.spec);

    return result;
  }

  readonly elementLabel: string;
  readonly descendantsLabel: string;
  readonly textLabel: string;

  getSpec (): types.ISpec {
    return this.spec;
  }

  // ISpecService interface ====================================================

  private validateSpec (): void {
    const delim: string = this.fetchOption('attributes/coercion/matchers/collection/delim');
    const assocDelim: string = this.fetchOption('attributes/coercion/matchers/collection/assoc/delim');

    if (delim === assocDelim) {
      throw new e.JaxSpecValidationError(
        'delim at "attributes/coercion/matchers/collection/delim" should be different',
        this.spec.name,
        delim,
        'attributes/coercion/matchers/collection/assoc/delim'
      );
    }
  }
} // class SpecOptionService

class MandatoryLabels {
  constructor (options: types.ISpecService) {
    this.element = options.fetchOption('labels/element') as string;
    this.descendants = options.fetchOption('labels/descendants') as string;
    this.text = options.fetchOption('labels/text') as string;
  }

  readonly element: string;
  readonly descendants: string;
  readonly text: string;
}

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
        string: true // if false, then throw;
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
        string: true // if false, then throw;
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
