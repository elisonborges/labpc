import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
function verifyAnnaJwt(header){
 const secret=process.env.SD_JWT_SECRET,issuer=process.env.SD_JWT_ISSUER,audience=process.env.SD_JWT_AUDIENCE;
 if(!secret||Buffer.byteLength(secret)<32||!issuer||!audience||typeof header!=='string'||!/^Bearer [A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(header))return null;
 try{
 const token=header.slice(7),[h,p,s]=token.split('.');
 const meta=JSON.parse(Buffer.from(h,'base64url').toString('utf8'));
 if(meta.alg!=='HS256'||meta.typ!=='JWT')return null;
 const expected=createHmac('sha256',secret).update(h+'.'+p).digest(),actual=Buffer.from(s,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 const claims=JSON.parse(Buffer.from(p,'base64url').toString('utf8')),now=Math.floor(Date.now()/1000);
 if(!/^[0-9a-f-]{36}$/i.test(claims.sub||'')||claims.iss!==issuer||claims.aud!==audience||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+3600||!Number.isInteger(claims.iat)||claims.iat>now+60||claims.iat>claims.exp||(claims.nbf!=null&&claims.nbf>now))return null;
 return claims.sub;
 }catch{return null}
}
async function adminIdentity(req){
 if(authorized(req))return 'professor-chave';
 const userId=verifyAnnaJwt(req.headers.authorization);
 if(!userId)return null;
 const data=await db.query('SELECT 1 FROM public.platform_admins pa JOIN neon_auth."user" u ON u.id=pa.user_id WHERE pa.user_id=$1 AND u."emailVerified"=true AND coalesce(u.banned,false)=false LIMIT 1',[userId]);
 return data.rowCount?'anna-one:'+userId:null;
}
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':process.env.LABPC_ORIGIN||'null','vary':'Origin'});res.end(JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.LABPC_ORIGIN||'null','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Authorization,Content-Type'});res.end();return}
 if(req.url==='/admin'&&req.method==='GET'){
  const page=await readFile(fileURLToPath(new URL('./admin.html',import.meta.url)));
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(page);return;
 }
 if(req.url==='/health'&&req.method==='GET')return send(res,200,{ok:true});
// Somente amostras APROVADAS são publicamente legíveis; nenhuma rota pública escreve dados.
 if(req.url==='/examples/approved'&&req.method==='GET'){
  try {
   const data=await db.query("SELECT category,strokes FROM labpc_learning.drawing_examples WHERE status='approved' ORDER BY submitted_at DESC LIMIT 150");
   return send(res,200,{examples:data.rows});
  }catch(e){console.error('Consulta de exemplos:',e.message);return send(res,503,{error:'Biblioteca temporariamente indisponível'})}
 }
 // A API de escrita é exclusiva do professor até existir uma autenticação institucional para envio.
 const identity=await adminIdentity(req);if(!identity)return send(res,401,{error:'Acesso restrito ao administrador'});
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
 const data=await db.query('UPDATE labpc_learning.drawing_examples SET status=$1,reviewed_at=now(),reviewed_by=$2 WHERE id=$3 AND status=$4 RETURNING id,status',[status,identity,id,'pending']);
 return send(res,data.rowCount?200:404,data.rowCount?data.rows[0]:{error:'Não encontrado'});
 }
 send(res,404,{error:'Rota não encontrada'});
 }catch(e){console.error('LabPC API:',e.message);send(res,500,{error:'Erro interno'})}
});
server.listen(Number(process.env.PORT||3000),()=>console.log('LabPC Learning API pronta'));
