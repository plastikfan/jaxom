import * as fs from 'fs';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
import * as R from 'ramda';
import * as types from '../types';
import { XpathConverter } from '../converter/xpath-converter.class';
import * as cli from './cli-types';

/**
 * @export
 * @class Application
 */
export class Application {
  constructor (private inputs: cli.ICommandLineInputs,
    private parseInfoFactory: cli.IParseInfoFactory,
    private converter: types.IConverter = new XpathConverter(),
    private parser: DOMParser = new DOMParser(),
    private applicationConsole: cli.IApplicationConsole = console,
    private write: cli.IFileWriter = fs.writeFileSync) {

  }

  /**
   * @method run
   *
   * @returns {number}
   * @memberof Application
   */
  run (): number {
    // read the xml document
    //
    const document = this.parser.parseFromString(this.inputs.xmlContent, 'text/xml');
    const selectResult = xp.select(this.inputs.query, document);

    // get the parse info
    //
    const parseInfo: types.IParseInfo = this.parseInfoFactory.get(this.inputs.parseInfoContent);
    let actionResult = 0;

    try {
      /* istanbul ignore else */
      if (selectResult instanceof Array) {
        // Multiple node result
        //
        if (this.inputs.out && this.inputs.out !== cli.ConsoleTag) {
          this.applicationConsole.log(Title);
          // collate then persist all
          //
          const collection = R.reduce((acc: { [key: string]: any }[], node: Node): { [key: string]: any }[] => {
            const conversionResult: types.ConversionResult = this.converter.build(node, parseInfo);
            return R.append(conversionResult)(acc);
          }, [])(selectResult);

          const descriptionMessage = `jaxom => converted ${collection.length} node(s)`;
          const jsonCollectionResult = {
            description: descriptionMessage,
            result: collection
          };
          this.applicationConsole.log(descriptionMessage);
          actionResult = this.persist(jsonCollectionResult);
          this.applicationConsole.log(End);
        } else {
          this.applicationConsole.log(Title);
          // display all
          //
          selectResult.forEach((node: Node): void => {
            const conversionResult: types.ConversionResult = this.converter.build(node, parseInfo);
            actionResult = this.display(conversionResult);
            this.applicationConsole.log(Sep);
          });
          this.applicationConsole.log(End);
        }
      }
    } catch (error) {
      this.applicationConsole.log(error);
      actionResult = 1;
    }

    return actionResult;
  }

  /**
   * @method persist
   * @description direct the output to a file
   *
   * @param {types.ConversionResult} conversion
   * @returns {number}
   * @memberof Application
   */
  private persist (conversion: types.ConversionResult): number {
    this.write(this.inputs.out, JSON.stringify(conversion, null, 2), 'utf8');

    return 0;
  }

  /**
   * @method
   * @description direct the output to the console
   *
   * @param {types.ConversionResult} conversion
   * @returns {number}
   * @memberof Application
   */
  private display (conversion: types.ConversionResult): number {
    this.applicationConsole.log(JSON.stringify(conversion, null, 2));

    return 0;
  }
} // Application

const Title = '====================================================================== jaxom ===';
const Sep = '................................................................................';
const End = '--------------------------------------------------------------------------------';
