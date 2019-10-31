
import { expect, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);

// https://journal.artfuldev.com/unit-testing-node-applications-with-typescript-using-mocha-and-chai-384ef05f32b2
// https://blog.atomist.com/typescript-imports/
//
describe('object under test', () => {
  context('the context', () => {
    it('dummy', () => {
      expect(1).to.equal(1, '*** Argh!!!');
    });
  });
});
