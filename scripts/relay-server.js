// WebSocket relay signaling server for Teleprompter Studio's Web remote module.
// Relays commands from phone/tablet controllers to the reader, and reader state
// back to the controllers. Requires: npm install ws
//
// Run:
//   node scripts/relay-server.js        (listens on :8098 by default)
// Then open Teleprompter Studio, enable "Web remote" in the sidebar, and open
// remote.html on your phone pointed at the same relay URL.

const WebSocket=require('ws');
const http=require('http');

const PORT=process.env.PORT||8098;
const PATH='/signaling';

const server=http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('Teleprompter Studio Web remote relay\n');
});

const wss=new WebSocket.Server({server,path:PATH});

let reader=null;
const controllers=new Set();

function isOpen(ws){return ws.readyState===WebSocket.OPEN}
function send(ws,payload){if(isOpen(ws))ws.send(JSON.stringify(payload))}
function broadcastControllers(payload){for(const c of controllers)if(isOpen(c))send(c,payload)}
function forwardToReader(payload){if(reader&&isOpen(reader))send(reader,payload)}

wss.on('connection',ws=>{
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.role==='reader'){
      reader=ws;
      ws.isReader=true;
      if(m.state)broadcastControllers({role:'reader',state:m.state});
      else if(m.cmd==='hello'){}
    }else if(m.role==='controller'){
      controllers.add(ws);
      ws.isController=true;
      if(m.cmd)forwardToReader({role:'controller',cmd:m.cmd});
    }
  });
  ws.on('close',()=>{
    if(ws.isReader)reader=null;
    if(ws.isController)controllers.delete(ws);
  });
  ws.on('error',()=>{
    if(ws.isReader)reader=null;
    if(ws.isController)controllers.delete(ws);
  });
});

server.listen(PORT,()=>console.log(`Web remote relay listening on :${PORT}${PATH}`));
