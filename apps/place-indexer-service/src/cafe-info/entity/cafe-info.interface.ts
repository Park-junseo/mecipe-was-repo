export interface ICafeInfo {
  createdAt: Date;
  isDisable: boolean;
  name: string;
  code: string | null;
  regionCategoryId: number;
  address: string;
  directions: string;
  businessNumber: string;
  ceoName: string;

  RegionCategory: IRegionCategory;
}

export interface IRegionCategory {
  id: number;
  createdAt: Date;
  isDisable: boolean;
  name: string;
  govermentType: GovermentType;
}

export const GovermentType = {
  SPECIAL_CITY: 'SPECIAL_CITY' as const,
  METROPOLITAN_CITY: 'METROPOLITAN_CITY' as const,
  SPECIAL_SELF_GOVERNING_CITY: 'SPECIAL_SELF_GOVERNING_CITY' as const,
  PROVINCE: 'PROVINCE' as const,
  SPECIAL_SELF_GOVERNING_PROVINCE: 'SPECIAL_SELF_GOVERNING_PROVINCE' as const,
  DISTRICT: 'DISTRICT' as const,
  CITY: 'CITY' as const,
  COUNTY: 'COUNTY' as const,
  TOWN: 'TOWN' as const,
  TOWNSHIP: 'TOWNSHIP' as const,
  NEIGHBORHOOD: 'NEIGHBORHOOD' as const,
  PLACENAME: 'PLACENAME' as const,
};

export type GovermentType = (typeof GovermentType)[keyof typeof GovermentType];
