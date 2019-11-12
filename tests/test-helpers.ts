import { functify } from 'jinxed';
import * as xp from 'xpath-ts';
import * as types from '../lib/converter/types';

export function logIfFailed (result: boolean, widget: any) {
  if (!result) {
    console.log(`FAILURE!: ${widget}!`);
  }

  return result;
}

export function logIfFailedStringify (result: boolean, widget: any) {
  if (!result) {
    console.log(`FAILURE!: ${functify(widget)}`);
  }

  return result;
}

export function selectElementNodeById (
  elementName: string, id: string, name: string, parentNode: any): types.NullableNode {
  let result: types.SelectResult = xp.select(`.//${elementName}[@${id}="${name}"]`, parentNode, true);

  if (!(result instanceof Node)) {
    throw new Error('selected a non Node item');
  }

  return result;
}
