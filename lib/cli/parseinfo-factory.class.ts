import * as types from '../types';
import * as R from 'ramda';

export class ParseInfoFactory {
  /**
   * @method construct
   * @description Acquire a parse info instance from the @source json provided.
   *
   * @param {string} source
   * @returns {types.IParseInfo}
   * @memberof ParseInfoFactory
   */
  public construct (source: string): types.IParseInfo {
    const json = JSON.parse(source);

    // elements array
    //
    type ParseInfoEntry = ['string', types.IElementInfo];
    const elements: ParseInfoEntry[] = R.prop('elements')(json);
    const elementsMap = new Map<string, types.IElementInfo>(elements);

    let parseInfo: types.IParseInfo = {
      elements: elementsMap
    };

    // optional items
    //
    parseInfo = this.copy('common', json, parseInfo);
    parseInfo = this.copy('def', json, parseInfo);

    return parseInfo;
  }

  /**
   * @method copy
   * @description Copy the optional property from the json specified in @from
   * to the target parse info instance @target
   *
   * @private
   * @param {string} property
   * @param {string} any JSON content
   * @param {types.IParseInfo} target
   * @returns {types.IParseInfo}
   * @memberof ParseInfoFactory
   */
  private copy (property: string, from: any, target: types.IParseInfo): types.IParseInfo {
    if (R.has(property)(from)) {
      const lens = R.lensProp(property);
      const item = R.view(lens, from);
      target = R.set(lens, item)(target);
    }
    return target;
  }
} // ParseInfoFactory
