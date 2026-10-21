import { describe, expect, it } from "vitest";
import { photoAt, uniqueCredits } from "./photo";
import type { Photo } from "./types";

const photo: Photo = {
  url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Zerenda_June_07.jpg/960px-Zerenda_June_07.jpg",
  alt: { ru: "Зеренда" },
  credit: {
    author: "Saltanat-alikhanova",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Zerenda_June_07.jpg",
  },
};

describe("photoAt", () => {
  it("leaves a photo kept on our own site as it is", () => {
    const local: Photo = { ...photo, url: "/photos/zerenda.jpg" };
    expect(photoAt(local, 1920).url).toBe("/photos/zerenda.jpg");
  });

  it("asks Wikimedia for another thumbnail width", () => {
    expect(photoAt(photo, 1920).url).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Zerenda_June_07.jpg/1920px-Zerenda_June_07.jpg",
    );
  });

  it("keeps the credit and the description", () => {
    const resized = photoAt(photo, 330);
    expect(resized.credit).toEqual(photo.credit);
    expect(resized.alt).toEqual(photo.alt);
  });

  it("leaves other addresses unchanged", () => {
    const other = { ...photo, url: "https://example.com/photo.jpg" };
    expect(photoAt(other, 1920).url).toBe("https://example.com/photo.jpg");
  });
});

describe("uniqueCredits", () => {
  it("lists every author once, even when the photo is used many times", () => {
    const credits = uniqueCredits([photo, photoAt(photo, 330), photo]);
    expect(credits).toHaveLength(1);
    expect(credits[0].author).toBe("Saltanat-alikhanova");
  });

  it("keeps the order of first appearance", () => {
    const second: Photo = {
      ...photo,
      credit: {
        ...photo.credit,
        author: "Noiembrie",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:B.jpg",
      },
    };
    expect(uniqueCredits([second, photo]).map((credit) => credit.author)).toEqual([
      "Noiembrie",
      "Saltanat-alikhanova",
    ]);
  });
});
