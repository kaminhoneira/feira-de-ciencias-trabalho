const KEY='bateria_participantes';
const TESTS=['reacao','memoria','atencao','numero','motora'];
const EMPTY=()=>({reacao:null,memoria:null,atencao:null,numero:null,motora:null});
let results=EMPTY(), currentId=null;

function loadAll(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } }
function save(){
  if(!currentId) return;
  const all=loadAll(); all[currentId]=results;
  try{ localStorage.setItem(KEY,JSON.stringify(all)); }catch(e){}
}

const clamp=v=>Math.max(0,Math.min(100,v));
const SCORE={
  reacao:ms=>clamp((600-ms)/(600-200)*100),     
  memoria:d=>d/6*100,                            
  atencao:c=>c/8*100,                            
  numero:c=>c/5*100,                             
  motora:ms=>clamp((12000-ms)/(12000-4000)*100) 
};
function notas(r){
  const n={};
  TESTS.forEach(t=>{ n[t]=r[t]==null?null:SCORE[t](r[t]); });
  n.final=TESTS.every(t=>n[t]!=null)?TESTS.reduce((a,t)=>a+n[t],0)/TESTS.length:null;
  return n;
}

function setMsg(t){
  const m=document.getElementById('idMsg');
  m.textContent=t||'PRESSIONE ENTER PARA CONTINUAR'; m.style.color=t?'#e04040':'var(--dim)';
}
function startParticipant(){
  const id=document.getElementById('pid').value.trim().toUpperCase();
  if(!id){ setMsg('DIGITE UM ID'); return; }
  const old=loadAll()[id];
  if(old&&TESTS.every(t=>old[t]!=null)){ setMsg('ESSE ID JÁ FEZ TODOS OS TESTES. USE OUTRO.'); return; }
  if(currentId){ try{ sessionStorage.setItem('pendingId',id); }catch(e){} location.reload(); return; }
  currentId=id; results=EMPTY(); setMsg(''); save(); showSection('reacao');
}

function showSection(id){
  if(id!=='inicio'&&id!=='resultados'&&!currentId){ id='inicio'; setMsg('DIGITE SEU ID E PRESSIONE ENTER'); }
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('show'));
  document.getElementById(id).classList.add('show');
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.s===id));
  if(id==='resultados') renderResults();
}
document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.s)));

(function(){
  const stage=document.getElementById('reacaoStage');
  let times=[], n=0, t0, state='idle';
  function runTrial(){
    state='waiting'; stage.style.background=''; stage.style.color=''; stage.textContent='Aguarde...';
    setTimeout(()=>{
      state='go'; stage.style.background='#fff'; stage.style.color='#000';
      stage.textContent='PRESSIONE ESPAÇO!'; t0=performance.now();
    },800+Math.random()*2000);
  }
  document.addEventListener('keydown',e=>{
    if(e.code!=='Space') return;
    if(!document.getElementById('reacao').classList.contains('show')) return;
    e.preventDefault();
    if(state==='idle'){ runTrial(); return; }
    if(state==='go'){
      const dt=Math.round(performance.now()-t0);
      times.push(dt); n++;
      stage.style.background=''; stage.style.color='';
      if(n<3){ state='idle'; stage.textContent='Tentativa '+n+'/3 — '+dt+'ms. Pressione ESPAÇO para a próxima.'; }
      else{
        state='done';
        const avg=Math.round(times.reduce((a,b)=>a+b)/times.length);
        results.reacao=avg; save();
        stage.textContent='Concluído! Média: '+avg+'ms';
      }
    }
  });
})();

(function(){
  const stage=document.getElementById('memoriaStage'), btn=document.getElementById('memoriaStart'), inp=document.getElementById('memoriaInput');
  let seq='';
  btn.addEventListener('click',()=>{
    if(inp.style.display==='none'){
      seq=Array.from({length:6},()=>Math.floor(Math.random()*10)).join('');
      stage.textContent=seq; stage.style.fontSize='36px';
      inp.style.display='none';
      setTimeout(()=>{
        stage.textContent='Digite a sequência e pressione ENTER'; stage.style.fontSize='';
        inp.style.display='block'; inp.value=''; inp.focus();
        btn.textContent='VERIFICAR';
      },3000);
    } else {
      const ans=inp.value.trim(); let d=0;
      for(let i=0;i<6;i++) if(ans[i]===seq[i]) d++;
      results.memoria=d; save();
      stage.textContent=d===6?'Correto!':'Você acertou '+d+'/6 dígitos. A sequência era '+seq;
      inp.style.display='none'; btn.disabled=true; btn.textContent='CONCLUÍDO';
    }
  });
})();

(function(){
  const stage=document.getElementById('atencaoStage'), btn=document.getElementById('atencaoStart'), btns=document.getElementById('atencaoBtns');
  const cores=[['VERMELHO','#e04040'],['AZUL','#4090f0'],['VERDE','#40c060'],['AMARELO','#e0d040']];
  let round=0, correct=0, total=8;
  function next(){
    if(round>=total){
      results.atencao=correct; save();
      stage.textContent='Concluído: '+correct+'/'+total; btns.style.display='none';
      btn.disabled=true; btn.textContent='CONCLUÍDO'; return;
    }
    const word=cores[Math.floor(Math.random()*4)][0];
    const colorObj=cores[Math.floor(Math.random()*4)];
    stage.innerHTML='<span style="color:'+colorObj[1]+'; font-size:34px;">'+word+'</span>';
    btns.innerHTML='';
    btns.style.display='flex';
    cores.forEach(c=>{
      const b=document.createElement('button');
      b.className='go'; b.textContent=c[0]; b.style.background=c[1]; b.style.color='#111';
      b.onclick=()=>{ if(c[0]===colorObj[0]) correct++; round++; next(); };
      btns.appendChild(b);
    });
  }
  btn.addEventListener('click',()=>{ round=0; correct=0; next(); btn.style.display='none'; });
})();

/* ---- NÚMERO ---- */
(function(){
  const stage=document.getElementById('numeroStage'), btn=document.getElementById('numeroStart'), btns=document.getElementById('numeroBtns');
  let q=0, correct=0, total=5, answer;
  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }
  function ask(){
    if(q>=total){
      results.numero=correct; save();
      stage.textContent='Concluído: '+correct+'/'+total;
      btns.style.display='none'; return;
    }
    const a=Math.floor(Math.random()*20)+1, b=Math.floor(Math.random()*20)+1;
    const op=Math.random()<0.5?'+':'-';
    answer=op==='+'?a+b:a-b;
    stage.textContent=a+' '+op+' '+b+' = ?';
    const options=new Set([answer]);
    while(options.size<4){
      const fake=answer+(Math.floor(Math.random()*9)-4);
      if(fake!==answer) options.add(fake);
    }
    btns.innerHTML=''; btns.style.display='flex';
    shuffle(Array.from(options)).forEach(o=>{
      const b=document.createElement('button');
      b.className='go'; b.textContent=o;
      b.onclick=()=>{ if(o===answer) correct++; q++; ask(); };
      btns.appendChild(b);
    });
  }
  btn.addEventListener('click',()=>{ q=0; correct=0; ask(); });
})();

(function(){
  const stage=document.getElementById('motoraStage'), btn=document.getElementById('motoraStart');
  let hits=0, total=8, t0;
  function spawn(){
    if(hits>=total){
      const dt=Math.round(performance.now()-t0);
      results.motora=dt; save();
      stage.innerHTML='Concluído: '+dt+'ms'; btn.disabled=true; btn.textContent='CONCLUÍDO'; return;
    }
    stage.innerHTML='';
    const t=document.createElement('div'); t.className='target';
    const maxX=stage.clientWidth-60, maxY=stage.clientHeight-60;
    t.style.left=Math.floor(Math.random()*Math.max(maxX,0))+'px';
    t.style.top=Math.floor(Math.random()*Math.max(maxY,0))+'px';
    t.onclick=()=>{ hits++; spawn(); };
    stage.appendChild(t);
  }
  btn.addEventListener('click',()=>{ hits=0; t0=performance.now(); spawn(); btn.disabled=true; });
})();

const LABEL={reacao:'Reação',memoria:'Memória',atencao:'Atenção',numero:'Número',motora:'Motora'};
const fmt={
  reacao:v=>v==null?'—':v+' ms', memoria:v=>v==null?'—':v+'/6', atencao:v=>v==null?'—':v+'/8',
  numero:v=>v==null?'—':v+'/5', motora:v=>v==null?'—':(v/1000).toFixed(1)+' s'
};
const pts=v=>v==null?'—':v.toFixed(1);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const esc=t=>t.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');

function renderResults(){
  const all=loadAll(), rows=Object.keys(all).map(id=>({id,r:all[id],n:notas(all[id])}));
  const done=rows.filter(x=>x.n.final!=null).sort((a,b)=>b.n.final-a.n.final);
  const rest=rows.filter(x=>x.n.final==null);

  const me=document.getElementById('resMe');
  if(currentId){
    const n=notas(results);
    me.innerHTML='<h2>'+esc(currentId)+' — SEUS RESULTADOS</h2><table>'
      +TESTS.map(t=>'<tr><td>'+LABEL[t]+'</td><td>'+fmt[t](results[t])+'</td><td>'+pts(n[t])+' pts</td></tr>').join('')
      +'<tr class="avg"><td>NOTA FINAL</td><td></td><td>'+pts(n.final)+'</td></tr></table>';
  } else me.innerHTML='';

  const line=(pos,x)=>'<tr><td>'+pos+'</td><td>'+esc(x.id)+'</td>'+TESTS.map(t=>'<td>'+fmt[t](x.r[t])+'</td>').join('')+'<td>'+pts(x.n.final)+'</td></tr>';
  const mean=t=>{ const v=avg(rows.map(x=>x.r[t]).filter(v=>v!=null)); return v==null?'—':fmt[t](Math.round(v*10)/10); };
  document.getElementById('resTable').innerHTML=rows.length
    ? '<tr><td>#</td><td>ID</td>'+TESTS.map(t=>'<td>'+LABEL[t].toUpperCase()+'</td>').join('')+'<td>NOTA</td></tr>'
      +done.map((x,i)=>line((i+1)+'º',x)).join('')
      +rest.map(x=>line('…',x)).join('')
      +'<tr class="avg"><td></td><td>MÉDIA</td>'+TESTS.map(t=>'<td>'+mean(t)+'</td>').join('')+'<td>'+pts(avg(done.map(x=>x.n.final)))+'</td></tr>'
    : '<tr><td>Nenhum participante ainda.</td></tr>';
}
document.getElementById('newBtn').addEventListener('click',()=>location.reload());
(function(){
  const b=document.getElementById('clearBtn'); let armed=false;
  b.addEventListener('click',()=>{
    if(!armed){ armed=true; b.textContent='CLIQUE DE NOVO PARA CONFIRMAR'; return; }
    try{ localStorage.removeItem(KEY); }catch(e){}
    location.reload();
  });
})();

const starters={memoria:'memoriaStart',atencao:'atencaoStart',numero:'numeroStart',motora:'motoraStart'};
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    const sec=document.querySelector('.section.show');
    const b=sec&&starters[sec.id]&&document.getElementById(starters[sec.id]);
    if(!b||b.dataset.used) return;
    e.preventDefault(); b.dataset.used='1'; b.click();
  }
  if(e.code==='Enter'){
    if(e.target.id==='pid') startParticipant();
    if(e.target.id==='memoriaInput') document.getElementById('memoriaStart').click();
  }
});
document.getElementById('pid').value='';
try{
  const p=sessionStorage.getItem('pendingId');
  if(p){ sessionStorage.removeItem('pendingId'); document.getElementById('pid').value=p; startParticipant(); }
}catch(e){}
