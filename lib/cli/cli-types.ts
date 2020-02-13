import * as fs from 'fs';
import * as types from '../types';

export interface ICommandLineInputs {
  xmlContent: string;
  query: string;
  parseInfoContent: any;
  out: string;
  argv: {};
}

export interface IParseInfoFactory {
  get (source: string): types.IParseInfo;
}

export const ConsoleTag = '[CONSOLE]';

export interface IApplicationConsole {
  log (message?: any, ...optionalParams: any[]): void;
}
