/// <reference types="../../lib/declarations" />

import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import sinonChai from 'sinon-chai';
use(sinonChai);
import * as xp from 'xpath-ts';
import * as types from '../../lib/types';
import { XpathConverterImpl as Impl } from '../../lib/converter/xpath-converter.impl';
const parser = new DOMParser();

const testParseInfo: types.IParseInfo = {
  elements: new Map<string, types.IElementInfo>([
    ['Command', {
      id: 'name',
      recurse: 'inherits'
    }],
    ['Argument', {
      id: 'ref'
    }]
  ]),
  common: {
    id: '',
    discards: ['inherits', 'abstract']
  },
  def: {
    id: '',
    descendants: {
      by: 'index',
      throwIfCollision: false,
      throwIfMissing: false
    }
  }
};

describe('Normaliser.combine', () => {
  const tests = [
    {
      given: 'element inherits from single item not marked as abstract',
      data: `<?xml version="1.0"?>
        <Application name="pez">
          <Cli>
            <Commands>
              <Command name="duo-command">
                <Arguments>
                  <ArgumentRef name="from"/>
                  <ArgumentRef name="to"/>
                </Arguments>
              </Command>
              <Command name="test" describe="Test regular expression definitions" inherits="duo-command">
                <Arguments>
                  <ArgumentRef name="config"/>
                  <ArgumentRef name="expr"/>
                  <ArgumentRef name="input"/>
                </Arguments>
              </Command>
            </Commands>
          </Cli>
        </Application>`
    },
    {
      given: 'element inherits from multiple items one of which (duo-command) is not marked as abstract',
      data: `<?xml version="1.0"?>
        <Application name="pez">
          <Cli>
            <Commands>
              <Command name="uni-command" abstract="true">
                <Arguments>
                  <ArgumentRef name="path"/>
                  <ArgumentRef name="filesys"/>
                  <ArgumentRef name="tree"/>
                </Arguments>
              </Command>
              <Command name="duo-command">
                <Arguments>
                  <ArgumentRef name="from"/>
                  <ArgumentRef name="to"/>
                </Arguments>
              </Command>
              <Command name="test" describe="Test regular expression definitions" inherits="duo-command,uni-command">
                <Arguments>
                  <ArgumentRef name="config"/>
                  <ArgumentRef name="expr"/>
                  <ArgumentRef name="input"/>
                </Arguments>
              </Command>
            </Commands>
          </Cli>
        </Application>`
    }
  ];

  tests.forEach(t => {
    context('given: throw', () => {
      it(`given: ${t.given}`, () => {
        const document: Document = parser.parseFromString(t.data, 'text/xml');
        const commandNode = xp.select(
          '/Application/Cli/Commands/Command[@name="test"]',
            document, true) as Node;

        if (commandNode) {
          const converter = new Impl();
          expect(() => {
            converter.build(commandNode, testParseInfo);
          }).to.throw();
        } else {
          assert.fail("Couldn't get test command");
        }
      });
    });
  });
});
