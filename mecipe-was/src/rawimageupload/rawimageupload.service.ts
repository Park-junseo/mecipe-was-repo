import { ForbiddenException, Injectable } from '@nestjs/common';
import { RawImageDescriptionData } from './dto/rawimageupload.dto';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { getAppDirectory } from 'src/util/getAppDirectory';

@Injectable()
export class RawimageuploadService {

    uploadImage(
        images: Express.Multer.File[] | undefined,
        thumbnails: Express.Multer.File[] | undefined,
    ) {
        if (!images) throw new ForbiddenException("Error: Not Found Images")

        if (thumbnails && thumbnails.length > 0 && thumbnails.length !== images.length) {
            throw new ForbiddenException("Error: Thumbnail is provided, but not enough images")
        }

        let result: RawImageDescriptionData[] = [];

        for (let i = 0; i < images.length; i++) {
            result.push({
                url: images[i].path,
                thumbnailUrl: thumbnails ? thumbnails[i].path : undefined
            })
        }

        return result

    }

    async deletImageByUrl(url: string) {

        console.log("deletImageByUrl", join(getAppDirectory(), url));
        if (url) rmSync(join(getAppDirectory(), url));
        return true;
    }

    async deletImageByUrlList(urlList: string[]) {

        if (urlList) urlList.forEach(url => {
            if (url) {
                console.log("deletImageByUrlList", join(getAppDirectory(), url));
                rmSync(join(getAppDirectory(), url))
            }
        });
        return true;
    }

    async validUploadUrl(url: string) {
        const valid = existsSync(join(getAppDirectory(), url));

        if (!valid) throw new ForbiddenException("Error: Invalid Image: " + url);

        return valid;
    }
}
