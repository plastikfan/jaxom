
import { expect, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import * as R from 'ramda';
import 'xmldom-ts';
import * as types from '../../lib/types';
import { SpecOptionService, Specs } from '../../lib/specService/spec-option-service.class';

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

describe('SpecOptionService.fetchOption', () => {
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
        const converter = new SpecOptionService(t.spec());
        const result = converter.fetchOption(t.path, t.fallback);

        t.verify(result);
      });
    });
  });
}); // SpecOptionService.fetchSpecOption

describe('SpecOptionService.getSpec', () => {
  context('given: a constructed SpecOptionService', () => {
    it('should: be able to get the current spec', () => {
      const converter = new SpecOptionService();
      const spec: types.ISpec = converter.getSpec();
      expect(spec).to.not.be.undefined();
    });
  });
});
