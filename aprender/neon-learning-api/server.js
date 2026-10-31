import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;
const db = new Pool({ connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3 });
const categories = new Set(["SOL","CASA","FLOR","ÁRVORE","BOLA","PEIXE","CORAÇÃO","ESTRELA","LUA","CARRO","GATO","CACHORRO","BORBOLETA","BICICLETA","AVIÃO","BARCO","CHUVA","NUVEM","GUARDA-CHUVA","RELÓGIO","ÓCULOS","CHAVE","LIVRO","XÍCARA","PIZZA","MAÇÃ","BANANA","SORVETE","ROBÔ","CASA DE PASSARINHO","COELHO","PÁSSARO","COGUMELO","BOTA","FANTASMA"]);
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
const NEON_AUTH_URL='https://ep-spring-snow-b6mci3yx.neonauth.c-2.sa-east-1.aws.neon.tech/neondb/auth';
async function isNeonAdmin(id){
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(id||'')))return false;
 const data=await db.query('SELECT 1 FROM public.platform_admins p JOIN neon_auth."user" u ON u.id=p.user_id WHERE p.user_id=$1 AND u."emailVerified"=true AND coalesce(u.banned,false)=false LIMIT 1',[id]);
 return data.rowCount>0;
}
function requestCookies(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('labpc_admin='))?.slice(12)||''}
async function adminIdentity(req){
 if(authorized(req))return 'professor-chave';
 const token=requestCookies(req);
 const subject=validateLabSession(token);
 return subject && await isNeonAdmin(subject)?'neon:'+subject:null;
}
function issueLabSession(userId){
 const exp=Math.floor(Date.now()/1000)+900;
 const payload=Buffer.from(JSON.stringify({v:2,sub:userId,exp,scope:'labpc-admin'})).toString('base64url');
 const sig=createHmac('sha256',secret).update('labpc-session.'+payload).digest('base64url');
 return payload+'.'+sig;
}
function validateLabSession(token){
 if(!/^[A-Za-z0-9_-]{25,350}\.[A-Za-z0-9_-]{43}$/.test(token||''))return null;
 try {
 const [payload,sig]=token.split('.');
 const expected=createHmac('sha256',secret).update('labpc-session.'+payload).digest();
 const actual=Buffer.from(sig,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')),now=Math.floor(Date.now()/1000);
 return data.v===2&&data.scope==='labpc-admin'&&data.exp>now&&data.exp<=now+900?data.sub:null;
 }catch{return null}
}
function cookie(res,token){res.setHeader('Set-Cookie','labpc_admin='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+(token?'900':'0'))}
function siteRequest(req){
 const origin=req.headers.origin;
 return !origin || origin==='https://labpc-learning-api.onrender.com';
}
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':process.env.LABPC_ORIGIN||'null','vary':'Origin'});res.end(JSON.stringify(data))}
let pairing=null;
function validExample(e){return e&&categories.has(e.category)&&Array.isArray(e.strokes)&&e.strokes.length<=35&&e.strokes.every(line=>Array.isArray(line)&&line.length>=2&&line.length<=170&&line.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=720)))}
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.LABPC_ORIGIN||'null','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Authorization,Content-Type'});res.end();return}
 if((req.url==='/'||req.url==='/index.html')&&req.method==='GET'){res.writeHead(302,{'location':'/admin','cache-control':'no-store'});res.end();return}
 if(req.url==='/admin'&&req.method==='GET'){
  const page=await readFile(fileURLToPath(new URL('./admin.html',import.meta.url)));
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(page);return;
 }
 if(req.url==='/health'&&req.method==='GET')return send(res,200,{ok:true});
 if(req.url==='/auth/session'&&req.method==='GET'){
  const who=await adminIdentity(req);if(!who&&(req.headers.accept||'').includes('text/html')){res.writeHead(303,{'location':'/admin','cache-control':'no-store'});res.end();return}return send(res,who?200:401,{authenticated:!!who});
 }
 if(req.url==='/auth/logout'&&req.method==='POST'){
  if(!siteRequest(req))return send(res,403,{error:'Origem não autorizada'});
  cookie(res,'');return send(res,200,{ok:true});
 }
 if(req.url==='/auth/login'&&req.method==='POST'){
  if(!siteRequest(req))return send(res,403,{error:'Origem não autorizada'});
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(res,413,{error:'Dados muito grandes'})}
  try {
   const data=JSON.parse(raw);
   if(typeof data.email!=='string'||typeof data.password!=='string'||data.email.length>254||data.password.length>1024)return send(res,400,{error:'Dados inválidos'});
   const login=await fetch(NEON_AUTH_URL+'/sign-in/email',{method:'POST',headers:{'content-type':'application/json','origin':'https://annaone.com.br'},body:JSON.stringify({email:data.email,password:data.password}),cache:'no-store',signal:AbortSignal.timeout(11000)});
   if(!login.ok){
    let reason='';try{const error=await login.json();reason=String(error.code||error.error?.code||'').slice(0,64)}catch{}
    console.warn('Neon Auth rejeitou login',{status:login.status,code:reason||'sem_codigo'});
    const invalid=login.status===401||reason==='INVALID_EMAIL_OR_PASSWORD'||reason==='INVALID_CREDENTIALS';
    const blocked=login.status===429;
    return send(res,invalid?401:blocked?429:503,{error:invalid?'E-mail ou senha não reconhecidos pelo Neon Auth':blocked?'Muitas tentativas. Tente novamente mais tarde.':'Falha de integração com Neon Auth (HTTP '+login.status+(reason?', '+reason:'')+')'});
   }
   const result=await login.json();
   let user=result.user||result.data?.user||result.session?.user||null;
   if(!user?.id){
    const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    if(cookies){
     const session=await fetch(NEON_AUTH_URL+'/get-session',{headers:{cookie:cookies,origin:'https://annaone.com.br'},signal:AbortSignal.timeout(8000)});
     if(session.ok){const body=await session.json();user=body.user||body.data?.user||body.session?.user||null}
    }
   }
   if(!user?.id || !await isNeonAdmin(user.id))return send(res,403,{error:'Conta sem permissão de administrador principal'});
   cookie(res,issueLabSession(user.id));
   return send(res,200,{authenticated:true,expires_in:900});
  }catch(err){console.error('Neon Auth login:',err?.name);return send(res,503,{error:'Falha na autenticação Neon Auth'})}
 }
 // Somente amostras APROVADAS são publicamente legíveis; nenhuma rota pública escreve dados.
 if(req.url==='/examples/approved'&&req.method==='GET'){
  try {
   const data=await db.query("SELECT category,strokes FROM labpc_learning.drawing_examples WHERE status='approved' ORDER BY submitted_at DESC LIMIT 500");
   return send(res,200,{examples:data.rows});
  }catch(e){console.error('Consulta de exemplos:',e.message);return send(res,503,{error:'Biblioteca temporariamente indisponível'})}
 }
 if(req.url==='/pair/upload'&&req.method==='POST'){
  if(req.headers.origin!==process.env.LABPC_ORIGIN)return send(res,403,{error:'Origem não autorizada'});
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>180000)return send(res,413,{error:'Lote muito grande'})}
  let data;try{data=JSON.parse(raw)}catch{return send(res,400,{error:'JSON inválido'})}
  const code=String(data?.code||'').trim().toUpperCase();
  if(!pairing||Date.now()>pairing.until||pairing.remaining<=0||code!==pairing.code)return send(res,403,{error:'Código expirado ou inválido'});
  if(!Array.isArray(data.examples)||data.examples.length<1||data.examples.length>40||!data.examples.every(validExample))return send(res,400,{error:'Desenhos inválidos ou limite de 40 excedido'});
  if(pairing.remaining<data.examples.length)return send(res,429,{error:'Limite de desenhos da sessão atingido'});
  pairing.remaining-=data.examples.length;
  let inserted=0,duplicate=0;
  try{
   for(const e of data.examples){
    const normalized=JSON.stringify(e.strokes);
    const result=await db.query("INSERT INTO labpc_learning.drawing_examples(category,strokes) SELECT $1,$2::jsonb WHERE NOT EXISTS (SELECT 1 FROM labpc_learning.drawing_examples WHERE category=$1 AND strokes=$2::jsonb AND status IN ('pending','approved')) RETURNING id",[e.category,normalized]);
    if(result.rowCount)inserted++;else duplicate++;
   }
   return send(res,200,{inserted,duplicate,remaining:pairing.remaining});
  }catch(err){console.error('Upload supervisionado:',err.message);return send(res,503,{error:'Falha ao enviar lote'})}
 }
 // A API de escrita é exclusiva do professor até existir uma autenticação institucional para envio.
 if(req.method!=='GET'&&!siteRequest(req))return send(res,403,{error:'Origem não autorizada'});
 const identity=await adminIdentity(req);
 if(!identity){
  // Navegação direta no navegador: exibir login, não um JSON de API.
  const wantsHtml=req.method==='GET' && (req.headers.accept||'').includes('text/html');
  if(wantsHtml){res.writeHead(303,{'location':'/admin','cache-control':'no-store'});res.end();return}
  return send(res,401,{error:'Acesso restrito ao administrador'});
 }
 try{
 if(req.url==='/pair/start'&&req.method==='POST'){
  pairing={code:randomBytes(8).toString('hex').toUpperCase(),until:Date.now()+10*60*1000,remaining:200};
  return send(res,200,{code:pairing.code,expires_in:600,max_examples:200});
 }
 if(req.url==='/pair/stop'&&req.method==='POST'){pairing=null;return send(res,200,{ok:true})}
 if(req.url==='/examples/approved'&&req.method==='GET'){
 const data=await db.query("SELECT id,category,strokes FROM labpc_learning.drawing_examples WHERE status='approved' ORDER BY submitted_at DESC LIMIT 300");
 return send(res,200,{examples:data.rows});
 }
 if(req.url==='/examples/stats'&&req.method==='GET'){
 const data=await db.query("SELECT status,category,COUNT(*)::integer AS total FROM labpc_learning.drawing_examples GROUP BY status,category ORDER BY category,status");
 return send(res,200,{counts:data.rows});
 }
 if(req.url==='/examples/pending'&&req.method==='GET'){
 const data=await db.query("SELECT id,category,strokes,submitted_at FROM labpc_learning.drawing_examples WHERE status='pending' ORDER BY submitted_at DESC LIMIT 100");
 return send(res,200,{examples:data.rows});
 }
 if(req.url==='/examples'&&req.method==='POST'){
 let body='';for await(const chunk of req){body+=chunk;if(body.length>25000)return send(res,413,{error:'Exemplo muito grande'})}
 const {category,strokes}=JSON.parse(body);
 if(!categories.has(category)||!Array.isArray(strokes)||strokes.length>35||!strokes.every(line=>Array.isArray(line)&&line.length>=2&&line.length<=170&&line.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=720))))return send(res,400,{error:'Exemplo inválido'});
 // Impede duplicatas idênticas, inclusive em envios simultâneos.
 const normalized=JSON.stringify(strokes);
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[category+':'+normalized]);
  const existing=await client.query("SELECT id,status FROM labpc_learning.drawing_examples WHERE category=$1 AND strokes=$2::jsonb AND status IN ('pending','approved') LIMIT 1",[category,normalized]);
  if(existing.rowCount){await client.query('COMMIT');return send(res,200,{...existing.rows[0],duplicate:true})}
  const data=await client.query('INSERT INTO labpc_learning.drawing_examples(category,strokes) VALUES ($1,$2::jsonb) RETURNING id,status',[category,normalized]);
  await client.query('COMMIT');
  return send(res,201,{...data.rows[0],duplicate:false});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
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
