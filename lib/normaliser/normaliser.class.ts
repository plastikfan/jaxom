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

  /**
   * @method normaliseDescendants
   *
   * @param {string} subject
   * @param {*} parentElement
   * @param {types.IElementInfo} elementInfo
   * @returns {*} The parentElement with descendants that have been normalised
   * @memberof Normaliser
   */
  normaliseDescendants (subject: string, parentElement: any, elementInfo: types.IElementInfo): any {
    const elementLabel = this.options.fetchOption('labels/element');

    if (elementLabel && R.is(String, elementLabel)) {
      const descendantsLabel = this.options.fetchOption('labels/descendants');

      if (descendantsLabel && R.is(String, descendantsLabel)) {
        const descendants: Array<{}> = parentElement[descendantsLabel];

        if (R.is(Array)(descendants)) { // descendants must be iterable
          let normalisedDescendants;
          const id: string = elementInfo?.descendants?.id ?? '';

          if (R.all(R.has(id))(descendants)) {
            if (R.hasPath(['descendants', 'by'], elementInfo)) {
              const lens = R.lensPath(['descendants', 'by']);
              const descendantsBy = R.view(lens)(elementInfo) as 'index' | 'group';

              switch (descendantsBy) {
                case 'index': {
                  if (elementInfo?.descendants?.throwIfMissing) {
                    // This reduce is only required because R.indexBy doesn't offer the ability to detect
                    // collisions (hence, that's why we're not interested in the return value.)
                    //
                    R.reduce((acc: any, val: any) => {
                      if (R.includes(val[id], acc)) {
                        throw new e.JaxSolicitedError(`Element collision found: ${functify(val)}`,
                          subject);
                      }
                      return R.append(val[id], acc);
                    }, [])(descendants);
                  }

                  normalisedDescendants = R.indexBy(R.prop(id), descendants);
                  break;
                }
                case 'group': {
                  normalisedDescendants = R.groupBy(R.prop(id), descendants);
                  break;
                }

                default: {
                  return parentElement;
                }
              }

              // Now punch in the new normalised descendants
              //
              const normalised = parentElement;
              normalised[descendantsLabel] = normalisedDescendants;
              return normalised;
            }
          } else if (elementInfo?.descendants?.throwIfMissing) {
            const missing: any = R.find(
              R.complement(R.has(id))
            )(descendants) ?? {};
            throw new e.JaxSolicitedError(
              `Element is missing key attribute "${id}": (${functify(missing)})`,
              subject);
          }
        }
      } else {
        throw new e.JaxInternalError(`options spec missing descendants label [at: ${subject}]`,
          'Normaliser.combineDescendants');
      }
    } else {
      throw new e.JaxInternalError(`options spec missing element label [at: ${subject}]`,
        'Normaliser.combineDescendants');
    }

    return parentElement;
  } // normaliseDescendants
} // Normaliser
