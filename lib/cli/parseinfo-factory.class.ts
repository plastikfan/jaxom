import * as types from '../types';
import * as R from 'ramda';

export class ParseInfoFactory {
  constructor (private source: string) { }

  public get (): types.IParseInfo {

    const json = JSON.parse(this.source);

    // elements array
    //
    type ParseInfoEntry = ['string', types.IElementInfo];
    const elements: ParseInfoEntry[] = R.prop('elements')(json);
    const elementsMap = new Map<string, types.IElementInfo>(elements);

    let parseInfo: types.IParseInfo = {
      elements: elementsMap
    };

    // common object
    //
    if (R.has('common')(json)) {
      const lens = R.lensProp('common');
      const common = R.prop('common', json);
      parseInfo = R.set(lens, common)(parseInfo);
    }

    // def object
    //
    if (R.has('def')(json)) {
      const lens = R.lensProp('def');
      const def = R.prop('def', json);
      parseInfo = R.set(lens, def)(parseInfo);
    }

    return parseInfo;
  }
}
