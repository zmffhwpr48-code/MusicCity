/* SOUND CITY — 플레이리스트 관리
   곡 정보와 음원 파일은 IndexedDB에 저장합니다.
   건물 연결은 track.buildingId로 보관하고, 지도에 다시 반영합니다.
*/
(() => {
  "use strict";

  const DATABASE_NAME = "sound-city-playlist-v1";
  const DATABASE_VERSION = 1;
  const TRACKS_STORE = "tracks";
  const FILES_STORE = "audioFiles";
  const $ = (selector) => document.querySelector(selector);
  const playlistToggle = $("#playlist-toggle");
  const playlistPanel = $("#playlist-panel");
  const app = document.querySelector(".app");
  const panelResizer = $("#panel-resizer");
  const wideLayout = window.matchMedia("(min-width: 901px)");
  let resizePointer = null;
  let resizeOffset = 0;

  function panelWidthLimits() {
    const style = getComputedStyle(app);
    const available = app.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return { min: 280, max: available - panelResizer.offsetWidth - 320 };
  }

  function updateResizeAccessibility() {
    if (!wideLayout.matches || playlistPanel.hidden) return;
    const { min, max } = panelWidthLimits();
    panelResizer.setAttribute("aria-valuemin", String(min));
    panelResizer.setAttribute("aria-valuemax", String(Math.round(max)));
    panelResizer.setAttribute("aria-valuenow", String(Math.round(playlistPanel.getBoundingClientRect().width)));
    panelResizer.setAttribute("aria-valuetext", `플레이리스트 너비 ${Math.round(playlistPanel.getBoundingClientRect().width)}픽셀`);
  }

  function setPlaylistWidth(width) {
    const { min, max } = panelWidthLimits();
    const clamped = Math.max(min, Math.min(max, width));
    // 비율로 보관해 창 크기가 바뀌어도 두 패널이 함께 조절되게 합니다.
    const style = getComputedStyle(app);
    const available = app.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    app.style.setProperty("--playlist-width", `${clamped / available * 100}%`);
    updateResizeAccessibility();
  }

  function finishPanelResize() {
    const pointer = resizePointer;
    resizePointer = null;
    document.body.classList.remove("resizing-panels");
    if (pointer !== null && panelResizer.hasPointerCapture(pointer)) panelResizer.releasePointerCapture(pointer);
  }

  panelResizer.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !wideLayout.matches || playlistPanel.hidden || resizePointer !== null) return;
    event.preventDefault();
    resizeOffset = event.clientX - playlistPanel.getBoundingClientRect().left;
    resizePointer = event.pointerId;
    panelResizer.setPointerCapture(event.pointerId);
    panelResizer.focus();
    document.body.classList.add("resizing-panels");
  });
  panelResizer.addEventListener("pointermove", event => {
    if (event.pointerId !== resizePointer) return;
    setPlaylistWidth(playlistPanel.getBoundingClientRect().right - event.clientX + resizeOffset);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    panelResizer.addEventListener(name, event => {
      if (event.pointerId === resizePointer) finishPanelResize();
    });
  }
  panelResizer.addEventListener("keydown", event => {
    if (!wideLayout.matches || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const { min, max } = panelWidthLimits();
    const widths = {
      ArrowLeft: playlistPanel.getBoundingClientRect().width + 24,
      ArrowRight: playlistPanel.getBoundingClientRect().width - 24,
      Home: min,
      End: max
    };
    setPlaylistWidth(widths[event.key]);
  });
  wideLayout.addEventListener("change", finishPanelResize);
  window.addEventListener("blur", finishPanelResize);
  new ResizeObserver(updateResizeAccessibility).observe(app);
  new ResizeObserver(updateResizeAccessibility).observe(playlistPanel);
  playlistToggle?.addEventListener("click", () => {
    finishPanelResize();
    const collapsed = !playlistPanel.hidden;
    playlistPanel.hidden = collapsed;
    app.classList.toggle("playlist-collapsed", collapsed);
    playlistToggle.setAttribute("aria-expanded", String(!collapsed));
    playlistToggle.setAttribute("aria-label", collapsed ? "플레이리스트 펼치기" : "플레이리스트 접기");
    playlistToggle.textContent = collapsed ? "플레이리스트 펼치기" : "플레이리스트 접기";
    const targetHeader = document.querySelector(collapsed ? ".map-header" : ".playlist-header");
    targetHeader.append(playlistToggle);
    playlistToggle.focus();
  });

  const map = $("sound-city-map");
  const form = $("#add-track-form");
  const list = $("#track-list");
  const template = $("#track-item-template");
  const searchInput = $("#search-input");
  const sortInput = $("#track-sort");
  const trackCollator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
  const audio = $("#audio-player");
  const playButton = $("#play-toggle");
  const prevButton = $("#play-prev");
  const nextButton = $("#play-next");
  const seek = $("#play-seek");
  const linkButton = $("#link-track");
  const unlinkButton = $("#unlink-track");
  const status = $("#playlist-feedback");

  if (!map || !form || !list || !template || !audio) return;

  let database;
  let tracks = [];
  let selectedTrackId = null;
  let selectedBuildingId = null;
  let activeAudioURL = null;
  let playbackRequest = 0;
  let saving = false;

  function notify(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function createId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint32Array(4)), number => number.toString(36)).join("-");
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TRACKS_STORE)) db.createObjectStore(TRACKS_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("다른 탭에서 데이터베이스가 열려 있어요."));
    });
  }

  function getAllTracks() {
    return new Promise((resolve, reject) => {
      const request = database.transaction(TRACKS_STORE, "readonly")
        .objectStore(TRACKS_STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getAudioFile(id) {
    return new Promise((resolve, reject) => {
      const request = database.transaction(FILES_STORE, "readonly")
        .objectStore(FILES_STORE).get(id);
      request.onsuccess = () => resolve(request.result?.blob ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  // Promise는 트랜잭션이 완료/실패할 때만 처리합니다. 메타데이터와 음원을 원자적으로 저장합니다.
  function writeRecords(changedTracks, newFile = null, removedId = null) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE, FILES_STORE], "readwrite");
      const trackStore = transaction.objectStore(TRACKS_STORE);
      const fileStore = transaction.objectStore(FILES_STORE);
      for (const track of changedTracks) trackStore.put(track);
      if (newFile) fileStore.put({ id: changedTracks[0].id, blob: newFile });
      if (removedId) {
        trackStore.delete(removedId);
        fileStore.delete(removedId);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("저장에 실패했어요."));
      transaction.onabort = () => reject(transaction.error ?? new Error("저장이 취소됐어요."));
    });
  }

  function currentTrack() {
    return tracks.find(track => track.id === selectedTrackId) ?? null;
  }

  function linkedTo(buildingId) {
    return tracks.find(track => track.buildingId === buildingId) ?? null;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const value = Math.floor(seconds);
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function refreshPlayer() {
    map.setSelectedTrack?.(selectedTrackId);
    const track = currentTrack();
    $("#now-track").textContent = track?.title ?? "재생할 곡을 선택해 주세요";
    $("#now-artist").textContent = track
      ? `${track.artist} · ${track.genre}${track.hasAudio ? "" : " · 음원 없음"}`
      : "직접 추가한 음원을 여기서 재생할 수 있어요";

    const playable = Boolean(track?.hasAudio);
    playButton.disabled = !playable;
    prevButton.disabled = !tracks.some(item => item.hasAudio);
    nextButton.disabled = prevButton.disabled;
    playButton.textContent = !audio.paused && audio.dataset.trackId === selectedTrackId ? "❚❚" : "▶";
    playButton.setAttribute("aria-label", !audio.paused && audio.dataset.trackId === selectedTrackId ? "일시정지" : "재생");

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const elapsed = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    $("#play-time").textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
    seek.disabled = !duration;
    seek.value = duration ? String(Math.round(elapsed / duration * 1000)) : "0";
  }

  function refreshBuildingControls() {
    const linked = selectedBuildingId ? linkedTo(selectedBuildingId) : null;
    const track = currentTrack();
    $("#chosen-building").textContent = selectedBuildingId
      ? `선택한 건물: ${selectedBuildingId}`
      : "지도에서 건물을 선택해 주세요";
    $("#building-track").textContent = linked
      ? `연결된 곡: ${linked.title} — ${linked.artist}`
      : selectedBuildingId ? "연결된 곡이 없어요" : "건물을 선택하면 곡을 배정할 수 있어요";

    linkButton.disabled = saving || !track || !selectedBuildingId || linked?.id === track.id;
    unlinkButton.disabled = saving || !linked || !selectedBuildingId;
    linkButton.textContent = track ? `「${track.title}」 배정` : "선택한 곡 배정";
  }

  function orderedTracks() {
    const order = sortInput.value;
    return [...tracks].sort((a, b) => {
      const addedOrder = (a.createdAt ?? 0) - (b.createdAt ?? 0);
      if (order === "newest") return -addedOrder;
      if (order === "oldest") return addedOrder;
      return trackCollator.compare(a[order] ?? "", b[order] ?? "") ||
        trackCollator.compare(a.title, b.title) || addedOrder;
    });
  }

  function renderTracks() {
    const keyword = searchInput.value.trim().toLocaleLowerCase();
    const filtered = orderedTracks().filter(track =>
      `${track.title} ${track.artist}`.toLocaleLowerCase().includes(keyword));
    $("#track-count").textContent = `${tracks.length} TRACKS`;

    const fragment = document.createDocumentFragment();
    if (!filtered.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      const icon = document.createElement("div");
      icon.className = "empty-icon";
      icon.textContent = "♪";
      const title = document.createElement("p");
      title.className = "empty-title";
      title.textContent = tracks.length ? "검색 결과가 없어요" : "아직 추가된 곡이 없어요";
      const desc = document.createElement("p");
      desc.className = "empty-desc";
      desc.textContent = tracks.length ? "다른 제목이나 아티스트로 검색해 보세요" : "위의 곡 추가하기로 첫 곡을 넣어 보세요";
      empty.append(icon, title, desc);
      fragment.append(empty);
    }

    filtered.forEach((track, index) => {
      const item = template.content.firstElementChild.cloneNode(true);
      item.dataset.id = track.id;
      item.classList.toggle("active", track.id === selectedTrackId);
      const main = item.querySelector(".track-main");
      main.setAttribute("aria-label", `${track.title} ${track.artist} ${track.hasAudio ? "재생" : "선택"}`);
      main.setAttribute("aria-pressed", String(track.id === selectedTrackId));
      item.querySelector(".track-name").textContent = track.title;
      item.querySelector(".track-meta").textContent =
        `${track.artist} · ${track.genre}${track.buildingId ? " · 🏙 연결됨" : ""}${track.hasAudio ? "" : " · 음원 없음"}`;
      item.querySelector(".track-number").textContent = String(index + 1).padStart(2, "0");
      item.querySelector(".track-delete").setAttribute("aria-label", `${track.title} 삭제`);
      if (!track.hasAudio) {
        const label = document.createElement("label");
        label.className = "track-attach";
        label.textContent = "음원 추가";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.aiff,.opus,.webm";
        input.className = "track-audio-file";
        input.disabled = saving;
        input.setAttribute("aria-label", `${track.title} 음원 추가`);
        label.append(input);
        item.append(label);
      }
      fragment.append(item);
    });
    list.replaceChildren(fragment);
    refreshPlayer();
    refreshBuildingControls();
  }

  function unloadAudio() {
    playbackRequest += 1; // 늦게 도착하는 음원 불러오기 작업 무효화
    audio.pause();
    audio.removeAttribute("src");
    audio.dataset.trackId = "";
    audio.load();
    if (activeAudioURL) URL.revokeObjectURL(activeAudioURL);
    activeAudioURL = null;
    refreshPlayer();
  }

  async function playTrack(id, toggleIfSame = true) {
    const track = tracks.find(item => item.id === id);
    if (!track) return;
    selectedTrackId = id;
    renderTracks();

    if (!track.hasAudio) {
      unloadAudio();
      notify("이 곡에는 음원 파일이 없어요. 목록의 ‘음원 추가’로 파일을 선택해 주세요.", true);
      return;
    }
    if (audio.dataset.trackId === id && audio.src) {
      if (!toggleIfSame || audio.paused) {
        try { await audio.play(); }
        catch { notify("이 파일은 브라우저에서 재생할 수 없거나 재생이 차단됐어요.", true); }
      } else {
        audio.pause();
      }
      refreshPlayer();
      return;
    }

    unloadAudio();
    const requestId = playbackRequest;
    try {
      const blob = await getAudioFile(id);
      if (requestId !== playbackRequest) return;
      if (!blob) {
        notify("저장된 음원 파일을 찾을 수 없어요.", true);
        return;
      }
      activeAudioURL = URL.createObjectURL(blob);
      audio.dataset.trackId = id;
      audio.src = activeAudioURL;
      await audio.play();
      notify(`재생 중: ${track.title} — ${track.artist}`);
    } catch (error) {
      if (requestId === playbackRequest) notify("음원을 불러오거나 재생할 수 없어요. 지원하는 오디오 형식인지 확인해 주세요.", true);
      console.warn("음원 재생 오류:", error);
    }
    refreshPlayer();
  }

  function nextPlayable(direction) {
    const playable = orderedTracks().filter(track => track.hasAudio);
    if (!playable.length) return;
    const position = playable.findIndex(track => track.id === selectedTrackId);
    const next = position < 0
      ? (direction > 0 ? 0 : playable.length - 1)
      : (position + direction + playable.length) % playable.length;
    void playTrack(playable[next].id, false);
  }

  function syncBuildings(ids = null) {
    const buildingIds = ids ?? tracks.map(track => track.buildingId).filter(Boolean);
    const assignments = Object.fromEntries([...new Set(buildingIds)]
      .map(id => [id, linkedTo(id)?.id ?? null]));
    if (typeof map.updateBuildingTracks === "function") {
      map.updateBuildingTracks(assignments);
    } else if (typeof map.updateBuilding === "function") {
      for (const [id, trackId] of Object.entries(assignments)) {
        map.updateBuilding(id, { trackId });
      }
    }
  }

  async function setBuildingTrackAssignments(buildingId,trackIds) {
    if(saving)throw new Error("곡을 저장 중이야. 잠시 후 다시 시도해 줘.");
    const wanted=new Set(trackIds);
    const affected=tracks.filter(track=>track.buildingId===buildingId || wanted.has(track.id));
    const changed=affected.map(track=>({...track,buildingId:wanted.has(track.id)?buildingId:null}));
    const affectedBuildings=[buildingId,...affected.map(track=>track.buildingId).filter(Boolean)];
    saving=true;
    refreshBuildingControls();
    try {
      await writeRecords(changed);
      const byId=new Map(changed.map(track=>[track.id,track]));
      tracks=tracks.map(track=>byId.get(track.id)??track);
      syncBuildings(affectedBuildings);
      return tracks.filter(track=>track.buildingId===buildingId).map(track=>track.id);
    } finally {
      saving=false;
      renderTracks();
    }
  }

  async function assignTrack() {
    const track = currentTrack();
    const buildingId = selectedBuildingId;
    if (!track || !buildingId || saving) return;
    if (typeof map.getBuilding !== "function" || !map.getBuilding(buildingId)) {
      notify("선택한 건물을 찾지 못했어요. 지도를 다시 선택해 주세요.", true);
      return;
    }

    const changed = new Map();
    const previous = linkedTo(buildingId);
    if (previous && previous.id !== track.id) changed.set(previous.id, { ...previous, buildingId: null });
    changed.set(track.id, { ...track, buildingId });
    const affectedBuildings = [buildingId, track.buildingId].filter(Boolean);
    saving = true;
    refreshBuildingControls();
    try {
      await writeRecords([...changed.values()]);
      tracks = tracks.map(item => changed.get(item.id) ?? item);
      syncBuildings(affectedBuildings);
      notify(`「${track.title}」을(를) 선택한 건물에 연결했어요.`);
    } catch (error) {
      notify(`건물 연결 저장 실패: ${error?.message ?? "저장소를 확인해 주세요."}`, true);
    } finally {
      saving = false;
      renderTracks();
    }
  }

  async function unlinkTrack() {
    const buildingId = selectedBuildingId;
    const track = linkedTo(buildingId);
    if (!track || saving) return;
    saving = true;
    refreshBuildingControls();
    try {
      const changed = { ...track, buildingId: null };
      await writeRecords([changed]);
      tracks = tracks.map(item => item.id === track.id ? changed : item);
      syncBuildings([buildingId]);
      notify(`「${track.title}」의 건물 연결을 해제했어요.`);
    } catch (error) {
      notify(`연결 해제 저장 실패: ${error?.message ?? "저장소를 확인해 주세요."}`, true);
    } finally {
      saving = false;
      renderTracks();
    }
  }

  function isAudioFile(file) {
    return file.type.startsWith("audio/") ||
      /\.(mp3|wav|ogg|m4a|aac|flac|aiff|opus|webm)$/i.test(file.name);
  }

  async function attachAudio(id, file) {
    const track = tracks.find(item => item.id === id);
    if (!track || track.hasAudio || !file || saving) return;
    if (!isAudioFile(file)) {
      notify("오디오 파일을 선택해 주세요.", true);
      return;
    }
    saving = true;
    renderTracks();
    try {
      const changed = { ...track, hasAudio: true, fileName: file.name };
      await writeRecords([changed], file);
      tracks = tracks.map(item => item.id === id ? changed : item);
      notify(`「${track.title}」에 음원 파일을 추가했어요. 곡을 선택하거나 재생 버튼을 눌러 주세요.`);
    } catch (error) {
      notify(`음원을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요. (${error?.name ?? "오류"})`, true);
    } finally {
      saving = false;
      renderTracks();
    }
  }

  async function addTrack(event) {
    event.preventDefault();
    if (saving) return;
    const title = $("#track-title").value.trim();
    const artist = $("#track-artist").value.trim();
    const genre = $("#track-genre").value;
    const file = $("#track-file").files[0] ?? null;
    if (!title || !artist || !genre) {
      notify("곡 제목, 아티스트, 장르를 모두 입력해 주세요.", true);
      return;
    }
    if (file && !isAudioFile(file)) {
      notify("오디오 파일을 선택해 주세요.", true);
      return;
    }
    const track = {
      id: createId(), title, artist, genre,
      hasAudio: Boolean(file), fileName: file?.name ?? null,
      buildingId: null, createdAt: Date.now()
    };
    saving = true;
    form.querySelector("button[type=submit]").disabled = true;
    try {
      await writeRecords([track], file);
      tracks.push(track);
      // 곡 추가 후 플레이어 제목과 실제 재생 곡이 서로 달라지는 상황 방지
      unloadAudio();
      selectedTrackId = track.id;
      form.reset();
      $("#add-track").open = false;
      searchInput.value = "";
      renderTracks();
      notify(`「${title}」 추가 완료${file ? " · 음원도 브라우저에 저장했어요." : " · 음원 파일 없이 정보만 저장했어요."}`);
    } catch (error) {
      notify(`곡을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요. (${error?.name ?? "오류"})`, true);
    } finally {
      saving = false;
      form.querySelector("button[type=submit]").disabled = false;
      refreshBuildingControls();
    }
  }

  async function deleteTrack(id) {
    const track = tracks.find(item => item.id === id);
    if (!track || saving || !confirm(`「${track.title}」을(를) 플레이리스트에서 삭제할까요?\n저장된 음원 파일과 건물 연결도 삭제됩니다.`)) return;
    saving = true;
    try {
      await writeRecords([], null, id);
      tracks = tracks.filter(item => item.id !== id);
      if (audio.dataset.trackId === id) unloadAudio();
      if (selectedTrackId === id) selectedTrackId = null;
      if (track.buildingId) syncBuildings([track.buildingId]);
      renderTracks();
      notify(`「${track.title}」을(를) 삭제했어요.`);
    } catch (error) {
      notify(`곡 삭제에 실패했어요: ${error?.message ?? "저장소를 확인해 주세요."}`, true);
    } finally {
      saving = false;
      refreshBuildingControls();
    }
  }

  async function initialize() {
    try {
      database = await openDatabase();
      tracks = await getAllTracks();
      tracks.sort((a, b) => a.createdAt - b.createdAt);
      map.getBuildingTrackAssignments=id=>tracks.filter(track=>track.buildingId===id).map(track=>track.id);
      map.setBuildingTrackAssignments=setBuildingTrackAssignments;
      syncBuildings();
      renderTracks();
      notify(`${tracks.length}곡을 불러왔어요. 곡을 선택해 재생하거나 건물에 배정할 수 있어요.`);
    } catch (error) {
      form.querySelector("button[type=submit]").disabled = true;
      notify("브라우저 저장소(IndexedDB)를 사용할 수 없어요. localhost나 HTTPS에서 다시 열어 주세요.", true);
      console.error("플레이리스트 초기화 오류:", error);
      return;
    }

    form.addEventListener("submit", addTrack);
    searchInput.addEventListener("input", renderTracks);
    sortInput.addEventListener("change", renderTracks);
    list.addEventListener("change", event => {
      if (!event.target.matches(".track-audio-file")) return;
      const input = event.target;
      const id = input.closest(".track-item").dataset.id;
      const file = input.files[0];
      input.value = "";
      void attachAudio(id, file);
    });
    list.addEventListener("click", event => {
      const item = event.target.closest(".track-item");
      if (!item) return;
      if (event.target.closest(".track-delete")) void deleteTrack(item.dataset.id);
      else if (event.target.closest(".track-main") && audio.dataset.trackId !== item.dataset.id) {
        void playTrack(item.dataset.id, false);
      }
    });
    playButton.addEventListener("click", () => {
      if (selectedTrackId) void playTrack(selectedTrackId);
    });
    prevButton.addEventListener("click", () => nextPlayable(-1));
    nextButton.addEventListener("click", () => nextPlayable(1));
    linkButton.addEventListener("click", assignTrack);
    unlinkButton.addEventListener("click", unlinkTrack);
    seek.addEventListener("input", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Number(seek.value) / 1000 * audio.duration;
      }
    });
    for (const name of ["timeupdate", "loadedmetadata", "durationchange", "play", "pause", "emptied"]) {
      audio.addEventListener(name, refreshPlayer);
    }
    audio.addEventListener("ended", () => {
      // 다음 곡이 없으면 종료합니다. 한 곡만 있을 때 무한 반복하지 않아요.
      const playable = orderedTracks().filter(track => track.hasAudio);
      const index = playable.findIndex(track => track.id === selectedTrackId);
      if (index >= 0 && index + 1 < playable.length) {
        void playTrack(playable[index + 1].id, false);
      } else {
        refreshPlayer();
      }
    });
    audio.addEventListener("error", () => notify("음원을 재생할 수 없어요. 파일 형식을 확인해 주세요.", true));
    map.addEventListener("building-select", event => {
      selectedBuildingId = event.detail?.id ?? null;
      const track = selectedBuildingId ? linkedTo(selectedBuildingId) : null;
      if (track) void playTrack(track.id, false); // 건물 클릭 시 연결된 곡 재생
      refreshBuildingControls();
    });
    map.addEventListener("city-layout-change", () => syncBuildings());
    window.addEventListener("pagehide", () => {
      if (activeAudioURL) URL.revokeObjectURL(activeAudioURL);
    });
  }

  void initialize();
})();
