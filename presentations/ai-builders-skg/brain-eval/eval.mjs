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
  // The app hides anything at distance >= 1.0, so a top hit past the cutoff means "nothing shown".
  const shown = r[0][0] < 1;
  const top = shown ? notes[r[0][1]].text.slice(0,45) : `(nothing shown; nearest: ${notes[r[0][1]].text.slice(0,30)})`;
  // expect: a substring of the right note | null = the app should show nothing | 'zzz' = no right answer, just look
  const verdict = expect === null ? (shown ? 'MISS' : 'OK  ')
    : expect === 'zzz' ? '----'
    : (shown && notes[r[0][1]].text.includes(expect) ? 'OK  ' : 'MISS');
  console.log(verdict+` d=${r[0][0].toFixed(2)} n<1:${V.length&&r.filter(x=>x[0]<1).length} | ${q} -> ${top} || 2nd d=${r[1][0].toFixed(2)} ${notes[r[1][1]].text.slice(0,30)}`);
}
