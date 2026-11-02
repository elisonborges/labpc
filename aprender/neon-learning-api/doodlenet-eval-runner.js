import * as tf from '@tensorflow/tfjs';
export async function evaluateDoodleNet(db){
 const modelUrl='https://raw.githubusercontent.com/yining1023/doodleNet/master/model-tfjs/';
 const r=await fetch(modelUrl+'model.json',{signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('Modelo HTTP '+r.status);
 const config=await r.json();
 const w=await fetch(modelUrl+config.weightsManifest[0].paths[0],{signal:AbortSignal.timeout(60000)});
 if(!w.ok)throw Error('Pesos HTTP '+w.status);
 const weightData=await w.arrayBuffer();
 const specs=config.weightsManifest.flatMap(x=>x.weights);
 const model=await tf.loadLayersModel({load:async()=>({modelTopology:config.modelTopology,weightSpecs:specs,weightData})});
 const query=await db.query("SELECT category,strokes FROM labpc_learning.drawing_examples WHERE status='approved' ORDER BY category,submitted_at");
 const rows=query.rows;
 const raster=lines=>{
  const pts=lines.flat();if(pts.length<6)return null;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const scale=23/Math.max(1,maxx-minx,maxy-miny),ox=(28-(maxx-minx)*scale)/2,oy=(28-(maxy-miny)*scale)/2;
  const pix=new Float32Array(784);
  for(const line of lines)for(let i=1;i<line.length;i++){
   const a=line[i-1],b=line[i],x=(a[0]-minx)*scale+ox,y=(a[1]-miny)*scale+oy,xx=(b[0]-minx)*scale+ox,yy=(b[1]-miny)*scale+oy,n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)*3));
   for(let k=0;k<=n;k++){const cx=Math.round(x+(xx-x)*k/n),cy=Math.round(y+(yy-y)*k/n);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(cx+dx>=0&&cx+dx<28&&cy+dy>=0&&cy+dy<28)pix[(cy+dy)*28+cx+dx]=1}
  }
  return pix;
 };
 const labels=await db.query('SELECT 1'); // verifies database connection
 const mapping=JSON.parse(process.env.LABPC_EVAL_LABELS||'{}');
 if(!Object.keys(mapping).length)throw Error('Mapeamento de classes não configurado');
 const indices=Object.entries(mapping).map(([i,c])=>[Number(i),c]);
 let evaluated=0,correct=0;const byCategory={};
 for(const row of rows){const pixels=raster(row.strokes);if(!pixels)continue;
  const input=tf.tensor4d(pixels,[1,28,28,1]);const prediction=model.predict(input);const data=await prediction.data();input.dispose();prediction.dispose();
  const best=indices.reduce((a,[i,c])=>data[i]>(a?.p??-1)?{p:data[i],category:c}:a,null);
  const v=byCategory[row.category]??={tested:0,correct:0};v.tested++;evaluated++;if(best?.category===row.category){correct++;v.correct++}
 }
 model.dispose();
 console.log('LABPC_DOODLENET_EVAL',JSON.stringify({evaluated,correct,rate:Math.round(1000*correct/evaluated)/10,byCategory}));
}
