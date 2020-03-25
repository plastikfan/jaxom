
import { expect, use } from 'chai';
import * as utils from '../../lib/utils/utils';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import sinonChai = require('sinon-chai');
use(sinonChai);

describe('prop', () => {
  const container = { colour: 'blue', quantity: 2, checked: true, children: ['a', 'b', 'c'] };
  const tests = [
    {
      given: 'requested string property exists',
      should: 'return the value of the string property requested',
      property: 'colour',
      expected: 'blue'
    },
    {
      given: 'requested string property does not exist',
      should: 'return empty string',
      property: 'category',
      expected: ''
    },
    //
    {
      given: 'requested number property exists',
      should: 'return the value of the number property requested',
      property: 'quantity',
      expected: 2
    },
    {
      given: 'requested boolean property exists',
      should: 'return the value of the boolean property requested',
      property: 'checked',
      expected: true
    },
    {
      given: 'requested array property exists',
      should: 'return the value of the array property requested',
      property: 'children',
      expected: ['a', 'b', 'c']
    }
  ];

  tests.forEach(t => {
    context(`given: ${t.given}`, () => {
      it(`should: ${t.should}`, () => {
        const result = utils.prop(t.property, container);
        expect(result).to.deep.equal(t.expected);
      });
    });
  });
});
