import { ImageKit } from "@imagekit/nodejs";
import { config } from "../utils/conf.js";

const client = new ImageKit({
  publicKey: config.IMAGEKIT_PUBLIC_KEY,
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
});

const uploadFile = async (buffer: Buffer, fileName = "file-name.jpg") => {
  try {
    const response = await client.files.upload({
      file: buffer.toString("base64"),
      fileName,
    });
    return response;
  } catch (error: any) {
    throw new Error(`ImageKit Upload Failed: ${error.message || "Unknown error"}`);
  }
};

export { uploadFile };
