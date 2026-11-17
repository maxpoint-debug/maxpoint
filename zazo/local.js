import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {route} from './core.js';
const sqlite = new DatabaseSync(process.env.SASO_DB || 'saso.sqlite');
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
sqlite.exec(readFileSync('drizzle/0001_state.sql','utf8'));
const db = {prepare(sql) {
  const query = sqlite.prepare(sql);
  const bind = (...args) => ({
    first: () => query.get(...args),
    run: () => ({meta:query.run(...args)})
  });
  return {...bind(),bind};
}};
const files = {'/':'index.html','/app.js':'app.js','/style.css':'style.css','/zazo-mascot.webp':'zazo-mascot.webp'};
const types = {'/':'text/html','/app.js':'text/javascript','/style.css':'text/css','/zazo-mascot.webp':'image/webp'};
createServer(async (req,res) => {
  try {
    const assets = Object.fromEntries(Object.entries(files).map(([path,file]) => [path,[readFileSync('public/'+file),types[path].startsWith('text/') ? types[path]+'; charset=utf-8' : types[path]]]));
    const body = [];
    if (req.method === 'POST') {
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 260000) { res.writeHead(413).end(); return; }
        body.push(chunk);
      }
    }
    const request = new Request(new URL(req.url,'http://localhost'),{method:req.method,headers:req.headers,body:body.length ? Buffer.concat(body) : undefined});
    const response = await route(request,db,assets);
    res.writeHead(response.status,Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500).end();
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
