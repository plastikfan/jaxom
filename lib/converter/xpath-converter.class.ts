
import * as types from './types';
import { Specs } from './specs';
import { XpathConverterImpl as Impl } from './xpath-converter.impl';

/**
 * @export
 * @class XpathConverter
 * @implements {types.IConverter}
 */
export class XpathConverter implements types.IConverter {
  /**
   * Creates an instance of XpathConverter.
   * @param {types.ISpec} [spec=Specs.default] The XpathConverter uses a spec to define
   * the conversion behaviour. A user may wish to override some of these settings, in which
   * case, they can pass in a partial spec (Partial here means that the custom spec does
   * not have to repeat all of the default fields that it does not wish to override). If
   * a setting is not found in the custom spec, that setting will be taken from the default
   * except where that setting is not default-able; please see the ISpec interface.
   *
   * @memberof XpathConverter
   */
  constructor (spec: types.ISpec = Specs.default) {
    if (!spec) {
      throw new Error('null spec not permitted');
    }

    this.impl = new Impl(spec);
  }

  private impl: types.IConverterImpl;

  /**
   * @method buildElement
   * @description builds the native object representing an element and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   * The structure of the JSON object is defined by the Spec object passed as the spec param.
   * buildElement uses the default spec. To use a different spec, use buildElementWithSpec
   * and pass in another one. Predefined specs are available as members on the exported specs
   * object, or users can define their own.
   * @param {*} elementNode
   * @param {*} parentNode
   * @param {types.IParseInfo} parseInfo
   * @returns
   * @memberof XpathConverter
   */
  buildElement (elementNode: Node, parentNode: types.NullableNode, parseInfo: types.IParseInfo): any {
    return this.impl.buildElement(elementNode, parentNode, parseInfo, []);
  }
} // class XpathConverter

// See https://developer.mozilla.org/en-US/docs/Web/API/Node
