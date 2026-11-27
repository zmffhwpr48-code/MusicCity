(() => {
  const parts = window.SoundCityParts;
  if (!parts) throw new Error("Load building-parts.js before landmarks.js");
  const types = {
    eiffel:{height:175,top:"flat",windows:"grid",category:"landmark",facade:['#a89172', '#59483c', '#806650']},
    bigben:{height:148,top:"flat",windows:"grid",category:"landmark",facade:['#c4a779', '#7e6149', '#a88a60']},
    colosseum:{height:62,top:"flat",windows:"grid",category:"landmark",facade:['#cead86', '#80664e', '#b69371']},
    taj:{height:105,top:"flat",windows:"grid",category:"landmark",facade:['#ece5d9', '#a39b90', '#ccc4b8']},
    pisa:{height:96,top:"flat",windows:"grid",category:"landmark",facade:['#e4ddbb', '#968c77', '#c1b79b']},
    burj:{height:180,top:"flat",windows:"grid",category:"landmark",facade:['#8aaebc', '#38586c', '#648da3']},
    sydney:{height:70,top:"flat",windows:"grid",category:"landmark",facade:['#f1ead8', '#897f71', '#c7bcaa']},
    nseoul:{height:155,top:"flat",windows:"grid",category:"landmark",facade:['#dad7cb', '#7b838a', '#a9afb0']},
  };
  const labels = ["에펠탑", "빅벤", "콜로세움", "타지마할", "피사의 사탑", "부르즈 할리파", "시드니 오페라 하우스", "N서울타워"];
  function modelBounds(b) {
    if (!Object.hasOwn(types,b.buildingType)) return null;
    const availableX=b.width/90, availableY=b.depth/73;
    // Expand into both axes, but limit extra stretch along a narrow lot.
    const maxStretch=1.5;
    const sx=Math.min(availableX,availableY*maxStretch);
    const sy=Math.min(availableY,availableX*maxStretch);
    const width=90*sx, depth=73*sy;
    return {...b,x:b.x+(b.width-width)/2,y:b.y+(b.depth-depth)/2,
      width,depth,height:b.height*Math.sqrt(sx*sy),top:"flat"};
  }
  function drawLandmark(b,{box,polygon}) {
    const {x,y,width:w,depth:d,height:h}=modelBounds(b);
    const c=b.facade || types[b.buildingType].facade;
    const dark="#24323a", gold="#e3ba73", white="#e5ded0";
    const B=(u,v,a,e,z,t,col=c)=>box(x+u*w,y+v*d,a*w,e*d,t*h,col,z*h);
    const P=(pts,col)=>polygon(pts.map(([u,v,z])=>[x+u*w,y+v*d,z*h]),col);
    const F=(v,pts,col)=>P(pts.map(([u,z])=>[u,v,z]),col);
    const panel=(v,u,z,ww,hh,col)=>F(v,[[u,z],[u+ww,z],[u+ww,z+hh],[u,z+hh]],col);
    const R=(u,v,rx,ry,z)=>Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [u+rx*Math.cos(a),v+ry*Math.sin(a),z];});
    function ring(u,v,rx,ry,z,tx,ty,end,col=c){
      const a=R(u,v,rx,ry,z),q=R(u,v,tx,ty,end);
      for(let i=0;i<20;i++){
        const j=(i+1)%20;
        if(Math.cos((i+.5)*Math.PI/10)+Math.sin((i+.5)*Math.PI/10)>0)P([a[i],a[j],q[j],q[i]],col[i%3]);
      }
      if(tx&&ty)P(q,col[0]);
    }
    function arch(v,u,z,rx,ry,col){
      F(v,[[u-rx,z],[u+rx,z],...Array.from({length:11},(_,i)=>[u+rx*Math.cos(i*Math.PI/10),z+ry*Math.sin(i*Math.PI/10)])],col);
    }
    B(.04,.05,.92,.90,0,.035);
    switch(b.buildingType){
      case "eiffel": {
        const metal=c[2], shade=c[1], edge=c[0], inset="#4f4035";
        const levels=[[.035,.365,.060],[.085,.328,.056],[.15,.278,.050],
          [.222,.221,.045],[.299,.168,.039],[.376,.126,.034],[.455,.094,.030],
          [.548,.071,.026]];
        const pt=(u,v,z)=>[u,v,z];
        function frame(A,B,C,D,col){
          P([A,B,C,D],col);
          const at=(a,b,t)=>a.map((q,i)=>q+(b[i]-q)*t);
          const f=(t,k)=>at(at(A,B,t),at(D,C,t),k);
          P([f(.09,.08),f(.89,.08),f(.89,.92),f(.09,.92)],inset);
          P([f(.09,.08),f(.20,.08),f(.89,.92),f(.78,.92)],edge);
          P([f(.78,.08),f(.89,.08),f(.20,.92),f(.09,.92)],metal);
        }
        function leg(sx,sy){
          for(const [i,L] of levels.slice(0,-1).entries()){
            const [za,ra,ta]=L,[zb,rb,tb]=levels[i+1];
            const a=.5+sx*ra,b=.5+sy*ra,u=.5+sx*rb,v=.5+sy*rb;
            frame(pt(a+ta,b-ta,za),pt(a+ta,b+ta,za),pt(u+tb,v+tb,zb),pt(u+tb,v-tb,zb),shade);
            frame(pt(a-ta,b+ta,za),pt(a+ta,b+ta,za),pt(u+tb,v+tb,zb),pt(u-tb,v+tb,zb),metal);
          }
        }
        function archBeam(side){
          const make=(u,z,t)=>side===0?[u,.799-t,z]:[.799-t,u,z];
          const high=(a)=>.052+.222*Math.sin(a);
          for(let i=0;i<24;i++){
            const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
            const u=.5+.326*Math.cos(a),v=.5+.326*Math.cos(b),z=high(a),q=high(b);
            const A=make(u,z,0),B=make(v,q,0),C=make(v,q-.021,0),D=make(u,z-.021,0);
            P([A,B,C,D],side===0?metal:shade);
            P([A,B,make(v,q,.027),make(u,z,.027)],edge);
          }
        }
        leg(-1,-1); leg(1,-1); leg(-1,1);
        archBeam(1); archBeam(0); leg(1,1);
        for(const u of [.135,.865])for(const v of [.135,.865])B(u-.082,v-.082,.164,.164,.035,.021,["#a29888","#5f564d","#82776a"]);
        function deck(r,z,t){
          B(.5-r,.5-r,r*2,r*2,z,t,[edge,shade,metal]);
          B(.5-r-.009,.5-r-.009,2*r+.018,2*r+.018,z+t-.005,.008,[edge,shade,edge]);
          for(let i=1;i<=10;i++)panel(.501+r,.5-r+2*r*i/11,z+.004,.009,t*.48,inset);
        }
        deck(.181,.231,.032); deck(.101,.536,.025);
        const tower=[[.553,.074],[.625,.060],[.693,.048],[.756,.038],[.81,.029],[.853,.022],[.886,.017]];
        for(let i=0;i<tower.length-1;i++){
          const [a,r]=tower[i],[b,t]=tower[i+1];
          frame([.5+r,.5-r,a],[.5+r,.5+r,a],[.5+t,.5+t,b],[.5+t,.5-t,b],shade);
          frame([.5-r,.5+r,a],[.5+r,.5+r,a],[.5+t,.5+t,b],[.5-t,.5+t,b],metal);
        }
        deck(.046,.884,.021);
        B(.47,.47,.06,.06,.905,.026,[edge,shade,metal]);
        panel(.531,.478,.910,.044,.013,"#a5bbba");
        B(.494,.494,.012,.012,.931,.057,[edge,shade,metal]);
        B(.496,.496,.008,.008,.988,.012,[white,edge,edge]);
        break;
      }
      case "bigben":
        B(.25,.26,.50,.48,.035,.83); B(.21,.22,.58,.56,.64,.025); B(.22,.23,.56,.54,.83,.04);
        for(const u of [.28,.38,.60,.70]) B(u,.744,.025,.021,.08,.55,[gold,c[1],gold]);
        for(const u of [.28,.69])B(u,.69,.035,.055,.87,.06);
        P([[.22,.77,.87],[.78,.77,.87],[.50,.50,.99]],c[2]); P([[.78,.23,.87],[.78,.77,.87],[.50,.50,.99]],c[1]);
        F(.746,Array.from({length:24},(_,i)=>[.5+.122*Math.cos(i*Math.PI/12),.75+.061*Math.sin(i*Math.PI/12)]),white);
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const u=.5+.103*Math.sin(a),z=.75+.051*Math.cos(a);
          panel(.747,u-.006,z-.004,.012,.008,dark);
        }
        for(const z of [.17,.32,.49])for(const u of [.43,.52])arch(.746,u,z,.022,.10,dark);
        for(const z of [.16,.33,.50,.59])panel(.748,.255,z,.49,.008,gold);
        F(.747,[[.493,.745],[.509,.745],[.509,.786],[.493,.786]],dark); F(.747,[[.497,.749],[.555,.737],[.557,.747],[.50,.76]],dark);break;
      case "colosseum":
        for(const [z,end] of [[.035,.34],[.34,.65],[.65,1]]){
          const r=.44-z*.055;
          ring(.5,.5,r,.40,z,r,.40,end);
          // Stone cornices follow the outer wall of each arcade tier.
          ring(.5,.5,r+.013,.414,end-.018,r+.013,.414,end,c);
          for(let i=0;i<10;i++){
            const a=.015+i*2.18/9, q=a+.020;
            const edge=(t,height)=>[.5+(r+.014)*Math.cos(t),.5+.414*Math.sin(t),height];
            P([edge(a,z+.019),edge(q,z+.019),edge(q,end-.018),edge(a,end-.018)],c[0]);
          }
          for(let i=0;i<10;i++){
            const a=.10+i*2.18/9;
            P(Array.from({length:13},(_,j)=>{const q=j<2?(j===0?a-.075:a+.075):a+.075*Math.cos((j-2)*Math.PI/10);return [.5+(r+.003)*Math.cos(q),.5+.404*Math.sin(q),z+.045+(j<2?0:.20*Math.sin((j-2)*Math.PI/10))];}),dark);
          }
        }
        P(R(.5,.5,.32,.29,1),c[1]);
        for(let i=0;i<3;i++)P(R(.5,.5,.275-i*.036,.245-i*.032,1),i%2?c[2]:c[0]);
        P(R(.5,.5,.16,.13,1),"#a78259"); break;
      case "taj":
        B(.19,.25,.62,.54,.035,.46);
        for(const u of [.20,.40,.58,.78])panel(.791,u,.058,.017,.421,c[2]);
        panel(.791,.19,.45,.62,.015,white);
        panel(.791,.19,.063,.62,.014,c[1]);
        for(const u of [.32,.68])arch(.793,u,.31,.039,.094,c[1]);
        for(const u of [.32,.50,.68])arch(.793,u,.08,u===.50?.105:.056,u===.50?.33:.22,dark);
        for(const [u,v] of [[.1,.14],[.9,.14],[.1,.86],[.9,.86]]){
          ring(u,v,.043,.051,.035,.036,.043,.65);
          for(const z of [.23,.44,.62])ring(u,v,.052,.060,z,.052,.060,z+.024);
          ring(u,v,.044,.051,.65,0,0,.73);
        }
        for(const [z,r,t,end] of [[.49,.18,.24,.60],[.60,.24,.22,.74],[.74,.22,.12,.86],[.86,.12,.022,.94]])ring(.5,.51,r,r,z,t,t,end);
        for(const [u,v] of [[.29,.36],[.71,.36],[.28,.72],[.72,.72]]){
          ring(u,v,.045,.050,.495,.045,.050,.555);
          ring(u,v,.063,.068,.555,.028,.033,.618);
          ring(u,v,.028,.033,.618,0,0,.65);
        }
        B(.492,.502,.016,.016,.94,.06,[gold,gold,gold]); break;
      case "pisa":
        for(let i=0;i<7;i++){
          const z=.035+i*.126,u=.40+i*.025,r=i===6?.19:.26;
          ring(u,.5,r,.27,z,r,.27,z+.107);
          for(let j=0;j<6;j++){
            const a=.035+j*.41,q=a+.035;
            const edge=(t,height)=>[u+(r+.010)*Math.cos(t),.5+.281*Math.sin(t),height];
            P([edge(a,z+.011),edge(q,z+.011),edge(q,z+.102),edge(a,z+.102)],c[0]);
          }
          for(let j=0;j<6;j++){
            const a=.19+j*.41,q=i===6?.07:.095;
            P(Array.from({length:13},(_,k)=>{const t=k<2?(k===0?a-q:a+q):a+q*Math.cos((k-2)*Math.PI/10);return [u+(r+.004)*Math.cos(t),.5+.274*Math.sin(t),z+.015+(k<2?0:.077*Math.sin((k-2)*Math.PI/10))];}),dark);
          }
          ring(u,.5,r+.018,.288,z+.104,r+.018,.288,z+.117);
        }
        ring(.55,.5,.19,.20,.91,.15,.15,1); break;
      case "burj":
        for(let i=0;i<9;i++){
          const z=.035+i*.096,r=.36-i*.034;
          B(.48-r,.49-r*.65,r*2,r*1.3,z,.096);
          if(i<7) B(.48,.49,r*1.15,r*1.13,z,.075);
          const face=.48+(i<7?r*1.15:r);
          const yy=i<7?.49:.49-r*.65;
          const dd=i<7?r*1.13:r*1.3;
          for(let k=1;k<=5;k++){
            const t=yy+dd*k/6;
            P([[face+.002,t,z+.006],[face+.002,t+.006,z+.006],[face+.002,t+.006,z+.068],[face+.002,t,z+.068]],c[0]);
          }
          const v=i<7?.49+r*1.13:.49+r*.65;
          const start=i<7?.48:.48-r, end=i<7?.48+r*1.15:.48+r;
          for(let j=1;j<=4;j++){const u=start+(end-start)*j/5;F(v+.002,[[u,z+.01],[u+.008,z+.01],[u+.008,z+.068],[u,z+.068]],"#b6dbdf");}
        }
        B(.472,.48,.016,.021,.899,.101); break;
      case "sydney":
        B(.04,.17,.92,.69,.035,.17); B(.12,.22,.76,.60,.205,.06,[dark,dark,dark]);
        for(let i=0;i<4;i++)B(.16+i*.025,.86-i*.028,.68-i*.05,.08,.035,.023*(i+1));
        for(let i=0;i<13;i++)panel(.822,.14+i*.055,.21,.008,.05,c[2]);
        for(const [u,v,r,z] of [[.29,.35,.25,.74],[.55,.42,.30,1],[.74,.57,.22,.82],[.34,.68,.22,.60]]){
          const shell=Array.from({length:13},(_,i)=>{const t=i/12;return [u-r+2*r*t,v-.15*Math.sin(t*Math.PI),.265+(z-.265)*Math.pow(Math.sin(Math.PI*t),.75)*(.35+.65*t)];});
          // Smooth crest; a solid inner surface closes each shell.
          for(let i=1;i<12;i++){
            const t=i/12,peak=.66;
            const theta=t<peak?t/peak*Math.PI/2:Math.PI/2+(t-peak)/(1-peak)*Math.PI/2;
            shell[i][2]=.265+(z-.265)*Math.pow(Math.sin(theta),1.15);
          }
          for(let i=0;i<12;i++)P([shell[i],shell[i+1],[u-r,v+.08,.265]],c[1]);
          for(let i=0;i<12;i++)P([shell[i],shell[i+1],[u+r,v+.18,.265]],c[i%3===0?2:0]);
          const foot=[u+r,v+.18,.265];
          for(let i=2;i<12;i+=2){
            const a=shell[i],q=shell[i+1],e=a.map((n,j)=>n+(q[j]-n)*.11);
            P([a,e,foot],"#d3c9b6");
          }
        } break;
      case "nseoul":
        B(.23,.26,.54,.48,.035,.10); ring(.5,.5,.108,.125,.135,.062,.073,.69);
        ring(.5,.5,.068,.08,.61,.24,.27,.66); ring(.5,.5,.24,.27,.66,.24,.27,.75);
        ring(.5,.5,.24,.27,.69,.24,.27,.723,["#87bccd",dark,"#4b8298"]);
        for(let i=0;i<12;i++){
          const a=-.58+i*.23,q=a+.037;
          const edge=(t,z)=>[.5+.243*Math.cos(t),.5+.274*Math.sin(t),z];
          P([edge(a,.69),edge(q,.69),edge(q,.724),edge(a,.724)],dark);
        }
        ring(.5,.5,.069,.081,.56,.076,.088,.577,[white,c[1],c[2]]);
        ring(.5,.5,.24,.27,.75,.13,.15,.78);
        for(let i=0;i<6;i++) B(.49,.486,.020,.028,.78+i*.0367,Math.min(.0367,1-(.78+i*.0367)),i%2?[white,white,white]:["#d85a58","#953d42","#b34748"]);
        break;
    }
  }
  Object.assign(parts.types, types);
  const style = document.createElement("style");
  style.textContent = "sound-city-map .landmark-choices-title { padding: 8px 12px; margin: 0; font-size: .85rem; border-top: 1px solid #ffffff25; }";
  document.head.append(style);
  window.SoundCityLandmarks = {
    modelBounds,
    addChoices(select, group) {
      const options = document.createElement("optgroup");
      options.label = "랜드마크";
      Object.keys(types).forEach((id, index) => options.append(new Option(labels[index], id)));
      select.append(options);
      const title = document.createElement("h4");
      title.className = "landmark-choices-title";
      title.textContent = options.label;
      const cards = document.createElement("div");
      cards.className = "city-choices";
      cards.setAttribute("role", "group");
      cards.setAttribute("aria-label", options.label);
      group.after(title, cards);
      return cards;
    },
    draw(b, helpers) {
      if (!Object.hasOwn(types, b.buildingType)) return false;
      drawLandmark(b, helpers);
      return true;
    }
  };
})();
