export type ImageUploadDirectResponse = {
  result: {
    id: string;
    uploadURL: string;
  };
  result_info: any | null;
  success: boolean;
  errors: any[];
  messages: any[];
};

export type ImageUploadCheckResponse = {
  result: {
    id: string;
    metadata: {
      key: string;
    };
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
    draft: boolean;
  };
  result_info: any | null;
  success: boolean;
  errors: any[];
  messages: any[];
};
