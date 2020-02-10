import 'xmldom-ts';
import * as fs from 'fs';
import { CommandLine } from './command-line.class';
import { ParseInfoFactory } from './parseinfo-factory.class';
import { Application } from './application.class';
import { ICommandLineInputs } from './cli-types';
import { XpathConverter } from '../converter/xpath-converter.class';
import { Specs } from '../specService/spec-option-service.class';

module.exports = (): number => {
  // acquire inputs
  //
  const commandLine = new CommandLine();
  const inputs: ICommandLineInputs = commandLine.build(require('yargs'));

  // inject dependencies
  //
  const converter = new XpathConverter(Specs.default);
  const parseInfoFactory = new ParseInfoFactory();
  const parser: DOMParser = new DOMParser();
  const application = new Application(inputs, parseInfoFactory, converter, parser,
    console, fs.writeFileSync);

  // run
  //
  const result = application.run();
  process.exitCode = result;
  return result;
};
