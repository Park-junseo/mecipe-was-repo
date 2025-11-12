import { GovermentType } from '../enums/goverment-type.interface';

export interface IRegionCategory {
  id: number;
  createdAt: Date;
  isDisable: boolean;
  name: string;
  govermentType: GovermentType;
}
