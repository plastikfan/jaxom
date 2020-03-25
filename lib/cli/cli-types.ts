import * as xiberia from 'xiberia';

export interface ICommandLineInputs {
  xmlContent: string;
  query: string;
  parseInfoContent: any;
  out: string;
  argv: {};
}

export interface IParseInfoFactory {
  construct(source: string): xiberia.IParseInfo;
}

export const ConsoleTag = '[CONSOLE]';

export interface IApplicationConsole {
  log (message?: any, ...optionalParams: any[]): void;
}
