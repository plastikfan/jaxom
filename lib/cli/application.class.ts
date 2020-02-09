import * as fs from 'fs';
import * as xp from 'xpath-ts';
import 'xmldom-ts';

import * as types from '../types';
import { ParseInfoFactory } from './parseinfo-factory.class';
import { XpathConverter } from '../converter/xpath-converter.class';
import { ICommandLineInputs, IParseInfoFactory, ConsoleTag, IApplicationConsole } from './cli-types';

export class Application {
  constructor (private inputs: ICommandLineInputs,
    private parseInfoFactory: IParseInfoFactory = new ParseInfoFactory(),
    private converter: types.IConverter = new XpathConverter(),
    private parser: DOMParser = new DOMParser(),
    private applicationConsole: IApplicationConsole) {

  }

  run (): number {
    // read the xml document
    //
    const document = this.parser.parseFromString(this.inputs.xmlContent, 'text/xml');
    const selectResult = xp.select(this.inputs.query, document, true);

    // This supports only a single mode, needs to change to build an array of objects
    // if the result of the query is an array
    //
    if (!(selectResult instanceof Node)) {
      throw new Error(`Query: "${this.inputs.query}" is invalid.`);
    }

    // get the parse info
    //
    const parseInfo: types.IParseInfo = this.parseInfoFactory.get(this.inputs.parseInfoContent);

    const conversionResult: types.ConversionResult = this.converter.build(selectResult, parseInfo);
    const showResult = (this.inputs.out && this.inputs.out !== ConsoleTag)
      ? this.print(conversionResult)
      : this.display(conversionResult);

    return showResult;
  }

  print (conversion: types.ConversionResult): number {
    this.applicationConsole.log(Title);
    fs.writeFileSync(this.inputs.out, JSON.stringify(conversion, null, 2), 'utf8');

    this.applicationConsole.log(End);
    return 0;
  }

  display (conversion: types.ConversionResult): number {
    this.applicationConsole.log(Title);

    if (conversion instanceof Array) {
      if (conversion.length === 1) {
        this.applicationConsole.log(JSON.stringify(conversion[0], null, 2));
      } else {
        conversion.forEach((co: any) => {
          this.applicationConsole.log(JSON.stringify(co, null, 2));
          this.applicationConsole.log(Sep);
        });
        this.applicationConsole.log(`>>> ${conversion.length} nodes converted.`);
      }
    } else {
      this.applicationConsole.log(JSON.stringify(conversion, null, 2));
    }

    this.applicationConsole.log(End);
    return 0;
  }
} // Application

const Title = '====================================================================== jaxom ===';
const Sep = '................................................................................';
const End = '--------------------------------------------------------------------------------';
