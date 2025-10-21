export type Override<TYPE, SUBJECT> = Omit<TYPE, keyof SUBJECT> & SUBJECT;

type PrimitiveKeys<TYPE> = {
  [P in keyof TYPE]: TYPE[P] extends object ? never : P;
}[keyof TYPE];
export type PrimitiveOnly<TYPE> = Pick<TYPE, PrimitiveKeys<TYPE>>;

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
