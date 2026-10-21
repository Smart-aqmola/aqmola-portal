/**
 * The test photos are copies of Wikimedia Commons files, kept in public/photos so the site does not
 * depend on another server. The key is the Commons file name as written in the data; the value is
 * the plain ASCII name of the local copy. Authors and licences: public/photos/CREDITS.md.
 */
const localNames: Record<string, string> = {
  "View_of_Burabay_lake_and_Kokshe_mountains.jpg": "burabay-kokshe.jpg",
  "%D0%9E%D0%BA%D0%B6%D0%B5%D1%82%D0%BF%D0%B5%D1%81_%D0%91%D1%83%D1%80%D0%B0%D0%B1%D0%B0%D0%B9.jpg":
    "okzhetpes.jpg",
  "Zerenda_June_07.jpg": "zerenda.jpg",
  "Sunset_in_Korgalzhyn_Nature_Reserve.jpg": "korgalzhyn.jpg",
  "Museum_of_History_of_Kokshetau_in_March_2025.jpg": "kokshetau-museum.jpg",
  "%D0%A1%D1%82%D0%B5%D0%BF%D0%BD%D0%BE%D0%B3%D0%BE%D1%80%D1%81%D0%BA%2C_%D0%BF%D0%B0%D0%BD%D0%BE%D1%80%D0%B0%D0%BC%D0%B0.JPG":
    "stepnogorsk.jpg",
  "Lake_Burabai_2.jpg": "burabay-lake-2.jpg",
};

/** Address of the local copy of a Commons photo, for example "/photos/zerenda.jpg". */
export function localPhotoUrl(commonsFile: string): string {
  const name = localNames[commonsFile];
  if (!name) throw new Error(`No local copy of the photo "${commonsFile}" in public/photos`);
  return `/photos/${name}`;
}
