(() => {
  const types = {
    tower:{height:110},house:{height:32},duplex:{height:62},
    shop:{height:48},apartment:{height:132},factory:{height:42},
    medieval:{height:65,top:"gable"},renaissance:{height:78,top:"flat"},
    gothic:{height:105,top:"gable"},baroque:{height:82,top:"flat"},
    artdeco:{height:138,top:"steps"},japanese:{height:60,top:"gable"},
    firestation:{height:44,top:"flat",facade:["#704749","#603a3c","#895653"],windows:"wide"},
    police:{height:62,top:"flat",facade:["#526984","#334965","#506684"],windows:"grid"},
    hospital:{height:90,top:"flat",facade:["#9aaeb8","#627b8b","#849ca9"],windows:"wide"}
  };
  function volumes(b) {
    const {x,y,width:w,depth:d,height:h}=b;
    const volume=(u,v,width,depth,height)=>({x:x+u,y:y+v,width,depth,height});
    switch(b.buildingType) {
      case "house": return [volume(10,12,w-20,d-24,h)];
      case "duplex": return [volume(0,0,w,d,h*.48),volume(14,8,w-28,d-22,h)];
      case "shop": return [volume(0,0,w,d,h*.55),volume(5,5,w-10,d-10,h)];
      case "apartment": return [volume(5,5,w-10,d-10,h)];
      case "factory": return [volume(0,0,w,d,h*.65),volume(w*.65,4,w*.30,d*.48,h)];
      default: return [volume(0,0,w,d,h)];
    }
  }

  function drawCharacter(b,a) {
    const {box,polygon,plane,ctx,project,scale}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const c=b.facade ?? ["#414961","#242c44","#323b55"];
    const trim=["#b19972","#594b40","#8c785c"];
    const glass=["#8aa9ad","#24414e","#536f78"];
    const solid=(u,v,ww,dd,hh,colors=trim,z=0)=>box(x+u,y+v,ww,dd,hh,colors,z);
    const front=(u,z,ww,hh,color)=>polygon([[x+u,y+d+.6,z],[x+u+ww,y+d+.6,z],[x+u+ww,y+d+.6,z+hh],[x+u,y+d+.6,z+hh]],color);
    function entrance(u,width,height) {
      solid(u-2,d-1,width+4,3,height+2,trim);
      front(u,1,width,height,"#302e35");
      front(u+2,height*.4,width-4,height*.5,"#c3ab72");
      solid(u-4,d+2,width+8,7,2,trim);
    }
    function planter(u,v) {
      solid(u,v,7,6,4,["#92705a","#543d36","#795444"]);
      solid(u+1,v+1,5,4,4,["#7f9664","#355145","#55774e"],4);
    }
    function rail(u,v,ww,z) {
      solid(u,v,ww,1,2,trim,z+8);
      for(let i=0;i<=ww;i+=6)solid(u+i,v,1,1,8,trim,z);
    }
    switch(b.buildingType) {
      case "house": {
        const fy=d-12, doorHeight=Math.min(20,h*.65);
        // Porch sits against the smaller residential footprint.
        solid(25,fy,34,16,3);
        solid(26,fy+12,3,3,doorHeight+3);
        solid(54,fy+12,3,3,doorHeight+3);
        solid(23,fy-1,38,18,3,trim,doorHeight+5);
        solid(35,fy,13,1,doorHeight,["#74583d","#41362d","#74583d"]);
        for(const u of [15,59]) {
          solid(u,fy,12,2,2,trim,h*.63);
          planter(u,fy+2);
        }
        for(const u of [15,65])planter(u,d+3);
        solid(30,d+9,25,7,2);
        break;
      }
      case "duplex":
        entrance(30,15,Math.min(22,h*.4));
        solid(11,d-10,w-22,17,3,trim,h*.49);
        rail(11,d+6,w-22,h*.49+3);
        for(const u of [11,w-13])solid(u,d+4,2,2,h*.49);
        for(let i=0;i<5;i++) solid(w-19-i*3,d-5,4,12,2,trim,i*2);
        planter(14,d-7);planter(w-24,d-7);
        break;
      case "shop":
        for(const u of [10,53]) {
          front(u,7,25,Math.min(22,h*.48),"#8faeb0");
          solid(u-2,d,2,2,Math.min(26,h*.55));
          solid(u+12,d,1,2,Math.min(26,h*.55));
        }
        entrance(39,10,Math.min(25,h*.6));
        solid(5,d,w-10,9,3,trim,h*.58);
        for(let u=6;u<w-6;u+=9)solid(u,d+1,8,9,2,
          u%18<9?["#b37c5b","#704a40","#b37c5b"]:["#d8c393","#a18b67","#d8c393"],h*.58+3);
        solid(8,d+1,w-16,2,9,trim,h*.76);
        {
          const [sx,sy]=project(x+w/2,y+d+3,h*.76+4);
          ctx.save();ctx.translate(sx,sy);ctx.transform(1,.49,0,1,0,0);
          ctx.fillStyle="#ffe1a0";ctx.font=Math.max(5,8*scale)+"px system-ui";ctx.textAlign="center";
          ctx.fillText(b.signText||"SOUND & CO.",0,0,(w-22)*scale);ctx.restore();
        }
        planter(3,d+3);planter(w-10,d+3);
        break;
      case "apartment":
        for(let z=24;z<h-8;z+=24) {
          solid(6,d-5,w-12,8,2,trim,z);
          rail(7,d+2,w-14,z+2);
          for(const u of [8,34,60])solid(u,d-5,2,7,9,trim,z+2);
        }
        entrance(w/2-7,14,20);
        solid(w/2-12,d-3,24,9,3,trim,23);
        for(const u of [5,w-8])solid(u,d-5,3,3,h,c);
        break;
      case "factory":
        solid(8,d-2,w*.5,3,Math.min(27,h*.58),["#828b93","#45515e","#667381"]);
        for(let z=4;z<h*.58;z+=4)front(10,z,w*.5-4,1,"#394652");
        solid(w*.72,10,8,8,h+23,["#8d7667","#524b49","#70605a"]);
        solid(w*.70,8,12,12,3,trim,h+22);
        for(const u of [10,31,52]) {
          solid(u,10,16,d*.45,3,["#91a5ad","#3f5c6b","#668492"],h*.65);
        }
        for(const u of [12,32,52])front(u,h*.48,14,5,"#9eb4b7");
        entrance(w-21,11,Math.min(20,h*.5));
        break;
    }
  }


  function drawFactory(b,a) {
    const {box,plane,polygon}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const c=b.facade ?? ["#414961","#242c44","#323b55"];
    const workHeight=h*.72;
    const workWidth=w*.68;
    const officeX=x+workWidth;
    const officeWidth=w-workWidth;
    const officeDepth=d*.56;
    const trim=["#8b929c","#424d60","#69778b"];
    // Foundations are drawn before any structure so they cannot cover walls.
    // The chimney starts at the roof. Its buried section is never painted.
    const chimneyX=x+w*.78, chimneyY=y+6;
    box(chimneyX,chimneyY,7,7,h*.50,["#998572","#594f49","#7a6b60"],h);
    box(chimneyX-1,chimneyY-1,9,9,2,["#b5a17d","#645647","#8e795e"],h+h*.50);
    // Rear service wing is painted before the foreground production hall.
    box(officeX,y,officeWidth,officeDepth,h,c);
    drawFacade({...b,x:officeX,y,width:officeWidth,depth:officeDepth,
      windows:b.windows,decorations:[]},a);
    plane(officeX+2,y+2,officeWidth-4,officeDepth-4,c[0],h);
    box(x,y,workWidth,d,workHeight,c);
    const roofBuilding={...b,width:workWidth,height:workHeight};
    // Front windows and ornaments remain bounded by the production hall.
    drawFacade({...roofBuilding,decorations:(b.decorations??[]).filter(name=>name!=="sign")},a);
    // Roller door covers the wall windows beneath it.
    const doorWidth=workWidth*.65, doorHeight=Math.min(27,workHeight*.70);
    box(x+5,y+d,doorWidth,1.5,doorHeight,trim);
    for(let z=3;z<doorHeight;z+=3) {
      polygon([[x+6,y+d+1.6,z],[x+doorWidth+4,y+d+1.6,z]],"transparent","#394652");
    }
    const entryX=x+workWidth-12;
    box(entryX-1,y+d,10,1.5,Math.min(20,workHeight*.7),trim);
    box(entryX,y+d+1.6,8,.3,Math.min(18,workHeight*.6),
      ["#b7a06a","#343541","#b7a06a"]);
    box(entryX-2,y+d+2,12,4,1.5,trim);
    // Roof fixtures stay entirely inside the exposed work-hall roof.
    if(b.top==="flat") {
      for(let i=0;i<3;i++) {
        const u=x+6+i*(workWidth-12)/3;
        box(u,y+9,(workWidth-18)/3,d*.48,2,
          ["#9cb8be","#486773","#718e9a"],workHeight);
      }
    } else if(b.top==="gable") {
      polygon([[x,y+d,workHeight],[x+workWidth,y+d,workHeight],
        [x+workWidth/2,y+d,workHeight+16]],c[2]);
      polygon([[x+workWidth,y,workHeight],[x+workWidth,y+d,workHeight],
        [x+workWidth/2,y+d,workHeight+16],[x+workWidth/2,y,workHeight+16]],c[0]);
    } else if(b.top==="steps") {
      box(x+7,y+7,workWidth-14,d-14,8,c,workHeight);
      box(x+14,y+14,workWidth-28,d-28,7,c,workHeight+8);
    } else if(b.top==="garden") {
      plane(x+6,y+6,workWidth-12,d-12,"#486045",workHeight);
    } else if(b.top==="antenna") {
      box(x+12,y+12,12,10,6,c,workHeight);
      box(x+17,y+16,2,2,22,trim,workHeight+6);
    } else {
      drawRoof(b.top,roofBuilding,a);
    }
  }


  function drawArchitecture(b,a) {
    const {box,polygon,ctx,project,scale}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const c=b.facade ?? ["#414961","#242c44","#323b55"];
    const gold=["#c1aa77","#685640","#94805b"];
    const timber=["#8d7158","#423a36","#685345"];
    const stone=["#a5a9ad","#5b6372","#808a99"];
    const solid=(u,v,ww,dd,hh,colors=gold,z=0)=>box(x+u,y+v,ww,dd,hh,colors,z);
    const front=(points,color,stroke)=>polygon(points.map(([u,z])=>[x+u,y+d+1,z]),color,stroke);
    const light=b.trackId || b.thumbnail ? (b.windowLight??"#f8ca83") : "#283044";
    function arch(u,z,ww,hh,pointed=false) {
      if (b.windows === "none") return;
      const outline=pointed?[[u,z],[u+ww,z],[u+ww,z+hh*.65],[u+ww/2,z+hh],[u,z+hh*.65]]
        :[[u,z],[u+ww,z],...Array.from({length:13},(_,i)=>[u+ww/2+Math.cos(i*Math.PI/12)*ww/2,z+hh*.65+Math.sin(i*Math.PI/12)*hh*.35])];
      front(outline,light);
    }
    function column(u) {
      solid(u,d,3,2,h,stone);
      solid(u-1,d,5,3,3,gold,h-3);
      solid(u-1,d,5,3,3,gold);
    }
    function cornice(z,colors=gold) {
      solid(-2,d, w+4,3,3,colors,z);
      solid(w,0,3,d,3,colors,z);
    }
    function spike(u,v,z,size) {
      const points=[[x+u,y+v,z],[x+u+size,y+v,z],[x+u+size,y+v+size,z],[x+u,y+v+size,z]];
      const tip=[x+u+size/2,y+v+size/2,z+size*2.3];
      polygon([points[0],points[3],tip],"#536078");
      polygon([points[3],points[2],tip],"#75859d");
      polygon([points[2],points[1],tip],"#38465e");
    }
    switch(b.buildingType) {
      case "medieval":
        for(const u of [2,w*.33,w*.66,w-4]) {
          solid(u,d,3,2,h,timber);
          solid(w-1,u*d/w,2,3,h,timber);
        }
        for(const z of [h*.45,h*.9])cornice(z,timber);
        for(let u=4;u<w-20;u+=28) {
          front([[u,h*.48],[u+2,h*.48],[u+25,h*.86],[u+23,h*.86]],"#725846");
        }
        solid(w*.39,d,18,2,h*.35,timber);
        arch(w*.41,2,14,h*.31);
        break;
      case "renaissance":
      case "baroque": {
        const ornate=b.buildingType==="baroque";
        for(const u of [1,w*.3,w*.65,w-4])column(u);
        for(const z of [h*.43,h-3])cornice(z);
        arch(w*.42,1,w*.16,h*.35);
        for(const u of [10,37,65]) {
          arch(u,h*.56,13,h*.28);
          solid(u-2,d,17,3,2,gold,h*.54);
          if(ornate) {
            front([[u-3,h*.88],[u+16,h*.88],[u+6,h*.98]],"#bca778");
            solid(u+4,d+1,3,2,4,gold,h*.5);
          }
        }
        solid(w*.37,d+3,w*.26,7,2,stone);
        if(ornate && b.top==="flat") {
          for(const u of [0,w-10]) {
            solid(u,4,10,10,6,gold,h);
            spike(u+2,6,h+6,6);
          }
          front([[w*.3,h+2],[w*.7,h+2],[w*.62,h+10],[w*.5,h+16],[w*.38,h+10]],"#c2af82");
        }
        break;
      }
      case "gothic":
        for(const u of [3,27,53,w-5]) {
          solid(u,d,3,4,h,stone);
          solid(u-1,d+1,5,5,h*.2,stone);
        }
        for(const u of [11,37,64]) {
          arch(u,h*.3,12,h*.52,true);
          front([[u+5,h*.33],[u+7,h*.33],[u+7,h*.71],[u+5,h*.71]],"#526375");
        }
        if(b.top==="gable"||b.top==="flat") {
          solid(w-18,6,14,16,12,stone,h);
          spike(w-18,6,h+12,14);
        }
        arch(w*.42,0,14,h*.23,true);
        break;
      case "artdeco":
        for(const u of [5,14,w-17,w-8])solid(u,d,2,2,h,gold);
        for(let z=12;z<h-10;z+=21) {
          front([[w*.36,z],[w*.48,z+9],[w*.6,z],[w*.6,z+3],[w*.48,z+12],[w*.36,z+3]],"#bcaa7c");
        }
        for(const inset of [0,4,8]) {
          solid(w*.35+inset,d+1,2,2,h*.24-inset,gold);
          solid(w*.65-inset,d+1,2,2,h*.24-inset,gold);
        }
        cornice(h*.27);
        break;
      case "japanese":
        for(const z of [h*.47,h-2]) {
          solid(-3,-2,w+6,d+7,3,timber,z);
          for(let u=0;u<w;u+=7)solid(u,d+3,2,3,2,timber,z+3);
        }
        for(const u of [2,w*.33,w*.66,w-4])solid(u,d,3,2,h,timber);
        for(const z of b.windows === "none" ? [] : [h*.15,h*.66]) for(const u of [10,37,64]) {
          front([[u,z],[u+14,z],[u+14,z+h*.22],[u,z+h*.22]],light);
          for(const v of [4,9])solid(u+v,d+1,1,1,h*.22,timber,z);
          solid(u,d+1,14,1,1,timber,z+h*.11);
        }
        for(const u of [5,w-9]) {
          solid(u,d+5,4,4,7,["#e1c78c","#9c7754","#c5a473"],h*.38);
          solid(u-1,d+4,6,6,1,timber,h*.38+7);
        }
        break;
    }
  }


  function drawJapanese(b,a) {
    const {box,polygon,plane}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const c=b.facade ?? ["#414961","#242c44","#323b55"];
    const timber=["#977658","#493c33","#70553e"];
    box(x,y,w,d,h,c);
    // Generic side windows and chosen facade ornaments are drawn on the walls first.
    drawFacade(b,a);
    const front=(u,z,ww,hh,color)=>polygon([[x+u,y+d+.5,z],[x+u+ww,y+d+.5,z],
      [x+u+ww,y+d+.5,z+hh],[x+u,y+d+.5,z+hh]],color);
    const light=b.trackId||b.thumbnail ? (b.windowLight??"#f8ca83") : "#283044";
    for(const u of [2,w*.33,w*.66,w-4])box(x+u,y+d,3,2,h,timber);
    if(b.windows!=="none") {
      for(const z of [h*.13,h*.63])for(const u of [10,37,64]) {
        front(u,z,14,h*.23,light);
        for(const offset of [4,9])box(x+u+offset,y+d+1,1,1,h*.23,timber,z);
        box(x+u,y+d+1,14,1,1,timber,z+h*.115);
      }
    }
    // Lower eaves are narrow sloped strips, leaving the wall and upper floor exposed.
    const level=h*.49;
    polygon([[x-3,y+d-1,level+5],[x+w+3,y+d-1,level+5],
      [x+w+5,y+d+8,level],[x-5,y+d+8,level]],c[0]);
    polygon([[x+w-1,y-3,level+5],[x+w-1,y+d-1,level+5],
      [x+w+8,y+d+5,level],[x+w+8,y-5,level]],c[0]);
    box(x-5,y+d+7,w+10,1,1.5,timber,level-1);
    box(x+w+7,y-5,1,d+12,1.5,timber,level-1);
    for(const u of [5,w-9]) {
      box(x+u,y+d+3,4,4,6,["#dfc891","#9b7756","#bea16e"],level-10);
      box(x+u-1,y+d+2,6,6,1,timber,level-4);
    }
    if(b.top==="gable") {
      const roofHeight=Math.max(13,Math.min(23,h*.32));
      const left=x-5,right=x+w+5,frontY=y+d+6,backY=y-6;
      polygon([[x,y+d,h],[x+w,y+d,h],[x+w/2,y+d,h+roofHeight]],c[2]);
      polygon([[left,backY,h],[left,frontY,h],[x+w/2,frontY,h+roofHeight],
        [x+w/2,backY,h+roofHeight]],c[0]);
      polygon([[right,backY,h],[right,frontY,h],[x+w/2,frontY,h+roofHeight],
        [x+w/2,backY,h+roofHeight]],c[0]);
      // Tile seams follow the slope, rather than covering the roof with another slab.
      for(let v=backY+6;v<frontY;v+=8) {
        polygon([[right,v,h+.2],[x+w/2,v,h+roofHeight+.2]],"transparent","#536078");
      }
      box(x+w/2-1,backY,2,d+12,2,timber,h+roofHeight);
    } else if(b.top==="flat") {
      box(x-3,y-3,w+6,d+6,2,c,h);
    } else if(b.top==="steps") {
      box(x+8,y+8,w-16,d-16,9,c,h);
      box(x+17,y+17,w-34,d-34,8,c,h+9);
    } else if(b.top==="garden") {
      plane(x+5,y+5,w-10,d-10,"#486045",h);
    } else if(b.top==="antenna") {
      box(x+15,y+15,15,12,6,c,h);
      box(x+21,y+20,2,2,23,timber,h+6);
    } else {
      drawRoof(b.top,b,a);
    }
  }


  function drawArtDeco(b,a) {
    const {box,plane,polygon}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const colors=b.facade ?? ["#414961","#242c44","#323b55"];
    const gold=["#c2a56b","#77603c","#a78b57"];
    const tierData=[
      {inset:0,height:h*.66},
      {inset:9,height:h*.85},
      {inset:20,height:h},
    ];
    // Each upper tier is drawn after the lower tier, including only its exposed windows.
    let base=0;
    for(const tier of tierData) {
      const inset=tier.inset, tw=w-inset*2, td=d-inset*2;
      const tx=x+inset, ty=y+inset;
      box(tx,ty,tw,td,tier.height-base,colors,base);
      drawFacade({...b,x:tx,y:ty,width:tw,depth:td,height:tier.height,
        minimumWindowZ:base+3,decorations:[]}, {
        ...a,
        polygon(points,fill,stroke) {
          if(points.some(point=>point[2]<base+3))return;
          polygon(points,fill,stroke);
        },
        box(px,py,ww,dd,hh,c,z=0) {
          if(z<base+3)return;
          box(px,py,ww,dd,hh,c,z);
        }
      });
      // Pilasters and gold capitals run vertically along both visible facades.
      for(let u=3;u<tw-2;u+=12) {
        box(tx+u,ty+td,2,1.6,tier.height-base,colors,base);
        box(tx+u-.6,ty+td,3.2,2.3,4,gold,tier.height-4);
        if(tier===tierData[0]) {
          for(let z=28;z<tier.height-6;z+=28)
            box(tx+u-.3,ty+td,2.6,2,2,gold,z);
        }
      }
      for(let v=4;v<td-2;v+=12) {
        box(tx+tw,ty+v,1.6,2,tier.height-base,colors,base);
        box(tx+tw,ty+v-.6,2.3,3.2,4,gold,tier.height-4);
      }
      box(tx-1,ty+td,tw+2,2,2,gold,tier.height);
      box(tx+tw,ty-1,2,td+3,2,gold,tier.height);
      base=tier.height;
    }
    const inset=20, tx=x+inset,ty=y+inset,tw=w-40,td=d-40;
    if(b.top==="steps"||b.top==="flat") {
      // The crown is built from narrow piers around a recessed dark center.
      box(tx+6,ty+6,tw-12,td-12,9,colors,h);
      for(const u of [0,tw*.5-2,tw-4]) {
        box(tx+u,ty+td-4,4,4,12,gold,h);
        polygon([[tx+u,ty+td,h+12],[tx+u+4,ty+td,h+12],
          [tx+u+2,ty+td,h+17]],gold[2]);
      }
      for(const v of [0,td*.5-2])box(tx+tw-4,ty+v,4,4,12,gold,h);
    } else if(b.top==="gable") {
      polygon([[tx,ty+td,h],[tx+tw,ty+td,h],[tx+tw/2,ty+td,h+18]],gold[2]);
      polygon([[tx+tw,ty,h],[tx+tw,ty+td,h],[tx+tw/2,ty+td,h+18],[tx+tw/2,ty,h+18]],colors[0]);
    } else if(b.top==="garden") {
      plane(tx+3,ty+3,tw-6,td-6,"#456047",h+2);
    } else if(b.top==="antenna") {
      box(tx+tw/2,ty+td/2,2,2,26,gold,h);
    } else {
      drawRoof(b.top,{...b,x:tx,y:ty,width:tw,depth:td},a);
    }
    // Recessed entrance and a tiered metal surround.
    for(let i=0;i<3;i++)box(x+w*.4+i*2,y+d+.5,2,2,h*.16-i*2,gold);
    for(let i=0;i<3;i++)box(x+w*.6-i*2,y+d+.5,2,2,h*.16-i*2,gold);
    if(b.decorations?.length)drawFacade({...b,windows:"none"},a);
  }


  function drawCivic(b,a) {
    const {box,plane,polygon,ctx,project,scale}=a;
    const {x,y,width:w,depth:d,height:h}=b;
    const kind=b.buildingType;
    const colors=b.facade ?? types[kind].facade;
    const accent=kind==="firestation" ? ["#ce6551","#793c39","#a54e45"] :
      kind==="police" ? ["#6597c1","#2b496e","#466b94"] :
      ["#7faeaa","#3c6e73","#568e90"];
    const metal=["#bac5ca","#586777","#8897a4"];
    const entranceHeight=Math.min(24,h*.40);
    const signBottom=entranceHeight+3;
    const signHeight=Math.max(5,Math.min(8,h*.14));
    const groundTop=signBottom+signHeight+2;
    box(x,y,w,d,h,colors);

    // Keep the facade's ground floor clear for garages, signs and entrance canopies.
    drawFacade(b,{
      ...a,
      polygon(points,fill,stroke) {
        if(points.some(point=>point[1]>y+d && point[2]<groundTop)) return;
        polygon(points,fill,stroke);
      },
      box(px,py,ww,dd,hh,c,z=0) {
        if(py>=y+d && z<groundTop) return;
        box(px,py,ww,dd,hh,c,z);
      }
    });
    function front(u,z,ww,hh,color,offset=.6) {
      polygon([[x+u,y+d+offset,z],[x+u+ww,y+d+offset,z],
        [x+u+ww,y+d+offset,z+hh],[x+u,y+d+offset,z+hh]],color);
    }
    function label(text,u,z,width) {
      const [sx,sy]=project(x+u,y+d+2.1,z);
      ctx.save();
      ctx.translate(sx,sy);
      ctx.transform(1,.49,0,1,0,0);
      ctx.font=Math.max(4.5,6*scale)+"px system-ui";
      ctx.fillStyle="#f1e6ce";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(text,0,0,width*scale);
      ctx.restore();
    }
    const glass=b.trackId||b.thumbnail ? b.windowLight??"#acd5df" : "#283044";
    if(kind==="firestation") {
      // Two framed rolling garage doors make the station legible at thumbnail size.
      for(const u of [6,34]) {
        front(u-1,0,25,entranceHeight+1,"#282f3a");
        front(u+1,1,21,entranceHeight-2,"#77838b",.8);
        for(let z=4;z<entranceHeight-2;z+=3)
          front(u+1,z,21,.6,"#3e4d5c",1);
        front(u+3,entranceHeight*.62,17,3,glass,1.2);
        box(x+u-1,y+d,2,2,entranceHeight+1,accent);
        box(x+u+23,y+d,2,2,entranceHeight+1,accent);
      }
      front(65,1,16,entranceHeight-1,"#29333e");
      front(68,entranceHeight*.45,10,entranceHeight*.4,glass,.8);
      box(x+63,y+d+1,20,8,2,metal);
      box(x+4,y+d,w-8,2,signHeight,accent,signBottom);
      label("FIRE STATION",w/2,signBottom+signHeight/2,w-15);
      for(const u of [4,w-8])box(x+u,y+d+1,4,3,2,accent,signBottom+signHeight);
    } else {
      const doorWidth=kind==="hospital"?28:21;
      const u=(w-doorWidth)/2;
      box(x+u-2,y+d,doorWidth+4,2,entranceHeight+1,metal);
      front(u,1,doorWidth,entranceHeight-1,"#283044",2.1);
      front(u+2,3,doorWidth-4,entranceHeight-5,glass,2.2);
      box(x+w/2-.5,y+d+2.3,1,1,entranceHeight-2,metal,1);
      const canopyWidth=doorWidth+14;
      box(x+(w-canopyWidth)/2,y+d,canopyWidth,10,2,accent,entranceHeight+1);
      for(const px of [(w-canopyWidth)/2,(w+canopyWidth)/2-2])
        box(x+px,y+d+8,2,2,entranceHeight+1,metal);
      box(x+u-5,y+d+2,doorWidth+10,10,1.5,metal);
      box(x+5,y+d,w-10,2,signHeight,accent,signBottom);
      label(kind==="police" ? "POLICE" : "HOSPITAL",w/2,signBottom+signHeight/2,w-14);
      if(kind==="police") {
        // Gold shield beside the entrance, clear of the windows above.
        const cx=14,z=entranceHeight*.55;
        polygon([[x+cx-5,y+d+1,z+6],[x+cx+5,y+d+1,z+6],
          [x+cx+4,y+d+1,z],[x+cx,y+d+1,z-3],[x+cx-4,y+d+1,z]],"#d0b877");
        front(cx-1,z,2,4,"#49678b",1.2);
      } else {
        // A green cross distinguishes the hospital from the blue police station.
        const cx=w-15,z=entranceHeight*.55;
        front(cx-2,z-6,4,12,"#8ac7ad",1);
        front(cx-6,z-2,12,4,"#8ac7ad",1);
      }
    }

    // The existing roof selector stays independent of the civic facade.
    if(b.top==="flat") {
      box(x-1,y-1,w+2,d+2,2,colors,h);
      box(x+5,y+5,w-10,2,3,accent,h+2);
      box(x+5,y+5,2,d-10,3,accent,h+2);
      if(kind==="hospital") {
        plane(x+w/2-2,y+d/2-10,4,20,"#8ac7ad",h+2.1);
        plane(x+w/2-10,y+d/2-2,20,4,"#8ac7ad",h+2.1);
      } else {
        box(x+12,y+12,14,12,5,metal,h+2);
        if(kind==="police")box(x+18,y+17,1.5,1.5,17,metal,h+7);
      }
    } else if(b.top==="gable") {
      polygon([[x,y+d,h],[x+w,y+d,h],[x+w/2,y+d,h+22]],colors[2]);
      polygon([[x+w,y,h],[x+w,y+d,h],[x+w/2,y+d,h+22],[x+w/2,y,h+22]],colors[0]);
    } else if(b.top==="steps") {
      box(x+12,y+12,w-24,d-24,12,colors,h);
      box(x+24,y+23,w-48,d-46,10,colors,h+12);
    } else if(b.top==="garden") {
      plane(x+5,y+5,w-10,d-10,"#45664c",h);
      for(const u of [12,w-24])box(x+u,y+15,12,18,5,accent,h);
    } else if(b.top==="antenna") {
      box(x+15,y+14,24,18,8,colors,h);
      box(x+26,y+22,3,3,24,metal,h+8);
    } else {
      drawRoof(b.top,b,a);
    }
  }

  const fields = ["buildingType","windowShape","windowLight"];
  const decorations = ["balcony","columns","neon","brick","bands","sign"];
  function normalize(b) {
    return {buildingType:b.buildingType ?? "tower",windowShape:b.windowShape === "rectangle" ? "auto" : (b.windowShape ?? "auto"),
      windowLight:b.windowLight ?? "#f8ca83",signText:b.signText ?? "",
      decorations:[]};
  }
  function isDefault(b) { return JSON.stringify(normalize(b)) === JSON.stringify(normalize({})); }
  function drawRoof(type,b,a) {
    const {box,polygon,plane}=a, {x,y,width:w,depth:d,height:h}=b;
    const c=b.facade ?? ["#414961","#242c44","#323b55"];
    const unit=(u,v,ww,dd,hh,colors=c,z=0)=>box(x+u,y+v,ww,dd,hh,colors,h+z);
    if(type==="billboard") {
      unit(17,28,3,5,28); unit(w-23,28,3,5,28);
      unit(11,27,w-22,4,23,["#ceae77","#735c46","#d4b779"],21);
      for(let i=18;i<w-18;i+=13) unit(i,31,8,1,3,["#fff0b7","#fff0b7","#fff0b7"],30);
    } else if(type==="tank") {
      const cx=x+w/2,cy=y+d/2,r=17;
      for(let i=0;i<16;i++) {
        const t=i*Math.PI/8,n=(i+1)*Math.PI/8;
        polygon([[cx+Math.cos(t)*r,cy+Math.sin(t)*r,h+8],
          [cx+Math.cos(n)*r,cy+Math.sin(n)*r,h+8],
          [cx+Math.cos(n)*r,cy+Math.sin(n)*r,h+32],
          [cx+Math.cos(t)*r,cy+Math.sin(t)*r,h+32]],i<8?"#7b94a5":"#475c70");
      }
      polygon(Array.from({length:24},(_,i)=>[cx+Math.cos(i*Math.PI/12)*r,cy+Math.sin(i*Math.PI/12)*r,h+32]),"#acc0c9");
      unit(25,24,3,3,8);unit(60,46,3,3,8);
    } else if(type==="industrial") {
      for(const u of [14,47]) {
        unit(u,15,24,22,13,["#8996a1","#424f60","#606f7e"]);
        for(let j=0;j<4;j++) plane(x+u+3,y+18+j*4,18,1,"#273548",h+13);
      }
      unit(18,48,49,4,5,["#96a6ac","#536575","#768a98"]);
      unit(18,43,4,9,18);
    } else if(type==="pergola") {
      for(const u of [12,w-16]) for(const v of [12,d-16]) unit(u,v,4,4,26);
      for(let v=9;v<d-8;v+=9) unit(9,v,w-18,4,3,["#b18f68","#5e4c3c","#8a6d50"],26);
    } else if(type==="greenhouse") {
      unit(12,12,w-24,d-24,19,["#8eb7bd","#39677b","#6596a5"]);
      polygon([[x+12,y+d-12,h+19],[x+w-12,y+d-12,h+19],[x+w/2,y+d-12,h+36]],"#99c5c7");
      polygon([[x+w-12,y+12,h+19],[x+w-12,y+d-12,h+19],[x+w/2,y+d-12,h+36],[x+w/2,y+12,h+36]],"#6b9fab");
      for(let u=15;u<w-14;u+=13) unit(u,d-11,2,1,19,["#d0dddd","#d0dddd","#d0dddd"]);
    } else if(type==="dome") {
      for(let j=0;j<6;j++) for(let i=0;i<24;i++) {
        const points=[];
        for(const [t,v] of [[i,j],[i+1,j],[i+1,j+1],[i,j+1]]) {
          const angle=t*Math.PI/12,lat=v*Math.PI/12;
          points.push([x+w/2+Math.cos(angle)*Math.cos(lat)*(w/2-8),
            y+d/2+Math.sin(angle)*Math.cos(lat)*(d/2-8),h+Math.sin(lat)*34]);
        }
        polygon(points,i<12?"#7189a4":"#4c5e7d");
      }
    }
  }
  function drawFacade(b,a) {
    const {polygon,box,plane,ctx,project,scale}=a;
    const {x,y,width:w,depth:d,height:h}=b, settings=normalize(b);
    const lit=b.trackId || b.thumbnail;
    const color=lit ? settings.windowLight : "#283044";
    const pattern=b.windows;
    if(b.occlusionOnly && pattern!=="bay")return;
    const ww=pattern==="glass"?w-16:pattern==="ribbon"?w-16:pattern==="wide"?18:7;
    const wh=pattern==="glass"?Math.min(28,h-20):pattern==="tall"?11:6;
    function windowPanel(u,z,width,height,side) {
      const shape=settings.windowShape==="auto" ? pattern : settings.windowShape;
      const point=(p,q)=>side?[x+w+.1,y+u+p,z+q]:[x+u+p,y+d+.1,z+q];
      let outline;
      if(shape==="round") outline=Array.from({length:18},(_,i)=>point(width/2+Math.cos(i*Math.PI/9)*width/2,height/2+Math.sin(i*Math.PI/9)*height/2));
      else if(shape==="arch") outline=[point(0,0),point(width,0),...Array.from({length:13},(_,i)=>point(width/2+Math.cos(i*Math.PI/12)*width/2,height*.55+Math.sin(i*Math.PI/12)*height*.45))];
      else outline=[point(0,0),point(width,0),point(width,height),point(0,height)];
      if(pattern==="bay") {
        if(side) box(x+w,y+u,3,width,height,["#6a7b93","#485c76","#7a8ba1"],z);
        else box(x+u,y+d,width,3,height,["#6a7b93","#485c76","#7a8ba1"],z);
        outline=outline.map(([px,py,pz])=>[px+(side?3:0),py+(side?0:3),pz]);
      }
      polygon(outline,color,lit ? "#53677b" : undefined);
    }
    const rowStep=pattern==="glass"?32:14;
    const firstRow=15+Math.max(0,Math.ceil(((b.minimumWindowZ??15)-15)/rowStep))*rowStep;
    for(let z=firstRow;pattern!=="none"&&z<h-wh;z+=rowStep) {
      for(const side of [false,true]) {
        if (!side && ["renaissance","baroque","gothic","japanese"].includes(b.buildingType)) continue;
        const span=side?d:w, width=Math.min(b.buildingType==="artdeco" ? 6 : ww,span-16);
        for(let u=b.buildingType==="artdeco" ? (side?8:7) : 8;u<=span-width-(b.buildingType==="artdeco"?4:8);u+=b.buildingType==="artdeco" ? 12 : width+6) {
          if(pattern==="irregular" && (Math.floor(u/13)+Math.floor(z/14)*3)%4===0) continue;
          windowPanel(u,z,width,wh,side);
        }
      }
    }
    const colors=["#8491a6","#46536b","#61718a"];
    for(const item of settings.decorations) {
      if(item==="bands"||item==="brick") {
        for(let z=10;z<h;z+=item==="brick"?6:28) {
          polygon([[x,y+d+.3,z],[x+w,y+d+.3,z]],"#000","#68758a");
          polygon([[x+w+.3,y,z],[x+w+.3,y+d,z]],"#000","#68758a");
          if(item==="brick") for(let u=6;u<w;u+=12)
            polygon([[x+u+(z%12?0:4),y+d+.4,z],[x+u+(z%12?0:4),y+d+.4,z+6]],"#000","#4b5970");
        }
      } else if(item==="columns") {
        for(const u of [2,w/2,w-5]) box(x+u,y+d,3,2,h,colors);
      } else if(item==="balcony") {
        for(let z=22;z<h-12;z+=28) {
          box(x+12,y+d,w-24,10,2,colors,z);
          box(x+12,y+d+8,w-24,2,7,colors,z+2);
        }
      } else if(item==="neon") {
        ctx.save();ctx.shadowColor="#6be6ed";ctx.shadowBlur=5;ctx.lineWidth=2;
        polygon([[x,y+d,h],[x+w,y+d,h],[x+w,y,h]],"transparent","#6be6ed");
        polygon([[x,y+d,0],[x,y+d,h]],"transparent","#6be6ed");
        ctx.restore();
      } else if(item==="sign") {
        box(x+9,y+d+1,w-18,2,13,["#948273","#3a3044","#292d46"],h*.55);
        const [sx,sy]=project(x+w/2,y+d+3,h*.55+6);
        ctx.save();ctx.translate(sx,sy);ctx.transform(1,.49,0,1,0,0);
        ctx.fillStyle="#ffe2a1";ctx.font=Math.max(5,8*scale)+"px system-ui";ctx.textAlign="center";
        ctx.fillText(settings.signText||"SOUND CITY",0,0,(w-24)*scale);ctx.restore();
      }
    }
  }
  function drawReservoir({ctx,project,polygon,plane,box,connections={},compact=false}) {
    ctx.save();
    ctx.beginPath();
    [[-600,-600],[800,-600],[800,800],[-600,800]].forEach(([x,y],index) => {
      const point=project(x,y);
      if (index===0) ctx.moveTo(...point);
      else ctx.lineTo(...point);
    });
    ctx.closePath();
    ctx.clip();
    const controls = [[-380,-175],[-330,-320],[-170,-405],[-40,-390],[95,-438],
      [240,-375],[360,-310],[410,-165],[470,-45],[435,105],[458,240],
      [330,365],[180,415],[20,385],[-130,430],[-290,330],[-375,190],[-455,50],[-420,-65]];
    const shoreline = [];
    // A closed Catmull-Rom curve keeps the coves soft without making the lake elliptical.
    for (let i=0;i<controls.length;i++) {
      const previous = controls[(i+controls.length-1)%controls.length];
      const current = controls[i];
      const next = controls[(i+1)%controls.length];
      const following = controls[(i+2)%controls.length];
      for (let step=0;step<5;step++) {
        const t = step/5, t2 = t*t, t3 = t2*t;
        shoreline.push(current.map((value,axis) => 100+.5*((2*value)+
          (-previous[axis]+next[axis])*t+
          (2*previous[axis]-5*value+4*next[axis]-following[axis])*t2+
          (-previous[axis]+3*value-3*next[axis]+following[axis])*t3)));
      }
    }
    const contour = (factor,z) => shoreline.map(([x,y]) => [100+(x-100)*factor,100+(y-100)*factor,z]);
    const water = contour(1,-18);
    const bank = contour(1.085,0);
    const pathInner = contour(1.18,0);
    const pathOuter = contour(1.22,0);
    plane(-600,-600,1400,1400,"#293c3e");
    // Ease the verge from the city's ground colour into lakeside grass.
    for (let strip=0;strip<16;strip++) {
      const inset=strip*9;
      const t=strip/15;
      const colour="rgb(41,"+Math.round(49+11*t)+","+Math.round(71-9*t)+")";
      if (connections.west) plane(-600+inset,-600,9.5,1400,colour);
      if (connections.east) plane(791-inset,-600,9.5,1400,colour);
      if (connections.north) plane(-600,-600+inset,1400,9.5,colour);
      if (connections.south) plane(-600,791-inset,1400,9.5,colour);
    }
    const westRiver=compact ? connections.riverWest : connections.river && connections.west;
    const eastRiver=compact ? connections.riverEast : connections.river && connections.east;
    const mouthTop=connections.riverTop ?? -173;
    const mouthBottom=connections.riverBottom ?? -27;
    function channelAt(x,west) {
      const edge=west ? -600 : 800, inside=west ? -235 : 450;
      const t=Math.max(0,Math.min(1,(x-edge)/(inside-edge)));
      return [mouthTop+(-173-mouthTop)*t,mouthBottom+(-27-mouthBottom)*t];
    }
    const crossesChannel=([x,y]) => {
      if (!(x<100 ? westRiver : eastRiver)) return false;
      const [top,bottom]=channelAt(x,x<100);
      return y>top-11 && y<bottom+11;
    };
    // Existing boundary streets become park entrances instead of ending in grass.
    for (const side of ["west","east","north","south"]) {
      if (!connections[side]) continue;
      const vertical=side==="west" || side==="east";
      const edge=side==="west" || side==="north" ? -600 : 800;
      if (vertical) {
        const half=compact ? 13*7/3 : 13;
        if (side==="west" ? westRiver : eastRiver) {
          plane(edge-half,-600,half*2,mouthTop+600,"#202638");
          plane(edge-half,mouthBottom,half*2,800-mouthBottom,"#202638");
        } else plane(edge-half,-600,half*2,1400,"#202638");
      } else {
        const half=compact ? 13*7/3 : 13;
        plane(-600,edge-half,1400,half*2,"#202638");
      }
      const entrances={
        west:[[-587,85,0],[-440,65,0],[-440,90,0],[-587,110,0]],
        east:[[787,85,0],[645,85,0],[645,110,0],[787,110,0]],
        north:[[85,-587,0],[85,-420,0],[110,-420,0],[110,-587,0]],
        south:[[85,787,0],[85,605,0],[110,605,0],[110,787,0]]
      };
      if (compact) {
        // Match the nearest city sidewalk on the 200-unit block grid.
        const entrance=-600+200*7/3;
        for (const point of entrances[side]) {
          if (Math.abs(point[0]-edge)<14 && vertical) point[1]=entrance+(point[1]===85 ? -24 : 24);
          if (Math.abs(point[1]-edge)<14 && !vertical) point[0]=entrance+(point[0]===85 ? -24 : 24);
        }
      }
      polygon(entrances[side],"#8a897a");
    }
    // River mouths meet the adjoining water at z=0 and descend into the basin.
    for (const [connected,edge,inside] of [[westRiver,-600,-235],[eastRiver,800,450]]) {
      if (!connected) continue;
      polygon([[edge,mouthTop,0],[inside,-173,-18],[inside,-27,-18],[edge,mouthBottom,0]],"#123652");
      polygon([[edge,mouthTop-11,0],[inside,-184,0],[inside,-173,-18],[edge,mouthTop,0]],"#52664f");
      polygon([[edge,mouthBottom,0],[inside,-27,-18],[inside,-16,0],[edge,mouthBottom+11,0]],"#52664f");
    }
    for (let i=0;i<shoreline.length;i++) {
      const next = (i+1)%shoreline.length;
      if (crossesChannel(pathInner[i]) || crossesChannel(pathInner[next])) continue;
      polygon([pathInner[i],pathOuter[i],pathOuter[next],pathInner[next]],"#8a897a");
    }
    const waterCenter = project(100,90,-18);
    const waterEdge = project(480,420,-18);
    const waterBack = project(-200,-200,-18);
    const waterGradient = ctx.createLinearGradient(waterCenter[0],waterBack[1],waterEdge[0],waterEdge[1]);
    waterGradient.addColorStop(0,"#286077");
    waterGradient.addColorStop(.5,"#225e76");
    waterGradient.addColorStop(1,"#163d55");
    polygon(water,waterGradient);
    const banks = shoreline.map((_,i) => i).sort((a,b) => bank[a][0]+bank[a][1]-bank[b][0]-bank[b][1]);
    for (const i of banks) {
      const next = (i+1)%shoreline.length;
      if (crossesChannel(bank[i]) || crossesChannel(bank[next])) continue;
      polygon([bank[i],bank[next],water[next],water[i]],i%5===0 ? "#5f725b" : "#52664f");
      if (i%4===0) polygon([water[i],water[next]],"transparent","#7fa8a480");
    }
    // Reflections are clipped to the actual, irregular water surface.
    ctx.save();
    ctx.beginPath();
    water.forEach((point,index) => {
      const [x,y] = project(...point);
      if (index===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.clip();
    for (let i=0;i<24;i++) {
      const x = -330+(i*173%920), y = -320+(i*269%870);
      plane(x,y,12+(i*7%30),1.3,i%3 ? "#76b6c32e" : "#b1d7ce40",-17.8);
    }
    ctx.restore();
    // Footbridges carry the circular walk across connected river inlets.
    for (const [connected,x] of [[westRiver,-425],[eastRiver,635]]) {
      if (!connected) continue;
      const [top,bottom]=channelAt(x,x<100);
      box(x-12,top-13,24,bottom-top+26,3,["#9b866b","#665b4f","#796954"],1);
      for (const rail of [x-12,x+11]) box(rail,top-13,1.5,bottom-top+26,2,["#b4a18a","#746958","#9a8870"],9);
    }
    ctx.restore();
    const props = [];
    const trees = [[-450,-400],[-350,-480],[-150,-495],[150,-490],[390,-430],[640,-180],
      [680,5],[685,210],[650,410],[510,650],[325,690],[-80,680],[-270,620],[-470,410],
      [-500,150],[-490,-70],[-390,630],[640,-420],[-100,-535],[600,650]];
    trees.forEach(([x,y],i) => {
      props.push({x,y,kind:"tree",size:31+(i*7%22)});
      if (i%3===0) props.push({x:x+38,y:y-25,kind:"tree",size:24+i%9});
    });
    [[-385,-340],[-280,-400],[460,-350],[590,0],[450,565],[-430,70]]
      .forEach(([x,y],i) => props.push({x,y,kind:"rock",size:9+i%3*3}));
    for (const index of [7,17,27,41,57,69,81,89]) {
      const [x,y] = shoreline[index];
      props.push({x,y,kind:"reeds"});
    }
    // The small jetty steps down from the bank, with pilings beneath the waterline.
    props.push({x:155,y:625,kind:"dock"});
    props.sort((a,b) => a.x+a.y-b.x-b.y);
    for (const prop of props) {
      const {x,y,size:r} = prop;
      if (crossesChannel([x,y])) continue;
      if (prop.kind==="tree") {
        box(x-2,y-2,4,4,30,["#746252","#453d38","#5f4e43"]);
        const ring = [[x-r,y,26],[x,y-r,28],[x+r,y,28],[x,y+r,24]];
        const tip = [x-5,y-5,r+40];
        polygon([ring[0],ring[1],tip],"#526b52");
        polygon([ring[1],ring[2],tip],"#46634d");
        polygon([ring[2],ring[3],tip],"#294a42");
        polygon([ring[3],ring[0],tip],"#3b5949");
      } else if (prop.kind==="rock") {
        polygon([[x-r,y,0],[x,y-r,3],[x+r,y,4],[x+3,y+r,0]],"#687573");
        polygon([[x-r,y,0],[x,y-r,3],[x-2,y-2,r]],"#85918a");
        polygon([[x,y-r,3],[x+r,y,4],[x-2,y-2,r]],"#9aa39a");
        polygon([[x+r,y,4],[x+3,y+r,0],[x-2,y-2,r]],"#596a69");
      } else if (prop.kind==="reeds") {
        for (let i=0;i<3;i++) {
          const rx = x+(i-2)*3, ry = y+(i%2)*4;
          polygon([[rx,ry,-16],[rx+1.4,ry,-16],[rx+2,ry,3+i%3*3]],"#8b9a68");
        }
      } else if (prop.kind==="dock") {
        for (const dy of [0,47,94,141,188]) {
          for (const dx of [-15,15]) box(x+dx,y-dy,3,3,32,["#9c8c75","#62594d","#7c6a55"],-30);
        }
        box(x-19,y-205,42,210,3,["#ab8c69","#6a5b4a","#80684f"],-2);
        for (let dy=0;dy<205;dy+=12) plane(x-18,y-dy,40,1,"#725b48",1.2);
        for (const dx of [-16,18]) {
          for (const dy of [0,47,94,141,188]) box(x+dx,y-dy,2,2,11,["#b99d7c","#72614f","#907355"],1);
          box(x+dx,y-188,1.5,188,1.5,["#b99d7c","#72614f","#907355"],11);
        }
        polygon([[x-19,y+6,0],[x+23,y+6,0],[x+23,y-8,1],[x-19,y-8,1]],"#b69b78");
      }
    }
  }
  function drawPark({ctx,project,polygon,plane,box,connections={}}) {
    const grass="#2c4638";
    const paving="#9b947c";
    const stone=["#a8a391","#6c746d","#848b7d"];
    plane(-600,-600,1400,1400,grass);
    plane(-600,-600,1400,14,"#293147");
    plane(-600,786,1400,14,"#293147");
    plane(-600,-600,14,1400,"#293147");
    plane(786,-600,14,1400,"#293147");
    for (const side of ["west","east","north","south"]) {
      if (!connections[side]) continue;
      const edge=side==="west" || side==="north" ? -600 : 800;
      if (side==="west" || side==="east") plane(edge-12,-600,24,1400,"#202638");
      else plane(-600,edge-12,1400,24,"#202638");
    }
    // Broad paths meet the same zero-coordinate road axes as city blocks.
    plane(-600,-25,1400,50,paving);
    plane(-25,-600,50,1400,paving);
    for (let run=-588;run<800;run+=16) {
      plane(run,-24,.7,48,"#746f5b");
      plane(-24,run,48,.7,"#746f5b");
    }
    for (const offset of [-9,8]) {
      plane(-600,offset,1400,.8,"#b8ae90");
      plane(offset,-600,.8,1400,"#b8ae90");
    }
    const ring=(x,y,r,z=0,count=32) => Array.from({length:count},(_,i) => {
      const angle=i*Math.PI*2/count;
      return [x+Math.cos(angle)*r,y+Math.sin(angle)*r,z];
    });
    function cylinder(x,y,r,h,z,colors) {
      const bottom=ring(x,y,r,z,24), top=ring(x,y,r,z+h,24);
      const faces=bottom.map((_,i)=>i).sort((a,b)=>
        bottom[a][0]+bottom[a][1]-bottom[b][0]-bottom[b][1]);
      for (const i of faces) {
        const next=(i+1)%bottom.length;
        polygon([bottom[i],bottom[next],top[next],top[i]],i<12 ? colors[1] : colors[2]);
      }
      polygon(top,colors[0]);
    }
    polygon(ring(0,0,102,0,8),"#727c69");
    polygon(ring(0,0,93,.3,8),"#b6a98a");
    polygon(ring(0,0,80,.5,8),"#99947b");
    // Pond outline is irregular, with a narrow middle beneath the bridge.
    const pond=[[220,300,-4],[244,236,-4],[317,216,-4],[384,244,-4],
      [430,256,-4],[486,222,-4],[566,230,-4],[624,280,-4],
      [638,354,-4],[598,424,-4],[520,451,-4],[455,413,-4],
      [406,393,-4],[350,426,-4],[275,404,-4],[232,360,-4]];
    const bank=pond.map(([x,y])=>[430+(x-430)*1.07,333+(y-333)*1.09,0]);
    polygon(bank,"#566c4c");
    polygon(pond,"#21475b");
    for (let i=0;i<pond.length;i++) {
      const next=(i+1)%pond.length;
      polygon([bank[i],bank[next],pond[next],pond[i]],"#4d614c");
    }
    // A small path branches off the main walk to the pond bridge.
    polygon([[380,25,0],[405,25,0],[443,217,0],[418,217,0]],paving);
    polygon([[418,447,0],[443,447,0],[488,570,0],[465,578,0]],paving);
    const props=[{x:0,y:0,kind:"fountain"},{x:430,y:455,kind:"bridge"}];
    const trees=[[-480,-455],[-405,-505],[-290,-470],[-130,-500],[145,-485],[290,-490],[455,-465],[640,-435],
      [-495,-300],[-370,-325],[-230,-305],[175,-310],[340,-340],[500,-275],[680,-260],
      [-490,-145],[-320,-160],[155,-150],[340,-140],[530,-130],[690,-95],
      [-500,145],[-350,155],[-190,165],[160,150],[710,160],
      [-480,310],[-335,330],[-175,295],[135,310],[710,370],
      [-495,490],[-345,490],[-180,460],[130,490],[700,535],
      [-465,665],[-300,660],[-130,655],[155,675],[315,650],[480,665],[640,650]];
    trees.forEach(([x,y],i)=>{
      props.push({x,y,kind:"tree",size:22+(i*11%17),variant:i%3});
      if (i%4===0) props.push({x:x+44,y:y+15,kind:"tree",size:19,variant:(i+1)%3});
    });
    for (const run of [-490,-330,-175,190,350,535,700]) {
      for (const sign of [-1,1]) {
        props.push({x:run,y:sign*53,kind:"hedge",axis:"x"});
        props.push({x:sign*53,y:run,kind:"hedge",axis:"y"});
      }
    }
    for (const run of [-440,-235,230,475,690]) {
      props.push({x:run,y:75,kind:"bench",axis:"x"});
      props.push({x:75,y:run,kind:"bench",axis:"y"});
      props.push({x:run,y:-43,kind:"lamp"});
      props.push({x:-43,y:run,kind:"lamp"});
    }
    [[-180,-90],[120,95],[-85,120],[190,-100],[-460,580],[565,540]]
      .forEach(([x,y])=>props.push({x,y,kind:"flowers"}));
    [[275,269],[562,384],[592,270],[329,385]]
      .forEach(([x,y])=>props.push({x,y,kind:"rock"}));
    props.sort((a,b)=>a.x+a.y-b.x-b.y);
    for (const prop of props) {
      const {x,y}=prop;
      if (prop.kind==="tree") {
        const r=prop.size, h=43+r*.6;
        box(x-2,y-2,4,4,26,["#817158","#463d36","#675340"]);
        const palettes=[
          ["#608149","#486d43","#2b5039","#3d603d"],
          ["#788952","#5a7545","#38583d","#4a6c45"],
          ["#45694a","#34593f","#244634","#34563c"]
        ];
        const colors=palettes[prop.variant];
        const lower=ring(x,y,r*.67,25,8);
        const middle=ring(x,y,r,39,8);
        const upper=ring(x-3,y-4,r*.53,h,8);
        const order=middle.map((_,i)=>i).sort((a,b)=>middle[a][0]+middle[a][1]-middle[b][0]-middle[b][1]);
        for(const i of order) {
          const next=(i+1)%8, color=colors[Math.floor(i/2)%4];
          polygon([lower[i],lower[next],middle[next],middle[i]],color);
          polygon([middle[i],middle[next],upper[next],upper[i]],color);
        }
        polygon(upper,colors[0]);
      } else if (prop.kind==="hedge") {
        const w=prop.axis==="x" ? 28 : 11, d=prop.axis==="x" ? 11 : 28;
        box(x-w/2,y-d/2,w,d,8,["#5d7746","#344d37","#49633e"]);
      } else if (prop.kind==="bench") {
        const w=prop.axis==="x" ? 37 : 12, d=prop.axis==="x" ? 12 : 37;
        for (const [dx,dy] of [[2,2],[w-4,d-4]]) box(x+dx,y+dy,2,2,7,["#63716a","#303c37","#48554c"]);
        box(x,y,w,d,2,["#b39563","#756346","#92754e"],7);
        if (prop.axis==="x") box(x,y+d-2,w,2,9,["#c2a071","#7b6849","#a58a5d"],9);
        else box(x+w-2,y,2,d,9,["#c2a071","#7b6849","#a58a5d"],9);
      } else if (prop.kind==="lamp") {
        const [px,py]=project(x,y,0), [unitX,unitY]=project(x+1,y,0);
        const unit=Math.hypot(unitX-px,unitY-py);
        const radius=30*unit;
        const glow=ctx.createRadialGradient(px,py,0,px,py,radius);
        glow.addColorStop(0,"#efd18b42");
        glow.addColorStop(1,"#efd18b00");
        ctx.fillStyle=glow;
        ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();
        box(x-1,y-1,2,2,29,["#b1a080","#665f50","#8c8066"]);
        box(x-3,y-3,6,6,5,["#f2df9e","#a68e59","#e6c57e"],29);
      } else if (prop.kind==="fountain") {
        cylinder(0,0,66,5,1,stone);
        cylinder(0,0,59,5,6,["#bbb49b","#7b8278","#979d8c"]);
        polygon(ring(0,0,52,10,32),"#458696");
        cylinder(0,0,14,4,10,stone);
        cylinder(0,0,5,27,14,["#c6c1aa","#808d87","#a5ada0"]);
        cylinder(0,0,25,4,36,["#c9c3a9","#83958e","#a9b8a8"]);
        polygon(ring(0,0,21,40,24),"#70b0b8");
        ctx.save();
        ctx.strokeStyle="#afd9da";
        const [sx,sy]=project(0,0,0),[ux,uy]=project(1,0,0);
        ctx.lineWidth=Math.max(.5,Math.hypot(ux-sx,uy-sy)*1.2);
        for (let i=0;i<8;i++) {
          const a=i*Math.PI/4;
          const start=project(Math.cos(a)*22,Math.sin(a)*22,39);
          const middle=project(Math.cos(a)*35,Math.sin(a)*35,33);
          const end=project(Math.cos(a)*42,Math.sin(a)*42,11);
          ctx.beginPath();ctx.moveTo(...start);ctx.quadraticCurveTo(...middle,...end);ctx.stroke();
        }
        const top=project(0,0,40), high=project(0,0,56);
        ctx.beginPath();ctx.moveTo(...top);ctx.lineTo(...high);ctx.stroke();
        ctx.restore();
      } else if (prop.kind==="bridge") {
        // The bridge crosses the pond's narrow central neck along the y axis.
        const start=214,end=452,segments=18;
        const height=t=>3+22*Math.sin(t*Math.PI);
        for (let i=0;i<segments;i++) {
          const t=i/segments, next=(i+1)/segments;
          const ya=start+(end-start)*t, yb=start+(end-start)*next;
          const za=height(t),zb=height(next);
          polygon([[x-16,ya,za],[x+16,ya,za],[x+16,yb,zb],[x-16,yb,zb]],i%2 ? "#9d8058" : "#b09265");
          polygon([[x+16,ya,za-3],[x+16,yb,zb-3],[x+16,yb,zb],[x+16,ya,za]],"#6e5b46");
          for (const edge of [x-16,x+16]) {
            polygon([[edge,ya,za+10],[edge,yb,zb+10],[edge,yb,zb+12],[edge,ya,za+12]],"#596551");
            if(i%3===0) box(edge-1,ya,2,2,12,["#849175","#3d4c3c","#617255"],za);
          }
        }
      } else if (prop.kind==="flowers") {
        for (let i=0;i<7;i++) {
          const dx=i*5-15,dy=(i%2)*6;
          box(x+dx,y+dy,3,3,4,["#697d47","#374f35","#4f683e"]);
          plane(x+dx-1,y+dy-1,5,5,i%2 ? "#b39a59" : "#b38382",4);
        }
      } else if (prop.kind==="rock") {
        polygon([[x-8,y,0],[x,y-7,2],[x+9,y,2],[x+3,y+8,0]],"#65786d");
        polygon([[x-8,y,0],[x,y-7,2],[x-1,y-1,11]],"#93a092");
        polygon([[x,y-7,2],[x+9,y,2],[x-1,y-1,11]],"#758a7e");
        polygon([[x+9,y,2],[x+3,y+8,0],[x-1,y-1,11]],"#526b61");
      }
    }
  }
  window.SoundCityParts={drawCivic,drawArtDeco,drawJapanese,drawArchitecture,drawFactory,drawCharacter,types,volumes,fields,decorations,normalize,isDefault,drawRoof,drawFacade,drawReservoir,drawPark,
    roofs:["greenhouse","billboard","tank","dome","industrial","pergola"]};
})();



