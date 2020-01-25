import { functify } from 'jinxed';
import * as R from 'ramda';
import * as e from '../exceptions';
import * as types from '../types';
import * as utils from '../utils/utils';

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
   * are NOT abstract and inherit from other elements.
   *
   * @param {string} subject
   * @param {*} parentElement: The element whose inherited descendants need to be combined.
   * @returns {{}}
   * @memberof Normaliser
   */

  public combineDescendants (subject: string, parentElement: any,
    parseInfo: types.IParseInfo): any {
    const self = this;
    const children: [] = parentElement[this.options.descendantsLabel];

    const combined = R.reduce((acc: any[], current: any): any => {
      // All elements el & value have elementLabel property
      //
      const foundIndex = R.findIndex((el: any): boolean => {
        return (
          el[self.options.elementLabel] === current[self.options.elementLabel]
        );
      })(acc);

      if (foundIndex === -1) {
        return R.append(current, acc);
      }

      const found: any = acc[foundIndex];
      const foundElementInfo = utils.composeElementInfo(
        found[self.options.elementLabel], parseInfo);

      if (current[self.options.descendantsLabel] && found[self.options.descendantsLabel]) {
        const currentChildren: any[] = R.is(Array)(current[self.options.descendantsLabel])
          ? current[self.options.descendantsLabel]
          : R.values(current[self.options.descendantsLabel]);

        const foundChildren: any[] = R.is(Array)(found[self.options.descendantsLabel])
          ? found[self.options.descendantsLabel]
          : R.values(found[self.options.descendantsLabel]);

        if (R.is(Array)(current[self.options.descendantsLabel]) ===
          R.is(Array)(found[self.options.descendantsLabel])) {

          const id = foundElementInfo.descendants?.id;
          const clash = (id)
            ? this.clashingIds(id, currentChildren, foundChildren)
            : this.clashingKeys(currentChildren, foundChildren);

          if (!clash) {
            const mergedChildren = R.is(Array)(found[self.options.descendantsLabel])
              ? R.union(foundChildren, currentChildren)
              : R.mergeDeepLeft(found[self.options.descendantsLabel],
                current[self.options.descendantsLabel]);
            found[self.options.descendantsLabel] = mergedChildren;
            return acc;
          }
        }
      }

      // If we return here, we simply add "current" unmodified
      //
      return R.append(current, acc);
    }, [])(children);

    // Now punch in the new children
    //
    parentElement[this.options.descendantsLabel] = combined;
    return parentElement;
  } // combineDescendants

  /**
   * @method clashingIds
   * @description Given an id and the arrays of child objects of 2 parents, determines
   * that both collections contain all child objects that all contain id as a member property
   * and also that this id property is unique. This is usd as a guard against improperly
   * merging child collections.
   *
   * @private
   * @param {string} id
   * @param {any[]} first
   * @param {any[]} second
   * @returns {boolean}
   * @memberof Normaliser
   */
  private clashingIds (id: string, first: any[], second: any[]): boolean {
    const allContainId = R.all((o: any): boolean => id in o);
    const pluckIds = R.pluck(id);
    const foundClash = !(allContainId(first) && allContainId(second)
      && R.intersection(pluckIds(first), pluckIds(second)).length === 0);
    return foundClash;
  }

  /**
   * @method clashingKeys
   * @description Given 2 collections that each represent the children of 2 parents, determines
   * that both collections do not contain any common keys. Used as a guard again attempting
   * to combine to map objects that contain common keys.
   *
   * @private
   * @param {types.IndexableObjByStr} first
   * @param {types.IndexableObjByStr} second
   * @returns {boolean}
   * @memberof Normaliser
   */
  private clashingKeys (first: types.IndexableObjByStr, second: types.IndexableObjByStr): boolean {
    const firstKeys = R.keys(first[this.options.descendantsLabel]);
    const secondKeys = R.keys(second[this.options.descendantsLabel]);
    const foundClash = R.intersection(firstKeys, secondKeys).length > 0;
    return foundClash;
  }

  /**
   * @method normaliseDescendants
   *
   * @param {string} subject
   * @param {*} parentElement
   * @param {types.IElementInfo} elementInfo
   * @returns {*} The parentElement with descendants that have been normalised
   * @memberof Normaliser
   */
  public normaliseDescendants (subject: string, parentElement: any, elementInfo: types.IElementInfo): any {
    const descendants: Array<{}> = parentElement[this.options.descendantsLabel];

    let normalisedDescendants;
    /* istanbul ignore next: normalisation can't be invoked without 'descendants.id' */
    const id: string = elementInfo?.descendants?.id ?? '';

    if (R.all(R.has(id))(descendants)) {
      /* istanbul ignore next: normalisation can't be invoked without 'descendants.by' */
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
    } else if /* istanbul ignore next */ (elementInfo?.descendants?.throwIfMissing) {
      const missing: any = R.find(
        R.complement(R.has(id))
      )(descendants) /* istanbul ignore next */ ?? {};
      throw new e.JaxSolicitedError(
        `Element is missing key attribute "${id}": (${functify(missing)})`,
        subject);
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
    /* istanbul ignore else */
    if (R.is(Object)(inherited)) {
      // denormalise inherited
      //
      return R.reduce((acc: any[], pair: [string, string]): any[] => {
        const pairValue = pair[1];
        return R.append(pairValue, acc);
      }, local)(R.toPairs(inherited));
    }

    /* istanbul ignore next */
    return R.concat(local, R.prop(this.options.descendantsLabel)(inherited));
  }
} // Normaliser
