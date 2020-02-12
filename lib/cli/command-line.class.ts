import * as yargs from 'yargs';
import * as fs from 'fs';
import 'xmldom-ts';
import { ICommandLineInputs, ConsoleTag } from './cli-types';

export class CommandLine {

  // needs to change to return a command line inputs instance
  //
  public build (instance: yargs.Argv): ICommandLineInputs {

    instance = instance.scriptName('jaxom-cli')
      .option('xml', {
        alias: 'x',
        describe: 'path to xml file',
        string: true,
        normalize: true
      })
      .option('query', {
        alias: 'q',
        describe: 'xpath query',
        string: true
      })
      .option('parseinfo', {
        alias: 'p',
        describe: 'path to json file containing parse info to apply to xml document',
        string: true,
        normalize: true
      })
      .option('output', {
        alias: 'o',
        describe: 'output file name, if not specified, display result to console',
        string: true,
        normalize: true,
        default: ConsoleTag
      })
      .requiresArg(['xml', 'query', 'parseinfo'])
      .usage('$0: -x/--xml string -q/--query string -p/--parseinfo string [-o/--output string]')
      .demandOption(['xml', 'query', 'parseinfo'], 'Missing parameters, try again!');

    // do parse
    //
    const parseResult = instance.argv;

    const inputs: ICommandLineInputs = {
      xmlContent: fs.readFileSync(parseResult.xml as string, 'utf8'),
      query: parseResult.query as string,
      parseInfoContent: fs.readFileSync(parseResult.parseinfo as string, 'utf8'),
      out: parseResult.output as string,
      argv: parseResult
    };

    /* istanbul ignore next: ? */
    return inputs;

  } // buildCli
}
