//
// Note: setting the prototype explicitly when extending built-in classes is a
// Microsoft recommendation.
// See: https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
//

export class JaxConfigError extends Error {
  constructor (message: string, elementPath: string) {
    super(`${message} at: '${elementPath}'`)/* istanbul ignore next: istanbul coverage issue #690 */;

    Object.setPrototypeOf(this, JaxConfigError.prototype);
  }
}

export class JaxParseError extends Error {
  constructor (message: string, elementPath: string) {
    super(`${message} at: '${elementPath}'`)/* istanbul ignore next: istanbul coverage issue #690 */;

    Object.setPrototypeOf(this, JaxParseError.prototype);
  }
}

export class JaxInternalError extends Error {
  constructor (message: string, private fnName: string) {
    super(`['${fnName}']: ${message}`)/* istanbul ignore next: istanbul coverage issue #690 */;

    Object.setPrototypeOf(this, JaxInternalError.prototype);
  }
}

export class JaxSolicitedError extends Error {
  constructor (message: string, elementPath: string) {
    super(`${message} at: '${elementPath}'`)/* istanbul ignore next: istanbul coverage issue #690 */;

    Object.setPrototypeOf(this, JaxSolicitedError.prototype);
  }
}

export class JaxSpecValidationError extends Error {
  constructor (reason: string, specName: string, val: string, configPath: string) {
    super(`spec named: ${specName} failed validation at: "${configPath}", with: "${val}" (${reason})`)/* istanbul ignore next: istanbul coverage issue #690 */;

    Object.setPrototypeOf(this, JaxSpecValidationError.prototype);
  }
}
