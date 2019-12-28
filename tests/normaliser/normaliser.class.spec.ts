/// <reference types="../../lib/declarations" />

import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import sinonChai = require('sinon-chai');
use(sinonChai);
import * as R from 'ramda';
import * as xp from 'xpath-ts';
import * as types from '../../lib/types';
import { XpathConverterImpl as Impl } from '../../lib/converter/xpath-converter.impl';
import { functify } from 'jinxed';
const parser = new DOMParser();

describe('Normaliser.combine', () => {
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
      discards: ['inherits', 'abstract']
    },
    def: {
      descendants: {
        by: 'index',
        throwIfCollision: false,
        throwIfMissing: false
      }
    }
  };

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
    context(`given: ${t.given}`, () => {
      it('should: throw', () => {
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
}); // Normaliser.combine

describe('Normaliser.normalise', () => {
  const byIndexParseInfo: types.IParseInfo = {
    elements: new Map<string, types.IElementInfo>([
      ['Arguments', {
        descendants: {
          by: 'index',
          id: 'name',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }],
      ['Argument', {
        id: 'name'
      }]
    ])
  };
  const byGroupParseInfo: types.IParseInfo = {
    elements: new Map<string, types.IElementInfo>([
      ['Arguments', {
        descendants: {
          by: 'group',
          id: 'name',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }],
      ['Argument', {
        id: 'name'
      }]
    ])
  };
  const byIndexParseInfoWithParam: types.IParseInfo = {
    elements: new Map<string, types.IElementInfo>([
      ['Arguments', {
        descendants: {
          by: 'index',
          id: 'name',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }],
      ['Argument', {
        id: 'name'
      }],
      ['Parameter', {
        id: 'name'
      }]
    ])
  };
  const byGroupParseInfoWithParam: types.IParseInfo = {
    elements: new Map<string, types.IElementInfo>([
      ['Arguments', {
        descendants: {
          by: 'group',
          id: 'name',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }],
      ['Argument', {
        id: 'name'
      }],
      ['Parameter', {
        id: 'name'
      }]
    ])
  };

  context('Normaliser.normalise no throw', () => {
    interface IUnitTestInfo {
      given: string;
      should: string;
      parseInfo: () => types.IParseInfo;
      data: string;
      query: string;
      verify: (children: any) => void;
    }

    const tests: IUnitTestInfo[] = [
      // by index
      {
        given: 'single child element without recurse attribute, normalise by index',
        should: 'normalise by index',
        parseInfo: () => byIndexParseInfo,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          const argumentName = 'director';
          const directorArg: any = children[argumentName];
          //
          // const NORMALISED_BY_INDEX_ARGS = {
          //   '_': 'Arguments',
          //   '_children': {
          //     'director': {
          //       'name': 'director',
          //       'alias': 'dn',
          //       'optional': true,
          //       'describe': 'Director name',
          //       '_': 'Argument'
          //     }
          //   }
          // };
          //
          const result: boolean = R.whereEq({
            _: 'Argument',
            name: 'director',
            alias: 'dn',
            optional: true,
            describe: 'Director name'
          })(directorArg);
          expect(result).to.be.true(functify(directorArg));
        }
      },
      {
        given: 'multiple child elements of same type without recurse attribute, normalise by index',
        should: 'normalise by index',
        parseInfo: () => byIndexParseInfo,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Argument name="genre" alias="gn" optional="true"
                  describe="Genre name">
                </Argument>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          const paramName = 'genre';
          const genreArg: any = children[paramName];
          const result: boolean = R.whereEq({
            _: 'Argument',
            name: 'genre',
            alias: 'gn',
            optional: true,
            describe: 'Genre name'
          })(genreArg);
          expect(result).to.be.true(functify(genreArg));
        }
      },
      {
        given: 'multiple child elements of different types without recurse attribute, normalise by index',
        should: 'normalise by index',
        parseInfo: () => byIndexParseInfoWithParam,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter name="genre" alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          const paramName = 'genre';
          const genreParam: any = children[paramName];
          const result: boolean = R.whereEq({
            _: 'Parameter',
            name: 'genre',
            alias: 'gn',
            optional: true,
            describe: 'Genre name'
          })(genreParam);
          expect(result).to.be.true(functify(genreParam));
        }
      },
      {
        given: 'multiple child elements of different types without recurse attribute, missing id, no throw',
        should: 'not normalise',
        parseInfo: () => byIndexParseInfoWithParam,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.be.true(functify(children));
        }
      },
      // group by
      {
        given: 'single child element without recurse attribute, normalise by group',
        should: 'normalise by group',
        parseInfo: () => byGroupParseInfo,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          const argumentName = 'director';
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          const directorArr: any = children[argumentName];
          expect(R.is(Array)(directorArr)).to.be.true(functify(children));
          const firstDirector = R.head(directorArr);
          const result: boolean = R.whereEq({
            _: 'Argument',
            name: 'director',
            alias: 'dn',
            optional: true,
            describe: 'Director name'
          })(firstDirector);
          expect(result).to.be.true(functify(firstDirector));
        }
      },
      {
        given: 'multiple child elements of same type without recurse attribute, normalise by group',
        should: 'normalise by group',
        parseInfo: () => byGroupParseInfo,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Argument name="director" alias="gn" optional="true"
                  describe="Genre name">
                </Argument>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          const argumentName = 'director';
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          const directorArr: any = children[argumentName];
          expect(R.is(Array)(directorArr)).to.be.true(functify(children));
          const secondDirector = directorArr[1];
          const result: boolean = R.whereEq({
            _: 'Argument',
            name: 'director',
            alias: 'gn',
            optional: true,
            describe: 'Genre name'
          })(secondDirector);
          expect(result).to.be.true(functify(secondDirector));
        }
      },
      {
        given: 'multiple child elements of different types without recurse attribute, normalise by group',
        should: 'should: normalise by group',
        parseInfo: () => byGroupParseInfoWithParam,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter name="genre" alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.not.be.true(functify(children));
          {
            const namedDirector = 'director';
            const directorArr: any = children[namedDirector];
            expect(R.is(Array)(directorArr)).to.be.true(functify(children));
            const firstDirector = R.head(directorArr);
            const directorResult: boolean = R.whereEq({
              _: 'Argument',
              name: 'director',
              alias: 'dn',
              optional: true,
              describe: 'Director name'
            })(firstDirector);
            expect(directorResult).to.be.true(functify(firstDirector));
          }

          {
            const namedGenre = 'genre';
            const genreArr: any = children[namedGenre];
            expect(R.is(Array)(genreArr)).to.be.true(functify(children));
            const firstGenre = R.head(genreArr);
            const genreResult: boolean = R.whereEq({
              _: 'Parameter',
              name: 'genre',
              alias: 'gn',
              optional: true,
              describe: 'Genre name'
            })(firstGenre);
            expect(genreResult).to.be.true(functify(firstGenre));
          }
        }
      },
      {
        given: 'multiple child elements of different types without recurse attribute, missing id, no throw',
        should: 'should: not normalise',
        parseInfo: () => byGroupParseInfoWithParam,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments',
        verify: (children: any): void => {
          expect(R.is(Array)(children)).to.be.true(functify(children));
        }
      }
    ];

    tests.forEach((t: IUnitTestInfo) => {
      context(`given: ${t.given}`, () => {
        it(`should: ${t.should}`, () => {
          const document: Document = parser.parseFromString(t.data, 'text/xml');
          const selectedNode = xp.select(t.query, document, true) as Node;

          if (selectedNode instanceof Node) {
            const converter = new Impl();
            const buildResult = converter.build(selectedNode, t.parseInfo());
            const children: { [key: string]: any } = R.prop('_children')(buildResult);
            t.verify(children);
          } else {
            assert.fail('Couldn\'t get selected node');
          }
        });
      });
    });
  }); // Normaliser.normalise no throw

  context('error handling', () => {
    const byIndexParseInfoWithParamThrows: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        ['Arguments', {
          descendants: {
            by: 'index',
            id: 'name',
            throwIfCollision: true,
            throwIfMissing: true
          }
        }],
        ['Argument', {
          id: 'name'
        }],
        ['Parameter', {
          id: 'name'
        }]
      ])
    };

    const byGroupParseInfoWithParamThrows: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        ['Arguments', {
          descendants: {
            by: 'group',
            id: 'name',
            throwIfCollision: true,
            throwIfMissing: true
          }
        }],
        ['Argument', {
          id: 'name'
        }],
        ['Parameter', {
          id: 'name'
        }]
      ])
    };

    interface IUnitTestInfo {
      given: string;
      should: string;
      parseInfo: () => types.IParseInfo;
      data: string;
      query: string;
    }

    const tests: IUnitTestInfo[] = [
      {
        given: 'multiple child elements of different types without recurse attribute, missing id, by index, with throw',
        should: 'should: throw',
        parseInfo: () => byIndexParseInfoWithParamThrows,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments'
      },
      {
        given: 'multiple child elements of different types without recurse attribute, missing id, by group, with throw',
        should: 'should: throw',
        parseInfo: () => byGroupParseInfoWithParamThrows,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments'
      },
      {
        given: 'multiple child elements of same type without recurse attribute, colliding id, by index, with throw',
        should: 'should: throw',
        parseInfo: () => byIndexParseInfoWithParamThrows,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Argument name="director" alias="gn" optional="true"
                  describe="Genre name">
                </Argument>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments'
      },
      {
        given: 'multiple child elements of different types without recurse attribute, colliding id, by index, with throw',
        should: 'should: throw',
        parseInfo: () => byIndexParseInfoWithParamThrows,
        data: `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Arguments>
                <Argument name="director" alias="dn" optional="true"
                  describe="Director name">
                </Argument>
                <Parameter name="director" alias="gn" optional="true"
                  describe="Genre name">
                </Parameter>
              </Arguments>
            </Cli>
          </Application>`,
        query: '/Application/Cli/Arguments'
      }
    ];

    tests.forEach((t: IUnitTestInfo) => {
      context(`given: ${t.given}`, () => {
        it(`should: ${t.should}`, () => {
          const document: Document = parser.parseFromString(t.data, 'text/xml');
          const selectedNode = xp.select(t.query, document, true) as Node;

          if (selectedNode instanceof Node) {
            const converter = new Impl();
            expect(() => {
              converter.build(selectedNode, t.parseInfo());
            }).to.throw();
          } else {
            assert.fail('Couldn\'t get selected node');
          }
        });
      });
    });
  }); // error handling
}); // Normaliser.normalise
