import { functify } from 'jinxed';
import * as xp from 'xpath-ts';
import * as types from '../lib/types';

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
  elementName: string, id: string, name: string, rootNode: any): types.NullableNode {
  if (rootNode && rootNode instanceof Node) {
    let result: types.SelectResult = xp.select(`.//${elementName}[@${id}="${name}"]`, rootNode, true);

    return result instanceof Node ? result : null;
  }

  /* istanbul ignore next: typescript type-guard */
  return null;
}
