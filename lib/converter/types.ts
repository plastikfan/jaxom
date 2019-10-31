
export interface IElementInfo {
  // 'id' is optional so that user can specify an object without an id for default
  //
  readonly id?: string;
  readonly recurse?: string;
  readonly discards?: ReadonlyArray<string>;
  readonly descendants?: {
    readonly by?: string;
    readonly throwIfCollision?: boolean;
    readonly throwIfMissing?: boolean;
  };
}

export interface IParseInfo {
  readonly elements: ReadonlyArray<IElementInfo>;
  readonly default?: IElementInfo;
}

export interface ISpec {
  labels?: {
    element?: string;
    descendants?: string;
    text?: string;
  };
  coercion?: {
    attributes?: {
      trim?: boolean,
      matchers?: {
        primitives?: ReadonlyArray<string>,
        collection?: {
          delim?: string,
          open?: string,
          close?: string,
          assoc?: {
            delim?: string,
            keyType?: string,
            valueType?: string
          }
        },
        date?: {
          format?: string
        },
        symbol?: {
          prefix?: string,
          global?: boolean
        },
        string?: boolean
      }
    },
    textNodes?: {
      trim?: boolean
    }
  };
}

export interface IConverter {
  // These 'any' types for nodes, should eventually have declarations written for them
  //
  buildElement(elementNode: Node, parentNode: Node, parseInfo: IParseInfo): any;
}

export interface IValidateSpecThrowIfMissingFn {
  (labelName: string, from: string, container: any): void;
}
