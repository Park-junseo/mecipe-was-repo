import { ForbiddenException, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ImageuploadService {

    constructor() { }

    async directUploadURL() {
        const imageResponse: { data: ImageUploadDirectResponse } = await axios(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.SECRET_CLOUDFLARE_ID}/images/v2/direct_upload`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_CLOUDFLARE_API_TOKEN}`,
                },
            }
        );

        if (!imageResponse.data || imageResponse.data.success === false) throw new ForbiddenException(imageResponse.data.errors.join(","));

        return imageResponse.data.result.uploadURL;
    }

    async checkUploadURL(imageId: string) {
        const imageResponse: { data: ImageUploadCheckResponse } = await axios(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.SECRET_CLOUDFLARE_ID}/images/v1/${imageId}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_CLOUDFLARE_API_TOKEN}`,
                },
            }
        );

        if (!imageResponse.data || imageResponse.data.success === false) throw new ForbiddenException(imageResponse.data.errors.join(","));

        return imageResponse.data.result;
    }

    async deletImage(imageId: string) {
        const imageResponse: { data: any } = await axios(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.SECRET_CLOUDFLARE_ID}/images/v1/${imageId}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_CLOUDFLARE_API_TOKEN}`,
                },
            }
        );

        return imageResponse.data.success;
    }

    async deletImageByUrl(url: string) {
        const imageId = this.getImageId(url);

        const imageResponse: { data: any } = await axios(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.SECRET_CLOUDFLARE_ID}/images/v1/${imageId}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_CLOUDFLARE_API_TOKEN}`,
                },
            }
        );

        return imageResponse.data.success;
    }

    async validUploadUrl(url: string) {
        const imageId = this.getImageId(url);
        const valid = await this.checkUploadURL(imageId);

        if (!valid) throw new ForbiddenException("Error: Invalid Image: " + url);

        return valid;
    }

    getImageId(url: string) {
        const urlObj = new URL(url);
        const segments = urlObj.pathname.split('/').filter(Boolean); // 빈 문자열 제거
        return segments.length >= 2 ? segments[segments.length - 2] : null;

    }
}
