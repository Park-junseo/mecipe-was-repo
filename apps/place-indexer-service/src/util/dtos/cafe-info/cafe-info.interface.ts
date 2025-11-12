import { IRegionCategory } from '../region-category/region-category.interface';

export interface ICafeInfo {
  id: number;
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
