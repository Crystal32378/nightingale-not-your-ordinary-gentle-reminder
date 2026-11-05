// Dependency-free local review server; bound to loopback only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.txt':'text/plain; charset=utf-8'};
const allowed = new Set(['index.html','styles.css','pet.css','app.js','audio.js','behavior.js','pet.js','state.js','assets/nightingale.png','assets/nightjar-chiayi-chiuluan.wav','assets/demo-meal.svg','assets/demo-glucose.svg','assets/NIGHTINGALE-LICENSE.txt']);
const server = http.createServer((req,res)=>{
  let relative;
  try { relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Read-only server'); }
  if (!allowed.has(relative)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(root,relative),(error,data)=>{
    if(error){ res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{
      'Content-Type':types[path.extname(relative)] || 'application/octet-stream',
      'Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.listen(4173,'127.0.0.1',()=>console.log('Nightingale local preview: http://127.0.0.1:4173 (Ctrl+C to stop)'));
server.on('error',error=>{ console.error(error.message); process.exitCode=1; });
