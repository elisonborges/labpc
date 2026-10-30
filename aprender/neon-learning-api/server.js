import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;
const db = new Pool({ connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3 });
const categories = new Set(['SOL','CASA','FLOR','ÁRVORE','BOLA','PEIXE','CORAÇÃO','ESTRELA','LUA','CARRO']);
const secret = process.env.LABPC_TEACHER_TOKEN;
if(!process.env.DATABASE_URL || !secret || secret.length<32) throw Error('Configure DATABASE_URL e LABPC_TEACHER_TOKEN forte.');
function authorized(req){
 const provided=(req.headers.authorization||'').replace(/^Bearer /i,'');
 const a=Buffer.from(provided),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':process.env.LABPC_ORIGIN||'null','vary':'Origin'});res.end(JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.LABPC_ORIGIN||'null','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Authorization,Content-Type'});res.end();return}
 if(req.url==='/health'&&req.method==='GET')return send(res,200,{ok:true});
 // A API de escrita é exclusiva do professor até existir uma autenticação institucional para envio.
 if(!authorized(req))return send(res,401,{error:'Acesso restrito ao professor'});
 try{
 if(req.url==='/examples/approved'&&req.method==='GET'){
 const data=await db.query("SELECT id,category,strokes FROM labpc_learning.drawing_examples WHERE status='approved' ORDER BY submitted_at DESC LIMIT 300");
 return send(res,200,{examples:data.rows});
 }
 if(req.url==='/examples/pending'&&req.method==='GET'){
 const data=await db.query("SELECT id,category,strokes,submitted_at FROM labpc_learning.drawing_examples WHERE status='pending' ORDER BY submitted_at DESC LIMIT 100");
 return send(res,200,{examples:data.rows});
 }
 if(req.url==='/examples'&&req.method==='POST'){
 let body='';for await(const chunk of req){body+=chunk;if(body.length>25000)return send(res,413,{error:'Exemplo muito grande'})}
 const {category,strokes}=JSON.parse(body);
 if(!categories.has(category)||!Array.isArray(strokes)||strokes.length>35||!strokes.every(line=>Array.isArray(line)&&line.length>=2&&line.length<=170&&line.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=720))))return send(res,400,{error:'Exemplo inválido'});
 const data=await db.query('INSERT INTO labpc_learning.drawing_examples(category,strokes) VALUES ($1,$2) RETURNING id,status',[category,JSON.stringify(strokes)]);
 return send(res,201,data.rows[0]);
 }
 const approve=req.url?.match(/^\/examples\/([0-9a-f-]{36})\/(approve|reject)$/);
 if(approve&&req.method==='POST'){
 const id=approve[1],status=approve[2]==='approve'?'approved':'rejected';
 const data=await db.query('UPDATE labpc_learning.drawing_examples SET status=$1,reviewed_at=now(),reviewed_by=$2 WHERE id=$3 AND status=$4 RETURNING id,status',[status,'professor',id,'pending']);
 return send(res,data.rowCount?200:404,data.rowCount?data.rows[0]:{error:'Não encontrado'});
 }
 send(res,404,{error:'Rota não encontrada'});
 }catch(e){console.error('LabPC API:',e.message);send(res,500,{error:'Erro interno'})}
});
server.listen(Number(process.env.PORT||3000),()=>console.log('LabPC Learning API pronta'));
