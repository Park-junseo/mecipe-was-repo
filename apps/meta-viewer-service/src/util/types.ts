export type Override<TYPE, SUBJECT> = Omit<TYPE, keyof SUBJECT> & SUBJECT;

type PrimitiveKeys<TYPE> = {
  [P in keyof TYPE]: TYPE[P] extends Record<string, unknown> ? never : P;
}[keyof TYPE];
export type PrimitiveOnly<TYPE> = Pick<TYPE, PrimitiveKeys<TYPE>>;

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type RequiredKeys<TYPE, KEYS extends keyof TYPE> =
  Omit<TYPE, KEYS> & Required<Pick<TYPE, KEYS>>;

export type FilteredOnlyRequired<T> = {
  [K in keyof T as T[K] extends null | undefined ? never :K]: T[K]
}