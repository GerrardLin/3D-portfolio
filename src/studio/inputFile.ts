import { strFromU8, unzipSync } from 'fflate';

export async function readResumeFile(file: File): Promise<string[]> {
  if(file.size>15*1024*1024) throw new Error('Choose a résumé smaller than 15 MB.');
  const ext=file.name.split('.').pop()?.toLowerCase();
  if(ext==='pdf') return (await import('./pdf.ts')).readPdf(file);
  if(ext==='txt') return [(await file.text()).replace(/^\uFEFF/u,'')];
  if(ext!=='docx') throw new Error('Choose a PDF, Word (.docx), or UTF-8 text (.txt) file.');
  let part:Uint8Array|undefined;
  try { const files=unzipSync(new Uint8Array(await file.arrayBuffer()),{ filter:e=>e.name==='word/document.xml'&&e.originalSize>0&&e.originalSize<=4*1024*1024 });part=files['word/document.xml']; } catch { /* Report an actionable message for a corrupt or protected file. */ }
  if(!part) throw new Error('Cannot read this Word document. Save as an unencrypted .docx or paste its text.');
  const doc=new DOMParser().parseFromString(strFromU8(part),'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('The Word document contains unreadable text. Paste the text instead.');
  const ns=doc.documentElement.namespaceURI||'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraphs=Array.from(doc.getElementsByTagNameNS(ns,'p')).map(p=>Array.from(p.getElementsByTagNameNS(ns,'t'),t=>t.textContent||'').join('').trim()).filter(Boolean);
  return [paragraphs.join('\n\n')];
}
