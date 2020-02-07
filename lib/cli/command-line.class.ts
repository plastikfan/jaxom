import * as xp from 'xpath-ts';
import 'xmldom-ts';
import * as types from '../types';
import { ParseInfoFactory } from './parseinfo-factory.class';
import { XpathConverter } from '../converter/xpath-converter.class';

export interface IParseInfoFactory {
  get (): types.IParseInfo;
}

export interface ICommandLineInputs {
  xmlContent: string;
  query: string;
  parseInfoContent: string;
}

export class CommandLine {

  constructor (private inputs: ICommandLineInputs,
    private parseInfoFactory: IParseInfoFactory = new ParseInfoFactory(inputs.parseInfoContent),
    private converter: types.IConverter = new XpathConverter(),
    private parser: DOMParser = new DOMParser()) {

  }

  acquire (): { [key: string]: any} {
    // read the x document
    //
    const document = this.parser.parseFromString(this.inputs.xmlContent, 'text/xml');
    const selectResult = xp.select(this.inputs.query, document, true);

    if (!(selectResult instanceof Node)) {
      throw new Error(`Query: "${this.inputs.query}" is invalid.`);
    }

    // get the parse info
    //
    const parseInfo: types.IParseInfo = this.parseInfoFactory.get();

    return this.converter.build(selectResult, parseInfo);
  }
}
