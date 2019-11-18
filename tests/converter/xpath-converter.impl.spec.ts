
import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import * as R from 'ramda';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
const parser = new DOMParser();
const { functify } = require('jinxed');
import * as types from '../../lib/types';
import * as Helpers from '../test-helpers';
import { Specs } from '../../lib/specs';

import { XpathConverterImpl as Impl, composeElementPath }
  from '../../lib/converter/xpath-converter.impl';

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

const testSpec: types.ISpec = Object.freeze({
  name: 'test-spec-with-attributes',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  attributes: {
    trim: true,
    coercion: {
      matchers: {
        primitives: ['number', 'boolean'],
        collection: {
          delim: ',',
          open: '!<type>[',
          close: ']',
          assoc: {
            delim: '=',
            keyType: 'string',
            valueType: 'string'
          }
        },
        date: {
          format: 'YYYY-MM-DD'
        },
        symbol: {
          prefix: '$',
          global: true
        },
        string: true
      }
    }
  },
  textNodes: {
    trim: true,
    coercion: {
      matchers: {
        primitives: ['number', 'boolean'],
        collection: {
          assoc: {
            delim: '=',
            keyType: 'string',
            valueType: 'string'
          }
        },
        date: {
          format: 'YYYY-MM-DD'
        },
        symbol: {
          prefix: '$',
          global: true
        },
        string: true
      }
    }
  }
});

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
        const converter = new Impl(Specs.attributesAsArray);
        const directoryNode: types.NullableNode = Helpers.selectElementNodeById(
          'Directory', 'name', 'archive', applicationNode);

        if (directoryNode) {
          const directory = converter.buildElement(directoryNode, testParseInfo);

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

describe('XpathConverterImpl.fetchSpecOption', () => {
  const localSpec = R.set(R.lensProp('name'), 'local-test-spec')(testSpec);
  const tests = [
    {
      given: 'fallback is true, "attributes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'attributes/coercion/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
          // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.equal(Specs.fallBack?.attributes?.coercion?.matchers?.collection?.assoc?.delim);
      }
    },
    {
      given: 'fallback is true, "attributes" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'attributes/coercion/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc', 'delim']),
        '|')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('|');
      }
    },
    {
      given: 'fallback is true, "textNodes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'textNodes/coercion/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['textNodes', 'coercion', 'matchers', 'collection', 'assoc']), {
          // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.equal(Specs.fallBack?.textNodes?.coercion?.matchers?.collection?.assoc?.delim);
      }
    },
    {
      given: 'fallback is true, "textNodes" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'textNodes/coercion/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['textNodes', 'coercion', 'matchers', 'collection', 'assoc', 'delim']),
        '|')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('|');
      }
    },
    {
      given: 'fallback is true, "labels/element" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'labels/element',
      fallback: true,
      spec: () => R.set(R.lensProp('labels'), {
        // no element here!
        descendants: '_children',
        text: '_text'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.equal(Specs.fallBack?.labels?.element);
      }
    },
    {
      given: 'fallback is true, "labels/element" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'labels/element',
      fallback: true,
      spec: () => R.set(R.lensPath(['labels', 'element']), '%')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('%');
      }
    },
    {
      given: 'fallback is false, "attributes" item missing from user spec',
      should: 'return nothing',
      path: 'attributes/coercion/matchers/collection/assoc/delim',
      fallback: false,
      spec: () => R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
        // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.be.undefined();
      }
    },
    {
      given: 'fallback is false, "textNodes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'textNodes/coercion/matchers/collection/assoc/delim',
      fallback: false,
      spec: () => R.set(R.lensPath(['textNodes', 'coercion', 'matchers', 'collection', 'assoc']), {
        // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.be.undefined();
      }
    }
  ];

  tests.forEach((t: any) => {
    context(`given: ${t.given}`, () => {
      it(`should: ${t.should}`, () => {
        const converter = new Impl(t.spec());
        const result = converter.fetchSpecOption(t.path, t.fallback);

        t.verify(result);
      });
    });
  });
}); // XpathConverterImpl.fetchSpecOption

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
      given: 'An intermediate element node',
      path: '/Application/Expressions[@name="content-expressions"]',
      expected: '/Application/Expressions'
    },
    {
      given: 'A leaf element node',
      path: '/Application/Expressions/Expression/Pattern[@eg="_"]',
      expected: '/Application/Expressions/Expression/Pattern'
    }
  ];

  tests.forEach((t: any) => {
    context(`given: ${t.given}`, () => {
      it(`should: return full path`, () => {
        const document: Document = parser.parseFromString(data, 'text/xml');
        const node: types.SelectResult = xp.select(t.path, document, true);

        if (node && node instanceof Node) {
          const result = composeElementPath(node);

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
