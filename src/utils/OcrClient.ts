import { configContext } from "@/context/config";
import { tesseractContext } from "@/context/tesseract";
import ISO963_1 from "@/types/ISO963";
import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";

export type ImageLike = string | File | Blob | ImageData | Buffer | HTMLCanvasElement;

export class OcrImage {
  constructor(private image: ImageLike) {}

  /**
   * 对于base64编码的图片的处理，要求image以 "data:image/png;base64,<raw base64>" 方式编码
   * @returns 元信息和去除类型信息的base64编码图片和raw base64
   * @throws 类型错误
   */
  decodeBase64() {
    if (typeof this.image === "string") {
      const res = /data:image\/([a-zA-Z]*);base64,([^"]*)/.exec(this.image);
      if (res instanceof Array && res.length === 3)
        return {
          type: res[1],
          contentType: `image/${res[1]}`,
          raw: res[2],
        };
      throw new Error(
        "getBase64Meta type error. image is a string but not a base64 encoded image"
      );
    } else throw new Error("getBase64Meta type error. image not a string");
  }

  static async canvasToBlob(canvas: HTMLCanvasElement) {
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) =>
        blob
          ? resolve(blob)
          : reject(Error("canvas toblob error, output null blob"))
      )
    );
  }

  async toBlob() {
    if (this.image instanceof Blob) {
      // File and Blob
      return this.image as Blob;
    } else if (this.image instanceof Buffer) {
      return new Blob([this.image]);
    } else if (typeof this.image === "string") {
      return await (await fetch(this.image)).blob();
    } else if (this.image instanceof ImageData) {
      let canvas = document.createElement("canvas");
      canvas.width = this.image.width;
      canvas.height = this.image.height;
      let ctx = canvas.getContext("2d");
      ctx?.putImageData(this.image, 0, 0);
      return await OcrImage.canvasToBlob(canvas);
    } else if (this.image instanceof HTMLCanvasElement) {
      return await OcrImage.canvasToBlob(this.image);
    }
    throw new Error("unknown error");
  }
}

interface OcrResult {
  lang: ISO963_1;
  text: string;
}

export abstract class OcrClient {
  abstract recognize(image: OcrImage): Promise<OcrResult>;
  static createLocalTesseractClient(
    ctxRecognizeFn: (image: ImageLike) => Promise<string>,
    lang: ISO963_1
  ): OcrClient {
    return new LocalTesseractClient(ctxRecognizeFn, lang);
  }

  static createRemotePaddleOcrClient(server: string): OcrClient {
    return new RemotePaddleOcrClient(server);
  }
}

// tesseract输入blob有问题
// wip: 解决tesseract的blob输入问题
function blobToDataURL(blob: Blob) {
  return new Promise<string>((resolve) => {
    console.time("blobToDataURL");
    const a = new FileReader();
    a.onload = function (e) {
      resolve(e.target!.result as string);
      console.timeEnd("blobToDataURL");
    };
    a.readAsDataURL(blob);
  });
}

// 前端运行的Tesseract
class LocalTesseractClient implements OcrClient {
  constructor(
    private ctxRecognizeFn: (image: ImageLike) => Promise<string>,
    private lang: ISO963_1
  ) {}
  async recognize(image: OcrImage): Promise<OcrResult> {
    return {
      lang: this.lang,
      text: await this.ctxRecognizeFn(
        await blobToDataURL(await image.toBlob())
      ),
    };
  }
}

class RemotePaddleOcrClient implements OcrClient {
  constructor(server: string) {}
  async recognize(image: OcrImage): Promise<OcrResult> {
    throw new Error("Method not implemented.");
  }
}

