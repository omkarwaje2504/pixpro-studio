import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import Config from "../app/Config";
import { getItem } from "../Utils/indexedDbHelper";
import { extractDomainAndSlug } from "../app/Components/GenerateVideohelper";

const bucketName = Config.AWS_S3_BUCKET_NAME;
const awsRegion = Config.AWS_S3_REGION;
const accessKeyId = Config.AWS_ACCESS_KEY_ID;
const secretAccessKey = Config.AWS_SECRET_ACCESS_KEY;
const s3 = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function GenerateFilePath(fileName: string) {
  const projectInfo = await getItem("projectInfo");
  const employeeInfo = await getItem("employeeData");

  const monthData = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];

  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  if (!projectInfo) {
    throw new Error("project info not found");
  }

  const { subDomain, slug } = await extractDomainAndSlug(projectInfo?.web_link);
  return `production/photos/${year}/${monthData[month]}/${slug}/${employeeInfo.hash}/${fileName}`;
}

const UploadFile = async (imageData: Blob, fileName: string, type: string) => {
  const contentType =
    type === "image"
      ? "image/png"
      : type === "video"
      ? "video/mp4"
      : type === "audio"
      ? "audio/wav"
      : type === "pdf"
      ? "application/pdf"
      : null;

  if (contentType == null) {
    throw new Error("Unsupported file type");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials are not defined");
  }
  const filePath = await GenerateFilePath(fileName);

  let command: PutObjectCommand;

  if (contentType === "application/pdf") {
    command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${filePath}`,
      Body: imageData,
      ACL: "public-read",
      ContentType: contentType,
      ContentDisposition: contentType === "application/pdf" ? "inline" : null,
    });
  } else {
    command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${filePath}`,
      Body: imageData,
      ACL: "public-read",
      ContentType: contentType,
    });
  }

  const s3Response = await s3.send(command);
  return createS3Url({ name: filePath });
};

export const createS3Url = ({ name }: { name: string }) => {
  return `https://${Config.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${name}`;
};

export default UploadFile;

export const DeleteFile = async (name: any) => {
  const filePath = await GenerateFilePath(name);
  const bucketParams = {
    Bucket: bucketName,
    Key: filePath,
  };

  try {
    await s3.send(new DeleteObjectCommand(bucketParams));
    return true;
  } catch (err) {
    console.log("Error", err);
    return false;
  }
};
