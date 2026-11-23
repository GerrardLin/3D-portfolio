import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export async function readPdf(file: File): Promise<string[]> {
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose a PDF smaller than 15 MB.");
  const task = getDocument({ data: await file.arrayBuffer(), stopAtErrors: true });
  try {
    const document = await task.promise;
    if (document.numPages > 12) throw new Error("Choose a résumé with at most 12 pages.");
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const content = await (await document.getPage(number)).getTextContent();
      let text = "";
      let y: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const nextY = item.transform[5];
        const newParagraph = y !== undefined && Math.abs(nextY - y) > Math.max(14, item.height * 1.65);
        if (newParagraph) text = text.trimEnd() + "\n\n";
        text += item.str + (item.hasEOL ? "\n" : " ");
        y = nextY;
      }
      pages.push(text.trim());
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
