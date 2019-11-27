import { functify } from 'jinxed';
import * as R from 'ramda';
import * as e from '../exceptions';
import * as types from '../types';

/**
 * @export
 * @class Normaliser
 * @description: Handles normalisation characteristics of an element's direct descendants.
 */
export class Normaliser {

  constructor (private options: types.ISpecService) {}

  /**
   * @method combineDescendants
   * @description: Elements that inherit properties from other parent elements will result
   * in properties of the same type (either attributes or other elements) being appearing
   * in multiple separate collections. For ease of use, this method will collate elements
   * of the same type into the same collection. See documentation and tests for more
   * information. Note, this method is only appropriate to be used on any elements that
   * are NOT abstract and do inherit from other elements.
   *
   * @param {string} subject
   * @param {*} parentElement: The element whose inherited descendants need to be combined.
   * @returns {{}}
   * @memberof Normaliser
   */
  combineDescendants (subject: string, parentElement: any): {} {
    const elementLabel = this.options.fetchOption('labels/element');

    if (elementLabel && R.is(String, elementLabel)) {
      const descendantsLabel = this.options.fetchOption('labels/descendants');

      if (descendantsLabel && R.is(String, descendantsLabel)) {

        if (R.has(descendantsLabel, parentElement)) {
          const groupByElement = R.groupBy((child: any): any => {
            return child[elementLabel];
          });

          const reduceByChildren = R.reduce((acc: [], value: []): any => {
            const descendants = value[descendantsLabel];
            return R.is(Array, descendants) ? R.concat(acc, descendants) : R.append(value, acc);
          }, []);

          let combined: any = R.omit([descendantsLabel], parentElement);

          const children: [] = parentElement[descendantsLabel];
          const renameGroupByElementChildrenObj = groupByElement(children);
          let adaptedChildren: any = {};

          R.forEachObjIndexed((value: [], key: string) => {
            adaptedChildren[key] = reduceByChildren(value);
          }, renameGroupByElementChildrenObj);

          // Now punch in the new children
          //
          combined[descendantsLabel] = adaptedChildren;
          return combined;
        } else {
          return parentElement;
        }
      } else {
        throw new e.JaxInternalError(`options spec missing descendants label [at: ${subject}]`,
          'Normaliser.combineDescendants');
      }
    } else {
      throw new e.JaxInternalError(`options spec missing element label [at: ${subject}]`,
        'Normaliser.combineDescendants');
    }
  } // combineDescendants
} // Normaliser
