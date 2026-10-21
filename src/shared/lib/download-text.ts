/**
 * Offers a text to the visitor as a file to save (spec 4.11, 4.13). In the demo the texts are made
 * in the browser; with a backend the file comes from the server and the link is checked there.
 */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the link is released.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
