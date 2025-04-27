const Config = {
  PROJECT_URL: process.env.PROJECT_URL || "https://pixpro.app/api",
  PROJECT_SAVE_URL: process.env.PROJECT_SAVE_URL || "https://ai.pixpro.app/api",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "pixpro",
  AWS_S3_REGION: process.env.AWS_S3_REGION || "ap-south-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "AKIATCSDVGINNWYMFXSA",
  AWS_SECRET_ACCESS_KEY:
    process.env.AWS_SECRET_ACCESS_KEY ||
    "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",
  API_KEY:
    process.env.API_KEY || "adfljhsdgofsahgalsdfjasadssaflkadnfgasldfsadf",
};

export default Config;
