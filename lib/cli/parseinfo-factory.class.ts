import * as types from '../types';
import * as R from 'ramda';

export class ParseInfoFactory {

  public get (source: string): types.IParseInfo { // this should be on an interface?

    const json = JSON.parse(source); // json conversion probably not needed

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
