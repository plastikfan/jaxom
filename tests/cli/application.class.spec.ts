import { functify } from 'jinxed';
import { expect, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import 'xmldom-ts';
import * as path from 'path';
import * as fs from 'fs';
import * as types from '../../lib/types';
import * as cli from '../../lib/cli/cli-types';
import { Application } from '../../lib/cli/application.class';
import { ParseInfoFactory } from '../../lib/cli/parseinfo-factory.class';
import { XpathConverter } from '../../lib/converter/xpath-converter.class';
const compositionRoot = require('../../lib/cli/composition-root');

class FakeConsole {
  log (message?: any, ...optionalParams: any[]): void {
    // null-op
  }
}

describe('Application', () => {
  let parseInfoFactory: ParseInfoFactory;
  let converter: types.IConverter;
  let parser: DOMParser;
  let applicationConsole: cli.IApplicationConsole;
  let writer: cli.IFileWriter;
  let errorWriter = (path: fs.PathLike | number, data: any, options?: fs.WriteFileOptions): void => {
    throw new Error(`Something went wrong writing file to ${path}`);
  };

  beforeEach(() => {
    parseInfoFactory = new ParseInfoFactory();
    converter = new XpathConverter();
    parser = new DOMParser();
    applicationConsole = new FakeConsole();
    writer = (path: fs.PathLike | number, data: any, options?: fs.WriteFileOptions): void => {
      // null-op
    };
  });

  context('persist to file', () => {
    context('given: singular node result', () => {
      it('should: persist result to file', () => {
        const resolvedXmlFile = path.resolve(__dirname, './commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[@name="rename"]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, writer);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: multi node result', () => {
      it('should: persist result to file', () => {
        const resolvedXmlFile = path.resolve(__dirname, './multiple-commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, writer);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: error event occurring during write', () => {
      it('should: catch and report error', () => {
        const resolvedXmlFile = path.resolve(__dirname, './multiple-commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole,
          errorWriter); // <--

        const result = application.run();
        expect(result).to.equal(1);
      });
    });

    context('given: error event occurring during write', () => {
      it('should: catch and report error', () => {
        const resolvedXmlFile = path.resolve(__dirname, './multiple-commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[@name="rename"]/@name', // <-- Select an @attribute
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole,
          errorWriter); // <--

        const result = application.run();
        expect(result).to.equal(1);
      });
    });
  }); // persist to file

  context('display to console', () => {
    context('given: singular node result', () => {
      it('should: display result on console', () => {
        const resolvedXmlFile = path.resolve(__dirname, './commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[@name="rename"]',
          parseInfoContent: parseInfoContent,
          out: cli.ConsoleTag,
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, writer);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: multi node result', () => {
      it('should: display result on console', () => {
        const resolvedXmlFile = path.resolve(__dirname, './multiple-commands.content.xml');
        const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

        const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
        const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, writer);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });
  }); // display to console

  context('given: construction with defaults', () => {
    it('should: persist result to file', () => {
      const resolvedXmlFile = path.resolve(__dirname, './commands.content.xml');
      const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

      const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
      const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

      const inputs: cli.ICommandLineInputs = {
        xmlContent: xmlContent,
        query: '/Application/Cli/Commands/Command[@name="rename"]',
        parseInfoContent: parseInfoContent,
        out: './output.json',
        argv: {}
      };

      const application = new Application(inputs, parseInfoFactory);

      const result = application.run();
      expect(result).to.equal(0);
    });
  });
}); // Application

describe('composition-root', () => {
  it('(coverage)', () => {
    try {
      compositionRoot();
    } catch (error) {
      // no-op
    }
  });
});
