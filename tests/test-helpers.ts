import { functify } from 'jinxed';
import * as xp from 'xpath-ts';

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

export function selectElementNodeById (elementName: string, id: string, name: string, parentNode: any) {
  return xp.select(`.//${elementName}[@${id}="${name}"]`, parentNode, true);
}
