
import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import * as R from 'ramda';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
const parser = new DOMParser();
const { functify } = require('jinxed');
import * as types from '../../lib/converter/types';
import { Specs, CollectionTypePlaceHolder, CollectionTypeLabel } from '../../lib/converter/specs';
import * as Helpers from '../test-helpers';

import { XpathConverter } from '../../lib/converter/xpath-converter.class';

function selectElementNodeById (elementName: string, id: string, name: string, parentNode: any) {
  let elementResult: any = xp.select(`.//${elementName}[@${id}="${name}"]`, parentNode);
  let elementNode: any = {};

  if (elementResult && elementResult.length > 0) {
    elementNode = elementResult[0];
  }

  return elementNode;
}

const testParseInfo: types.IParseInfo = {
  elements: new Map<string, types.IElementInfo>([
    ['commands', {
      id: 'name',
      recurse: 'inherits',
      discards: ['inherits', 'abstract'],
      descendants: {
        by: 'index',
        throwIfCollision: false,
        throwIfMissing: false
      }
    }]
  ])
};

// https://journal.artfuldev.com/unit-testing-node-applications-with-typescript-using-mocha-and-chai-384ef05f32b2
// https://blog.atomist.com/typescript-imports/
//
describe('xpath-converter', () => {
  const SelectSingle = true;
  const data = `<?xml version="1.0"?>
    <Application name="pez">
      <Cli>
        <Commands>
          <Command name="leaf" describe="this is a leaf command" type="native"/>
        </Commands>
      </Cli>
    </Application>`;
  const spec = {
    name: 'default-spec',
    labels: {
      element: '_',
      descendants: '_children',
      text: '_text'
    }
  };

  context('given: new object / command with no inheritance, using custom spec', () => {
    it('should: return a command object all local attributes', () => {
      const document: Document = parser.parseFromString(data, 'text/xml');
      const commandsNode = xp.select('/Application/Cli/Commands[1]', document, SelectSingle);

      if (commandsNode) {
        let leafCommandNode: any = selectElementNodeById('Command', 'name', 'leaf', commandsNode);

        if (leafCommandNode) {
          const converter = new XpathConverter(Specs.default);
          let command = converter.buildElement(leafCommandNode, commandsNode, testParseInfo);

          let result = Helpers.logIfFailedStringify(R.where({
            'name': R.equals('leaf'),
            'describe': R.equals('this is a leaf command'),
            'type': R.equals('native')
          })(command), command);

          // const RES = {
          //   'name': false,
          //   'describe': false,
          //   'type': false,
          //   '_': 'Command'
          // };

          console.log(`--> result: ${functify(command)}`);
          // expect(result).to.be.true(functify(command));
        }
      }
    });
  });

  context('the context', () => {
    it('dummy', () => {
      expect(1).to.equal(1, '*** Argh!!!');
    });
  });
});
