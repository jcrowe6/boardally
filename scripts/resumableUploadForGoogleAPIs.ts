// Adapted from https://github.com/tanaikech/resumableUploadForGoogleAPIs_nodejs
import { UploadFileResponse } from '@google/generative-ai/dist/server/server';
import { default as stream } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'

export type ResumableUploadOptions = {
  fileUrl?: string;        // File URL of the file for uploading
  resumableUrl: string;    // URL for running the resumable upload
  dataSize: number;        // Data size (content size, file size) of the file
  accessToken: string;     // Access token for uploading with Google API you want to use
  metadata?: object;       // Metadata for Google API
  chunkSize?: number;      // Chunk size in bytes. Default is 16MB. Should be multiples of 256KB
}

export function resumableUpload(options: ResumableUploadOptions) : Promise<UploadFileResponse> {
  const {
    fileUrl = "",
    resumableUrl = "",
    dataSize = 0,
    accessToken,
    metadata = {},
    chunkSize = 16777216,
  } = options;
  
  return new Promise(async (resolve, reject) => {
    let mainData;
    if (resumableUrl == "" || dataSize == 0) {
      throw new Error("Please set resumableUrl and dataSize");
    }

    // Retrieve data from url as stream.
    if (fileUrl != "") {
      const res1 = await fetch(fileUrl);
      if (!res1.body) {
        throw new Error("Failed to get file from URL");
      }
      mainData = stream.Readable.fromWeb(res1.body as ReadableStream<Uint8Array>);
    } else {
      throw new Error("Please set fileUrl");
    }
    const streamTrans = new stream.Transform({
      transform: function (chunk, _, callback) {
        callback(null, chunk);
      },
    });
    mainData.pipe(streamTrans);

    // Retrieve session for resumable upload.
    const headers = {
      "Content-Type": "application/json",
    };

    const res2 = await fetch(resumableUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    });

    let location: string | null = null;
    if (res2.ok) {
      location = res2.headers.get("location");
      if (!location) {
        throw new Error("Failed to get location header from resumable upload initialization");
      }
    } else {
      reject({ status: res2.status, error: await res2.json() });
      return;
    }
    
    // Upload the file.
    let startByte = 0;
    let bufferData: Uint8Array[] = [];
    streamTrans.on("data", async (chunk) => {
      bufferData.push(chunk);
      const temp = Buffer.concat(bufferData);
      if (temp.length >= chunkSize) {
        const dataChunk = temp.slice(0, chunkSize);
        const left = temp.slice(chunkSize);
        streamTrans.pause();
        let upCount = 0;

        const upload = async () => {
          console.log(
            `Progress: from ${startByte} to ${
              startByte + dataChunk.length - 1
            } for ${dataSize}`
          );
          const res3 = await fetch(location!, {
            method: "PUT",
            headers: {
              "Content-Range": `bytes ${startByte}-${
                startByte + dataChunk.length - 1
              }/${dataSize}`,
            },
            body: dataChunk,
          });
          const text = await res3.text();
          // console.log({ ok: res3.ok, status: res3.status, body: text }); // For debug
          if (res3.ok && res3.status == 200) {
            try {
              resolve(JSON.parse(text));
            } catch (_) {
              reject(new Error("Failed to parse response as JSON"));
            }
            return;
          } else {
            if (res3.status == 308) {
              startByte += dataChunk.length;
              streamTrans.resume();
              return;
            }
            if (upCount == 3) {
              reject({ status: res3.status, error: text });
              return;
            }
            upCount++;
            console.log(`Retry: ${upCount} / 3`);
            console.log(text);
            await upload();
            return;
          }
        };

        await upload();
        bufferData = [left];
      }
    });
    streamTrans.on("end", async () => {
      const dataChunk = Buffer.concat(bufferData);
      if (dataChunk.length > 0) {
        // Upload last chunk.
        let upCount = 0;

        const upload = async function () {
          console.log(
            `Progress(last): from ${startByte} to ${
              startByte + dataChunk.length - 1
            } for ${dataSize}`
          );
          const res4 = await fetch(location!, {
            method: "PUT",
            headers: {
              "Content-Range": `bytes ${startByte}-${
                startByte + dataChunk.length - 1
              }/${dataSize}`,
            },
            body: dataChunk,
          });
          const text = await res4.text();
          // console.log({ ok: res4.ok, status: res4.status, body: text }); // For debug
          if (res4.ok && res4.status == 200) {
            try {
              resolve(JSON.parse(text));
            } catch (_) {
              reject(new Error("Failed to parse response as JSON"));
            }
            return;
          } else {
            if (res4.status == 308) {
              startByte += dataChunk.length;
              streamTrans.resume();
              return;
            }
            if (upCount == 3) {
              reject({ status: res4.status, error: text });
              return;
            }
            upCount++;
            console.log(`Retry: ${upCount} / 3`);
            await upload();
            return;
          }
        };

        await upload();
      }
    });
    streamTrans.on("error", (err) => reject(err));
  });
}