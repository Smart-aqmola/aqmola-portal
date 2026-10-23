import { ApiFault } from "../api-errors";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;
export type UploadedDocument = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function jpegStructure(bytes: Buffer) {
  let offset = 2;
  let frame = false;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) return false;
    while (offset < bytes.length && bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (offset + 2 > bytes.length) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (
        length < 8 ||
        bytes.readUInt16BE(offset + 3) === 0 ||
        bytes.readUInt16BE(offset + 5) === 0
      )
        return false;
      frame = true;
    }
    if (marker === 218) return frame && length >= 6 && offset + length < bytes.length - 2;
    offset += length;
  }
  return false;
}

function pngStructure(bytes: Buffer) {
  let offset = 8;
  let imageData = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (offset + length + 12 > bytes.length) return false;
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT" && length > 0) imageData = true;
    offset += length + 12;
    if (type === "IEND") return imageData && length === 0 && offset === bytes.length;
  }
  return false;
}

/** Basic binary structure validation, not a malware scanner or a PDF renderer. */
export function inspectDocument(file?: UploadedDocument) {
  const reject = () => {
    throw new ApiFault(400, "validation_error", { file: "format" });
  };
  if (!file) throw new ApiFault(400, "validation_error", { file: "required" });
  const bytes = file.buffer;
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length === 0 ||
    bytes.length > MAX_DOCUMENT_BYTES ||
    bytes.length !== file.size
  )
    return reject();
  // Original names are display metadata only, never filesystem paths or header text.
  const name = file.originalname;
  if (!name || name.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(name)) return reject();
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf" && file.mimetype === "application/pdf") {
    const text = bytes.toString("latin1");
    if (
      !/^%PDF-(?:1\.[0-9]|2\.0)/.test(text) ||
      !/%%EOF\s*$/.test(text) ||
      !/\bobj\b/.test(text) ||
      !/\btrailer\b|\/Type\s*\/XRef/.test(text) ||
      /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|Encrypt)\b/.test(text)
    )
      return reject();
    return { name, mimeType: "application/pdf" };
  }
  if ((ext === "jpg" || ext === "jpeg") && file.mimetype === "image/jpeg") {
    if (
      bytes.length < 12 ||
      !bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
      !bytes.subarray(-2).equals(Buffer.from([255, 217])) ||
      !jpegStructure(bytes)
    )
      return reject();
    return { name, mimeType: "image/jpeg" };
  }
  if (ext === "png" && file.mimetype === "image/png") {
    if (
      bytes.length < 45 ||
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.toString("ascii", 12, 16) !== "IHDR" ||
      bytes.readUInt32BE(16) === 0 ||
      bytes.readUInt32BE(20) === 0 ||
      !bytes.subarray(-12).equals(Buffer.from("0000000049454e44ae426082", "hex")) ||
      !pngStructure(bytes)
    )
      return reject();
    return { name, mimeType: "image/png" };
  }
  return reject();
}
