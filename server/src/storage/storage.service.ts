import ImageKit from "@imagekit/nodejs";
import { config } from "../utils/conf.js";

const client = new ImageKit({
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
});

const uploadFile = async (buffer: Buffer, fileName = "file-name.jpg") => {
  const response = await client.files.upload({
    file: buffer.toString("base64"),
    fileName,
  });

  return response;
};

export { uploadFile };
