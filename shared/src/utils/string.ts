/**
 * Converts all keys of an object to string value types.
 */
export type Stringify<T extends object> = {
  [K in keyof T]: T[K] extends string | number | boolean ? string : T[K] extends object ? Stringify<T[K]> : never;
};
