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
  constructor (private options: types.ISpecService) { }

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
    if (R.has(this.options.descendantsLabel, parentElement)) {
      const groupByElement = R.groupBy((child: any): any => {
        return child[this.options.elementLabel];
      });

      const reduceByChildren = R.reduce((acc: [], value: any): any => {
        const descendants = value[this.options.descendantsLabel];
        return R.is(Array, descendants) ? R.concat(acc, descendants) : R.append(value, acc);
      }, []);

      const combined: any = R.omit([this.options.descendantsLabel], parentElement);

      const children: [] = parentElement[this.options.descendantsLabel];
      const renameGroupByElementChildrenObj = groupByElement(children);
      let adaptedChildren: any = {};

      R.forEachObjIndexed((value: [], key: string) => {
        adaptedChildren[key] = reduceByChildren(value);
      }, renameGroupByElementChildrenObj);

      // Now punch in the new children
      //
      combined[this.options.descendantsLabel] = adaptedChildren;
      return combined;
    } else {
      return parentElement;
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
    const descendants: Array<{}> = parentElement[this.options.descendantsLabel];

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
          }

          // Now punch in the new normalised descendants
          //
          const normalised = parentElement;
          normalised[this.options.descendantsLabel] = normalisedDescendants;
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

    return parentElement;
  } // normaliseDescendants

  /**
   * @method mergeDescendants
   * @description This method is required by the converter when an element inherits others
   * which may in turn have there own children (not attributes). When this happens, the
   * inherited element(s) may already be in normalised form (an object with a key (the id) which
   * maps to the child element) and so can not be combined with local's (the element currently
   * being built) child elements because they haven't been normalised yet and are represented
   * as an object not an array. The solution is denormalise the inherited elements which will
   * then subsequently be renormalised along with the local's children at the same time. The
   * denormalisation happens by iterating the inherited children (object) and attaching those
   * children to the local element's children array.
   *
   * @param {[]} local
   * @param {types.Descendants} inherited
   * @returns {any[]}
   * @memberof Normaliser
   */
  public mergeDescendants (local: [], inherited: types.Descendants): any[] {
    // local descendants has not been normalised yet so it's safe to assume its an array
    //
    if (R.is(Object)(inherited)) {
      // denormalise inherited
      //
      return R.reduce((acc: any[], pair: [string, string]): any[] => {
        const pairValue = pair[1];
        return R.append(pairValue, acc);
      }, local)(R.toPairs(inherited));
    }

    return R.concat(local, R.prop(this.options.descendantsLabel)(inherited));
  }
} // Normaliser
