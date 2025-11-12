import type {
  MappingProperty,
  MappingTypeMapping,
  MappingNestedProperty,
  MappingObjectProperty,
} from '@elastic/elasticsearch/lib/api/types';

type StringFieldType =
  | 'keyword'
  | 'text'
  | 'match_only_text'
  | 'search_as_you_type'
  | 'wildcard'
  | 'completion'
  | 'constant_keyword'
  | 'counted_keyword'
  | 'version';

type NumberFieldType =
  | 'integer'
  | 'long'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float'
  | 'unsigned_long'
  | 'rank_feature'
  | 'rank_features';

type BooleanFieldType = 'boolean';

type DateFieldType = 'date' | 'date_nanos';

type GeoPointFieldType = 'geo_point';

type GeoShapeFieldType = 'geo_shape' | 'point' | 'cartesian_point';

type IpFieldType = 'ip';

type FlattenedFieldType = 'flattened';

type MappingWithChildProperties = {
  properties: Record<string, MappingProperty>;
};

type PropertyTypeName<P extends MappingProperty> = P extends {
  type: infer T extends string;
}
  ? T
  : never;

type GeoPointValue =
  | { lat: number; lon: number }
  | [number, number]
  | { x: number; y: number }
  | string;

type InferObjectShape<P extends MappingProperty> = P extends {
  properties: infer Props extends Record<string, MappingProperty>;
}
  ? { [K in keyof Props]: InferMappingProperty<Props[K]> }
  : Record<string, unknown>;

type InferNestedShape<P extends MappingNestedProperty> = Array<
  InferObjectShape<P>
>;

type InferMappingProperty<P extends MappingProperty> = Nullable<
  CorePropertyValue<P>
>;

type CorePropertyValue<P extends MappingProperty> =
  P extends MappingNestedProperty
    ? InferNestedShape<P>
    : CorePropertyValueNonNested<P>;

type CorePropertyValueNonNested<P extends MappingProperty> =
  P extends MappingObjectProperty
    ? InferObjectShape<P>
    : CorePropertyValueWithChildren<P>;

type CorePropertyValueWithChildren<P extends MappingProperty> =
  P extends MappingWithChildProperties
    ? InferObjectShape<P>
    : PrimitivePropertyValue<P>;

type PrimitivePropertyValue<P extends MappingProperty> =
  PropertyTypeName<P> extends StringFieldType
    ? string
    : PropertyTypeName<P> extends NumberFieldType
      ? number
      : PropertyTypeName<P> extends BooleanFieldType
        ? boolean
        : PropertyTypeName<P> extends DateFieldType
          ? string
          : PropertyTypeName<P> extends GeoPointFieldType
            ? GeoPointValue
            : PropertyTypeName<P> extends GeoShapeFieldType
              ? Record<string, unknown>
              : PropertyTypeName<P> extends IpFieldType
                ? string
                : PropertyTypeName<P> extends FlattenedFieldType
                  ? Record<string, unknown>
                  : unknown;

type Nullable<TValue> = TValue | null | undefined;

export type InferMappingDocument<TMapping extends MappingTypeMapping> =
  TMapping['properties'] extends Record<string, MappingProperty>
    ? {
        [K in keyof TMapping['properties']]: InferMappingProperty<
          TMapping['properties'][K]
        >;
      }
    : Record<string, unknown>;

export type InferPropertiesShape<TMapping extends MappingTypeMapping> =
  TMapping['properties'] extends Record<string, MappingProperty>
    ? {
        [K in keyof TMapping['properties']]: InferMappingProperty<
          TMapping['properties'][K]
        >;
      }
    : Record<string, unknown>;

export type InferProperty<TProperty extends MappingProperty> =
  InferMappingProperty<TProperty>;
