// Distributable local authoring service. Serves the editors and same-origin generation endpoints.
import { createServer } from 'node:http';
import { readFileSync,existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { middleware } from './api.ts';
import { createModel, modelConfig } from './model.ts';
const folder=dirname(fileURLToPath(import.meta.url)),file=join(folder,'.env');
const settings={...existsSync(file)?parseEnv(readFileSync(file,'utf8')):{},...process.env};
const config=modelConfig(settings);
const api=middleware(config?createModel(config):undefined);
const html=readFileSync(join(folder,'Career-Exhibit-Studio.html'),'utf8').replace('<head>','<head><meta name="exhibit-local-service" content="1">');
const decisions=join(folder,"Your-Turn.html");
const server=createServer((req,res)=>{const addr=server.address();const host=addr&&typeof addr==='object'?`127.0.0.1:${addr.port}`:'';
 if(req.headers.host!==host || (req.headers.origin && req.headers.origin!==`http://${host}`)){res.writeHead(403).end('Local studio only.');return;}
 if((req.url==='/decisions'||req.url==='/decisions/')&&req.method==='GET'&&existsSync(decisions)){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
  res.end(readFileSync(decisions));return;
 }
 if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(html);return;}
 void api(req,res,()=>{res.writeHead(404).end();}).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});
});
const port = Number(settings.STUDIO_PORT || "41723");
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("STUDIO_PORT must be a valid port number.");
server.on("error", (error: NodeJS.ErrnoException) => {
 if (error.code === "EADDRINUSE") console.error(`Port ${port} is occupied. Open the running studio or set STUDIO_PORT before restarting.`);
 else console.error(error.message);
 process.exitCode = 1;
});
server.listen(port,'127.0.0.1',()=>{const addr=server.address();if(!addr||typeof addr==='string')return;const url=`http://127.0.0.1:${addr.port}/decisions/`;console.log(`3D Portfolio: ${url}\n${config?'Model gateway configured.':'Configure .env and restart to enable AI interviews. Manual authoring is available now.'}\nKeep this window open while creating. Press Ctrl+C to stop.`);
 if(process.argv.includes('--open')){const command=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];const child=spawn(command,args,{detached:true,stdio:'ignore'});child.on('error',()=>console.log('Open the printed URL in your browser.'));child.unref();}
});
