import { functify } from 'jinxed';
import { expect, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import 'xmldom-ts';
import * as R from 'ramda';
import * as path from 'path';
import * as memfs from 'memfs';
import { patchFs } from 'fs-monkey';
import * as fs from 'fs';
import * as types from '../../lib/types';
import * as cli from '../../lib/cli/cli-types';
import { Application } from '../../lib/cli/application.class';
import { ParseInfoFactory } from '../../lib/cli/parseinfo-factory.class';
import { XpathConverter } from '../../lib/converter/xpath-converter.class';
const compositionRoot = require('../../lib/cli/composition-root');
const vol = memfs.vol;

class FakeConsole {
  log (message?: any, ...optionalParams: any[]): void {
    // null-op
  }
}

const patchedFS = {
  writeFileSync: (path: fs.PathLike | number, data: any, options?: fs.WriteFileOptions): void => {
    throw new Error(`Something went wrong writing file to ${path}`);
  }
};

function setupFS (fileNames: string[], patch?: {}): memfs.IFs {

  const resultFS = R.reduce((acc: { [key: string]: any }, fileName: string): { [key: string]: any } => {
    const filePath = path.resolve(__dirname, fileName);
    const content: string = fs.readFileSync(filePath, 'utf8');
    return R.assoc(fileName, content)(acc);
  }, {})(fileNames);

  const volume = memfs.Volume.fromJSON(resultFS);
  if (patch) {
    patchFs(patch, volume);
  }

  return memfs.createFsFromVolume(volume);
}

describe('Application', () => {
  let parseInfoFactory: ParseInfoFactory;
  let converter: types.IConverter;
  let parser: DOMParser;
  let applicationConsole: cli.IApplicationConsole;
  let mfs: memfs.IFs;

  beforeEach(() => {
    parseInfoFactory = new ParseInfoFactory();
    converter = new XpathConverter();
    parser = new DOMParser();
    applicationConsole = new FakeConsole();
  });

  afterEach(() => {
    vol.reset();
  });

  context('persist to file', () => {
    context('given: singular node result', () => {
      it('should: persist result to file', () => {
        mfs = setupFS(['./commands.content.xml', './test.parseInfo.all.json']);

        const xmlContent: string = mfs.readFileSync('./commands.content.xml', 'utf8').toString();
        const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[@name="rename"]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, mfs);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: multi node result', () => {
      it('should: persist result to file', () => {
        mfs = setupFS(['./multiple-commands.content.xml', './test.parseInfo.all.json']);
        const xmlContent: string = mfs.readFileSync('./multiple-commands.content.xml', 'utf8').toString();
        const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, mfs);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: error event occurring during write', () => {
      it('should: catch and report error', () => {
        mfs = setupFS(['./multiple-commands.content.xml', './test.parseInfo.all.json'],
          patchedFS); // <--

        const xmlContent: string = mfs.readFileSync('./multiple-commands.content.xml', 'utf8').toString();
        const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole,
          mfs);

        const result = application.run();
        expect(result).to.equal(1);
      });
    });
  }); // persist to file

  context('display to console', () => {
    context('given: singular node result', () => {
      it('should: display result on console', () => {
        mfs = setupFS(['./commands.content.xml', './test.parseInfo.all.json']);
        const xmlContent: string = mfs.readFileSync('./commands.content.xml', 'utf8').toString();
        const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[@name="rename"]',
          parseInfoContent: parseInfoContent,
          out: cli.ConsoleTag,
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, mfs);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });

    context('given: multi node result', () => {
      it('should: display result on console', () => {
        mfs = setupFS(['./multiple-commands.content.xml', './test.parseInfo.all.json']);
        const xmlContent: string = mfs.readFileSync('./multiple-commands.content.xml', 'utf8').toString();
        const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

        const inputs: cli.ICommandLineInputs = {
          xmlContent: xmlContent,
          query: '/Application/Cli/Commands/Command[not(@abstract)]',
          parseInfoContent: parseInfoContent,
          out: './output.json',
          argv: {}
        };

        const application = new Application(inputs, parseInfoFactory, converter, parser,
          applicationConsole, mfs);

        const result = application.run();
        expect(result).to.equal(0);
      });
    });
  }); // display to console

  context('given: construction with defaults', () => {
    it('should: persist result to file', () => {
      mfs = setupFS(['./commands.content.xml', './test.parseInfo.all.json']);
      const xmlContent: string = mfs.readFileSync('./commands.content.xml', 'utf8').toString();
      const parseInfoContent: string = mfs.readFileSync('./test.parseInfo.all.json', 'utf8').toString();

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
    const applicationConsole = new FakeConsole();
    const additionalArguments = [
      '--xml', path.resolve(__dirname, './commands.content.xml'),
      '--query', '/Application/Cli/Commands/Command[@name="rename"]',
      '--parseinfo', path.resolve(__dirname, './test.parseInfo.all.json')
    ];

    process.argv = R.concat(process.argv, additionalArguments);
    const vfs = setupFS(['./commands.content.xml', './test.parseInfo.all.json']);

    compositionRoot(applicationConsole, vfs);
    vol.reset();
  });
});
