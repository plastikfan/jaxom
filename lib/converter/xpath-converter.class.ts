
import * as types from '../types';
import { XpathConverterImpl, IConverterImpl } from './xpath-converter.impl';
import { SpecOptionService, Specs } from '../specService/spec-option-service.class';

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
    // Control freak!
    //
    this.impl = new XpathConverterImpl(new SpecOptionService(spec));
  }

  private impl: IConverterImpl;

  /**
   * @method build
   * @description builds the native object representing an element and recurses in 2 dimensions;
   * by the "recurse" attribute (usually "inherits") and via the element's direct descendants.
   *
   * @param {*} elementNode
   * @param {types.IParseInfo} parseInfo
   * @returns
   * @memberof XpathConverter
   */
  build (elementNode: Node, parseInfo: types.IParseInfo): any {
    return this.impl.build(elementNode, parseInfo, []);
  }
} // class XpathConverter

// See https://developer.mozilla.org/en-US/docs/Web/API/Node
