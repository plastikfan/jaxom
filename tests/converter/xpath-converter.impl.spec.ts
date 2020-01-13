
import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import sinonChai = require('sinon-chai');
use(sinonChai);

import * as R from 'ramda';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
const parser = new DOMParser();
import * as types from '../../lib/types';
import * as Helpers from '../test-helpers';
import * as utils from '../../lib/utils/utils';

import { XpathConverterImpl as Impl, composeElementPath }
  from '../../lib/converter/xpath-converter.impl';
import { SpecOptionService, Specs } from '../../lib/specService/spec-option-service.class';
import { functify } from 'jinxed';

const testParseInfo: types.IParseInfo = {
  elements: new Map<string, types.IElementInfo>([
    ['Command', {
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

describe('XpathConverterImpl.composeText', () => {
  context('given: a Pattern element with a single text child', () => {
    it('should: return the trimmed text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT">   SOME-RAW-TEXT   </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with a single CDATA section', () => {
    it('should: return CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT">   <![CDATA[   .SOME-CDATA-TEXT   ]]>   </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with a single text child followed by single CDATA section', () => {
    it('should: return raw text child concatenated with CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT"> SOME-RAW-TEXT <![CDATA[ .SOME-CDATA-TEXT ]]> </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with multiple CDATA sections and raw text sections', () => {
    it('should: return raw text child concatenated with CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT"> SOME-RAW-TEXT <![CDATA[ .SOME-CDATA-TEXT ]]> <![CDATA[ .SOME-MORE-CDATA-TEXT ]]></Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT.SOME-CDATA-TEXT.SOME-MORE-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with single CDATA section and child element', () => {
    it('should: return the CDATA text.', () => {
      const data = `<?xml version="1.0"?>
        <Application name="pez">
          <Expressions name="content-expressions">
            <Expression name="meta-prefix-expression">
              <Pattern eg="TEXT"><![CDATA[ .SOME-CDATA-TEXT ]]>
                <Dummy/>
              </Pattern>
            </Expression>
          </Expressions>
        </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with white space and trim disabled', () => {
    it('should: return the text untrimmed', () => {
      const data = `<?xml version="1.0"?>
        <Application name="pez">
          <Expressions name="content-expressions">
            <Expression name="meta-prefix-expression">
              <Pattern eg="TEXT"> .SOME-TEXT    <Dummy/></Pattern>
            </Expression>
          </Expressions>
        </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl(new SpecOptionService({
          name: 'trim-disabled-for-text-nodes-for-test',
          textNodes: {
            trim: false
          }
        }));
        const result = converter.composeText(patternNode);

        expect(result).to.equal(' .SOME-TEXT    ');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });
}); // XpathConverterImpl.composeText

describe('converter.impl.buildLocalAttributes', () => {
  function getAttributes (commands: any, commandName: string): [] {
    const children: { [key: string]: any } = R.prop('_children')(commands);

    // Assuming normalisation by "id" has occurred.
    //
    const command = children[commandName];

    if (command) {
      return command['_attributes'];
    }
    return [];
  }

  function findAttribute (attributes: [], attributeName: string): {} | undefined {
    return R.find((n: {}): boolean => R.has(attributeName, n))(attributes as Array<{}>);
  }

  function assertAttributesContains (attributes: [], contains: string[]): void {
    R.forEach((co: string) => {
      expect(R.find((n: {}): boolean => R.has(co, n))(attributes as Array<{}>)).to.not.be.undefined();
    })(contains);
  }

  function assertAttributesExcludes (attributes: [], excludes: string[]): void {
    R.forEach((ex: string) => {
      expect(R.find((n: {}): boolean => R.has(ex, n))(attributes as Array<{}>)).to.be.undefined();
    })(excludes);
  }

  context('attributes as array', () => {
    const parseInfo: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        ['Commands', {
          descendants: {
            id: 'name',
            by: 'index',
            throwIfCollision: false,
            throwIfMissing: false
          }
        }],
        ['Command', {
          id: 'name',
          recurse: 'inherits',
          discards: ['inherits', 'abstract']
        }]
      ])
    };

    context('given: a spec with coercion disabled', () => {
      it('should: extract attributes as an array', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Commands>
                <Command name="base-command" abstract="true"/>
              </Commands>
            </Cli>
          </Application>`;

        // const data_SHOULD_BE_CONVERTED_TO_THIS = {
        //   _: 'Commands',
        //   _children: {
        //     'base-command': {
        //       name: 'base-command',
        //       _attributes: [{ name: 'base-command' }],
        //       _: 'Command'
        //     }
        //   }
        // };

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);

        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService({
            name: 'attributes-as-array-spec-without-coercion-for-test',
            labels: {
              attributes: '_attributes',
              element: '_',
              descendants: '_children',
              text: '_text'
            }
          }));
          const commandsNode: types.SelectResult = xp.select('/Application/Cli/Commands', document, true);

          if (commandsNode instanceof Node) {
            const commands = converter.build(commandsNode, parseInfo);
            const attributes = getAttributes(commands, 'base-command');
            assertAttributesContains(attributes, ['name']);
            assertAttributesExcludes(attributes, ['abstract']);
          } else {
            assert.fail('Couldn\'t get Commands node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    }); // a spec with coercion disabled

    context('given: a spec with coercion enabled', () => {
      it('should: extract attributes as an array and coerce', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Commands>
                <Command name="base-command" abstract="true" max="10"/>
              </Commands>
            </Cli>
          </Application>`;

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);
        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService({
            name: 'attributes-as-array-spec-without-coercion-for-test',
            labels: {
              attributes: '_attributes',
              element: '_',
              descendants: '_children',
              text: '_text'
            },
            attributes: {
              coercion: { }
            }
          }));

          const commandsNode: types.SelectResult = xp.select('/Application/Cli/Commands', document, true);

          if (commandsNode instanceof Node) {
            const commands = converter.build(commandsNode, parseInfo);
            const attributes = getAttributes(commands, 'base-command');
            assertAttributesContains(attributes, ['name', 'max']);
            assertAttributesExcludes(attributes, ['abstract']);

            const maxAttribute: any = findAttribute(attributes, 'max');
            if (maxAttribute) {
              expect(R.prop('max')(maxAttribute)).to.equal(10);
            }
          } else {
            assert.fail('Couldn\'t get Commands node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    }); // a spec with coercion enabled

    context('given: a spec with trim disabled', () => {
      it('should: extract attributes as an array and coerce', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Commands>
                <Command name="base-command" abstract="true" kind=" async "/>
              </Commands>
            </Cli>
          </Application>`;

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);
        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService({
            name: 'attributes-as-array-spec-without-coercion-for-test',
            labels: {
              attributes: '_attributes',
              element: '_',
              descendants: '_children',
              text: '_text'
            },
            attributes: {
              trim: false
            }
          }));

          const commandsNode: types.SelectResult = xp.select('/Application/Cli/Commands', document, true);

          if (commandsNode instanceof Node) {
            const commands = converter.build(commandsNode, parseInfo);
            const attributes = getAttributes(commands, 'base-command');
            assertAttributesContains(attributes, ['name', 'kind']);

            const kindAttribute: any = findAttribute(attributes, 'kind');
            if (kindAttribute) {
              expect(R.prop('kind')(kindAttribute)).to.equal(' async ');
            }
          } else {
            assert.fail('Couldn\'t get Commands node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    });

    context('given: a spec with "attributes" label set', () => {
      it('should: populate attributes into array', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Directory name="archive"
              field="archive-location"
              date-modified="23 jun 2016"
              tags="front,back"
              category="hi-res"
              format="flac">
            </Directory>
          </Application>`;

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);

        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService(Specs.attributesAsArray));
          const directoryNode: types.NullableNode = Helpers.selectElementNodeById(
            'Directory', 'name', 'archive', applicationNode);

          if (directoryNode) {
            const directory = converter.build(directoryNode, testParseInfo);

            expect(R.has('_attributes')(directory));
            const attributes: string[] = R.prop('_attributes')(directory);
            const attributeKeys: string[] = R.reduce((acc: [], val: string): any => {
              return R.concat(acc, R.keys(val));
            }, [])(attributes);

            expect(R.all(at => R.includes(at, attributeKeys))(
              ['name', 'field', 'date-modified', 'tags', 'category', 'format'])).to.be.true();

          } else {
            assert.fail('Couldn\'t get Application node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    }); // a spec with "attributes" label set

    context('given: an abstract entity with child items', () => {
      it('should: extract attributes as an array', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Commands>
                <Command name="base-command" category="sync" abstract="true">
                  <AlphaChild rank="alpha"/>
                  <BetaChild rank="beta" label="red"/>
                </Command>
              </Commands>
            </Cli>
          </Application>`;

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);

        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService({
            name: 'attributes-as-array-spec-without-coercion-for-test',
            labels: {
              attributes: '_attributes',
              element: '_',
              descendants: '_children',
              text: '_text'
            }
          }));
          const commandsNode: types.SelectResult = xp.select('/Application/Cli/Commands', document, true);

          if (commandsNode instanceof Node) {
            const commands = converter.build(commandsNode, parseInfo);
            const children: { [key: string]: any } = R.prop('_children')(commands);
            const baseCommand = children['base-command'];
            const attributes = baseCommand['_attributes'];
            assertAttributesContains(attributes, ['name', 'category']);
            assertAttributesExcludes(attributes, ['abstract']);
          } else {
            assert.fail('Couldn\'t get Commands node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    }); // a spec with coercion disabled

    context('given: entity with own children that inherits from an abstract entity with child items', () => {
      it('should: extract attributes as an array', () => {
        // TODO: THIS TEST SHOULD GO INTO NORMALISER SUITE
      });
    });
  }); // attributes as array

  context('attributes as members', () => {
    context('given: coercion disabled', () => {
      it('should: extract attributes as an array un-coerced', () => {
        const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Cli>
              <Commands>
                <Command name="base-command" max="10" abstract="true"/>
              </Commands>
            </Cli>
          </Application>`;

        const parseInfo: types.IParseInfo = {
          elements: new Map<string, types.IElementInfo>([
            ['Commands', {
              descendants: {
                id: 'name',
                by: 'index'
              }
            }],
            ['Command', {
              id: 'name',
              recurse: 'inherits',
              discards: ['inherits', 'abstract']
            }]
          ])
        };

        const document: Document = parser.parseFromString(data, 'text/xml');
        const applicationNode: types.SelectResult = xp.select('/Application', document, true);

        if (applicationNode instanceof Node) {
          const converter = new Impl(new SpecOptionService({
            name: 'attributes-as-array-spec-without-coercion-for-test',
            labels: {
              element: '_',
              descendants: '_children',
              text: '_text'
            }
          }));
          const commandsNode: types.SelectResult = xp.select('/Application/Cli/Commands', document, true);
          if (commandsNode instanceof Node) {
            const commands = converter.build(commandsNode, parseInfo);
            const children: { [key: string]: any } = R.prop('_children')(commands);
            const baseCommand = children['base-command'];
            const result = R.prop('max')(baseCommand);
            expect(result).to.equal('10');
          } else {
            assert.fail('Couldn\'t get Commands node.');
          }
        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      });
    });
  });
}); // converter.impl.buildLocalAttributes

describe('composeElementPath', () => {
  const data = `<?xml version="1.0"?>
    <Application name="pez">
      <Expressions name="content-expressions">
        <Expression name="meta-prefix-expression">
          <Pattern eg="_"><![CDATA[SOME-TEXT]]></Pattern>
          <Pattern eg="cover" csv="meta-csv"/>
          <Pattern eg=".">MORE-TEXT-NO-CDATA</Pattern>
          <Pattern eg="media."><![CDATA[(media.)?]]></Pattern>
        </Expression>
      </Expressions>
    </Application>`;

  const tests = [
    {
      given: 'An intermediate element node WITH id',
      path: '/Application/Expressions[@name="content-expressions"]',
      id: 'name',
      expected: '/Application/Expressions[@name="content-expressions"]'
    },
    {
      given: 'A leaf element node WITH id',
      path: '/Application/Expressions/Expression/Pattern[@eg="_"]',
      id: 'eg',
      expected: '/Application/Expressions/Expression/Pattern[@eg="_"]'
    },
    {
      given: 'An intermediate element node without id',
      path: '/Application/Expressions[@name="content-expressions"]',
      id: '',
      expected: '/Application/Expressions'
    },
    {
      given: 'A leaf element node without id',
      path: '/Application/Expressions/Expression/Pattern[@eg="_"]',
      id: '',
      expected: '/Application/Expressions/Expression/Pattern'
    }
  ];

  tests.forEach((t: any) => {
    context(`given: ${t.given}`, () => {
      it(`should: return full path`, () => {
        const document: Document = parser.parseFromString(data, 'text/xml');
        const node: types.SelectResult = xp.select(t.path, document, true);

        if (node && node instanceof Node) {
          const result = composeElementPath(node, t.id);

          expect(result).to.equal(t.expected);
        } else {
          assert.fail('Invalid node type.');
        }
      });
    });
  });

  context('given: the Document node', () => {
    it('should: return empty string', () => {
      const document: Document = parser.parseFromString(data, 'text/xml');
      const result = composeElementPath(document);
      expect(result).to.equal('');
    });
  });

  context('given: a null node', () => {
    it('should: return root path', () => {
      const result = composeElementPath(null);
      expect(result).to.equal('/');
    });
  });
}); // composeElementPath

describe('utils.composeElementInfo', () => {
  let converter: Impl;
  beforeEach(() => {
    converter = new Impl();
  });

  context('IParseInfo without common or def', () => {
    const withoutCommonOrDefInfo: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        [
          'Command',
          {
            id: 'cmd',
            recurse: 'inherits',
            discards: ['inherits', 'abstract'],
            descendants: {
              by: 'index',
              throwIfCollision: false,
              throwIfMissing: false
            }
          }
        ]
      ])
    };

    context('given: named element IS present', () => {
      it('should: return named parse info', () => {
        const result = utils.composeElementInfo('Command', withoutCommonOrDefInfo);
        expect(result.id).to.equal('cmd');
      });
    });

    context('given: named element is NOT present', () => {
      it('should: return empty parse info', () => {
        const result = utils.composeElementInfo('Task', withoutCommonOrDefInfo);
        expect(result).to.deep.equal({});
      });
    });
  }); // IParseInfo without common or def

  context('IParseInfo with common', () => {
    const withCommonInfo: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        [ 'Command', { id: 'cmd' } ]
      ]),
      common: {
        id: 'common-id',
        recurse: 'inherits',
        discards: ['inherits', 'abstract'],
        descendants: {
          by: 'index',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }
    };

    context('given: named element IS present', () => {
      it('should: return named info merged with common', () => {
        const result = utils.composeElementInfo('Command', withCommonInfo);
        expect(result.id).to.equal('cmd');
        expect(result.recurse).to.equal('inherits');
      });
    });

    context('given: named element is NOT present', () => {
      it('should: return common info', () => {
        const result = utils.composeElementInfo('Task', withCommonInfo);
        expect(result.id).to.equal('common-id');
        expect(result.recurse).to.equal('inherits');
      });
    });
  }); // IParseInfo with common

  context('IParseInfo with def', () => {
    const withDefInfo: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        ['Command', { id: 'cmd' }]
      ]),
      def: {
        id: 'def-id',
        recurse: 'inherits',
        discards: ['inherits', 'abstract'],
        descendants: {
          by: 'index',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }
    };

    context('given: named element IS present', () => {
      it('should: return named info', () => {
        const result = utils.composeElementInfo('Command', withDefInfo);
        expect(result.id).to.equal('cmd');
        expect(result.recurse).to.be.undefined();
      });
    });

    context('given: named element is NOT present', () => {
      it('should: return def info', () => {
        const result = utils.composeElementInfo('Task', withDefInfo);
        expect(result.id).to.equal('def-id');
        expect(result.recurse).to.equal('inherits');
      });
    });
  }); // IParseInfo with def

  context('IParseInfo with common and def', () => {
    const withCommonAndDefInfo: types.IParseInfo = {
      elements: new Map<string, types.IElementInfo>([
        ['Command', { id: 'cmd' }]
      ]),
      common: {
        id: 'common-id',
        recurse: 'from',
        discards: ['from', 'abstract'],
        descendants: {
          by: 'group'
        }
      },
      def: {
        id: 'def-id',
        recurse: 'inherits',
        discards: ['inherits', 'abstract'],
        descendants: {
          by: 'index',
          throwIfCollision: false,
          throwIfMissing: false
        }
      }
    };

    context('given: named element IS present', () => {
      it('should: return named info', () => {
        const result = utils.composeElementInfo('Command', withCommonAndDefInfo);
        expect(result.id).to.equal('cmd');
        expect(result.recurse).to.equal('from');
        expect(result.descendants?.by).to.equal('group');
      });
    });

    context('given: named element is NOT present', () => {
      it('should: return def info', () => {
        const result = utils.composeElementInfo('Task', withCommonAndDefInfo);
        expect(result.id).to.equal('def-id');
        expect(result.recurse).to.equal('inherits');
        expect(result.descendants?.by).to.equal('index');
      });
    });
  }); // IParseInfo with common and def
}); // utils.composeElementInfo

describe('XpathConverterImpl', () => {
  context('given: a custom spec', () => {
    it('should: be constructed ok', () => {
      const stub = new SpecOptionService();
      const converter = new Impl(stub);
      expect(converter).to.not.be.undefined();
    });
  });
}); // XpathConverterImpl
