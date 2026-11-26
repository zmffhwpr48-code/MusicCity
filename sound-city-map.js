(() => {
  class SoundCityMap extends HTMLElement {
    connectedCallback() {
      if (this.observer) {
        this.observer?.observe(this);
        this.startTraffic();
        window.addEventListener("pointerup",this.finishHeightAdjustment);
        window.addEventListener("pagehide",this.saveTimeSettings);
        this.connectKeyboardPan();
        document.addEventListener("pointerdown",this.closeEffectsOutside,true);
        return;
      }
      const parts = window.SoundCityParts;
      const root = this;
      root.innerHTML = `
        
        <div class="scene-sky" aria-hidden="true">
          <div class="scene-stars"></div>
          <div class="scene-sun"></div>
          <div class="scene-moon"></div>
        </div>
        <canvas tabindex="0" aria-label="야간 도시 지도. 방향키 또는 드래그로 이동"></canvas>
        <canvas class="scene-shadows" aria-hidden="true"></canvas>
        <canvas class="scene-structures" aria-hidden="true"></canvas>
        <canvas class="traffic" aria-hidden="true" style="pointer-events:none"></canvas>
        <canvas class="merge-selection-layer" aria-hidden="true" style="pointer-events:none"></canvas>
        <div class="daylight-tint" aria-hidden="true"></div>
        <div class="scene-controls">
        <details class="effects-panel">
          <summary>배경 요소</summary>
          <div class="effects-buttons">
            <button type="button" data-effect="boat" aria-pressed="true">배 켜짐</button>
            <button type="button" data-effect="bridge" aria-pressed="true">다리 개폐 켜짐</button>
            <button type="button" data-effect="cars" aria-pressed="true">자동차 켜짐</button>
            <button type="button" data-effect="plane" aria-pressed="true">비행기 켜짐</button>
          </div>
          <p class="effects-feedback" role="status"></p>
        </details>
        <details class="time-panel">
          <summary>시간대 <time>21:00</time></summary>
          <div class="time-settings">
            <label>시간대 선택
              <select class="time-preset">
                <option value="custom">직접 설정</option>
                <option value="300">새벽 · 05:00</option>
                <option value="480">아침 · 08:00</option>
                <option value="720">정오 · 12:00</option>
                <option value="1080">노을 · 18:00</option>
                <option value="1200">저녁 · 20:00</option>
                <option value="1380">밤 · 23:00</option>
              </select>
            </label>
            <label>시각 조절 <input class="time-slider" type="range" min="0" max="1439" step="1" value="1260"></label>
            <div class="time-playback">
              <button type="button" class="time-play" aria-pressed="false">시간 흐르기</button>
              <label>하루 길이
                <select class="time-speed">
                  <option value="60">1분</option>
                  <option value="180">3분</option>
                  <option value="600">10분</option>
                </select>
              </label>
            </div>
            <p class="time-feedback">선택한 시간에 고정</p>
          </div>
        </details>
        </div>
        <div class="zoom" role="group" aria-label="지도 확대 및 축소">
<button type="button" aria-label="확대">+</button>
          <button type="button" aria-label="축소">−</button>
          <button type="button" class="district-toggle" aria-pressed="false">구역 추가</button>
          <label class="district-type" hidden>추가할 구역
            <select aria-label="추가할 구역 종류">
              <option value="city">도시</option>
              <option value="reservoir">저수지</option>
              <option value="park">공원</option>
            </select>
          </label>
          <button type="button" class="district-toggle" aria-pressed="false">구역 삭제</button>
          <button type="button" class="district-toggle" name="undoAction" disabled>실행 취소</button>
        </div>
        <div class="merge-panel" hidden>
          <strong>부지 합치기</strong>
          <p class="merge-description">드래그해서 여러 부지를 한 번에 선택해 줘. 클릭으로 선택하거나 해제할 수도 있어.</p>
          <output class="merge-status" aria-live="polite"></output>
          <button type="button" class="merge-confirm" disabled>선택 부지 합치기</button>
        </div>
        <div class="plot-actions" hidden>
          <button type="button">빈 부지에 건물 만들기</button>
          <button type="button" name="splitEmptyPlot" hidden>부지 나누기</button>
        </div>
        <form hidden aria-label="건물 디자인 편집">
          <strong>건물 디자인</strong>
          <button type="button" name="resetDesign">디자인 초기화</button>
          <div class="design-transfer">
            <button type="button" name="copyDesign">디자인 복사</button>
            <button type="button" name="pasteDesign" disabled title="먼저 디자인을 복사해 줘">디자인 붙여넣기</button>
          </div>
<label>건물 형태 <select name="buildingType"><option value="tower">빌딩</option><option value="house">단독주택</option><option value="duplex">복층주택</option><option value="shop">상가</option><option value="apartment">아파트</option><option value="factory">공장</option><option value="medieval">중세 유럽풍</option><option value="renaissance">르네상스풍</option><option value="gothic">고딕풍</option><option value="baroque">바로크풍</option><option value="artdeco">아르데코풍</option><option value="japanese">일본 전통 목조풍</option><option value="firestation">소방서</option><option value="police">경찰서</option><option value="hospital">병원</option></select></label>
          <label>음악 장르 스타일 <select name="preset">
            <option value="">직접 조합</option>
            <option value="dream-pop">Dream Pop</option>
            <option value="synthwave">Synthwave</option>
            <option value="indie-folk">Indie Folk</option>
            <option value="lo-fi">Lo-fi</option>
            <option value="electronic">Electronic</option>
            <option value="rnb">R&amp;B</option>
            <option value="alt-rock">Alt Rock</option>
            <option value="jazz">Jazz</option>
            <option value="city-pop">City Pop</option>
            <option value="ambient">Ambient</option>
          </select></label>
          <label>옥상 형태 <select name="top">
            <option value="flat">평지붕</option><option value="gable">박공지붕</option>
            <option value="steps">계단형</option><option value="garden">정원</option>
            <option value="antenna">안테나</option><option value="greenhouse">온실형</option><option value="billboard">광고판형</option><option value="tank">물탱크형</option><option value="dome">돔형</option><option value="industrial">산업형</option><option value="pergola">파고라형</option>
          </select></label>
          <label>창문 패턴 <select name="windows">
            <option value="grid">격자형</option><option value="wide">가로형</option>
            <option value="tall">세로형</option><option value="none">창문 없음</option><option value="glass">통유리형</option><option value="round">원형</option><option value="arch">아치형</option><option value="ribbon">띠창형</option><option value="irregular">불규칙형</option><option value="bay">돌출형</option>
          </select></label>

<label>창문 형태 <select name="windowShape"><option value="auto">패턴 기본 형태</option><option value="round">원형</option><option value="arch">아치형</option></select></label>
<label>창문 조명 <input name="windowLight" type="color" value="#f8ca83"></label>
<label>높이 <input name="height" type="number" min="24" max="180" required></label>
          <div class="building-colors wall-colors">
            <label>건물 전체 색 <input name="buildingColor" type="color"></label>
            <button type="button" name="applyBuildingColor" hidden>지붕·외벽에 같은 색 적용</button>
          </div>
          <label>지붕 <input name="roof" type="color"></label>
          <div class="wall-colors">
            <label>외벽 전체 색 <input name="walls" type="color"></label>
            <button type="button" name="applyWalls">양쪽 외벽에 같은 색 적용</button>
            <details>
              <summary>좌우 외벽 색</summary>
              <label>오른쪽 <input name="right" type="color"></label>
              <label>왼쪽 <input name="left" type="color"></label>
            </details>
          </div>
          <button type="submit" style="width:100%;min-height:44px;font-size:15px;font-weight:700;margin-bottom:6px">적용</button>
          <div class="building-actions">
            <button type="button" name="swapBuilding">이동 / 위치 교환</button>
            <button type="button" name="splitPlot" hidden>부지 나누기</button>
            <button type="button" name="deleteBuilding" aria-describedby="building-delete-help">건물 삭제</button>
            <small id="building-delete-help" hidden>음악이 연결된 건물은 확인 후 삭제할 수 있어요.</small>
          </div>
        </form>
        <output>드래그 · 방향키로 이동 / 휠로 확대·축소</output>`;
      const canvas = root.querySelector('canvas');
      const trafficCanvas = root.querySelector(".traffic");
      const trafficContext = trafficCanvas.getContext("2d");
      const shadowCanvas=root.querySelector(".scene-shadows");
      const shadowContext=shadowCanvas.getContext("2d");
      const structureCanvas=root.querySelector(".scene-structures");
      const structureContext=structureCanvas.getContext("2d");
      const mergeCanvas=root.querySelector(".merge-selection-layer");
      const mergeContext=mergeCanvas.getContext("2d");
      // Keep the base canvas as the input surface even with an older cached stylesheet.
      for (const layer of [shadowCanvas,structureCanvas,trafficCanvas,
          root.querySelector(".scene-sky"),root.querySelector(".daylight-tint")]) {
        layer.style.pointerEvents="none";
      }
      canvas.style.touchAction="none";
      const sunElement=root.querySelector(".scene-sun");
      const moonElement=root.querySelector(".scene-moon");
      const starsElement=root.querySelector(".scene-stars");
      let starSeed=0x5a17f00d;
      function starRandom() {
        starSeed^=starSeed<<13;
        starSeed^=starSeed>>>17;
        starSeed^=starSeed<<5;
        return (starSeed>>>0)/4294967296;
      }
      for (let index=0;index<70;index++) {
        const star=document.createElement("i");
        star.style.left=(3+starRandom()*94)+"%";
        star.style.top=(3+starRandom()*76)+"%";
        const size=.8+Math.pow(starRandom(),2)*1.9;
        star.style.width=star.style.height=size+"px";
        star.style.opacity=String(.35+starRandom()*.65);
        star.style.background=starRandom()<.2 ? "#fff0d5" : "#e7f1ff";
        star.style.boxShadow="0 0 "+(size*2)+"px #b9d6ff";
        starsElement.append(star);
      }
      let shadowsNeedPaint=true;
      const effectStorageKey="sound-city-effects-v1";
      const effects={boat:true,bridge:true,cars:true,plane:true};
      try {
        const storedEffects=JSON.parse(localStorage.getItem(effectStorageKey));
        for (const name of Object.keys(effects)) {
          if (typeof storedEffects?.[name]==="boolean") effects[name]=storedEffects[name];
        }
      } catch {}
      const effectNames={boat:"배",bridge:"다리 개폐",cars:"자동차",plane:"비행기"};
      const effectButtons=[...root.querySelectorAll("[data-effect]")];
      const effectsPanel=root.querySelector(".effects-panel");
      this.closeEffectsOutside=event=> {
        if (effectsPanel.open && !event.composedPath().includes(effectsPanel)) {
          effectsPanel.open=false;
        }
      };
      document.addEventListener("pointerdown",this.closeEffectsOutside,true);
      function refreshEffectButtons() {
        for (const button of effectButtons) {
          const name=button.dataset.effect;
          button.textContent=effectNames[name]+" "+(effects[name] ? "켜짐" : "꺼짐");
          button.setAttribute("aria-pressed",String(effects[name]));
        }
      }
      for (const button of effectButtons) {
        button.addEventListener("click",()=> {
          const name=button.dataset.effect;
          effects[name]=!effects[name];
          refreshEffectButtons();
          const feedback=root.querySelector(".effects-feedback");
          try {
            localStorage.setItem(effectStorageKey,JSON.stringify(effects));
            feedback.textContent=name==="bridge" && !effects.bridge ? "다리는 닫힌 상태로 유지돼요" : "";
          } catch {
            feedback.textContent="현재 화면에 적용됨 · 브라우저 저장 불가";
          }
          clearZoomPreview();
          trafficContext.clearRect(0,0,canvas.width,canvas.height);
          draw();
        });
      }
      refreshEffectButtons();
      const timePanel = root.querySelector(".time-panel");
      const timePreset = root.querySelector(".time-preset");
      const timeSlider = root.querySelector(".time-slider");
      const timePlay = root.querySelector(".time-play");
      const timeSpeed = root.querySelector(".time-speed");
      const timeFeedback = root.querySelector(".time-feedback");
      const clock = timePanel.querySelector("time");
      const timeStorageKey = "sound-city-time-v1";
      let timeSettings = {minute:1260,running:false,daySeconds:180};
      try {
        const record = JSON.parse(localStorage.getItem(timeStorageKey));
        if (record && Number.isFinite(record.minute) && record.minute>=0 && record.minute<1440) {
          timeSettings = {minute:record.minute,running:record.running===true,
            daySeconds:[60,180,600].includes(record.daySeconds) ? record.daySeconds : 180};
        }
      } catch {}
      // Interpolate brightness and atmospheric colour through a full day.
      const daylight = [
        {minute:0,brightness:.88,saturation:.9,tint:[5,8,24],alpha:.12},
        {minute:300,brightness:1.15,saturation:.88,tint:[88,75,137],alpha:.16},
        {minute:480,brightness:1.8,saturation:1.02,tint:[209,165,92],alpha:.13},
        {minute:720,brightness:2.15,saturation:.92,tint:[157,199,219],alpha:.12},
        {minute:960,brightness:1.95,saturation:1,tint:[194,185,130],alpha:.10},
        {minute:1080,brightness:1.45,saturation:1.15,tint:[227,106,61],alpha:.24},
        {minute:1200,brightness:1.05,saturation:1.05,tint:[80,65,126],alpha:.13},
        {minute:1380,brightness:.88,saturation:.9,tint:[5,8,24],alpha:.12},
        {minute:1440,brightness:.88,saturation:.9,tint:[5,8,24],alpha:.12}
      ];
      function saveTimeSettings() {
        try {
          localStorage.setItem(timeStorageKey,JSON.stringify(timeSettings));
          timeFeedback.textContent = timeSettings.running ? "시간이 자동으로 흐르는 중" : "선택한 시간에 고정";
        } catch {
          timeFeedback.textContent = "시간대 적용됨 · 브라우저 저장 불가";
        }
      }
      function paintTime() {
        const minute=timeSettings.minute;
        const end=daylight.findIndex(frame=>frame.minute>minute);
        const a=daylight[end-1], b=daylight[end];
        const progress=(minute-a.minute)/(b.minute-a.minute);
        const mix=(start,end)=>start+(end-start)*progress;
        root.style.setProperty("--city-light-filter",
          "brightness("+mix(a.brightness,b.brightness).toFixed(3)+") saturate("+
          mix(a.saturation,b.saturation).toFixed(3)+")");
        root.style.setProperty("--city-light-tint","rgba("+
          a.tint.map((value,i)=>Math.round(mix(value,b.tint[i]))).join(",")+","+
          mix(a.alpha,b.alpha).toFixed(3)+")");
        paintSky(minute);
        shadowsNeedPaint=true;
        const whole=Math.floor(minute);
        const formatted=String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");
        clock.textContent=formatted;
        clock.setAttribute("datetime",formatted);
        timeSlider.value=whole;
        timeSlider.setAttribute("aria-valuetext",formatted);
        const preset=[300,480,720,1080,1200,1380].find(value=>value===whole);
        timePreset.value=preset===undefined ? "custom" : String(preset);
        timeSpeed.value=String(timeSettings.daySeconds);
        timePlay.textContent=timeSettings.running ? "시간 고정" : "시간 흐르기";
        timePlay.setAttribute("aria-pressed",String(timeSettings.running));
      }
      const skyFrames=[
        [0,[5,12,32],[21,36,66]],
        [300,[58,51,91],[206,148,137]],
        [480,[56,135,194],[192,228,244]],
        [720,[35,128,200],[184,224,250]],
        [960,[77,140,182],[226,208,172]],
        [1080,[83,56,105],[250,145,88]],
        [1200,[16,28,64],[52,66,101]],
        [1380,[5,12,32],[21,36,66]],
        [1440,[5,12,32],[21,36,66]]
      ];
      const clampUnit=value=>Math.max(0,Math.min(1,value));
      function solarState(minute) {
        const phase=(minute-360)/720;
        const altitude=Math.sin(phase*Math.PI);
        const strength=clampUnit(altitude*3);
        const azimuth=(phase-.5)*Math.PI*.9;
        return {phase,altitude,strength,azimuth};
      }
      function paintSky(minute) {
        const index=skyFrames.findIndex(frame=>frame[0]>minute);
        const a=skyFrames[index-1],b=skyFrames[index];
        const fraction=(minute-a[0])/(b[0]-a[0]);
        const colour=slot=>"rgb("+a[slot].map((value,i)=>
          Math.round(value+(b[slot][i]-value)*fraction)).join(",")+")";
        root.style.setProperty("--scene-sky","linear-gradient(180deg,"+colour(1)+","+colour(2)+")");
        const sun=solarState(minute);
        sunElement.style.left=(8+84*clampUnit(sun.phase))+"%";
        sunElement.style.top=(72-61*Math.max(0,sun.altitude))+"%";
        sunElement.style.opacity=String(sun.strength);
        const nightPhase=((minute+360)%1440)/720;
        const moonAltitude=Math.max(0,Math.sin(nightPhase*Math.PI));
        moonElement.style.left=(12+76*clampUnit(nightPhase))+"%";
        moonElement.style.top=(66-51*moonAltitude)+"%";
        moonElement.style.opacity=String(clampUnit(moonAltitude*3)*(1-sun.strength));
        starsElement.style.opacity=String(1-clampUnit((sun.altitude+.12)/.4));
      }
      let lastTimeTick;
      let lastTimePaint=-Infinity;
      let lastTimeSave=-Infinity;
      function advanceTime(now) {
        const elapsed=lastTimeTick===undefined ? 0 : Math.max(0,Math.min(1000,now-lastTimeTick));
        lastTimeTick=now;
        if (!timeSettings.running) return;
        timeSettings.minute=(timeSettings.minute+elapsed/1000*1440/timeSettings.daySeconds)%1440;
        if (now-lastTimePaint>=100) {
          lastTimePaint=now;
          paintTime();
        }
        if (now-lastTimeSave>=5000) {
          lastTimeSave=now;
          saveTimeSettings();
        }
      }
      function chooseTime(minute) {
        timeSettings.minute=Math.max(0,Math.min(1439,minute));
        timeSettings.running=false;
        paintTime();
        saveTimeSettings();
      }
      timePreset.addEventListener("change",()=> {
        if (timePreset.value!=="custom") chooseTime(Number(timePreset.value));
      });
      timeSlider.addEventListener("input",()=>chooseTime(Number(timeSlider.value)));
      timePlay.addEventListener("click",()=> {
        timeSettings.running=!timeSettings.running;
        lastTimeTick=undefined;
        paintTime();
        saveTimeSettings();
      });
      timeSpeed.addEventListener("change",()=> {
        timeSettings.daySeconds=Number(timeSpeed.value);
        saveTimeSettings();
      });
      this.saveTimeSettings=saveTimeSettings;
      window.addEventListener("pagehide",saveTimeSettings);
      paintTime();
      timeFeedback.textContent=timeSettings.running ? "시간이 자동으로 흐르는 중" : "선택한 시간에 고정";
      const editor = root.querySelector("form");
      const plotActions = root.querySelector(".plot-actions");
      const mergeButton = document.createElement("button");
      mergeButton.type = "button";
      mergeButton.className = "district-toggle";
      mergeButton.textContent = "부지 합치기";
      mergeButton.setAttribute("aria-pressed","false");
      root.querySelector(".zoom").append(mergeButton);
      const mergePanel = root.querySelector(".merge-panel");
      const mergeStatus = root.querySelector(".merge-status");
      const mergeConfirm = root.querySelector(".merge-confirm");
      const deleteHelp = root.querySelector("#building-delete-help");
      const idleMessage = "드래그 · 방향키로 이동 / 휠로 확대·축소";
      const defaultFacade = ["#414961", "#242c44", "#323b55"];
      const editableColors = ["roof", "right", "left"];
      const field = name => editor.elements.namedItem(name);
      const presets = {
        "dream-pop": [105, "steps", "tall", "#9b84ba", "#4b3c65", "#75658e"],
        "synthwave": [138, "antenna", "wide", "#d363ad", "#452861", "#85488d"],
        "indie-folk": [56, "gable", "tall", "#927059", "#473b33", "#735747"],
        "lo-fi": [68, "garden", "grid", "#7a8568", "#3c4746", "#60726a"],
        "electronic": [154, "steps", "wide", "#46c2c8", "#193e56", "#2b7789"],
        "rnb": [92, "flat", "wide", "#9a5a7a", "#42263c", "#713853"],
        "alt-rock": [78, "flat", "grid", "#a65554", "#303039", "#4e4953"],
        "jazz": [72, "flat", "tall", "#ba8954", "#533932", "#795542"],
        "city-pop": [126, "steps", "grid", "#f09699", "#4b4a75", "#656b9d"],
        "ambient": [108, "garden", "none", "#8fa8bf", "#3f5368", "#61788f"],
      };
      const storageKey = "sound-city-designs-v1";
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
      const status = root.querySelector(':scope > output');
      const [zoomIn, zoomOut, addDistrict, removeDistrict, undoButton] = root.querySelectorAll(".zoom button");
      const redoButton = document.createElement("button");
      redoButton.type = "button";
      redoButton.className = "district-toggle";
      redoButton.name = "redoAction";
      redoButton.textContent = "다시 실행";
      redoButton.disabled = true;
      undoButton.after(redoButton);
      const districtTypeControl = root.querySelector(".district-type");
      const districtTypeSelect = districtTypeControl.querySelector("select");
      let zoom = 1;
      let minZoom;
      let overview = true;
      const maxZoom = 2.5;
      let ctx = canvas.getContext('2d');

      const camera = { x: 0, y: 110 };
      let seed = 74;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const roads = [-600, -400, -200, 0, 200, 400, 600, 800];
      const districtSize = 1400;
      const blockSize = 200;
      const tileBlocks = () => 7;
      const tileSize = tile => tileBlocks(tile)*blockSize;
      const isCity = tile => !!tile && (!tile.type || tile.type === "city");
      const districtNames = {city:"도시",reservoir:"저수지",park:"공원"};
      const origin = {col:0,row:0,type:"city"};
      const key = ({col,row}) => col + "," + row;
      const open = new Map([[key(origin),origin]]);
      const generated = new Set([key(origin)]);
      let districtMode = "";
      let targets = [];
      let districtHover;
      const waterTop = -173;
      const waterBottom = -27;
      const objects = [];
      let worldPreviewVersion=0;
      let worldPreview;
      let worldPreviewJob;
      let worldPreviewTimer;
      function cancelWorldPreviewJob() {
        clearTimeout(worldPreviewTimer);
        worldPreviewJob=undefined;
      }
      function invalidateWorldPreview() {
        worldPreviewVersion++;
        worldPreview=undefined;
        cancelWorldPreviewJob();
      }
      const buildings = new Map();
      const plotsByBuilding = new Map();
      const layoutKey = "sound-city-building-layout-v1";
      let layout = {};
      try { layout = JSON.parse(localStorage.getItem(layoutKey)) ?? {}; } catch {}

      const plotWidth = plot => plot.width ?? 90;
      const plotDepth = plot => plot.depth ?? 73;
      const mergeStorageKey = "sound-city-merged-plots-v1";
      let mergeRecords = [];
      try {
        const records = JSON.parse(localStorage.getItem(mergeStorageKey));
        if (Array.isArray(records)) mergeRecords = records.filter(record =>
          typeof record?.id === "string" && Array.isArray(record.members) &&
          record.members.length >= 2 && record.members.every(id=>typeof id === "string"));
      } catch {}
      let mergeMode = false;
      let mergeDrag;
      let mergeDragFrame;
      const mergeSelection = new Set();
      const mergedPlots = [];

      function placeBuilding(plot, building) {
        plot.building = building;
        if (!building) return;
        building.width = plotWidth(plot);
        building.depth = plotDepth(plot);
        building.x = plot.x - building.width;
        building.y = plot.y - building.depth;
        buildings.set(building.id, building);
        plotsByBuilding.set(building.id, plot);
      }

      function makeBuilding(id, defaultDesign) {
        const design = saved[id] ?? defaultDesign;
        const { height, facade = null, top, windows } = design;
        return { id, width:90, depth:73, height, trackId:null, facade, top, windows, ...parts.normalize(design), defaultDesign };
      }

      function saveLayout(message, ...plots) {
        invalidateWorldPreview();
        for (const { plotId, building } of plots) {
          layout[plotId] = building ? { id:building.id, defaultDesign:building.defaultDesign } : null;
        }
        try {
          localStorage.setItem(layoutKey, JSON.stringify(layout));
          status.textContent = message;
        } catch {
          status.textContent = message + " · 브라우저 저장 불가";
        }
      }

      const undoHistory = [];
      const redoHistory = [];
      let historyBusy=false;
      let resetDraft;
      let copiedBuildingDesign;

      function clearRedo() {
        redoHistory.length = 0;
        redoButton.disabled = true;
      }

      function rememberUndo(undo, redo) {
        undoHistory.push({undo,redo});
        clearRedo();
        undoButton.disabled = false;
      }

      function rememberLayout(...plots) {
        const previous = plots.map(plot => plot.building);
        let next;
        function applyLayout(values,message) {
          for (const plot of plots) {
            if (!plot.building) continue;
            buildings.delete(plot.building.id);
            plotsByBuilding.delete(plot.building.id);
          }
          plots.forEach((plot,index)=>placeBuilding(plot,values[index]));
          saveLayout(message,...plots);
        }
        rememberUndo(()=>{
          next=plots.map(plot=>plot.building);
          applyLayout(previous,"건물 배치 변경을 취소했어요");
        },()=>applyLayout(next,"건물 배치 변경을 다시 실행했어요"));
      }

      function saveDesign(message) {
        invalidateWorldPreview();
        try {
          localStorage.setItem(storageKey, JSON.stringify(saved));
          status.textContent = message;
        } catch {
          status.textContent = message + " · 브라우저 저장 불가";
        }
      }

      function addBlocks(columns, destination, rows=roads.slice(0,-1), river=-200) {
      for (const x of columns) {
        for (const y of rows) {
          if (y === river) continue;
          const occupied = random() > 0.27;
          const plotId = `block-${x}-${y}`;
          const plot = { plotId, x:x+143, y:y+134 };
          const defaultDesign = { height:occupied ? 32+Math.floor(random()*98) : 64, top:"flat", windows:"grid" };
          if (Object.hasOwn(layout, plotId)) {
            const record = layout[plotId];
            if (record) placeBuilding(plot, makeBuilding(record.id, record.defaultDesign));
          } else if (occupied) {
            placeBuilding(plot, makeBuilding(plotId, defaultDesign));
          }
          destination.push(plot);
          for (const offset of [42, 87, 152]) {
            destination.push({ x:x+offset, y:y+168, tree:true, size:9+random()*7 });
          }
        }
      }
      }
      addBlocks(roads.slice(0,-1), objects);
      for (const x of roads) {
        for (let y = -570; y < 800; y += 92) {
          if (y < waterBottom && y > waterTop) continue;
          objects.push({ x:x+21, y, lamp:true });
        }
      }

      const ripples = Array.from({length:520}, () => ({
        x:-600+random()*1390, y:waterTop+5+random()*136, length:3+random()*18
      }));
      function overlaps(a,b) {
        return a.col < b.col+tileBlocks(b) && a.col+tileBlocks(a)>b.col &&
          a.row < b.row+tileBlocks(b) && a.row+tileBlocks(a)>b.row;
      }
      function contains(tile,x,y) {
        return x>=tile.col*blockSize-600 && x<(tile.col+tileBlocks(tile))*blockSize-600 &&
          y>=tile.row*blockSize-600 && y<(tile.row+tileBlocks(tile))*blockSize-600;
      }
      function mergedBounds(plot) {
        return {left:plot.x-plotWidth(plot),top:plot.y-plotDepth(plot),right:plot.x,bottom:plot.y};
      }
      function withinMergedPlot(x,y) {
        return mergedPlots.some(plot=>{
          if (!plot.memberDistricts.every(id=>isCity(open.get(id)))) return false;
          const b=mergedBounds(plot);
          return x>=b.left-6 && x<=b.right+6 && y>=b.top-6 && y<=b.bottom+6;
        });
      }
      function mergedRoadBlocked(tile,x,y,nx,ny) {
        const ox=tile.col*blockSize,oy=tile.row*blockSize;
        return mergedPlots.some(plot=>{
          const b=mergedBounds(plot);
          return plot.memberDistricts.every(id=>isCity(open.get(id))) &&
            Math.max(x,nx)+ox>=b.left-9 && Math.min(x,nx)+ox<=b.right+9 &&
            Math.max(y,ny)+oy>=b.top-9 && Math.min(y,ny)+oy<=b.bottom+9;
        });
      }
      function visibleObject(object) {
        if (object.mergedInto) return false;
        if (object.memberDistricts) return object.memberDistricts.every(id=>isCity(open.get(id)));
        if (!object.plotId && withinMergedPlot(object.x,object.y)) return false;
        const tile = open.get(object.district ?? key(origin));
        return isCity(tile);
      }
      const districtObjects = new Map();
      let viewQueryCache;
      function sortObjects() {
        invalidateWorldPreview();
        viewQueryCache = null;
        objects.sort((a,b) => a.x+a.y-b.x-b.y);
        districtObjects.clear();
        for (const object of objects) {
          const id = object.district ?? key(origin);
          if (!districtObjects.has(id)) districtObjects.set(id, []);
          districtObjects.get(id).push(object);
        }
      }
      function viewObjects() {
        if (!width || !height || !scale) return [];
        const viewKey=[width,height,scale,camera.x,camera.y,offsetX,offsetY].join(",");
        if(viewQueryCache?.key===viewKey)return viewQueryCache.objects;
        const visible=[];
        for (const [id,tile] of open) {
          if (isCity(tile) && intersectsView(tile.col*blockSize-600,
              tile.row*blockSize-600,districtSize,districtSize,310,50)) {
            visible.push(...(districtObjects.get(id)??[]));
          }
        }
        for (const plot of mergedPlots) {
          if (!visible.includes(plot) && visibleObject(plot)) visible.push(plot);
        }
        const result=visible.filter(visibleObject).sort((a,b)=>a.x+a.y-b.x-b.y);
        viewQueryCache={key:viewKey,objects:result};
        return result;
      }
      sortObjects();
      function generateDistrict(tile) {
        if (!isCity(tile)) return;
        const id = key(tile);
        if (generated.has(id)) return;
        const dx = tile.col*blockSize;
        const dy = tile.row*blockSize;
        const added = [];
        const columns = roads.slice(0,-1).map(x => x+dx);
        const rows = roads.slice(0,-1).map(y => y+dy);
        const previousSeed = seed;
        seed = (74 ^ Math.imul(tile.col%7===0 ? tile.col/7 : tile.col+100003,73856093) ^
          Math.imul(tile.row%7===0 ? tile.row/7 : tile.row+100003,19349663)) >>> 0;
        addBlocks(columns,added,rows,tile.row===0 ? -200 : NaN);
        seed = previousSeed;
        for (const x of columns) {
          for (let y=dy-570; y<dy+800; y+=92) {
            if (tile.row===0 && y>waterTop && y<waterBottom) continue;
            added.push({x:x+21,y,lamp:true});
          }
        }
        for (const object of added) {
          object.district = id;
          objects.push(object);
        }
        generated.add(id);
        sortObjects();
      }
      const districtStorageKey = "sound-city-districts-v3";
      try {
        const current = localStorage.getItem(districtStorageKey);
        const compact = localStorage.getItem("sound-city-districts-v2");
        const tiles = JSON.parse(current ?? compact ?? localStorage.getItem("sound-city-districts-v1"));
        const factor = current === null && compact === null ? 7 : 1;
        if (Array.isArray(tiles)) {
          const restoredTiles = tiles.filter(tile =>
            Number.isSafeInteger(tile?.col) && Number.isSafeInteger(tile?.row) &&
            (!tile.type || ["city","reservoir","park"].includes(tile.type)))
            .map(tile => ({col:tile.col*factor,row:tile.row*factor,type:tile.type ?? "city"}));
          // Restore built-up areas first so enlarging lakes never moves buildings.
          restoredTiles.sort((a,b) => Number(a.type==="reservoir")-Number(b.type==="reservoir"));
          for (const savedTile of restoredTiles) {
            if (key(savedTile)===key(origin) && savedTile.type!=="reservoir") continue;
            let restored=savedTile;
            if ([...open.values()].some(existing => overlaps(existing,restored))) {
              if (restored.type!=="reservoir") continue;
              const candidates=[];
              for (const neighbor of open.values()) {
                for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                  const candidate={col:neighbor.col+dx*7,row:neighbor.row+dy*7,type:"reservoir"};
                  if (![...open.values()].some(existing => overlaps(existing,candidate))) {
                    candidates.push(candidate);
                  }
                }
              }
              candidates.sort((a,b) =>
                (Math.abs(a.col-savedTile.col)+Math.abs(a.row-savedTile.row))-
                (Math.abs(b.col-savedTile.col)+Math.abs(b.row-savedTile.row)));
              restored=candidates[0];
              if (!restored) continue;
            }
            generateDistrict(restored);
            open.set(key(restored),restored);
          }
        }
      } catch {}
      function saveDistricts() {
        invalidateWorldPreview();
        try {
          localStorage.setItem(districtStorageKey,JSON.stringify([...open.values()]
            .map(({col,row,type}) => ({col,row,type:type ?? "city"}))));
          return true;
        } catch {
          return false;
        }
      }
      saveDistricts();
      restoreMergedPlots();
      let offsetX = 0;
      let offsetY = 0;
      let width, height, scale, selected, hovered, gesture, selectedPlot, swapSource, dropPlot;
      const project = (x,y,z=0) => [
        width/2+(x+offsetX-y-offsetY-camera.x)*scale,
        height/2+((x+y+offsetX+offsetY)*0.49-z-camera.y)*scale
      ];
      const trafficByDistrict = new Map();
      const trafficRoads = roads.slice(1,-1);
      const trafficDirections = [[200,0],[-200,0],[0,200],[0,-200]];
      function chooseTrafficTurn(tile, x, y, previous) {
        const options = trafficDirections.map(([dx,dy]) => ({x:x+dx,y:y+dy})).filter(next => {
          if (!trafficRoads.includes(next.x) || !trafficRoads.includes(next.y)) return false;
          const crossesRiver = tile.row === 0 && Math.min(y,next.y) < waterTop &&
            Math.max(y,next.y) > waterBottom;
          return (!crossesRiver || [-400,0,400].includes(x)) && !mergedRoadBlocked(tile,x,y,next.x,next.y);
        });
        const forward = options.filter(next => next.x !== previous?.x || next.y !== previous?.y);
        const choices = forward.length ? forward : options;
        return choices[Math.floor(Math.random()*choices.length)];
      }

      function drawCarWheels(x,y,dx,dy,length,breadth,angle) {
        const radius = 2.1;
        const detail = scale >= 1.55;
        // Use the camera-facing side of the car for either road axis.
        const roll = dx ? angle*dx : -angle*dy;
        for (const axle of [-.29,.29]) {
          const [px,py] = project(x+dx*length*axle+Math.abs(dy)*breadth/2,
            y+dy*length*axle+Math.abs(dx)*breadth/2, radius);
          const r = radius*scale;
          ctx.save();
          ctx.transform(1,dx ? .49 : -.49,0,1,px,py);
          ctx.fillStyle = "#111821";
          ctx.beginPath();
          ctx.arc(0,0,r,0,2*Math.PI);
          ctx.fill();
          ctx.fillStyle = detail ? "#667589" : "#444e5d";
          ctx.beginPath();
          ctx.arc(0,0,r*.58,0,2*Math.PI);
          ctx.fill();
          if (detail) {
            ctx.strokeStyle = "#c9d5df";
            ctx.lineWidth = Math.max(.65,r*.14);
            ctx.beginPath();
            for (let spoke=0; spoke<3; spoke++) {
              const theta = roll+spoke*2*Math.PI/3;
              ctx.moveTo(0,0);
              ctx.lineTo(Math.cos(theta)*r*.55,Math.sin(theta)*r*.55);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      let occlusionCapture;
      const buildingOcclusionShapes=new Map();
      const silentContext=new Proxy({},{
        get:(target,name)=>name==="measureText"?()=>({width:0}):()=>{},
        set:()=>true
      });
      function buildingOcclusion(b) {
        const signature=JSON.stringify({width:b.width,depth:b.depth,height:b.height,top:b.top,
          windows:b.windows,...parts.normalize(b)});
        let faces=buildingOcclusionShapes.get(signature);
        if(faces) {
          buildingOcclusionShapes.delete(signature);
          buildingOcclusionShapes.set(signature,faces);
          return faces;
        }
        const captured=[];
        const previousContext=ctx;
        const previousCapture=occlusionCapture;
        function projected(point) {return [point[0]-point[1],(point[0]+point[1])*.49-point[2]];}
        function insideConvex(point,outline) {
          let positive=false,negative=false;
          for(let i=0;i<outline.length;i++) {
            const a=outline[i],z=outline[(i+1)%outline.length];
            const cross=(z[0]-a[0])*(point[1]-a[1])-(z[1]-a[1])*(point[0]-a[0]);
            positive ||= cross>.001;
            negative ||= cross<-.001;
            if(positive&&negative)return false;
          }
          return true;
        }
        try {
          ctx=silentContext;
          occlusionCapture=points=>{
            if(points.length<3)return;
            const outline=points.map(projected);
            const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
            const bounds={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
            // Windows within a wall add no new silhouette, so avoid duplicate clip paths.
            if(captured.some(face=>face.left<=bounds.left && face.right>=bounds.right &&
              face.top<=bounds.top && face.bottom>=bounds.bottom &&
              outline.every(point=>insideConvex(point,face.outline))))return;
            captured.push({...bounds,outline,points:points.map(p=>[...p])});
          };
          drawBuilding({...b,x:0,y:0,cachedSprite:true,thumbnail:false,occlusionOnly:true});
        } finally {
          ctx=previousContext;
          occlusionCapture=previousCapture;
        }
        faces=captured.map(face=>face.points);
        buildingOcclusionShapes.set(signature,faces);
        if(buildingOcclusionShapes.size>128)buildingOcclusionShapes.delete(buildingOcclusionShapes.keys().next().value);
        return faces;
      }

      const occlusionCellSize = 96;
      let occlusionGrid, occlusionView;
      function buildOcclusionGrid(skipBuilding=null,onlyBuilding=null) {
        const grid = new Map();
        function add(object, points, lamp=false, radius=0) {
          const outline = points.map(point => project(...point));
          const xs = outline.map(([x]) => x);
          const ys = outline.map(([,y]) => y);
          const left = Math.min(...xs)-radius, right = Math.max(...xs)+radius;
          const top = Math.min(...ys)-radius, bottom = Math.max(...ys)+radius;
          const shape = {depth:object.x+object.y,outline,left,right,top,bottom,lamp,radius};
          for (let col=Math.floor(left/occlusionCellSize); col<=Math.floor(right/occlusionCellSize); col++) {
            for (let row=Math.floor(top/occlusionCellSize); row<=Math.floor(bottom/occlusionCellSize); row++) {
              const id = col+","+row;
              if (!grid.has(id)) grid.set(id,[]);
              grid.get(id).push(shape);
            }
          }
        }
        const candidates=onlyBuilding?[plotsByBuilding.get(onlyBuilding.id)].filter(Boolean):viewObjects();
        for (const object of candidates) {
          if (!visibleObject(object)) continue;
          const building = object.building;
          if(building && building===skipBuilding)continue;
          if (building) {
            const design = building === selected && !editor.hidden ? {...building,...readDesign()} : building;
            const {x,y,width:w,depth:d} = building;
            const h = design.height;
            if (!intersectsView(x,y,w,d,h+80,32)) continue;
            for(const face of buildingOcclusion(design)) {
              add(object,face.map(([px,py,pz])=>[x+px,y+py,pz]));
            }
          } else if (object.lamp) {
            const {x,y} = object;
            if (!intersectsView(x,y,2,2,20,32)) continue;
            add(object,[[x,y+1.6,17],[x,y,17],[x+1.6,y,17],
              [x+1.6,y,0],[x+1.6,y+1.6,0],[x,y+1.6,0]],true);
            add(object,[[x,y,18]],true,2.4*scale);
          }
        }
        return grid;
      }
      function clipForeground(depth,left,top,right,bottom,includeLamps=false) {
        const view = [width,height,scale,camera.x,camera.y].join(",");
        const liveScene=heightPreviewPending && liveHeightScene && liveHeightScene.building===selected && liveHeightScene.view===view ? liveHeightScene:null;
        if(liveScene) {
          occlusionGrid=liveScene.staticGrid;
          occlusionView=view;
        } else if (!occlusionGrid || view !== occlusionView) {
          occlusionGrid = buildOcclusionGrid();
          occlusionView = view;
        }
        const candidates = new Set();
        for (let col=Math.floor(left/occlusionCellSize); col<=Math.floor(right/occlusionCellSize); col++) {
          for (let row=Math.floor(top/occlusionCellSize); row<=Math.floor(bottom/occlusionCellSize); row++) {
            const id=col+","+row;
            const cell = occlusionGrid.get(id);
            if (cell) for (const shape of cell) candidates.add(shape);
            const dynamicCell=liveScene?.dynamicGrid.get(id);
            if(dynamicCell)for(const shape of dynamicCell)candidates.add(shape);
          }
        }
        for (const shape of candidates) {
          if (shape.depth<=depth || (!includeLamps && shape.lamp) ||
              right<shape.left || left>shape.right || bottom<shape.top || top>shape.bottom) continue;
          ctx.beginPath();
          ctx.rect(0,0,width,height);
          if (shape.radius) {
            const [[x,y]] = shape.outline;
            ctx.moveTo(x+shape.radius,y);
            ctx.arc(x,y,shape.radius,0,2*Math.PI);
          } else {
            shape.outline.forEach(([x,y],index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
          }
          ctx.closePath();
          ctx.clip("evenodd");
        }
      }
      const riverCrossings = [-400,0,400];
      function bridgeOpening(boatX, bridgeX) {
        if (!effects.bridge) return 0;
        const amount = Math.max(0,Math.min(1,(88-Math.abs(boatX-bridgeX))/52));
        return amount*amount*(3-2*amount);
      }
      function drawRiverTraffic(now) {
        const elapsed = (now-firstTrafficFrame)/1000;
        const columns = [...open.values()].filter(tile => tile.row===0 && isCity(tile)).map(tile => tile.col);
        const left = Math.min(...columns)*blockSize-690;
        const right = Math.max(...columns)*blockSize+890;
        const boatSpeed = 28;
        const duration = (right-left)/boatSpeed;
        const cycleLength = duration+30;
        const cycle = elapsed%cycleLength;
        const direction = Math.floor(elapsed/cycleLength)%2 ? -1 : 1;
        const boatX = (direction===1 ? left : right)+direction*(cycle-3)*boatSpeed;
        const moving = effects.boat && cycle>=3 && cycle<duration+3;
        const riverY = (waterTop+waterBottom)/2;
        for (const tile of open.values()) {
          if (tile.row!==0 || !isCity(tile)) continue;
          const startX = tile.col*blockSize;
          if (!intersectsView(startX-620,waterTop,1440,waterBottom-waterTop,76,12)) continue;
          if (moving && boatX>=startX-600 && boatX<startX+800) {
            const [left]=project(boatX-46,riverY+11);
            const [right]=project(boatX+46,riverY-11);
            const [,top]=project(boatX-46,riverY-11,16);
            const [,bottom]=project(boatX+46,riverY+11,-1);
            ctx.save();
            try {
              clipForeground(boatX+riverY,left,top,right,bottom,true);
              const stern = boatX-direction*25;
              const shoulder = boatX+direction*13;
              const bow = boatX+direction*27;
              const near = riverY+8;
              const far = riverY-8;
              for (const side of [-1,1]) {
                polygon([[stern,riverY+side*3,0],
                  [stern-direction*20,riverY+side*10,0],
                  [stern-direction*13,riverY+side*4,0]],"#8fc1ca42");
              }
              const hull=[[stern,far,0],[shoulder,far,0],[bow,riverY,2],
                [shoulder,near,0],[stern,near,0]];
              const faces=[];
              for (let index=0;index<hull.length;index++) {
                const a=hull[index], b=hull[(index+1)%hull.length];
                const facing=((b[1]-a[1])-(b[0]-a[0]))*direction;
                if (facing<=0) continue;
                faces.push({
                  points:[a,b,[b[0],b[1],6],[a[0],a[1],6]],
                  depth:(a[0]+a[1]+b[0]+b[1])/2,
                  colour:index===4 ? "#68554b" : "#564844"
                });
              }
              faces.sort((a,b)=>a.depth-b.depth);
              for (const face of faces) polygon(face.points,face.colour);
              polygon(hull.map(([x,y])=>[x,y,6]),"#d1ad82","#846952");
              box(boatX-10,riverY-5,17,10,9,["#e0caa6","#746764","#a48b75"],6);
              plane(boatX-11,riverY-6,19,12,"#eee0bd",15);
              polygon([[boatX-7,riverY+5,9],[boatX+4,riverY+5,9],
                [boatX+4,riverY+5,12],[boatX-7,riverY+5,12]],"#7999a6");
            } finally {
              ctx.restore();
            }
          }
          for (const crossing of riverCrossings) {
            const x = startX+crossing;
            const angle = (moving ? bridgeOpening(boatX,x) : 0)*1.12;
            for (const [hinge,sign] of [[waterTop,1],[waterBottom,-1]]) {
              const length = (waterBottom-waterTop)/2;
              const tip = hinge+sign*length*Math.cos(angle);
              const elevation = length*Math.sin(angle);
              const railPoint = (rail, fraction, height) => [
                rail,
                hinge+(tip-hinge)*fraction-sign*height*Math.sin(angle),
                elevation*fraction+height*Math.cos(angle)
              ];
              function drawRail(rail) {
                polygon([railPoint(rail,0,3),railPoint(rail,1,3),
                  railPoint(rail,1,5),railPoint(rail,0,5)],"#9ba6bc");
                for (const fraction of [.08,.35,.65,.92]) {
                  polygon([railPoint(rail-.6,fraction,0),railPoint(rail+.6,fraction,0),
                    railPoint(rail+.6,fraction,4),railPoint(rail-.6,fraction,4)],"#747f96");
                }
              }
              const [left] = project(x-14,Math.max(hinge,tip)+7);
              const [right] = project(x+14,Math.min(hinge,tip)-7);
              const [,top] = project(x-14,Math.min(hinge,tip)-7,elevation+8);
              const [,bottom] = project(x+14,Math.max(hinge,tip)+7,-6);
              if (right < 0 || left > width || bottom < 0 || top > height) continue;
              ctx.save();
              clipForeground(x+Math.max(hinge,tip),left,top,right,bottom);
              const thickness = 6;
              const deck = (edge, fraction) => railPoint(edge,fraction,0);
              // Both hinge edges stay at the riverbank, below the adjoining road.
              const lowerHinge = edge => [edge,hinge,-thickness];
              const lowerTip = edge => railPoint(edge,1,-thickness);
              // Projection looks toward increasing x and y at .98 elevation per unit.
              const facesUp = .98*Math.cos(angle)-sign*Math.sin(angle)>0;
              const tipVisible = angle>0 && sign*Math.cos(angle)+.98*Math.sin(angle)>0;
              if (facesUp) drawRail(x-12);
              if (!facesUp) {
                polygon([lowerHinge(x-13),lowerHinge(x+13),
                  lowerTip(x+13),lowerTip(x-13)],"#414b63");
              }
              polygon([lowerHinge(x+13),lowerTip(x+13),
                deck(x+13,1),deck(x+13,0)],"#59647f");
              if (tipVisible) {
                polygon([lowerTip(x-13),lowerTip(x+13),deck(x+13,1),deck(x-13,1)],"#69758e");
              }
              if (facesUp) {
                polygon([deck(x-13,0),deck(x+13,0),deck(x+13,1),deck(x-13,1)],"#242c40");
                polygon([deck(x-.55,0),deck(x+.55,0),deck(x+.55,1),deck(x-.55,1)],"#8e8390");
                drawRail(x+12);
              }
              ctx.restore();
            }
          }
        }
        return moving ? boatX : Infinity;
      }
      let firstTrafficFrame;
      function drawPassingPlane(now) {
        if (!effects.plane) return;
        firstTrafficFrame ??= now;
        const elapsed = now-firstTrafficFrame-5500;
        if (elapsed < 0) return;
        const cycle = 62000;
        const progress = (elapsed%cycle)/26000;
        if (progress >= 1) return;
        const direction = Math.floor(elapsed/cycle)%2 ? -1 : 1;
        const worldX = 100+direction*(progress-.5)*1900;
        const worldY = 300-direction*(progress-.5)*440;
        const flightAltitude = 325;
        const [x,y] = project(worldX,worldY,flightAltitude);
        if (x < -70 || x > width+70 || y < -70 || y > height+70) return;
        const size = Math.min(1.8,Math.max(.5,scale));
        trafficContext.save();
        trafficContext.translate(x,y);
        trafficContext.rotate(Math.atan2(1460*.49,2340));
        trafficContext.scale(direction*size,size);
        function paint(points, fill) {
          trafficContext.beginPath();
          trafficContext.moveTo(...points[0]);
          for (const [px,py] of points.slice(1)) trafficContext.lineTo(px,py);
          trafficContext.closePath();
          trafficContext.fillStyle = fill;
          trafficContext.fill();
        }
        const fuselage = trafficContext.createLinearGradient(0,-4,0,5);
        fuselage.addColorStop(0,"#dae5f0");
        fuselage.addColorStop(.38,"#a5b8ca");
        fuselage.addColorStop(1,"#465870");
        paint([[-5,-2],[-12,-12],[-9,-13],[5,-3]],"#758ca5");
        paint([[-15,-1],[-19,-7],[-16,-8],[-10,-2]],"#91a6bb");
        paint([[-16,0],[-12,-3],[8,-4],[13,-2],[17,0],[16,2],
          [11,4],[-9,4],[-15,2]],fuselage);
        paint([[-15,-1],[-17,-9],[-14,-10],[-8,-2]],"#a9bed1");
        paint([[-11,2],[-16,6],[-13,7],[-7,3]],"#7188a1");
        paint([[7,-2],[11,-2],[14,0],[10,0]],"#283f58");
        for (const px of [-7,-4,-1,2,5]) {
          trafficContext.fillStyle = "#4d6580";
          trafficContext.fillRect(px,0,1.3,1);
        }
        paint([[2,6],[5,6],[6,8],[4,10],[-1,10],[-3,8],[-1,6]],"#536981");
        paint([[4,6],[6,7],[5,9],[3,9],[2,8]],"#26394f");
        paint([[6,2],[0,2],[-9,12],[-6,13],[5,5]],"#6b819a");
        paint([[6,2],[0,2],[-9,12],[-6,11]],"#b4c6d8");
        if (Math.floor(now/400)%2 === 0) {
          trafficContext.fillStyle = direction===1 ? "#ff8683" : "#88ddcc";
          trafficContext.fillRect(-11,-13,2,2);
          trafficContext.fillStyle = direction===1 ? "#88ddcc" : "#ff8683";
          trafficContext.fillRect(-9,11,2,2);
        }
        trafficContext.restore();
      }
      let lastTrafficTime;
      let lastAnimationPaint = -Infinity;
      function animateTraffic(now) {
        if (!root.isConnected) {
          lastTrafficTime = undefined;
          return;
        }
        root.trafficFrame = requestAnimationFrame(animateTraffic);
        advanceTime(now);
        if (!width || !height || !scale) return;
        // All four layers, including vehicles, stay visible during the zoom preview.
        if(zoomPreview)return;

        if (now-lastAnimationPaint < 1000/30) return;
        lastAnimationPaint = now;
        advanceKeyboardPan(now);
        const elapsed = Math.min((now-(lastTrafficTime ?? now))/1000,.05);
        lastTrafficTime = now;
        const pixelRatio = trafficCanvas.width/width;
        trafficContext.setTransform(pixelRatio,0,0,pixelRatio,0,0);
        trafficContext.clearRect(0,0,width,height);
        if (shadowsNeedPaint) paintShadows();
        for (const id of trafficByDistrict.keys()) {
          if (!isCity(open.get(id))) trafficByDistrict.delete(id);
        }
        const mapContext = ctx;
        ctx = trafficContext;
        try {
          firstTrafficFrame ??= now;
          const boatX = drawRiverTraffic(now);
          const carDistricts=effects.cars && scale>=.5 ? open : [];
          for (const [id,tile] of carDistricts) {
            if (!isCity(tile)) continue;
            const ox = tile.col*blockSize, oy = tile.row*blockSize;
            if (!intersectsView(ox-600,oy-600,districtSize,districtSize,0,30)) continue;
            if (!trafficByDistrict.has(id)) {
              trafficByDistrict.set(id, [0,1,2].map((index) => {
                const from = index === 0 ? {x:0,y:0} : {x:trafficRoads[index*2],y:trafficRoads[(index+2)%trafficRoads.length]};
                const to = index === 0 ? {x:0,y:-200} : chooseTrafficTurn(tile,from.x,from.y);
                return {from,to,distance:index === 0 ? 100 : 25+index*51,
                  wheelAngle:0,speed:23+Math.random()*10,color:["#6487a1","#ac725e","#84947e"][index]};
              }));
            }
            for (const car of trafficByDistrict.get(id)) {
              if (!car.to) continue;
              let travel = elapsed*car.speed;
              if (tile.row===0 && car.from.x===car.to.x &&
                  Math.min(car.from.y,car.to.y)<waterTop &&
                  Math.max(car.from.y,car.to.y)>waterBottom &&
                  riverCrossings.includes(car.from.x) &&
                  bridgeOpening(boatX,ox+car.from.x)>0) {
                const bank = car.to.y>car.from.y ? waterTop : waterBottom;
                const stop = Math.abs(bank-car.from.y)-12;
                if (car.distance<=stop) travel = Math.min(travel,stop-car.distance);
              }
              car.distance += travel;
              car.wheelAngle = (car.wheelAngle+travel/2.1)%(2*Math.PI);
              if (car.distance >= 200) {
                const next = chooseTrafficTurn(tile,car.to.x,car.to.y,car.from);
                if (!next) { car.distance = 200; continue; }
                car.from = car.to;
                car.to = next;
                car.distance -= 200;
              }
              const dx = (car.to.x-car.from.x)/200, dy = (car.to.y-car.from.y)/200;
              const x = ox+car.from.x+dx*car.distance-dy*4;
              const y = oy+car.from.y+dy*car.distance+dx*4;
              const [px,py] = project(x,y,2);
              if (px < -20 || px > width+20 || py < -20 || py > height+20) continue;
              trafficContext.save();
              clipForeground(x+y, px-28*scale-8, py-18*scale-8, px+28*scale+8, py+18*scale+8, true);
              const length = Math.max(16, 8/scale), breadth = Math.max(7, 3/scale);
              const w = dx ? length : breadth, d = dy ? length : breadth;
              const bodyHeight = Math.max(4, 2/scale);
              box(x-w/2,y-d/2,w,d,bodyHeight,[car.color,"#394962","#4b6177"]);
              box(x-w*.30,y-d*.30,w*.60,d*.60,bodyHeight*.68,
                ["#a2bbcb","#303f56","#536c82"],bodyHeight);
              if (scale >= .8) {
                drawCarWheels(x,y,dx,dy,length,breadth,car.wheelAngle);
              }
              const lightOffset = length*.42;
              plane(x+dx*lightOffset-1,y+dy*lightOffset-1,2,2,"#fff0b8",bodyHeight);
              plane(x-dx*lightOffset-1,y-dy*lightOffset-1,2,2,"#ed645d",bodyHeight);
              trafficContext.restore();
            }
          }
        } finally {
          ctx = mapContext;
        }
        drawFactorySmoke(now);
        drawPassingPlane(now);
      }

      function drawFactorySmoke(now) {
        const audio = document.getElementById("audio-player");
        if (!audio || audio.paused || audio.ended || audio.readyState < 2) return;
        const trackId = audio.dataset.trackId;
        if (!trackId) return;
        trafficContext.save();
        for (const plot of viewObjects()) {
          const building = plot.building;
          if (!building || !visibleObject(plot) || building.trackId !== trackId) continue;
          const b = building === selected && !editor.hidden ? {...building,...readDesign()} : building;
          if (b.buildingType !== "factory") continue;
          const chimneyX = b.x+b.width*.78+3.5;
          const chimneyY = b.y+9.5;
          const chimneyTop = b.height*1.5+2;
          for (let i=0;i<4;i++) {
            const age = ((now/1000+i*1.1)%4.4)/4.4;
            const drift = Math.sin(age*2+i)*3+age*9;
            const [sx,sy] = project(chimneyX+drift,chimneyY,chimneyTop+age*27);
            const radius = Math.max(1.2,(2+age*5)*scale);
            trafficContext.fillStyle = "rgba(185,194,208,"+((1-age)*.19)+")";
            trafficContext.beginPath();
            trafficContext.ellipse(sx,sy,radius,radius*.8,0,0,Math.PI*2);
            trafficContext.fill();
          }
        }
        trafficContext.restore();
      }

      function polygon(points, fill, stroke) {
        if(occlusionCapture) {occlusionCapture(points);return;}
        ctx.beginPath();
        for (const [i, point] of points.entries()) {
          const [x,y] = project(...point);
          if (i === 0) ctx.moveTo(x,y);
          else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
      }
      const plane = (x,y,w,d,color,z=0,stroke) =>
        polygon([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color,stroke);
      function box(x,y,w,d,h,colors,z=0) {
        polygon([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],colors[1]);
        polygon([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],colors[2]);
        plane(x,y,w,d,colors[0],z+h);
      }
      function glow(x,y,z,r,color,core) {
        const [px,py] = project(x,y,z);
        const radius = r*scale;
        const light = ctx.createRadialGradient(px,py,0,px,py,radius);
        light.addColorStop(0,color);
        light.addColorStop(1,'transparent');
        ctx.fillStyle = light;
        ctx.fillRect(px-radius,py-radius,radius*2,radius*2);
        if (core) {
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(px,py,2.4*scale,0,Math.PI*2);
          ctx.fill();
        }
      }
      function syncWallColor() {
        field("walls").value = field("right").value;
        field("applyWalls").hidden = field("right").value === field("left").value;
        field("buildingColor").value = field("roof").value;
        field("applyBuildingColor").hidden = editableColors.every(name=>field(name).value===field("roof").value);
      }
      function applyWallColor() {
        field("right").value = field("walls").value;
        field("left").value = field("walls").value;
      }
      function fillDesignEditor(design) {
        const extension = parts.normalize(design);
        for (const name of parts.fields) field(name).value = extension[name];
        editor.elements.namedItem("height").value = design.height;
        field("preset").value = "";
        field("top").value = design.top;
        field("windows").value = design.windows;
        const colors = design.facade ?? defaultFacade;
        editableColors.forEach((name, index) => {
          editor.elements.namedItem(name).value = colors[index];
        });
        syncWallColor();
        refreshChoices();
      }
      function readDesign() {
        return {
          height: Math.max(24, Math.min(180, field("height").valueAsNumber || selected.height)),
          facade: editableColors.map(name => field(name).value),
          top: field("top").value,
          windows: field("windows").value,
          ...Object.fromEntries(parts.fields.map(name => [name, field(name).value])),
          signText: selected.signText ?? "",
          decorations: []
        };
      }
      const roofHeights = { flat:8, gable:22, steps:22, garden:6, antenna:32, greenhouse:36,billboard:42,tank:36,dome:34,industrial:22,pergola:30 };
      let selectedMusicTrackId = null;
      this.setSelectedTrack = trackId => {
        const next = trackId ?? null;
        if (next === selectedMusicTrackId) return;
        selectedMusicTrackId = next;
        invalidateWorldPreview();
        draw();
      };
      function drawMusicBadge(building) {
        if (building.cachedSprite) return;
        const badgeColor = building.trackId === selectedMusicTrackId ? "#60b8ff" : "#ffcc70";
        const {x,y,width,depth,height,top} = building;
        const [cx,roofY] = project(x+width/2,y+depth/2,height+(roofHeights[top] ?? 0));
        const cy = roofY-15;
        ctx.save();
        ctx.fillStyle = "#141b2d";
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx,cy+11);
        ctx.lineTo(cx,roofY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx,cy,11,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = badgeColor;
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♪",cx,cy);
        ctx.restore();
      }
      const buildingSprites = new Map();
      let buildingSpritePixels = 0;
      function drawDistantBuilding(b) {
        const signature=JSON.stringify({
          width:b.width,depth:b.depth,height:b.height,top:b.top,windows:b.windows,
          facade:b.facade??defaultFacade,...parts.normalize(b),lit:!!b.trackId,preview:!!b.preview
        });
        let sprite=buildingSprites.get(signature);
        if(sprite) {
          buildingSprites.delete(signature);
          buildingSprites.set(signature,sprite);
        } else {
          const left=-b.depth-48,top=-b.height-110;
          const span=b.width+b.depth+96;
          const tall=b.height+110+(b.width+b.depth)*.49+40;
          const resolution=Math.min(.8,1536/span,1536/tall);
          const image=document.createElement("canvas");
          image.width=Math.ceil(span*resolution);
          image.height=Math.ceil(tall*resolution);
          const previous={ctx,width,height,scale,offsetX,offsetY,x:camera.x,y:camera.y};
          try {
            ctx=image.getContext("2d");
            width=image.width;height=image.height;scale=resolution;
            offsetX=offsetY=0;
            camera.x=left+width/(2*resolution);
            camera.y=top+height/(2*resolution);
            drawBuilding({...b,x:0,y:0,cachedSprite:true});
          } finally {
            ({ctx,width,height,scale,offsetX,offsetY}=previous);
            camera.x=previous.x;camera.y=previous.y;
          }
          sprite={image,left,top,resolution,pixels:image.width*image.height};
          while(buildingSpritePixels+sprite.pixels>8000000 && buildingSprites.size) {
            const oldest=buildingSprites.keys().next().value;
            buildingSpritePixels-=buildingSprites.get(oldest).pixels;
            buildingSprites.delete(oldest);
          }
          buildingSprites.set(signature,sprite);
          buildingSpritePixels+=sprite.pixels;
        }
        const [x,y]=project(b.x,b.y);
        ctx.save();
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality="high";
        ctx.drawImage(sprite.image,x+sprite.left*scale,y+sprite.top*scale,
          sprite.image.width/sprite.resolution*scale,sprite.image.height/sprite.resolution*scale);
        ctx.restore();
      }

      function drawBuildingFootprint(b) {
        const active=b.preview || b===selected || b===hovered;
        const color=active?(b.trackId?"#61e0ff":"#777f91"):"#51566d";
        plane(b.x-4,b.y-4,b.width+8,b.depth+8,color);
      }
      function drawGroundFootprints(list) {
        for(const object of list) {
          const b=object.building;
          if(b && visibleObject(object) && intersectsView(b.x-4,b.y-4,b.width+8,b.depth+8,0,5))
            drawBuildingFootprint(b);
        }
      }
      function drawBuilding(b) {
        if(b.thumbnail && !b.cachedSprite)drawBuildingFootprint(b);
        if (b === selected && !editor.hidden) b = { ...b, ...readDesign(), preview:true };
        if (scale < .28 && !b.thumbnail && !b.cachedSprite) {
          drawDistantBuilding(b);
          if(b.trackId)drawMusicBadge(b);
          return;
        }
        if (["firestation","police","hospital"].includes(b.buildingType)) {
          parts.drawCivic(b,{box,plane,polygon,project,ctx,scale});
          if (b.trackId) drawMusicBadge(b);
          return;
        }
        if (b.buildingType === "artdeco") {
          parts.drawArtDeco(b,{box,plane,polygon,project,ctx,scale});
          if (b.trackId) drawMusicBadge(b);
          return;
        }
        if (b.buildingType === "japanese") {
          parts.drawJapanese(b,{box,plane,polygon,project,ctx,scale});
          if (b.trackId) drawMusicBadge(b);
          return;
        }
        if (b.buildingType === "factory") {
          parts.drawFactory(b,{box,plane,polygon,project,ctx,scale});
          if (b.trackId) drawMusicBadge(b);
          return;
        }
        const originalBuilding = b;
        const type = b.buildingType ?? "tower";
        const volumes = parts.volumes(b);
        for (const volume of volumes.slice(0,-1)) {
          box(volume.x,volume.y,volume.width,volume.depth,volume.height,b.facade ?? defaultFacade);
          parts.drawFacade({...b,...volume},{box,plane,polygon,project,ctx,scale});
        }
        b = {...b,...volumes[volumes.length-1]};
        const {x,y,width:w,depth:d,height:h} = b;
        box(x,y,w,d,h,b.facade ?? defaultFacade);
        plane(x+4,y+4,w-8,d-8,b.facade?.[0] ?? '#353d56',h,'#535d75');
        const colors = b.facade ?? defaultFacade;
        const roof = colors[0];
        if (parts.roofs.includes(b.top)) {
          parts.drawRoof(b.top,b,{box,plane,polygon,project,ctx,scale});
        } else if (b.top === "gable") {
          polygon([[x,y+d,h],[x+w,y+d,h],[x+w/2,y+d,h+22]],colors[2]);
          polygon([[x+w,y,h],[x+w,y+d,h],[x+w/2,y+d,h+22],[x+w/2,y,h+22]],roof);
        } else if (b.top === "steps") {
          box(x+12,y+12,w-24,d-24,12,colors,h);
          box(x+24,y+23,w-48,d-46,10,colors,h+12);
        } else if (b.top === "garden") {
          plane(x+9,y+9,w-18,d-18,"#40583c",h);
          for (const offset of [14, 34, 54]) {
            box(x+15,y+offset,12,9,6,["#74945c","#3d5944","#56774a"],h);
            box(x+51,y+offset,12,9,6,["#74945c","#3d5944","#56774a"],h);
          }
        } else {
          box(x+15,y+14,24,18,8,colors,h);
          if (b.top === "antenna") box(x+26,y+22,3,3,24,["#8492a9","#67758c","#77869f"],h+8);
        }
        parts.drawFacade(b,{box,plane,polygon,project,ctx,scale});

        parts.drawCharacter(originalBuilding,{box,plane,polygon,project,ctx,scale});
        parts.drawArchitecture(originalBuilding,{box,plane,polygon,project,ctx,scale});
        if (b.trackId) drawMusicBadge(b);
      }
      const editorSections = [];
      function createEditorSection(label, control) {
        const section = document.createElement("details");
        section.className = "editor-section";
        const summary = document.createElement("summary");
        const title = document.createElement("span");
        title.textContent = label.firstChild.textContent.trim();
        const value = document.createElement("span");
        value.className = "editor-section-value";
        summary.append(title, value);
        label.before(section);
        section.append(summary, label);
        editorSections.push({section, control, value});
        return section;
      }
      const choiceGroups = ["buildingType", "preset", "top", "windows", "windowShape"].map(name => {
        const select = field(name);
        const group = document.createElement("div");
        group.className = "city-choices";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", {buildingType:"건물 형태",preset:"음악 장르 스타일", top:"옥상 형태", windows:"창문 패턴",windowShape:"창문 형태"}[name]);
        const section = createEditorSection(select.parentElement, select);
        section.append(group);
        select.parentElement.hidden = true;
        select.hidden = true;
        const cards = [...select.options].filter(option => option.value).map(option => {
          const button = document.createElement("button");
          button.type = "button";
          const image = document.createElement("canvas");
          image.width = 144;
          image.height = 100;
          image.setAttribute("aria-hidden", "true");
          button.append(image, option.textContent);
          group.append(button);
          button.addEventListener("click", () => {
            select.value = option.value;
            select.dispatchEvent(new Event("input", { bubbles:true }));
          });
          return {button,image,value:option.value};
        });
        return {name,select,cards};
      });

      function drawWindowShapePreview(image, shape, pattern) {
        const context=image.getContext("2d");
        context.clearRect(0,0,image.width,image.height);
        context.fillStyle="#1b2a40";
        context.fillRect(12,10,image.width-24,image.height-20);
        let drawn=false;
        parts.drawFacade({
          x:0,y:0,width:32,depth:24,height:36,thumbnail:true,
          windows:shape==="auto"?pattern:"grid",
          windowShape:shape,windowLight:"#ffd78a"
        },{
          ctx:context,scale:1,box(){},plane(){},
          project:(x,y,z=0)=>[x-y,(x+y)*.49-z],
          polygon(points,fill,stroke) {
            if(drawn || points.some(point=>point[1]<24))return;
            const xs=points.map(point=>point[0]),zs=points.map(point=>point[2]);
            const left=Math.min(...xs),right=Math.max(...xs);
            const bottom=Math.min(...zs),top=Math.max(...zs);
            const zoom=Math.min(56/(right-left),58/(top-bottom));
            context.beginPath();
            points.forEach(([x,y,z],index)=>{
              const px=image.width/2+(x-(left+right)/2)*zoom;
              const py=image.height/2-(z-(top+bottom)/2)*zoom;
              if(index===0)context.moveTo(px,py);
              else context.lineTo(px,py);
            });
            context.closePath();
            context.fillStyle=fill;
            context.fill();
            if(stroke) {
              context.strokeStyle=stroke;
              context.lineWidth=2;
              context.stroke();
            }
            drawn=true;
          }
        });
        if(!drawn) {
          context.fillStyle="#a9b9cd";
          context.font="12px system-ui";
          context.textAlign="center";
          context.fillText("창문 없음",image.width/2,image.height/2+4);
        }
      }
      let shapePreviewPattern;
      function refreshChoices(renderImages = false) {
        const currentPattern=field("windows").value || "grid";
        const updateShapes=renderImages || currentPattern!==shapePreviewPattern;
        shapePreviewPattern=currentPattern;
        for (const {control,value} of editorSections) {
          if (control.tagName === "SELECT") {
            value.textContent = control.selectedOptions[0]?.textContent ?? "";
          } else if (control.type === "number") {
            value.textContent = control.value;
          } else if (control.type === "color") {
            value.textContent = control.value;
            value.style.borderLeft = "12px solid " + control.value;
          } else {
            value.textContent = control.value || "입력 안 함";
          }
        }
        for (const {name,select,cards} of choiceGroups) {
          for (const {button,image,value} of cards) {
            button.setAttribute("aria-pressed", String(select.value === value));
            if(name==="windowShape") {
              if(updateShapes)drawWindowShapePreview(image,value,currentPattern);
              continue;
            }
            if (!renderImages) continue;
            let sample = {
              x:0, y:0, width:90, depth:73, height:84,
              facade:["#99aaca","#536784","#758cad"],
              top:"flat", windows:"grid", trackId:null, thumbnail:true
            };
            if (name === "preset") {
              const [height,top,windows,...facade] = presets[value];
              sample = {...sample,height,top,windows,facade};
            } else if (name === "buildingType") {
              sample = {...sample, ...(parts.types[value].facade ? {facade:parts.types[value].facade,windows:parts.types[value].windows} : {}), ...(value === "artdeco" ? {facade:["#393c43","#20232c","#30343d"],windows:"tall"} : {}), buildingType:value, height:parts.types[value].height, top:parts.types[value].top ?? (["house","duplex"].includes(value) ? "gable" : "flat")};
            } else {
              sample[name] = value;
            }
            const previous = {ctx,width,height,scale,x:camera.x,y:camera.y};
            try {
              ctx = image.getContext("2d");
              width = image.width;
              height = image.height;
              scale = Math.min(.75, 78/(sample.height+42));
              camera.x = 8.5;
              camera.y = 39.9-sample.height/2;
              ctx.clearRect(0,0,width,height);
              drawBuilding(sample);
            } finally {
              ({ctx,width,height,scale} = previous);
              camera.x = previous.x;
              camera.y = previous.y;
            }
          }
        }
      }
      refreshChoices(true);
      let colorPreviewTimer;
      let heightPreviewTimer;
      let heightPreviewPending=false;
      let heightPreviewFrame;
      let heightScenePrepTimer;
      let liveHeightScene;
      function heightSceneView() {
        return [width,height,scale,camera.x,camera.y].join(",");
      }
      function captureHeightScene() {
        const list=viewObjects();
        const index=list.findIndex(object=>object.building===selected);
        if(index<0)return null;
        const ratio=structureCanvas.width/width;
        const previousContext=ctx;
        function capture(items) {
          const image=document.createElement("canvas");
          image.width=structureCanvas.width;image.height=structureCanvas.height;
          try {
            ctx=image.getContext("2d");
            ctx.setTransform(ratio,0,0,ratio,0,0);
            drawObjectList(items);
          } finally {
            ctx=previousContext;
          }
          return image;
        }
        return {building:selected,view:heightSceneView(),
          behind:capture(list.slice(0,index)),front:capture(list.slice(index+1)),
          staticGrid:buildOcclusionGrid(selected),dynamicGrid:buildOcclusionGrid(null,selected)};
      }
      function paintLiveHeightPreview() {
        heightPreviewFrame=undefined;
        if(!heightPreviewPending || !root.isConnected || !selected || editor.hidden)return;
        const view=heightSceneView();
        if(liveHeightScene?.building!==selected || liveHeightScene.view!==view)liveHeightScene=captureHeightScene();
        if(!liveHeightScene){draw();return;}
        const previousContext=ctx;
        try {
          structureContext.clearRect(0,0,width,height);
          structureContext.drawImage(liveHeightScene.behind,0,0,width,height);
          ctx=structureContext;
          drawBuilding(selected);
          structureContext.drawImage(liveHeightScene.front,0,0,width,height);
        } finally {
          ctx=previousContext;
        }
        liveHeightScene.dynamicGrid=buildOcclusionGrid(null,selected);
        shadowsNeedPaint=true;
        paintShadows();
      }
      function scheduleLiveHeightPreview() {
        if(heightPreviewFrame===undefined)heightPreviewFrame=requestAnimationFrame(paintLiveHeightPreview);
      }
      let dragImage;
      const dragMargin = 224;
      function draw() {
        clearTimeout(heightScenePrepTimer);
        clearTimeout(heightPreviewTimer);
        cancelAnimationFrame(heightPreviewFrame);
        heightPreviewFrame=undefined;
        heightPreviewPending=false;
        liveHeightScene=undefined;
        clearZoomPreview();
        viewQueryCache=null;
        refreshSplitButtons();
        dragImage = undefined;
        occlusionGrid = undefined;
        clearTimeout(colorPreviewTimer);
        renderMap();
        queueWorldPreview();
        if(selected && !editor.hidden) {
          const building=selected,view=heightSceneView();
          heightScenePrepTimer=setTimeout(()=>{
            if(root.isConnected && selected===building && !editor.hidden && !heightPreviewPending &&
              !gesture && !zoomPreview && heightSceneView()===view)liveHeightScene=captureHeightScene();
          },60);
        }
      }
      function renderMap() {
        if (!width || !height) return;
        ctx.clearRect(0,0,width,height);
        for (const tile of open.values()) {
          offsetX = tile.col*blockSize;
          offsetY = tile.row*blockSize;
          drawCachedDistrict(tile);
        }
        offsetX = offsetY = 0;
        drawCityJoins();
        drawMergedGround();
        drawGroundFootprints(viewObjects());
        structureContext.clearRect(0,0,width,height);
        const groundContext=ctx;
        try {
          ctx=structureContext;
          drawObjects();
        } finally {
          ctx=groundContext;
        }
        shadowsNeedPaint=true;
        paintShadows(true);
        drawMergeSelection();
        if (swapSource) drawSwapHighlights();
        if (districtMode) drawTargets();
      }
      function intersectsView(x,y,w,d,h=0,margin=0) {
        const [left] = project(x,y+d);
        const [right] = project(x+w,y);
        const [,top] = project(x,y,h);
        const [,bottom] = project(x+w,y+d);
        return right+margin>=0 && left-margin<=width && bottom+margin>=0 && top-margin<=height;
      }
      const districtImages = new Map();
      const districtImageBounds = {left:-1440,top:-620,width:2880,height:1440};
      function landscapeConnections(tile) {
        const result={west:false,east:false,north:false,south:false,riverWest:false,riverEast:false};
        for (const neighbor of open.values()) {
          if (!isCity(neighbor)) continue;
          const vertical=tile.row<neighbor.row+7 && tile.row+tileBlocks(tile)>neighbor.row;
          const horizontal=tile.col<neighbor.col+7 && tile.col+tileBlocks(tile)>neighbor.col;
          if (vertical && neighbor.col+7===tile.col) {
            result.west=true;
            result.riverWest ||= neighbor.row===0 && tile.row>=0 && tile.row<=2;
          }
          if (vertical && tile.col+tileBlocks(tile)===neighbor.col) {
            result.east=true;
            result.riverEast ||= neighbor.row===0 && tile.row>=0 && tile.row<=2;
          }
          if (horizontal && neighbor.row+7===tile.row) result.north=true;
          if (horizontal && tile.row+tileBlocks(tile)===neighbor.row) result.south=true;
        }
        return result;
      }
      function drawCachedDistrict(tile) {
        if (!intersectsView(-620,-620,tileSize(tile)+40,tileSize(tile)+40,8,12)) return;
        const bounds=districtImageBounds;
        const {left,top,width:iw,height:ih} = bounds;
        const river = tile.row===0;
        const connections = isCity(tile) ? {} : landscapeConnections(tile);
        const connectionKey=Object.values(connections).map(Number).join("");
        const imageKey = tile.type==="reservoir" ? "reservoir7-"+tile.row+"-"+connectionKey :
          tile.type==="park" ? "park-"+connectionKey : river;
        let image = districtImages.get(imageKey);
        if (!image) {
          image = document.createElement("canvas");
          image.width = iw;
          image.height = ih;
          const previous = {ctx,width,height,scale,offsetX,offsetY,x:camera.x,y:camera.y};
          try {
            ctx = image.getContext("2d");
            width = iw;
            height = ih;
            scale = 1;
            offsetX = offsetY = 0;
            camera.x = left+iw/2;
            camera.y = top+ih/2;
            ctx.save();
            try {
              if (isCity(tile)) {
                ctx.beginPath();
                [[-600,-600],[800,-600],[800,800],[-600,800]].forEach((point,index)=> {
                  const [px,py]=project(...point);
                  if (index===0) ctx.moveTo(px,py);
                  else ctx.lineTo(px,py);
                });
                ctx.closePath();
                ctx.clip();
              }
              drawDistrict(tile);
            } finally {
              ctx.restore();
            }
          } finally {
            ({ctx,width,height,scale,offsetX,offsetY} = previous);
            camera.x = previous.x;
            camera.y = previous.y;
          }
          districtImages.set(imageKey,image);
          if (districtImages.size>6) districtImages.delete(districtImages.keys().next().value);
        }
        const [x,y] = project(0,0);
        ctx.drawImage(image,x+left*scale,y+top*scale,iw*scale,ih*scale);
      }
      let cityJoinSignature,cityJoins=[];
      function getCityJoins() {
        const cities=[...open.values()].filter(isCity);
        const signature=cities.map(key).join(";");
        if (signature===cityJoinSignature) return cityJoins;
        cityJoinSignature=signature;
        cityJoins=[];
        const westEdges=new Map(),northEdges=new Map();
        for (const tile of cities) {
          if (!westEdges.has(tile.col)) westEdges.set(tile.col,[]);
          if (!northEdges.has(tile.row)) northEdges.set(tile.row,[]);
          westEdges.get(tile.col).push(tile);
          northEdges.get(tile.row).push(tile);
        }
        for (const tile of cities) {
          for (const next of westEdges.get(tile.col+7) ?? []) {
            const start=Math.max(tile.row,next.row)*blockSize-600;
            const end=Math.min(tile.row+7,next.row+7)*blockSize-600;
            if (start<end) cityJoins.push({
              vertical:true,edge:(tile.col+7)*blockSize-600,start,end,
              river:tile.row===0 && next.row===0
            });
          }
          for (const next of northEdges.get(tile.row+7) ?? []) {
            const start=Math.max(tile.col,next.col)*blockSize-600;
            const end=Math.min(tile.col+7,next.col+7)*blockSize-600;
            if (start<end) cityJoins.push({
              vertical:false,edge:(tile.row+7)*blockSize-600,start,end,river:false
            });
          }
        }
        return cityJoins;
      }
      function drawCityJoins() {
        for (const join of getCityJoins()) {
          const {vertical,edge,start,end,river}=join;
          if (vertical) {
            if (!intersectsView(edge-16,start,32,end-start)) continue;
            if (river) {
              plane(edge-13,start,26,waterTop-start,"#202638");
              plane(edge-13,waterBottom,26,end-waterBottom,"#202638");
              const seam=Math.max(1,1/scale);
              plane(edge-seam,waterTop,seam*2,waterBottom-waterTop,"#123652");
              for (const bank of [waterTop-5,waterBottom]) {
                plane(edge-15,bank,30,5,"#74788d");
              }
            } else plane(edge-13,start,26,end-start,"#202638");
          } else {
            if (!intersectsView(start,edge-16,end-start,32)) continue;
            plane(start,edge-13,end-start,26,"#202638");
          }
          for (let run=Math.ceil((start-10)/25)*25+10;run<end;run+=25) {
            const crossDistance=Math.abs(((run+100)%200+200)%200-100);
            if (crossDistance<25 || (river && run+10>waterTop && run<waterBottom)) continue;
            const length=Math.min(10,end-run);
            if (vertical) plane(edge,run,1.1,length,"#8e8390");
            else plane(run,edge,length,1.1,"#8e8390");
          }
        }
      }
      function drawDistrict(tile) {
        if (!intersectsView(-620,-620,1440,1440,0,24)) return;
        if (tile.type==="park") {
          parts.drawPark({ctx,project,polygon,plane,box,connections:landscapeConnections(tile)});
          return;
        }
        if (tile.type==="reservoir") {
          parts.drawReservoir({ctx,project,polygon,plane,box,
            connections:{...landscapeConnections(tile),river:tile.row===0}});
          return;
        }
        const columns = roads;
        plane(-600,-600,districtSize,districtSize,'#293147');
        for (const x of columns.slice(0,-1)) {
          for (const y of roads.slice(0,-1)) {
            if (!intersectsView(x,y,200,200)) continue;
            if (tile.row===0 && y===-200) continue;
            plane(x+17,y+17,166,166,'#62647a');
            plane(x+24,y+24,152,152,'#26383e',0,'#424d59');
          }
        }
        for (const road of columns) {
          plane(-600,road-13,districtSize,26,'#202638');
          if (tile.row===0) {
            plane(road-13,-600,26,waterTop+600,'#202638');
            plane(road-13,waterBottom,26,800-waterBottom,'#202638');
          } else {
            plane(road-13,-600,26,districtSize,'#202638');
          }
          for (let run=-590; run<800; run+=25) {
            if (roads.some(cross => Math.abs(run-cross)<25)) continue;
            if (road<=800) plane(run,road,10,1.1,'#8e8390');
            if (tile.row!==0 || run+10<=waterTop || run>=waterBottom) {
              plane(road,run,1.1,10,'#8e8390');
            }
          }
        }
        if (tile.row !== 0) return;
        plane(-600,waterTop,districtSize,waterBottom-waterTop,'#123652');
        for (const r of ripples) plane(r.x,r.y,r.length,1.5,'#29608080');
        const crossings = [-400,0,400];
        for (const y of [waterTop-5,waterBottom]) {
          let start = -600;
          for (const x of crossings) {
            plane(start,y,x-13-start,5,'#74788d');
            start = x+13;
          }
          plane(start,y,800-start,5,'#74788d');
        }
      }
      function drawSwapHighlights() {
        ctx.save();
        ctx.font = "bold 12px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        function mark(building, label, color) {
          const {x,y,width:w,depth:d,height:h,top} = building;
          const roofHeight = roofHeights[top] ?? 0;
          const [cx,cy] = project(x+w/2,y+d/2,h+roofHeight);
          ctx.lineWidth = 3;
          plane(x-6,y-6,w+12,d+12,"transparent",0,color);
          const labelWidth = ctx.measureText(label).width+16;
          ctx.fillStyle = "#101526";
          ctx.fillRect(cx-labelWidth/2,cy-27,labelWidth,22);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx-labelWidth/2,cy-27,labelWidth,22);
          ctx.fillStyle = color;
          ctx.fillText(label,cx,cy-16);
        }
        mark(swapSource, "이동할 건물", "#79e6ff");
        if (hovered && hovered !== swapSource) mark(hovered, "교환 대상", "#ffcc70");
        if (dropPlot) {
          mark({x:dropPlot.x-plotWidth(dropPlot),y:dropPlot.y-plotDepth(dropPlot),width:plotWidth(dropPlot),depth:plotDepth(dropPlot),height:0}, "이동할 빈 부지", "#ffcc70");
        }
        ctx.restore();
      }

      function shadowHull(points) {
        const sorted=points.slice().sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
        const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        const lower=[],upper=[];
        for (const point of sorted) {
          while (lower.length>1 && cross(lower.at(-2),lower.at(-1),point)<=0) lower.pop();
          lower.push(point);
        }
        for (const point of sorted.slice().reverse()) {
          while (upper.length>1 && cross(upper.at(-2),upper.at(-1),point)<=0) upper.pop();
          upper.push(point);
        }
        return lower.slice(0,-1).concat(upper.slice(0,-1));
      }
      let lastShadowPaint=-Infinity;
      let lastShadowView="";
      function paintShadows(force=false) {
        const view=[width,height,scale,camera.x,camera.y].join(",");
        const now=performance.now();
        if(!force && view===lastShadowView && now-lastShadowPaint<150)return;
        lastShadowView=view;
        lastShadowPaint=now;
        shadowsNeedPaint=false;
        shadowContext.clearRect(0,0,width,height);
        const sun=solarState(timeSettings.minute);
        if (sun.strength<=0) return;
        const reach=Math.min(3.8,1/Math.max(.22,sun.altitude))*.9;
        // Project shadows away from the sun's screen position, with a short noon shadow.
        const dx=(-Math.sin(sun.azimuth)+.35*Math.cos(sun.azimuth))*reach;
        const dy=(Math.sin(sun.azimuth)+.35*Math.cos(sun.azimuth))*reach;
        shadowContext.save();
        shadowContext.beginPath();
        for (const tile of open.values()) {
          const x=tile.col*blockSize-600,y=tile.row*blockSize-600,size=tileSize(tile);
          [[x,y],[x+size,y],[x+size,y+size],[x,y+size]].forEach((point,i)=> {
            const [px,py]=project(...point);
            if (i===0) shadowContext.moveTo(px,py);
            else shadowContext.lineTo(px,py);
          });
          shadowContext.closePath();
        }
        shadowContext.clip();
        shadowContext.beginPath();
        for (const object of viewObjects()) {
          if (!visibleObject(object)) continue;
          let x,y,w,d,h;
          if (object.building) {
            const b=object.building;
            const design=b===selected && !editor.hidden ? {...b,...readDesign()} : b;
            ({x,y,width:w,depth:d,height:h}=design);
            if (design.buildingType==="factory") h*=1.5;
          } else if (object.tree) {
            x=object.x-object.size*.65; y=object.y-object.size*.65;
            w=d=object.size*1.3; h=object.size+10;
          } else continue;
          if(!intersectsView(x,y,w,d,h,Math.ceil(h*reach*scale+40)))continue;
          const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
          const projected=corners.concat(corners.map(([x,y])=>[x+dx*h,y+dy*h]))
            .map(point=>project(...point));
          const hull=shadowHull(projected);
          hull.forEach(([px,py],i)=>i===0 ? shadowContext.moveTo(px,py) : shadowContext.lineTo(px,py));
          shadowContext.closePath();
        }
        shadowContext.fillStyle="rgba(13,26,45,"+(.28*sun.strength).toFixed(3)+")";
        shadowContext.fill();
        shadowContext.restore();
      }
      function drawScenery(o) {
          if (o.tree) {
            box(o.x-1,o.y-1,3,3,10,['#554838','#453a37','#554838']);
            const [x,y] = project(o.x,o.y,o.size);
            const r = o.size*scale;
            const crown = ctx.createRadialGradient(x-r*.32,y-r*.4,0,x,y,r);
            crown.addColorStop(0,'#536448');
            crown.addColorStop(1,'#213637');
            ctx.fillStyle = crown;
            ctx.beginPath();
            ctx.arc(x,y,r,0,Math.PI*2);
            ctx.fill();
          }
          if (o.lamp) {
            glow(o.x,o.y,0,18,'#ebbc7960');
            box(o.x,o.y,1.6,1.6,17,['#b6a899','#817783','#aaa0a3']);
            glow(o.x,o.y,18,12,'#ffc67baf','#fff0c9');
          }
      }
      const sceneryImages=new Map();
      function drawCachedScenery(object) {
        const size=object.tree?Math.round(object.size):0;
        const key=object.tree?"tree-"+size:"lamp";
        let image=sceneryImages.get(key);
        if(!image) {
          image=document.createElement("canvas");
          image.width=image.height=120;
          const previous={ctx,width,height,scale,offsetX,offsetY,x:camera.x,y:camera.y};
          try {
            ctx=image.getContext("2d");
            width=height=120;
            scale=1.2;
            offsetX=offsetY=0;
            camera.x=0;
            camera.y=-10;
            drawScenery({...object,x:0,y:0,size});
          } finally {
            ({ctx,width,height,scale,offsetX,offsetY}=previous);
            camera.x=previous.x;camera.y=previous.y;
          }
          sceneryImages.set(key,image);
        }
        const [x,y]=project(object.x,object.y);
        ctx.drawImage(image,x-50*scale,y-60*scale,100*scale,100*scale);
      }

      let distantScene;
      function drawObjects() {
        const list=viewObjects();
        if(scale>=.35 || list.length<500) {
          drawObjectList(list);
          return;
        }
        const signature=JSON.stringify({
          scale,selected:!editor.hidden&&selected?{id:selected.id,design:readDesign()}:null,
          music:selectedMusicTrackId,empty:selectedPlot?.plotId,drop:dropPlot?.plotId,
          objects:list.map(o=>[o.x,o.y,o.plotId,o.building,o.tree?o.size:0,!!o.lamp])
        });
        if(distantScene?.signature!==signature) {
          const [originX,originY]=project(0,0);
          let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
          for(const o of list) {
            const b=o.building;
            const x=b?.x??o.x,y=b?.y??o.y;
            const w=b?.width??0,d=b?.depth??0,h=b?b.height+110:60;
            const points=[[x-35,y+d+35,0],[x+w+35,y-35,0],[x-35,y-35,h],[x+w+35,y+d+35,0]];
            for(const point of points) {
              const [px,py]=project(...point);
              left=Math.min(left,px);right=Math.max(right,px);
              top=Math.min(top,py);bottom=Math.max(bottom,py);
            }
          }
          const iw=Math.ceil(right-left+4),ih=Math.ceil(bottom-top+4);
          // Large panoramas fall back to the regular renderer instead of allocating huge textures.
          if(!Number.isFinite(iw) || iw*ih>6000000 || iw>4096 || ih>4096) {
            distantScene=null;
            drawObjectList(list);
            return;
          }
          const image=distantScene?.image??document.createElement("canvas");
          image.width=iw;image.height=ih;
          const previous={ctx,width,height,x:camera.x,y:camera.y};
          const spriteLeft=(left-originX)/scale,spriteTop=(top-originY)/scale;
          try {
            ctx=image.getContext("2d");
            width=iw;height=ih;
            camera.x=previous.x+(left+(iw-previous.width)/2)/scale;
            camera.y=previous.y+(top+(ih-previous.height)/2)/scale;
            drawObjectList(list);
          } finally {
            ({ctx,width,height}=previous);
            camera.x=previous.x;camera.y=previous.y;
          }
          distantScene={signature,image,left:spriteLeft,top:spriteTop};
        }
        const [x,y]=project(0,0);
        ctx.drawImage(distantScene.image,x+distantScene.left*scale,y+distantScene.top*scale);
      }
      function drawObjectList(list) {
        for (const o of list) {
          if (!visibleObject(o)) continue;
          if (o.building) {
            const b = o.building;
            if (intersectsView(b.x-5,b.y-5,b.width+10,b.depth+10,
              b===selected && !editor.hidden ? 230 : b.height+46)) drawBuilding(b);
          } else if (o.plotId) {
            const x = o.x-plotWidth(o), y = o.y-plotDepth(o);
            if (intersectsView(x,y,plotWidth(o),plotDepth(o))) {
              plane(x,y,plotWidth(o),plotDepth(o),o === dropPlot ? "#315e72" : o === selectedPlot ? "#354c64" : "#222d41",0,o === dropPlot ? "#77ddff" : "#52647a");
            }
          } else if (!intersectsView(o.x,o.y,0,0,18,Math.max(25,25*scale))) {
            continue;
          }
          if(o.tree || o.lamp) {
            if(scale < .65)drawCachedScenery(o);
            else drawScenery(o);
          }
        }
      }
      function districtBounds() {
        const tiles = [...open.values(), ...targets];
        const corners=tiles.flatMap(tile => {
          const x=tile.col*blockSize-600, y=tile.row*blockSize-600, size=tileSize(tile);
          return [[x,y],[x+size,y],[x,y+size],[x+size,y+size]];
        });
        return {
          left:Math.min(...corners.map(([x,y])=>x-y))-40,
          right:Math.max(...corners.map(([x,y])=>x-y))+40,
          top:Math.min(...corners.map(([x,y])=>(x+y)*.49))-180,
          bottom:Math.max(...corners.map(([x,y])=>(x+y)*.49))+40
        };
      }

      function centerOverview() {
        const bounds = districtBounds();
        camera.x = (bounds.left+bounds.right)/2;
        camera.y = (bounds.top+bounds.bottom)/2;
      }
      function resize() {
        clearZoomPreview();
        ({width,height} = canvas.getBoundingClientRect());
        if (!width || !height) return;
        const ratio = Math.min(window.devicePixelRatio || 1,2);
        canvas.width = Math.round(width*ratio);
        canvas.height = Math.round(height*ratio);
        trafficCanvas.width = canvas.width;
        trafficCanvas.height = canvas.height;
        shadowCanvas.width=structureCanvas.width=mergeCanvas.width=canvas.width;
        shadowCanvas.height=structureCanvas.height=mergeCanvas.height=canvas.height;
        mergeContext.setTransform(ratio,0,0,ratio,0,0);
        shadowContext.setTransform(ratio,0,0,ratio,0,0);
        structureContext.setTransform(ratio,0,0,ratio,0,0);
        shadowsNeedPaint=true;
        ctx.setTransform(ratio,0,0,ratio,0,0);
        const baseScale = Math.min(1.55,Math.max(.65,width/710));
        const padding = Math.min(24, width*.06, height*.06);
        const city = districtBounds();
        minZoom = Math.min(.6, (width-2*padding)/(city.right-city.left)/baseScale,
          (height-2*padding)/(city.bottom-city.top)/baseScale);
        if (overview) {
          zoom = minZoom;
          centerOverview();
        }
        scale = baseScale*zoom;
        zoomOut.disabled = overview;
        draw();
      }
      function move(dx,dy,dragging=false) {
        overview = false;
        zoomOut.disabled = false;
        const city = districtBounds();
        camera.x = Math.max(city.left,Math.min(city.right,camera.x-dx/scale));
        camera.y = Math.max(city.top,Math.min(city.bottom,camera.y-dy/scale));
        if (dragging) scheduleCameraDraw();
        else draw();
      }
      function drawDragFrame() {
        if (!width || !height || !scale) return;
        if (!dragImage || dragImage.scale !== scale ||
            Math.abs(dragImage.x-camera.x)*scale >= dragMargin ||
            Math.abs(dragImage.y-camera.y)*scale >= dragMargin) {
          const image = dragImage?.image ?? document.createElement("canvas");
          const previous = {ctx,width,height};
          const ratio = canvas.width/width;
          width += dragMargin*2;
          height += dragMargin*2;
          image.width = Math.ceil(width*ratio);
          image.height = Math.ceil(height*ratio);
          try {
            ctx = image.getContext("2d");
            ctx.setTransform(ratio,0,0,ratio,0,0);
            renderMap();
          } finally {
            ({ctx,width,height} = previous);
          }
          dragImage = {image,x:camera.x,y:camera.y,scale,ratio};
        }
        const {image,x,y,ratio} = dragImage;
        ctx.drawImage(image,(x-camera.x)*scale-dragMargin,
          (y-camera.y)*scale-dragMargin,image.width/ratio,image.height/ratio);
      }
      function scheduleWorldPreviewSlice() {
        worldPreviewTimer=setTimeout(paintWorldPreviewSlice,16);
      }
      function queueWorldPreview() {
        if(!root.isConnected || !width || !height || !scale)return;
        if(worldPreview?.version===worldPreviewVersion)return;
        // A rendered overview already covers the whole city, so it is ready immediately.
        if(overview && !districtMode) {
          cancelWorldPreviewJob();
          const image=document.createElement("canvas");
          const ratio=Math.min(1,1200/width,1000/height);
          image.width=Math.ceil(width*ratio);image.height=Math.ceil(height*ratio);
          const context=image.getContext("2d");
          context.drawImage(canvas,0,0,image.width,image.height);
          context.drawImage(structureCanvas,0,0,image.width,image.height);
          worldPreview={version:worldPreviewVersion,image,width,height,scale,x:camera.x,y:camera.y};
          return;
        }
        if(worldPreviewJob?.version===worldPreviewVersion)return;
        cancelWorldPreviewJob();
        const bounds=districtBounds();
        const left=bounds.left-80,top=bounds.top-160;
        const span=bounds.right-left+80,tall=bounds.bottom-top+80;
        const resolution=Math.min(.3,1200/span,1000/tall);
        const image=document.createElement("canvas");
        image.width=Math.ceil(span*resolution);image.height=Math.ceil(tall*resolution);
        worldPreviewJob={
          version:worldPreviewVersion,image,resolution,
          x:left+image.width/(2*resolution),y:top+image.height/(2*resolution),
          tiles:[...open.values()],tileIndex:0,
          objects:objects.filter(visibleObject).slice().sort((a,b)=>a.x+a.y-b.x-b.y),
          objectIndex:0,foundationIndex:0,groundDone:false
        };
        scheduleWorldPreviewSlice();
      }
      function paintWorldPreviewSlice() {
        const job=worldPreviewJob;
        if(!job || !root.isConnected || job.version!==worldPreviewVersion)return;
        // Let wheel, drag and animation frames take priority over background preparation.
        if(zoomPreview || gesture) {scheduleWorldPreviewSlice();return;}
        const previous={ctx,width,height,scale,offsetX,offsetY,x:camera.x,y:camera.y};
        const start=performance.now();
        try {
          ctx=job.image.getContext("2d");
          width=job.image.width;height=job.image.height;scale=job.resolution;
          camera.x=job.x;camera.y=job.y;offsetX=offsetY=0;
          do {
            if(job.tileIndex<job.tiles.length) {
              const tile=job.tiles[job.tileIndex++];
              offsetX=tile.col*blockSize;offsetY=tile.row*blockSize;
              drawCachedDistrict(tile);
              offsetX=offsetY=0;
            } else if(!job.groundDone) {
              drawCityJoins();
              drawMergedGround();
              job.groundDone=true;
            } else if(job.foundationIndex<job.objects.length) {
              const object=job.objects[job.foundationIndex++];
              if(object.building)drawBuildingFootprint(object.building);
            } else if(job.objectIndex<job.objects.length) {
              drawObjectList([job.objects[job.objectIndex++]]);
            } else break;
          } while(performance.now()-start<5);
        } finally {
          ({ctx,width,height,scale,offsetX,offsetY}=previous);
          camera.x=previous.x;camera.y=previous.y;
        }
        if(job.groundDone && job.objectIndex===job.objects.length) {
          worldPreview={version:job.version,image:job.image,width:job.image.width,height:job.image.height,
            scale:job.resolution,x:job.x,y:job.y};
          worldPreviewJob=undefined;
        } else scheduleWorldPreviewSlice();
      }
      function drawWorldPreview(context) {
        if(!worldPreview || worldPreview.version!==worldPreviewVersion)return;
        const factor=scale/worldPreview.scale;
        const left=width/2-worldPreview.width*factor/2+(worldPreview.x-camera.x)*scale;
        const top=height/2-worldPreview.height*factor/2+(worldPreview.y-camera.y)*scale;
        context.drawImage(worldPreview.image,left,top,worldPreview.width*factor,worldPreview.height*factor);
      }

      let zoomPreview;
      let zoomSettleTimer;
      function clearZoomPreview() {
        clearTimeout(zoomSettleTimer);
        zoomPreview=undefined;
      }
      function beginZoomPreview() {
        if(zoomPreview)return;
        const layers=[canvas,shadowCanvas,structureCanvas,trafficCanvas].map(source=>{
          const image=document.createElement("canvas");
          image.width=source.width;image.height=source.height;
          image.getContext("2d").drawImage(source,0,0);
          return {target:source,image};
        });
        zoomPreview={layers,scale,x:camera.x,y:camera.y,width,height};
      }
      function drawZoomPreview() {
        if(!zoomPreview)return;
        const factor=scale/zoomPreview.scale;
        const left=width/2*(1-factor)+(zoomPreview.x-camera.x)*scale;
        const top=height/2*(1-factor)+(zoomPreview.y-camera.y)*scale;
        for(const {target,image} of zoomPreview.layers) {
          const context=target.getContext("2d");
          context.clearRect(0,0,width,height);
          if(target===canvas)drawWorldPreview(context);
          context.drawImage(image,left,top,zoomPreview.width*factor,zoomPreview.height*factor);
        }
        drawMergeSelection();
      }
      function settleZoom() {
        clearTimeout(zoomSettleTimer);
        zoomSettleTimer=setTimeout(()=>{
          if(!root.isConnected){clearZoomPreview();return;}
          draw();
        },140);
      }
      let cameraDrawPending = false;
      function scheduleCameraDraw() {
        if (cameraDrawPending) return;
        cameraDrawPending = true;
        requestAnimationFrame(() => {
          cameraDrawPending = false;
          if (!root.isConnected) return;
          if(zoomPreview)drawZoomPreview();
          else draw();
        });
      }
      function finishMapDrag() {
        dragImage = undefined;
        scheduleCameraDraw();
      }
      function changeZoom(factor, x=width/2, y=height/2, interactive=false) {
        if (!scale) return;
        const next = Math.max(Math.min(minZoom, zoom), Math.min(maxZoom, zoom*factor));
        if(interactive && next!==zoom)beginZoomPreview();
        if(zoomPreview)settleZoom();
        if (factor < 1 && next <= minZoom) {
          scale *= minZoom/zoom;
          zoom = minZoom;
          overview = true;
          centerOverview();
          zoomIn.disabled = false;
          zoomOut.disabled = true;
          scheduleCameraDraw();
          return;
        }
        if (next === zoom) return;
        overview = false;
        const previousScale = scale;
        scale *= next/zoom;
        zoom = next;
        camera.x += (x-width/2)*(1/previousScale-1/scale);
        camera.y += (y-height/2)*(1/previousScale-1/scale);
        if (factor < 1 && zoom < minZoom*1.6) {
          const blend = (Math.log(minZoom*1.6/zoom)/Math.log(1.6))*.45;
          const city = districtBounds();
          camera.x += ((city.left+city.right)/2-camera.x)*blend;
          camera.y += ((city.top+city.bottom)/2-camera.y)*blend;
        }
        zoomIn.disabled = zoom === maxZoom;
        zoomOut.disabled = zoom <= minZoom;
        scheduleCameraDraw();
      }
      const directions = [[1,0,"동"],[-1,0,"서"],[0,1,"남"],[0,-1,"북"]];
      function finishDistrictEdit(message) {
        setDistrictMode(districtMode, saveDistricts() ? message : message + " · 브라우저 저장 불가", true);
      }
      function setDistrictMode(mode, message, keepView = false) {
        if (mergeMode) setMergeMode(false);
        districtMode = mode;
        const candidates = new Map();
        if (mode === "add") {
          const type=districtTypeSelect.value;
          const size=7;
          for (const tile of open.values()) {
            for (const [dx,dy,label] of directions) {
              const edgeLength=tileBlocks(tile);
              for (let step=0;step<=Math.max(0,edgeLength-size);step+=size) {
                const next = {
                  col:tile.col+(dx>0 ? tileBlocks(tile) : dx<0 ? -size : step),
                  row:tile.row+(dy>0 ? tileBlocks(tile) : dy<0 ? -size : step),label,type
                };
                if (![...open.values()].some(existing=>overlaps(existing,next))) candidates.set(key(next),next);
              }
            }
          }
        } else if (mode === "remove") {
          for (const [id,tile] of open) {
            if (id !== key(origin)) candidates.set(id,tile);
          }
        }
        targets = [...candidates.values()];
        districtHover = undefined;
        addDistrict.setAttribute("aria-pressed",String(mode==="add"));
        districtTypeControl.hidden = mode!=="add";
        removeDistrict.setAttribute("aria-pressed",String(mode==="remove"));
        selected = hovered = selectedPlot = swapSource = dropPlot = undefined;
        plotActions.hidden = true;
        resetCopyButton();
        editor.hidden = true;
        resetDraft = undefined;
        undoButton.disabled = !undoHistory.length;
        if (keepView) {
          status.textContent = message + (mode==="add" ? " · 계속 추가 가능 · 우클릭 또는 같은 버튼으로 종료" :
            mode==="remove" ? " · 계속 삭제 가능 · 우클릭 또는 같은 버튼으로 종료" : "");
          draw();
          return;
        }
        status.textContent = message ?? (mode==="add" ? "파란 구역을 연속 선택해 추가 · 우클릭 또는 같은 버튼으로 종료" :
          mode==="remove" ? (targets.length ? "빨간 구역을 연속 선택해 삭제 · 우클릭 또는 같은 버튼으로 종료" : "삭제할 추가 구역이 없어요 · 우클릭으로 종료") :
          "드래그 · 방향키로 이동 / 휠로 확대·축소");
        overview = true;
        zoomIn.disabled = false;
        resize();
      }
      function drawTargets() {
        const adding = districtMode==="add";
        for (const tile of targets) {
          const x = tile.col*blockSize-600;
          const y = tile.row*blockSize-600;
          const active = tile===districtHover;
          plane(x,y,tileSize(tile),tileSize(tile),
            adding ? (active ? "#23789dcc" : "#24567599") : (active ? "#b43755aa" : "#8c274c66"),
            0,adding ? "#7adcff" : "#ff829d");
          const [px,py] = project(x+tileSize(tile)/2,y+tileSize(tile)/2);
          ctx.fillStyle = "#f0f8ff";
          ctx.font = "bold 13px system-ui";
          ctx.textAlign = "center";
          const typeName = districtNames[districtTypeSelect.value];
          ctx.fillText(adding ? "+ " + typeName + " · " + tile.label : "− 삭제",px,py);
          ctx.textAlign = "start";
        }
      }
      function findDistrict(event) {
        const bounds = canvas.getBoundingClientRect();
        const difference = (event.clientX-bounds.left-width/2)/scale+camera.x;
        const sum = ((event.clientY-bounds.top-height/2)/scale+camera.y)/.49;
        return targets.find(tile => contains(tile,(sum+difference)/2,(sum-difference)/2));
      }
      addDistrict.addEventListener("click", () => setDistrictMode(districtMode==="add" ? "" : "add"));
      districtTypeSelect.addEventListener("change", () => {
        if (districtMode==="add") {
          setDistrictMode("add", "파란 구역을 선택해 " +
            districtNames[districtTypeSelect.value] + " 추가");
        }
      });
      removeDistrict.addEventListener("click", () => setDistrictMode(districtMode==="remove" ? "" : "remove"));
      zoomIn.addEventListener("click", () => changeZoom(1.25,undefined,undefined,true));
      zoomOut.addEventListener("click", () => changeZoom(1/1.25,undefined,undefined,true));
      canvas.addEventListener("wheel", event => {
        if (!event.deltaY) return;
        event.preventDefault();
        if (!scale) return;
        const bounds = canvas.getBoundingClientRect();
        changeZoom(event.deltaY < 0 ? 1.12 : 1/1.12,
          event.clientX-bounds.left, event.clientY-bounds.top,true);
      }, { passive:false });
      function frameSelectedBuilding() {
        if (!selected || !scale || editor.hidden) return;
        const bounds = canvas.getBoundingClientRect();
        const panel = editor.getBoundingClientRect();
        const {x,y,width:w,depth:d} = selected;
        const design = readDesign();
        const roofHeight = (roofHeights[design.top] ?? 32);
        const worldWidth = w+d+20;
        const worldHeight = (w+d)*.49+design.height+roofHeight+12;
        const left = panel.right-bounds.left+10;
        const right = width-10;
        const top = 54;
        const bottom = height-14;
        const fit = Math.min((right-left)/worldWidth, (bottom-top)/worldHeight);
        if (fit <= 0) return;
        if (scale > fit) changeZoom(fit/scale);
        const targetScale = Math.min(scale, fit);
        if (targetScale < scale) {
          scale = targetScale;
          zoom = scale/Math.min(1.55,Math.max(.65,width/710));
          zoomIn.disabled = false;
        }
        overview = false;
        zoomOut.disabled = false;
        camera.x = x+w/2-y-d/2-((left+right)/2-width/2)/scale;
        camera.y = (x+w/2+y+d/2)*.49-(design.height+roofHeight)/2
          -((top+bottom)/2-height/2)/scale;
      }
      function mergeGeometry(plots) {
        if (plots.length < 2) return null;
        const left=Math.min(...plots.map(p=>p.x-90));
        const top=Math.min(...plots.map(p=>p.y-73));
        const right=Math.max(...plots.map(p=>p.x));
        const bottom=Math.max(...plots.map(p=>p.y));
        const columns=(right-left-90)/blockSize+1;
        const rows=(bottom-top-73)/blockSize+1;
        if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns*rows!==plots.length) return null;
        const cells=new Set(plots.map(p=>p.x+","+p.y));
        for(let col=0;col<columns;col++)for(let row=0;row<rows;row++) {
          if(!cells.has((left+90+col*blockSize)+","+(top+73+row*blockSize))) return null;
        }
        return {x:right,y:bottom,width:right-left,depth:bottom-top};
      }
      function persistMerges(message) {
        invalidateWorldPreview();
        try {
          localStorage.setItem(mergeStorageKey,JSON.stringify(mergeRecords));
          status.textContent=message;
        } catch {
          status.textContent=message+" · 브라우저 저장 불가";
        }
      }
      function restoreMergedPlots() {
        for(const record of mergeRecords) {
          if(mergedPlots.some(plot=>plot.plotId===record.id))continue;
          const members=record.members.map(id=>objects.find(o=>o.plotId===id));
          if(members.some(p=>!p || p.mergedInto))continue;
          const geometry=mergeGeometry(members);
          if(!geometry)continue;
          const plot={plotId:record.id,...geometry,members:record.members,
            memberDistricts:[...new Set(members.map(p=>p.district ?? key(origin)))],
            district:members[0].district,template:record.template};
          for(const original of record.originals ?? []) {
            const member=members.find(p=>p.plotId===original.plotId);
            if(member) {
              const current=member.building;
              if(current && buildings.get(current.id)===current) {
                buildings.delete(current.id);
                plotsByBuilding.delete(current.id);
              }
              member.building=original.building?structuredClone(original.building):null;
            }
          }
          for(const member of members) {
            member.mergedInto=plot.plotId;
            if(member.building) {
              buildings.delete(member.building.id);
              plotsByBuilding.delete(member.building.id);
            }
          }
          const entry=layout[plot.plotId];
          if(entry)placeBuilding(plot,makeBuilding(entry.id,entry.defaultDesign));
          mergedPlots.push(plot);
          objects.push(plot);
        }
        // Rebuild identities after all archived members and active large plots are restored.
        buildings.clear();
        plotsByBuilding.clear();
        for(const site of objects) {
          if(site.plotId && !site.mergedInto && site.building)placeBuilding(site,site.building);
        }
        sortObjects();
      }
      function drawMergedGround() {
        for(const plot of mergedPlots) {
          if(!visibleObject(plot))continue;
          const b=mergedBounds(plot);
          if(intersectsView(b.left,b.top,plotWidth(plot),plotDepth(plot),260,15))
            plane(b.left-6,b.top-6,plotWidth(plot)+12,plotDepth(plot)+12,"#35453f");
        }
      }
      function drawMergeSelection() {
        mergeContext.clearRect(0,0,width,height);
        if(!mergeMode)return;
        const previousContext=ctx;
        ctx=mergeContext;
        try {
        ctx.save();
        ctx.lineWidth=3;
        for(const plot of mergeSelection) {
          const b=mergedBounds(plot);
          plane(b.left-4,b.top-4,98,81,"#65d6df44",0,"#79e6ff");
          if(plot.building) {
            const building=plot.building;
            const [x,y]=project(building.x+building.width/2,building.y+building.depth/2,building.height+18);
            ctx.fillStyle="#79e6ff";
            ctx.font="bold 12px system-ui";
            ctx.textAlign="center";
            ctx.fillText("합치기 선택",x,y);
          }
        }
        if(mergeDrag?.bounds) {
          const r=mergeDrag.bounds;
          ctx.setLineDash([7,4]);
          plane(r.left-4,r.top-4,r.width+8,r.depth+8,"#79e6ff10",0,"#79e6ff");
        }
        ctx.restore();
        } finally {ctx=previousContext;}
      }
      function mergePlotPoint(event) {
        const building=findBuilding(event);
        const plot=building?plotsByBuilding.get(building.id):findEmptyPlot(event);
        if(plot && !plot.members)return {x:plot.x,y:plot.y};
        const bounds=canvas.getBoundingClientRect();
        const difference=(event.clientX-bounds.left-width/2)/scale+camera.x;
        const sum=((event.clientY-bounds.top-height/2)/scale+camera.y)/.49;
        return {x:Math.floor(((sum+difference)/2)/blockSize)*blockSize+143,
          y:Math.floor(((sum-difference)/2)/blockSize)*blockSize+134};
      }
      function updateMergeDrag(event) {
        if(!mergeDrag || !mergeMode)return;
        const end=mergePlotPoint(event),start=mergeDrag.anchor;
        const left=Math.min(start.x,end.x),right=Math.max(start.x,end.x);
        const top=Math.min(start.y,end.y),bottom=Math.max(start.y,end.y);
        const key=[left,right,top,bottom].join(",");
        if(mergeDrag.key===key)return;
        mergeDrag.key=key;
        mergeDrag.bounds={left:left-90,top:top-73,width:right-left+90,depth:bottom-top+73};
        mergeSelection.clear();
        for(const plot of objects) {
          if(!plot.plotId || plot.members || plot.mergedInto || !visibleObject(plot))continue;
          if(plot.x>=left && plot.x<=right && plot.y>=top && plot.y<=bottom)mergeSelection.add(plot);
        }
        refreshMergePanel();
        drawMergeSelection();
      }
      function scheduleMergeDrag(event) {
        if(!mergeDrag)return;
        mergeDrag.event={clientX:event.clientX,clientY:event.clientY};
        if(mergeDragFrame!==undefined)return;
        mergeDragFrame=requestAnimationFrame(()=>{
          mergeDragFrame=undefined;
          if(mergeDrag?.event)updateMergeDrag(mergeDrag.event);
        });
      }
      function cancelMergeDrag() {
        cancelAnimationFrame(mergeDragFrame);
        mergeDragFrame=undefined;
        if(mergeDrag) {
          mergeSelection.clear();
          mergeDrag.before.forEach(plot=>mergeSelection.add(plot));
          mergeDrag=undefined;
          refreshMergePanel();
          drawMergeSelection();
        }
      }
      function refreshMergePanel() {
        const plots=[...mergeSelection];
        const geometry=mergeGeometry(plots);
        const assigned=plots.filter(p=>p.building?.trackId);
        mergeConfirm.disabled=!geometry || assigned.length>1;
        mergeStatus.textContent=plots.length+"개 선택 · "+(!geometry
          ? "서로 붙어 있는 부지를 빠짐없이 직사각형으로 선택해 줘."
          : assigned.length>1 ? "음악 연결 건물이 여러 개야. 하나만 남기고 연결을 해제해 줘."
          : "합치면 큰 빈 부지가 돼. 음악 연결 건물 또는 먼저 선택한 건물의 디자인을 이어받아.");
      }
      function setMergeMode(enabled) {
        cancelAnimationFrame(mergeDragFrame);
        mergeDragFrame=undefined;
        mergeDrag=undefined;
        if(gesture?.mergeDrag)gesture=undefined;
        mergeMode=enabled;
        canvas.style.cursor=enabled?"crosshair":"";
        mergeSelection.clear();
        mergePanel.hidden=!enabled;
        mergeButton.setAttribute("aria-pressed",String(enabled));
        if(enabled) {
          districtMode="";
          targets=[];
          addDistrict.setAttribute("aria-pressed","false");
          removeDistrict.setAttribute("aria-pressed","false");
          root.querySelector(".district-type").hidden=true;
          swapSource=hovered=dropPlot=undefined;
          selectBuilding(undefined);
          root.dispatchEvent(new CustomEvent("building-select",{bubbles:true,composed:true,detail:{id:null,trackId:null,lit:false}}));
          canvas.focus();
          refreshMergePanel();
        }
        status.textContent=enabled ? "부지를 드래그로 선택하고 합치기를 눌러 줘 · 같은 버튼 또는 Esc로 종료" : idleMessage;
        draw();
      }
      mergeButton.addEventListener("click",()=>setMergeMode(!mergeMode));
      mergeConfirm.addEventListener("click",()=>{
        const members=[...mergeSelection];
        const geometry=mergeGeometry(members);
        if(!geometry || members.filter(p=>p.building?.trackId).length>1)return;
        const source=members.find(p=>p.building?.trackId)?.building ?? members.find(p=>p.building)?.building;
        const id="merged-"+Array.from(crypto.getRandomValues(new Uint32Array(2)),n=>n.toString(36)).join("-");
        const template=source ? structuredClone(source) : null;
        const record={id,members:members.map(p=>p.plotId),template,
          originals:members.map(p=>({plotId:p.plotId,building:p.building?structuredClone(p.building):null}))};
        const plot={plotId:id,...geometry,members:record.members,
          memberDistricts:[...new Set(members.map(p=>p.district ?? key(origin)))],
          district:members[0].district,template};
        for(const member of members) {
          member.mergedInto=id;
          if(member.building) {
            buildings.delete(member.building.id);
            plotsByBuilding.delete(member.building.id);
          }
        }
        mergeRecords.push(record);
        objects.push(plot);
        mergedPlots.push(plot);
        sortObjects();
        trafficByDistrict.clear();
        rememberUndo(()=>{
          // A building created after the merge is undone before this entry.
          if(plot.building) {
            buildings.delete(plot.building.id);
            plotsByBuilding.delete(plot.building.id);
          }
          objects.splice(objects.indexOf(plot),1);
          mergedPlots.splice(mergedPlots.indexOf(plot),1);
          mergeRecords=mergeRecords.filter(r=>r.id!==id);
          for(const member of members) {
            delete member.mergedInto;
            if(member.building)placeBuilding(member,member.building);
          }
          delete layout[id];
          sortObjects();
          trafficByDistrict.clear();
          saveLayout("부지 합치기를 취소했어요");
          persistMerges("부지 합치기를 취소했어요");
          root.dispatchEvent(new CustomEvent("city-layout-change",{bubbles:true}));
        },()=>{
          for(const member of members) {
            member.mergedInto=id;
            if(member.building) {
              buildings.delete(member.building.id);
              plotsByBuilding.delete(member.building.id);
            }
          }
          mergeRecords.push(record);
          objects.push(plot);
          mergedPlots.push(plot);
          sortObjects();
          trafficByDistrict.clear();
          persistMerges("부지 합치기를 다시 실행했어요");
        });
        setMergeMode(false);
        selectedPlot=plot;
        plotActions.hidden=false;
        persistMerges(members.length+"개 부지를 합쳤어요 · 큰 부지에 건물을 만들어 줘");
        draw();
      });

      function refreshSplitButtons() {
        const plot=selected ? plotsByBuilding.get(selected.id) : null;
        field("splitPlot").hidden=!plot?.members;
        plotActions.querySelector("[name=splitEmptyPlot]").hidden=!selectedPlot?.members;
      }
      function splitMergedPlot(plot) {
        if(!plot?.members)return;
        const record=mergeRecords.find(r=>r.id===plot.plotId);
        const members=plot.members.map(id=>objects.find(o=>o.plotId===id));
        if(!record || members.some(p=>!p))return;
        const largeBuilding=plot.building;
        const oldMembers=members.map(p=>p.building);
        const restored=oldMembers.map(building=>{
          if(!building || building.id===largeBuilding?.id)return null;
          // A building moved to another site must keep its live identity there.
          if(buildings.has(building.id))return null;
          return building;
        });
        if(largeBuilding) {
          let index=oldMembers.findIndex(b=>b?.id===largeBuilding.id);
          if(index<0)index=oldMembers.findIndex(b=>b?.id===plot.template?.id);
          if(index<0)index=restored.findIndex(b=>!b);
          if(index<0)index=0;
          restored[index]=largeBuilding;
        }
        const layoutIds=[plot.plotId,...members.map(p=>p.plotId)];
        const buildingIds=[...new Set([...oldMembers,largeBuilding].filter(Boolean).map(b=>b.id))];
        function entries(store,ids) {
          return ids.map(id=>({id,exists:Object.hasOwn(store,id),value:structuredClone(store[id])}));
        }
        const beforeLayout=entries(layout,layoutIds),beforeSaved=entries(saved,buildingIds);
        const afterLayout=members.map((member,index)=>({id:member.plotId,exists:true,
          value:restored[index]?{id:restored[index].id,defaultDesign:structuredClone(restored[index].defaultDesign)}:null}));
        afterLayout.push({id:plot.plotId,exists:false});
        const afterSaved=entries(saved,buildingIds);
        for(const building of restored.filter(Boolean)) {
          const item=afterSaved.find(entry=>entry.id===building.id);
          item.exists=true;
          item.value={height:building.height,top:building.top,windows:building.windows,
            facade:structuredClone(building.facade??defaultFacade),...parts.normalize(building)};
        }
        function writeEntries(store,values) {
          for(const {id,exists,value} of values) {
            if(exists)store[id]=structuredClone(value);
            else delete store[id];
          }
        }
        function apply(merged) {
          for(const site of [plot,...members]) {
            const building=site.building;
            if(building && plotsByBuilding.get(building.id)===site) {
              buildings.delete(building.id);
              plotsByBuilding.delete(building.id);
            }
          }
          if(merged) {
            if(!objects.includes(plot))objects.push(plot);
            if(!mergedPlots.includes(plot))mergedPlots.push(plot);
            if(!mergeRecords.includes(record))mergeRecords.push(record);
            members.forEach((member,index)=>{
              member.mergedInto=plot.plotId;
              member.building=oldMembers[index];
            });
            placeBuilding(plot,largeBuilding);
          } else {
            const objectIndex=objects.indexOf(plot);
            if(objectIndex>=0)objects.splice(objectIndex,1);
            const mergedIndex=mergedPlots.indexOf(plot);
            if(mergedIndex>=0)mergedPlots.splice(mergedIndex,1);
            mergeRecords=mergeRecords.filter(r=>r.id!==record.id);
            members.forEach((member,index)=>{
              delete member.mergedInto;
              placeBuilding(member,restored[index]);
            });
          }
          writeEntries(layout,merged?beforeLayout:afterLayout);
          writeEntries(saved,merged?beforeSaved:afterSaved);
          sortObjects();
          trafficByDistrict.clear();
          const message=merged?"부지 나누기를 취소했어요":"원래 부지로 나눴어요";
          saveLayout(message);
          saveDesign(message);
          persistMerges(message);
          root.dispatchEvent(new CustomEvent("city-layout-change",{bubbles:true}));
        }
        rememberUndo(()=>apply(true),()=>apply(false));
        prepareHistoryAction();
        apply(false);
        if(largeBuilding)selectBuilding(largeBuilding);
        draw();
      }
      field("splitPlot").addEventListener("click",()=>{
        splitMergedPlot(selected?plotsByBuilding.get(selected.id):null);
      });
      plotActions.querySelector("[name=splitEmptyPlot]").addEventListener("click",()=>{
        splitMergedPlot(selectedPlot);
      });

      function findEmptyPlot(event) {
        const bounds = canvas.getBoundingClientRect();
        const difference = (event.clientX-bounds.left-width/2)/scale+camera.x;
        const sum = ((event.clientY-bounds.top-height/2)/scale+camera.y)/.49;
        const x = (sum+difference)/2, y = (sum-difference)/2;
        return viewObjects().find(plot => plot.plotId && !plot.building && visibleObject(plot) &&
          x >= plot.x-plotWidth(plot) && x <= plot.x && y >= plot.y-plotDepth(plot) && y <= plot.y);
      }

      function canDeleteBuilding(building) {
        return !!building && !historyBusy;
      }

      function refreshBuildingActions() {
        refreshSplitButtons();
        const disabled = !canDeleteBuilding(selected);
        field("deleteBuilding").disabled = disabled;
        deleteHelp.hidden = !selected?.trackId;
      }

      function selectBuilding(building, frame = true) {
        if(building!==selected || editor.hidden)resetCopyButton();
        selected = building;
        resetDraft = undefined;
        undoButton.disabled = !undoHistory.length;
        selectedPlot = undefined;
        plotActions.hidden = true;
        editor.hidden = !building;
        if (!building) return;
        fillDesignEditor(building);
        refreshBuildingActions();
        if (frame) frameSelectedBuilding();
        root.dispatchEvent(new CustomEvent("building-select", {
          bubbles:true, composed:true, detail:{ id:building.id, trackId:building.trackId, lit:!!building.trackId }
        }));
      }

      function findBuilding(event) {
        const bounds = canvas.getBoundingClientRect();
        const px = event.clientX-bounds.left;
        const py = event.clientY-bounds.top;
        return viewObjects().findLast(({building:b,district:objectsDistrict}) => {
          if (!b || !visibleObject({building:b,district:objectsDistrict})) return false;
          const [left] = project(b.x,b.y+b.depth);
          const [right] = project(b.x+b.width,b.y);
          const [,top] = project(b.x,b.y,b.height);
          const [,bottom] = project(b.x+b.width,b.y+b.depth);
          return px>=left && px<=right && py>=top && py<=bottom;
        })?.building;
      }
      function closeBuildingEditor() {
        if(editor.hidden)return;
        stopKeyboardPan();
        gesture=hovered=dropPlot=undefined;
        resetDraft=undefined;
        undoButton.disabled=!undoHistory.length;
        resetCopyButton();
        editor.hidden=true;
        invalidateWorldPreview();
        draw();
        status.textContent="건물 디자인 편집을 취소했어요";
      }
      root.addEventListener("contextmenu",event=>{
        if(editor.hidden)return;
        event.preventDefault();
        event.stopPropagation();
        closeBuildingEditor();
      },true);
      canvas.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();
        if (mergeMode) { setMergeMode(false); return; }
        if (!districtMode) return;
        gesture = undefined;
        canvas.style.cursor = '';
        setDistrictMode('', '구역 편집을 종료했어요', true);
      });
      for (const type of ['mousedown', 'mousemove', 'mouseup', 'auxclick']) {
        canvas.addEventListener(type, event => {
          if (event.button !== 2 && !(event.buttons & 2)) return;
          event.preventDefault();
          event.stopPropagation();
        });
      }
      canvas.addEventListener('pointerdown', event => {
        stopKeyboardPan();
        if (event.button === 2) {
          event.preventDefault();
          event.stopPropagation();
          const wasPanning = gesture?.moved && !gesture.swapDrag && !gesture.mergeDrag;
          gesture = undefined;
          if (wasPanning) finishMapDrag();
          return;
        }
        if (!event.isPrimary || event.button !== 0) return;
        gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, moved:false,
          swapDrag: Boolean(swapSource && findBuilding(event) === swapSource),mergeDrag:mergeMode };
        if(mergeMode)mergeDrag={anchor:mergePlotPoint(event),before:[...mergeSelection]};
        canvas.setPointerCapture(event.pointerId);
        if(zoomPreview) {
          clearZoomPreview();
          scheduleCameraDraw();
        }
      });
      canvas.addEventListener('pointermove', event => {
        if (event.buttons & 2) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (gesture) {
          if (event.pointerId!==gesture.id) return;
          const dx=event.clientX-gesture.x, dy=event.clientY-gesture.y;
          if (!gesture.moved && Math.hypot(dx,dy)<5) return;
          Object.assign(gesture,{ x:event.clientX, y:event.clientY, moved:true });
          if(gesture.mergeDrag) {
            scheduleMergeDrag(event);
            return;
          }
          if (gesture.swapDrag) {
            const target = findBuilding(event);
            const emptyTarget = target ? undefined : findEmptyPlot(event);
            if (target !== hovered || emptyTarget !== dropPlot) {
              hovered = target;
              dropPlot = emptyTarget;
              draw();
            }
          } else {
            move(dx,dy,true);
          }
          return;
        }
        if(mergeMode) {canvas.style.cursor="crosshair";return;}
        if (districtMode) {
          districtHover = findDistrict(event);
          canvas.style.cursor = districtHover ? "pointer" : "";
          draw();
          return;
        }
        const previousHover = hovered, previousDrop = dropPlot;
        hovered = findBuilding(event);
        dropPlot = swapSource && !hovered ? findEmptyPlot(event) : undefined;
        canvas.style.cursor = (hovered || dropPlot) ? 'pointer' : '';
        if (hovered !== previousHover || dropPlot !== previousDrop) draw();
      });
      canvas.addEventListener('pointerleave', () => { hovered = dropPlot = undefined; draw(); });
      canvas.addEventListener('pointerup', event => {
        if (event.pointerId!==gesture?.id) return;
        const { moved, swapDrag, mergeDrag:isMergeDrag } = gesture;
        if(isMergeDrag) {
          cancelAnimationFrame(mergeDragFrame);
          mergeDragFrame=undefined;
          if(moved)updateMergeDrag(event);
          mergeDrag=undefined;
          gesture=undefined;
          if(moved) {drawMergeSelection();return;}
        }
        gesture = undefined;
        if (moved && !swapDrag) finishMapDrag();
        if (!moved || (swapDrag && swapSource)) {
          if (mergeMode) {
            const building = findBuilding(event);
            const plot = building ? plotsByBuilding.get(building.id) : findEmptyPlot(event);
            if (plot) {
              if (plot.members) {
                status.textContent = "이미 합쳐진 부지야. 원래 부지를 선택해 줘.";
              } else {
                if (mergeSelection.has(plot)) mergeSelection.delete(plot);
                else mergeSelection.add(plot);
                refreshMergePanel();
              }
            }
            draw();
            return;
          }
          if (districtMode) {
            const tile = findDistrict(event);
            gesture = undefined;
            if (!tile) return;
            if (districtMode==="add") {

              generateDistrict(tile);
              open.set(key(tile),tile);
              restoreMergedPlots();
              rememberUndo(() => {
                open.delete(key(tile));
                finishDistrictEdit("구역 추가를 취소했어요");
              },()=>{
                open.set(key(tile),tile);
                restoreMergedPlots();
                finishDistrictEdit("구역 추가를 다시 실행했어요");
              });
              finishDistrictEdit("새 구역을 열었어요");
            } else {
              open.delete(key(tile));
              rememberUndo(() => {
                open.set(key(tile),tile);
              restoreMergedPlots();
                finishDistrictEdit("구역 삭제를 취소했어요");
              },()=>{
                open.delete(key(tile));
                finishDistrictEdit("구역 삭제를 다시 실행했어요");
              });
              finishDistrictEdit("선택한 구역을 닫았어요");
            }
            return;
          }
          const building = findBuilding(event);
          if (swapSource) {
            const to = building ? plotsByBuilding.get(building.id) : findEmptyPlot(event);
            dropPlot = undefined;
            if (!to || building === swapSource) {
              hovered = undefined;
              draw();
              status.textContent = "다른 건물이나 빈 부지를 선택해 주세요";
              return;
            }
            const from = plotsByBuilding.get(swapSource.id);
            if (plotWidth(from)!==plotWidth(to) || plotDepth(from)!==plotDepth(to)) {
              status.textContent = "같은 크기의 부지끼리 이동하거나 교환할 수 있어.";
              draw();
              return;
            }
            const source = swapSource;
            swapSource = hovered = undefined;
            rememberLayout(from, to);
            placeBuilding(from, building);
            placeBuilding(to, source);
            selectBuilding(source, false);
            saveLayout(building ? "두 건물의 위치를 교환했어요" : "건물을 빈 부지로 옮겼어요", from, to);
          } else {
            selectBuilding(building);
            if (!building) selectedPlot = findEmptyPlot(event);
            plotActions.hidden = !selectedPlot;
            status.textContent = building ? `선택한 건물 · ${building.id} · ${building.trackId ? "곡 배정됨" : "미배정"}`
              : selectedPlot ? "빈 부지를 선택했어요" : idleMessage;
          }
          draw();
        }
        gesture = undefined;
      });
      field("swapBuilding").addEventListener("click", () => {
        resetDraft = undefined;
        undoButton.disabled = !undoHistory.length;
        swapSource = selected;
        hovered = undefined;
        resetCopyButton();
        editor.hidden = true;
        status.textContent = "다른 건물이나 빈 부지로 끌어 놓거나 클릭하세요 · Esc로 취소";
        canvas.focus();
        draw();
      });
      plotActions.querySelector("button").addEventListener("click", () => {
        const plot = selectedPlot;
        if (!plot || plot.building) return;
        const suffix = Array.from(crypto.getRandomValues(new Uint32Array(2)), number => number.toString(36)).join("-");
        const building = plot.template
          ? {...structuredClone(plot.template),trackId:plot.template.trackId ?? null}
          : makeBuilding("building-" + suffix, { height:64, top:"flat", windows:"grid" });
        rememberLayout(plot);
        placeBuilding(plot, building);
        selectBuilding(building);
        saveLayout("빈 부지에 건물을 만들었어요", plot);
        root.dispatchEvent(new CustomEvent("city-layout-change",{bubbles:true}));
        draw();
      });
      function removeBuilding(building,plot) {
        buildings.delete(building.id);
        plotsByBuilding.delete(building.id);
        hovered=undefined;
        placeBuilding(plot,null);
        selectBuilding(undefined);
        selectedPlot=plot;
        plotActions.hidden=false;
        root.dispatchEvent(new CustomEvent("building-select",{
          bubbles:true,composed:true,detail:{id:null,trackId:null,lit:false}
        }));
        saveLayout("건물을 삭제했어요",plot);
        root.dispatchEvent(new CustomEvent("city-layout-change",{bubbles:true}));
      }
      field("deleteBuilding").addEventListener("click", () => {
        if (!canDeleteBuilding(selected)) return;
        const building=selected,plot=plotsByBuilding.get(building.id);
        if(!building.trackId) {
          rememberLayout(plot);
          removeBuilding(building,plot);
          draw();
          return;
        }
        if(!window.confirm("노래가 할당되어 있는데 삭제하시겠습니까?"))return;
        if(!root.setBuildingTrackAssignments || !root.getBuildingTrackAssignments) {
          status.textContent="곡 정보를 불러온 뒤 다시 삭제해 줘.";
          return;
        }
        let trackIds=root.getBuildingTrackAssignments(building.id);
        runMapChange(()=>root.setBuildingTrackAssignments(building.id,[]),()=>{
          rememberUndo(async()=>{
            const restored=await root.setBuildingTrackAssignments(building.id,trackIds);
            building.trackId=restored[0]??null;
            placeBuilding(plot,building);
            saveLayout("건물 삭제를 취소했어요",plot);
          },async()=>{
            const current=root.getBuildingTrackAssignments(building.id);
            if(current.some(id=>!trackIds.includes(id)) &&
              !window.confirm("노래가 할당되어 있는데 삭제하시겠습니까?"))throw new Error("삭제를 취소했어요");
            trackIds=current;
            await root.setBuildingTrackAssignments(building.id,[]);
            removeBuilding(building,plot);
          });
          removeBuilding(building,plot);
        });
      });
      canvas.addEventListener('pointercancel',()=>{
        if(gesture?.mergeDrag) {cancelMergeDrag();gesture=undefined;}
      });
      canvas.addEventListener('lostpointercapture', () => {
        if(gesture?.mergeDrag) {cancelMergeDrag();gesture=undefined;return;}
        const wasPanning = gesture?.moved && !gesture.swapDrag && !gesture.mergeDrag;
        if (gesture?.swapDrag) {
          hovered = dropPlot = undefined;
          draw();
        }
        gesture = undefined;
        if (wasPanning) finishMapDrag();
      });
      const panKeys=new Set();
      const panDirections={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
      let panVelocityX=0,panVelocityY=0,lastPanTime;
      function stopKeyboardPan() {
        panKeys.clear();
        panVelocityX=panVelocityY=0;
        lastPanTime=undefined;
      }
      function advanceKeyboardPan(now) {
        if (!scale || gesture) {
          stopKeyboardPan();
          return;
        }
        if (!panKeys.size && panVelocityX===0 && panVelocityY===0) {
          lastPanTime=undefined;
          return;
        }
        const elapsed=lastPanTime===undefined ? 1/60 : Math.max(0,Math.min(.05,(now-lastPanTime)/1000));
        lastPanTime=now;
        let x=0,y=0;
        for (const key of panKeys) {
          x+=panDirections[key][0];
          y+=panDirections[key][1];
        }
        const magnitude=Math.hypot(x,y);
        const targetX=magnitude ? x/magnitude*420 : 0;
        const targetY=magnitude ? y/magnitude*420 : 0;
        const smoothing=panKeys.size ? .09 : .075;
        const damping=Math.exp(-elapsed/smoothing);
        const dx=targetX*elapsed+(panVelocityX-targetX)*smoothing*(1-damping);
        const dy=targetY*elapsed+(panVelocityY-targetY)*smoothing*(1-damping);
        panVelocityX=targetX+(panVelocityX-targetX)*damping;
        panVelocityY=targetY+(panVelocityY-targetY)*damping;
        if (!panKeys.size && Math.hypot(panVelocityX,panVelocityY)<.5) {
          panVelocityX=panVelocityY=0;
        }
        if (Math.abs(dx)+Math.abs(dy)>.001) move(dx,dy);
      }
      this.releasePanKey=event=> {
        if (Object.hasOwn(panDirections,event.key)) panKeys.delete(event.key);
      };
      this.stopKeyboardPan=stopKeyboardPan;
      this.onPanVisibilityChange=()=> {
        if (document.hidden) stopKeyboardPan();
      };
      this.connectKeyboardPan=()=> {
        window.addEventListener("keyup",this.releasePanKey);
        window.addEventListener("blur",stopKeyboardPan);
        document.addEventListener("visibilitychange",this.onPanVisibilityChange);
      };
      this.connectKeyboardPan();
      canvas.addEventListener("blur",stopKeyboardPan);
      canvas.addEventListener('keydown', event => {
        if (event.key === "Escape") stopKeyboardPan();
        if (event.key === "Escape" && mergeMode) {
          setMergeMode(false);
          return;
        }
        if (event.key === "Escape" && swapSource) {
          const building = swapSource;
          swapSource = hovered = dropPlot = undefined;
          selectBuilding(building, false);
          status.textContent = "이동 / 위치 교환을 취소했어요";
          draw();
          return;
        }
        if (!Object.hasOwn(panDirections,event.key)) return;
        event.preventDefault();
        if (gesture) return;
        if (zoomPreview) {
          clearZoomPreview();
          scheduleCameraDraw();
        }
        panKeys.add(event.key);
      });
      this.getBuilding = id => {
        const building = buildings.get(id);
        return building ? { ...building, facade: [...(building.facade ?? defaultFacade)] } : null;
      };
      this.focusBuilding = id => {
        if (!editor.hidden || !width || !height || !scale) return false;
        const building=buildings.get(id);
        const plot=plotsByBuilding.get(id);
        if (!building || !plot || !visibleObject(plot)) return false;
        stopKeyboardPan();
        clearZoomPreview();
        gesture=undefined;
        overview=false;
        const {x,y,width:w,depth:d,height:h}=building;
        const top=h+(roofHeights[building.top] ?? 32);
        const fit=Math.min((width-60)/(w+d+20),(height-100)/((w+d)*.49+top+30));
        if (fit>0 && scale>fit) {
          scale=fit;
          zoom=scale/Math.min(1.55,Math.max(.65,width/710));
        }
        camera.x=x+w/2-y-d/2;
        camera.y=(x+w/2+y+d/2)*.49-top/2;
        zoomIn.disabled=zoom>=maxZoom;
        zoomOut.disabled=zoom<=minZoom;
        draw();
        return true;
      };
      this.updateBuilding = (id, changes) => {
        const building = buildings.get(id);
        if (!building) return false;
        invalidateWorldPreview();
        if (Object.hasOwn(changes, 'trackId')) building.trackId = changes.trackId ?? null;
        if (Number.isFinite(changes.height)) {
          building.height = Math.max(24, Math.min(180, changes.height));
        }
        if (Array.isArray(changes.facade) && changes.facade.length === 3 &&
            changes.facade.every(color => typeof color === 'string' && CSS.supports('color',color))) {
          building.facade = [...changes.facade];
        }
        if (building === selected) refreshBuildingActions();
        draw();
        return true;
      };
      editor.addEventListener("input", event => {
        if (!selected) return;
        invalidateWorldPreview();
        clearRedo();
        if (event.target === field("preset")) {
          const preset = presets[field("preset").value];
          if (preset) {
            const [height, top, windows, ...colors] = preset;
            field("height").value = height;
            field("top").value = top;
            field("windows").value = windows;
            editableColors.forEach((name, index) => { field(name).value = colors[index]; });
          }
        } else {
          field("preset").value = "";
          if (event.target === field("walls")) applyWallColor();
          if (event.target === field("buildingColor")) {
            const color=field("buildingColor").value;
            editableColors.forEach(name=>{field(name).value=color;});
          }
        }
        if (event.target === field("buildingType")) {
          field("height").value = parts.types[field("buildingType").value].height;
          const typeDefaults = parts.types[field("buildingType").value];
          if (typeDefaults.facade) {
            typeDefaults.facade.forEach((color,index)=>{field(editableColors[index]).value=color;});
            field("windows").value=typeDefaults.windows;
          }
          if (field("buildingType").value === "artdeco") {
            ["#393c43","#20232c","#30343d"].forEach((color,index)=>{field(editableColors[index]).value=color;});
            field("windows").value="tall";
          }
          field("top").value = parts.types[field("buildingType").value].top ?? (["house","duplex"].includes(field("buildingType").value) ? "gable" : "flat");
        }
        syncWallColor();
        refreshChoices();
        if (event.target === field("height")) {
          clearTimeout(heightPreviewTimer);
          heightPreviewPending=true;
          scheduleLiveHeightPreview();
          heightPreviewTimer=setTimeout(()=>{
            if(root.isConnected && selected && !editor.hidden)draw();
          },150);
        } else if (event.target.type === "color") {
          clearTimeout(colorPreviewTimer);
          colorPreviewTimer = setTimeout(draw, 90);
        } else {
          draw();
        }
      });
      this.finishHeightAdjustment=()=>{
        if(heightPreviewPending && root.isConnected && selected && !editor.hidden)draw();
      };
      this.cancelHeightPreview=()=>{
        clearTimeout(heightScenePrepTimer);
        clearTimeout(heightPreviewTimer);
        cancelAnimationFrame(heightPreviewFrame);
        heightPreviewFrame=undefined;
        heightPreviewPending=false;
        liveHeightScene=undefined;
      };
      window.addEventListener("pointerup",this.finishHeightAdjustment);
      field("height").addEventListener("keyup",this.finishHeightAdjustment);
      field("height").addEventListener("blur",this.finishHeightAdjustment);
      editor.addEventListener("change", event => {
        if (selected && event.target.type === "color") draw();
      });
      field("applyBuildingColor").addEventListener("click",()=>{
        field("buildingColor").dispatchEvent(new Event("input",{bubbles:true}));
      });
      field("applyWalls").addEventListener("click", () => {
        field("walls").dispatchEvent(new Event("input", { bubbles:true }));
      });
      function resetCopyButton() {
        field("copyDesign").textContent="디자인 복사";
        field("copyDesign").classList.remove("copy-complete");
      }
      this.dismissCopyFeedback=resetCopyButton;
      field("copyDesign").addEventListener("click",()=>{
        if(!selected)return;
        copiedBuildingDesign={design:structuredClone(readDesign()),preset:field("preset").value};
        field("pasteDesign").disabled=false;
        field("pasteDesign").title="복사한 디자인을 미리보기에 적용";
        field("copyDesign").textContent="복사 완료 ✓";
        field("copyDesign").classList.add("copy-complete");
      });
      field("pasteDesign").addEventListener("click",()=>{
        if(!selected || !copiedBuildingDesign)return;
        resetDraft ??= {design:readDesign(),preset:field("preset").value,label:"디자인 붙여넣기"};
        clearRedo();
        fillDesignEditor(structuredClone(copiedBuildingDesign.design));
        field("preset").value=copiedBuildingDesign.preset;
        refreshChoices();
        invalidateWorldPreview();
        frameSelectedBuilding();
        draw();
        undoButton.disabled=false;
        status.textContent="디자인을 붙여넣었어요 · 적용을 누르면 저장돼";
      });
      field("resetDesign").addEventListener("click", () => {
        if (!selected) return;
        clearRedo();
        resetDraft ??= { design:readDesign(), preset:field("preset").value, label:"디자인 초기화" };
        undoButton.disabled = false;
        fillDesignEditor(selected.defaultDesign);
        frameSelectedBuilding();
        draw();
      });
      editor.addEventListener("submit", event => {
        event.preventDefault();
        if (!selected) return;
        const building = selected;
        const { id, height, top, windows, facade } = building;
        const previousExtension = parts.normalize(building);
        const previousSaved = saved[id];
        const design = readDesign();
        const unchanged = JSON.stringify(parts.normalize(building)) === JSON.stringify(parts.normalize(design)) && height === design.height && top === design.top && windows === design.windows &&
          design.facade.every((color, index) => color === (facade ?? defaultFacade)[index]);
        if (!unchanged) {
          rememberUndo(() => {
            Object.assign(building, { height, top, windows, facade }, previousExtension);
            if (previousSaved) saved[id] = previousSaved;
            else delete saved[id];
            saveDesign("건물 디자인 변경을 취소했어요");
          },()=>{
            Object.assign(building,design);
            saved[id]=design;
            saveDesign("건물 디자인 변경을 다시 실행했어요");
          });
          Object.assign(building, design);
          saved[id] = design;
          saveDesign("건물 디자인 저장됨 · " + id);
        }
        resetDraft = undefined;
        undoButton.disabled = !undoHistory.length;
        resetCopyButton();
        editor.hidden = true;
        draw();
      });
      function runMapChange(operation,onSuccess,onFailure) {
        if(historyBusy)return;
        historyBusy=true;
        const wasInert=root.inert;
        root.inert=true;
        undoButton.disabled=redoButton.disabled=true;
        function finish(error) {
          historyBusy=false;
          try {
            if(error) {
              onFailure?.();
              status.textContent="작업을 완료하지 못했어요 · "+(error.message??"저장 실패");
            } else onSuccess();
          } finally {
            root.inert=wasInert;
            undoButton.disabled=!(resetDraft||undoHistory.length);
            redoButton.disabled=!redoHistory.length;
            refreshBuildingActions();
            draw();
          }
        }
        try {
          const result=operation();
          if(result && typeof result.then==="function")result.then(()=>finish(),error=>finish(error));
          else finish();
        } catch(error) {finish(error);}
      }
      function runStoredAction(action,direction) {
        const source=direction==="undo"?undoHistory:redoHistory;
        const target=direction==="undo"?redoHistory:undoHistory;
        runMapChange(()=>action[direction](),()=>{
          target.push(action);
          root.dispatchEvent(new CustomEvent("city-layout-change",{bubbles:true}));
        },()=>source.push(action));
      }
      function prepareHistoryAction() {
        if(mergeMode)setMergeMode(false);
        swapSource = hovered = dropPlot = gesture = undefined;
        selectBuilding(undefined);
        root.dispatchEvent(new CustomEvent("building-select", {
          bubbles:true,composed:true,detail:{id:null,trackId:null,lit:false}
        }));
      }
      undoButton.addEventListener("click", () => {
        if(historyBusy)return;
        if (resetDraft && selected && !editor.hidden) {
          const building=selected;
          const before=structuredClone(resetDraft);
          const after={design:readDesign(),preset:field("preset").value};
          resetDraft=undefined;
          fillDesignEditor(before.design);
          field("preset").value=before.preset;
          refreshChoices();
          frameSelectedBuilding();
          redoHistory.push({
            draft:true,
            redo:()=>{
              selectBuilding(building,false);
              resetDraft=structuredClone(before);
              fillDesignEditor(after.design);
              field("preset").value=after.preset;
              refreshChoices();
              frameSelectedBuilding();
              status.textContent=(before.label??"디자인 초기화")+" 작업을 다시 실행했어요";
            }
          });
          status.textContent=(before.label??"디자인 초기화")+" 작업을 취소했어요";
        } else {
          const action=undoHistory.pop();
          if(!action)return;
          prepareHistoryAction();
          runStoredAction(action,"undo");
          return;
        }
        undoButton.disabled=!(resetDraft||undoHistory.length);
        redoButton.disabled=!redoHistory.length;
        draw();
      });
      redoButton.addEventListener("click",()=>{
        if(historyBusy)return;
        const action=redoHistory.pop();
        if(!action)return;
        if(action.draft) {
          action.redo();
        } else {
          prepareHistoryAction();
          runStoredAction(action,"redo");
          return;
        }
        undoButton.disabled=!(resetDraft||undoHistory.length);
        redoButton.disabled=!redoHistory.length;
        draw();
      });
      this.cancelZoomPreview=clearZoomPreview;
      this.cancelMergeDrag=cancelMergeDrag;
      this.cancelWorldPreview=cancelWorldPreviewJob;
      this.startTraffic = () => {
        cancelAnimationFrame(this.trafficFrame);
        this.trafficFrame = requestAnimationFrame(animateTraffic);
      };
      this.startTraffic();
      this.observer = new ResizeObserver(resize);
      this.observer.observe(this);
    }
    disconnectedCallback() {
      document.removeEventListener("pointerdown",this.closeEffectsOutside,true);
      this.dismissCopyFeedback?.();
      this.stopKeyboardPan?.();
      window.removeEventListener("keyup",this.releasePanKey);
      window.removeEventListener("blur",this.stopKeyboardPan);
      document.removeEventListener("visibilitychange",this.onPanVisibilityChange);
      this.cancelMergeDrag?.();
      this.cancelHeightPreview?.();
      window.removeEventListener("pointerup",this.finishHeightAdjustment);
      this.cancelZoomPreview?.();
      this.saveTimeSettings?.();
      window.removeEventListener("pagehide",this.saveTimeSettings);
      this.observer?.unobserve(this);
      this.cancelWorldPreview?.();
      cancelAnimationFrame(this.trafficFrame);
    }
  }
  customElements.define('sound-city-map', SoundCityMap);
})();






































