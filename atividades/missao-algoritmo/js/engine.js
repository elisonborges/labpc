
const STORE="labpc_algoritmo_v13";
const Store={load(){try{return JSON.parse(localStorage.getItem(STORE))||{done:{},achievement:false}}catch(e){return{done:{},achievement:false}}},save(x){localStorage.setItem(STORE,JSON.stringify(x))},reset(){localStorage.removeItem(STORE)}};
const Nexo={dirs:["N","E","S","W"],delta:{N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]},
 turn(d,s){let i=this.dirs.indexOf(d);return this.dirs[(i+(s==="R"?1:3))%4]},
 run(p,sc){let x=sc.start.x,y=sc.start.y,d=sc.start.dir,path=[{x,y}],hit=false;for(const c of p){if(c==="L")d=this.turn(d,"L");else if(c==="R")d=this.turn(d,"R");else if(c==="F"){let [dx,dy]=this.delta[d],nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=sc.size||ny>=sc.size||sc.walls.some(w=>w.x===nx&&w.y===ny)){hit=true;break}x=nx;y=ny;path.push({x,y})}}return{x,y,d,path,hit,success:x===sc.goal.x&&y===sc.goal.y}}
};
function scene(m,l,variant=0){let size=m>=9?6:5,seed=(m*131+l*47+variant*17+Math.floor(Math.random()*400))%997;let st={x:seed%size,y:(seed*3+1)%size,dir:Nexo.dirs[seed%4]},g={x:(seed*5+2)%size,y:(seed*7+3)%size};if(st.x===g.x&&st.y===g.y)g.x=(g.x+2)%size;let walls=[];if(m>=5)for(let k=0;k<Math.min(2,m-4);k++){let w={x:(seed+k*2+1)%size,y:(seed+k*3+2)%size};if(!(w.x===st.x&&w.y===st.y)&&!(w.x===g.x&&w.y===g.y))walls.push(w)}return{size,start:st,goal:g,walls,seed:`${m}.${l}-${seed}`}}
window.Store=Store;window.Nexo=Nexo;window.makeScene=scene;
