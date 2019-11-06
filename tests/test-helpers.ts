import { functify } from 'jinxed';

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
