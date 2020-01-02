
import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
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
}); // XpathConverterImpl.composeText

describe('converter.impl.buildLocalAttributes', () => {
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

      if (applicationNode && applicationNode instanceof Node) {
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
