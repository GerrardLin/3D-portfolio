import { mkdir, readFile, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { makeDemo } from "../src/domain/preparedDesigns.ts";
import { viewerFiles, zipPortfolio } from "../src/domain/export.ts";
const demo = makeDemo();
const portfolio = demo.samples[0].designs[0].portfolio;
const assets = Object.fromEntries(await Promise.all(viewerFiles.map(async path => [path, await readFile(`public/viewer/${path}`)])));
const zip = zipPortfolio(portfolio, assets);
await mkdir("artifacts/hosted-demo/dist/assets", { recursive: true });
await writeFile("artifacts/career-exhibit-sample.zip", zip);
await Promise.all(Object.entries(unzipSync(zip)).filter(([path]) => path !== "portfolio.json").map(([path, contents]) =>
  writeFile(`artifacts/hosted-demo/dist/${path}`, contents),
));
await writeFile("artifacts/hosted-demo/dist/portfolio.json", JSON.stringify(demo, null, 2) + "\n");
console.log("artifacts/career-exhibit-sample.zip");
