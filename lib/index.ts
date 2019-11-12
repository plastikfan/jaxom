
//  comment/ <reference path="./declarations.d.ts" />
import jinxed = require('jinxed');

const TestObject: any = {
  name: 'dvorak',
  occ: 'watchman'
};

console.log('jaxom: ', jinxed.functify(TestObject));
