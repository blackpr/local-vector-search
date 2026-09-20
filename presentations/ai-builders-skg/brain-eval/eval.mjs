import { pipeline } from '@huggingface/transformers';
import fs from 'fs';
const notes = JSON.parse(fs.readFileSync(new URL('../talk-brain.json', import.meta.url),'utf8'));
const ex = await pipeline('feature-extraction','onnx-community/embeddinggemma-300m-ONNX',{dtype:process.env.DT||'q4'});
const emb = async (t,q)=> (await ex((q?'task: search result | query: ':'title: none | text: ')+t,{pooling:'mean',normalize:true})).data;
const V=[]; for(const n of notes) V.push(await emb(n.text,false));
const qs = JSON.parse(fs.readFileSync(new URL(process.argv[2] || './queries.json', import.meta.url),'utf8'));
for(const [q,expect] of qs){
  const qv=await emb(q,true);
  const r=V.map((v,i)=>{let s=0;for(let k=0;k<v.length;k++){const d=v[k]-qv[k];s+=d*d}return [Math.sqrt(s),i]}).sort((a,b)=>a[0]-b[0]).slice(0,3);
  const top=notes[r[0][1]].text.slice(0,45);
  const ok = notes[r[0][1]].text.includes(expect);
  console.log((ok?'OK  ':'MISS')+` d=${r[0][0].toFixed(2)} n<1:${V.length&&r.filter(x=>x[0]<1).length} | ${q} -> ${top} || 2nd d=${r[1][0].toFixed(2)} ${notes[r[1][1]].text.slice(0,30)}`);
}
