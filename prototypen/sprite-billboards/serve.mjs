import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
const root=normalize(import.meta.dirname), port=Number(process.env.PORT||8101);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
createServer(async(req,res)=>{try{let path=decodeURIComponent((req.url||'/').split('?')[0]);if(path==='/')path='/index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw Error('forbidden');await stat(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Nicht gefunden');}}).listen(port,'127.0.0.1',()=>console.log(`SLIMORIA Sprite-Prototyp: http://127.0.0.1:${port}`));
