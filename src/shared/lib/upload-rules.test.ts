import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, checkFile, megabytes, sizeParts } from "./upload-rules";

describe("checkFile", () => {
  it("accepts the allowed formats in any letter case", () => {
    for (const name of ["a.pdf", "A.PDF", "photo.JPG", "scan.jpeg", "x.png", "my.file.png"]) {
      expect(checkFile({ name, size: 1000 }), name).toBeNull();
    }
  });

  it("refuses other formats, names without an extension and disguised files", () => {
    for (const name of ["a.exe", "a.docx", "noextension", "a.pdf.exe", ".pdf.zip", "a."]) {
      expect(checkFile({ name, size: 1000 }), name).toBe("type");
    }
  });

  it("refuses empty and too large files", () => {
    expect(checkFile({ name: "a.pdf", size: 0 })).toBe("empty");
    expect(checkFile({ name: "a.pdf", size: MAX_FILE_BYTES })).toBeNull();
    expect(checkFile({ name: "a.pdf", size: MAX_FILE_BYTES + 1 })).toBe("size");
  });
});

describe("sizes for reading", () => {
  it("rounds megabytes to one digit", () => {
    expect(megabytes(1572864)).toBe("1.5");
    expect(megabytes(5 * 1024 * 1024)).toBe("5");
  });

  it("uses kilobytes for small files and never shows zero", () => {
    expect(sizeParts(2048)).toEqual({ value: "2", unit: "kb" });
    expect(sizeParts(10)).toEqual({ value: "1", unit: "kb" });
    expect(sizeParts(3 * 1024 * 1024)).toEqual({ value: "3", unit: "mb" });
  });
});
