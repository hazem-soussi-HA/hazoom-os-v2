const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||8888,ROOT=__dirname;
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  if(req.url==='/health'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'healthy',timestamp:new Date().toISOString()}));
    return;
  }
  let fp=path.join(ROOT,req.url==='/'?'index.html':req.url);
  if(!fs.existsSync(fp)){res.writeHead(404);res.end('Not Found');return}
  const ext=path.extname(fp);
  res.writeHead(200,{'Content-Type':MIME[ext]||'text/plain','Cache-Control':'no-cache'});
  fs.createReadStream(fp).pipe(res);
}).listen(PORT,()=>console.log(`HAZOOM OS running at http://localhost:${PORT}`));
