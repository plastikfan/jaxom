import 'xmldom-ts';
import * as fs from 'fs';
import { CommandLine } from './command-line.class';
import { ParseInfoFactory } from './parseinfo-factory.class';
import { Application } from './application.class';
import { ICommandLineInputs } from './cli-types';
import { XpathConverter } from '../converter/xpath-converter.class';
import { Specs } from '../specService/spec-option-service.class';

module.exports = (): number => {
  // setup
  //
  const converter = new XpathConverter(Specs.default);
  const parseInfoFactory = new ParseInfoFactory();
  const parser: DOMParser = new DOMParser();
  const commandLine = new CommandLine();

  // acquire inputs
  //
  const inputs: ICommandLineInputs = commandLine.build(require('yargs'));

  // inject dependencies
  //
  /* istanbul ignore next: not worth the effort in testing */
  const application = new Application(inputs, parseInfoFactory, converter, parser,
    console, fs.writeFileSync);

  // run
  //
  /* istanbul ignore next */
  const result = application.run();
  /* istanbul ignore next */
  process.exitCode = result;
  /* istanbul ignore next */
  return result;
};
