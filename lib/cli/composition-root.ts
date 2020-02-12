import 'xmldom-ts';
import { CommandLine } from './command-line.class';
import { ParseInfoFactory } from './parseinfo-factory.class';
import { Application } from './application.class';
import { ICommandLineInputs } from './cli-types';
import { XpathConverter } from '../converter/xpath-converter.class';
import { Specs } from '../specService/spec-option-service.class';
import * as types from '../types';
import { IApplicationConsole } from '../cli/cli-types';

module.exports = (applicationConsole: IApplicationConsole, fs: types.VirtualFS): number => {
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
  const application = new Application(inputs, parseInfoFactory, converter, parser,
    applicationConsole, fs);

  // run
  //
  const result = application.run();
  process.exitCode = result;
  return result;
};
