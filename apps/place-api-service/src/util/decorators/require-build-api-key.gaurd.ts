import { SetMetadata } from "@nestjs/common";

export const BUILD_API_KEY_META = 'buildApiKey';

export const RequireBuildApiKey = () => SetMetadata(BUILD_API_KEY_META, true);
