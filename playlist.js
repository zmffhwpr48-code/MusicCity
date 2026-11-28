/* SOUND CITY — 플레이리스트 관리
   곡 정보와 음원 파일은 IndexedDB에 저장합니다.
   건물 연결은 track.buildingId로 보관하고, 지도에 다시 반영합니다.
*/
(() => {
  "use strict";

  const DATABASE_NAME = "sound-city-playlist-v1";
  const DATABASE_VERSION = 2;
  const LIBRARY_STORE = "library";
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
  const defaultGenres = Array.from($("#track-genre").options, option => option.value).filter(Boolean);
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
  let editableTrackId = null;
  let editingLibrary = false;
  let bulkPlaylistId = null;
  const selectedTrackIds = new Set();
  let editingPlaylistId = null;
  const selectedPlaylistTrackIds = new Set();
  let playlistDrag = null;
  let pendingPlaylistOrder = null;
  let activePlaylistTab = "library";

  function setPlaylistTab(view, focus = false) {
    if (!["library", "playlists"].includes(view)) return;
    clearPlaylistDrag();
    activePlaylistTab = view;
    for (const name of ["library", "playlists"]) {
      const selected = name === view;
      const tab = $(`#${name}-tab`);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(`#${name}-view`).hidden = !selected;
      if (selected && focus) tab.focus();
    }
    document.querySelector(".playlist-content").scrollTop = 0;
    refreshBuildingControls();
  }
  let selectedBuildingId = null;
  let activeAudioURL = null;
  let playbackRequest = 0;
  let saving = false;
  let library = { id: "library", playlists: [], selectedPlaylistId: null, links: {}, genres: [] };
  let queue = null;
  let queuePlaylistId = null;
  let shuffle = false;
  let repeat = 0;

  function genreNames() {
    return [...new Set([...defaultGenres, ...(library.genres ?? []), ...tracks.map(track => track.genre)])]
      .filter(name => typeof name === "string" && name.trim());
  }

  function genreLabel(track) {
    return track.genre || "장르 선택되지 않음";
  }

  async function deleteCustomGenre(name) {
    if (saving || !(library.genres ?? []).includes(name)) return;
    const changed = tracks.filter(track => track.genre === name).map(track => ({ ...track, genre: "" }));
    if (!confirm(`「${name}」 장르를 삭제할까요?\n${changed.length}곡의 장르가 ‘장르 선택되지 않음’으로 바뀝니다.`)) return;
    const next = structuredClone(library);
    next.genres = next.genres.filter(genre => genre !== name);
    saving = true;
    renderTracks();
    try {
      await writeRecords(changed, null, null, next);
      library = next;
      const byId = new Map(changed.map(track => [track.id, track]));
      tracks = tracks.map(track => byId.get(track.id) ?? track);
      notify(`「${name}」 장르를 삭제했어요. ${changed.length}곡을 ‘장르 선택되지 않음’으로 변경했어요.`);
      return true;
    } catch (error) {
      const message = "장르를 삭제하지 못했어요. 다시 시도해 주세요.";
      notify(message, true);
      if ($("#edit-track-dialog").open) $("#edit-track-feedback").textContent = message;
      return false;
    } finally {
      saving = false;
      renderTracks();
    }
  }

  function positionGenreMenu(select) {
    const menu = $(`#${select.id}-menu`);
    if (!menu.matches(":popover-open")) return;
    const rect = $(`#${select.id}-trigger`).getBoundingClientRect();
    const width = Math.min(rect.width, window.innerWidth - 16);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const opensBelow = below >= Math.min(280, menu.scrollHeight) || below >= above;
    menu.style.maxHeight = `${Math.max(40, Math.min(280, opensBelow ? below : above))}px`;
    const height = menu.getBoundingClientRect().height;
    menu.style.top = `${opensBelow ? rect.bottom + 4 : Math.max(8, rect.top - height - 4)}px`;
  }

  function refreshGenreOptions() {
    const names = genreNames();
    for (const select of [$("#track-genre"), $("#edit-track-genre")]) {
      const value = names.includes(select.value) ? select.value : "";
      const unassigned = select.id === "edit-track-genre";
      const placeholderText = unassigned ? "장르 선택되지 않음" : "장르 선택";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = placeholderText;
      placeholder.disabled = !unassigned;
      placeholder.defaultSelected = true;
      const options = names.map(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        return option;
      });
      select.replaceChildren(placeholder, ...options);
      select.value = value;
      select.disabled = saving;
      const trigger = $(`#${select.id}-trigger`);
      trigger.disabled = saving;
      $(`#${select.id}-value`).textContent = value || placeholderText;
      const menu = $(`#${select.id}-menu`);
      const rows = (unassigned ? ["", ...names] : names).map(name => {
        const row = document.createElement("div");
        row.className = "genre-option";
        row.classList.toggle("is-current", name === value);
        const choice = button(name || placeholderText, "choose-genre", saving);
        choice.className = "genre-choice";
        choice.title = name || placeholderText;
        choice.setAttribute("aria-pressed", String(name === value));
        choice.addEventListener("click", () => {
          select.value = name;
          menu.hidePopover();
          refreshGenreOptions();
          trigger.focus();
        });
        row.append(choice);
        if ((library.genres ?? []).includes(name)) {
          const remove = button("🗑", "delete-genre", saving);
          remove.className = "genre-remove";
          remove.title = `「${name}」 장르 삭제`;
          remove.setAttribute("aria-label", remove.title);
          remove.addEventListener("click", async () => {
            if (await deleteCustomGenre(name)) menu.querySelector(".genre-choice")?.focus();
          });
          row.append(remove);
        }
        return row;
      });
      const add = button("＋ 장르 직접 추가", "add-genre", saving);
      add.className = "genre-choice genre-add";
      add.addEventListener("click", async () => {
        menu.hidePopover();
        await addCustomGenre(select);
        trigger.focus();
      });
      menu.replaceChildren(...rows, add);
      positionGenreMenu(select);
    }
  }

  async function addCustomGenre(select) {
    if (saving) return;
    const name = prompt("추가할 장르 이름을 입력해 주세요.")?.trim();
    if (!name) return;
    let selectedName = genreNames().find(item => item.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!selectedName) {
      const saved = await editLibrary(next => {
        next.genres ??= [];
        next.genres.push(name);
      });
      if (!saved) {
        const message = "장르를 저장하지 못했어요. 다시 시도해 주세요.";
        notify(message, true);
        if (select.id === "edit-track-genre") $("#edit-track-feedback").textContent = message;
        return;
      }
      selectedName = name;
    }
    select.value = selectedName;
    refreshGenreOptions();
    if (select.id === "edit-track-genre") $("#edit-track-feedback").textContent = "";
  }

  function initializeGenreMenus() {
    for (const select of [$("#track-genre"), $("#edit-track-genre")]) {
      const trigger = $(`#${select.id}-trigger`);
      const menu = $(`#${select.id}-menu`);
      menu.addEventListener("toggle", event => {
        trigger.setAttribute("aria-expanded", String(event.newState === "open"));
        positionGenreMenu(select);
      });
      new ResizeObserver(() => positionGenreMenu(select)).observe(trigger);
    }
    window.addEventListener("resize", () => {
      positionGenreMenu($("#track-genre"));
      positionGenreMenu($("#edit-track-genre"));
    });
    document.querySelector(".playlist-content").addEventListener("scroll", () => {
      for (const select of [$("#track-genre"), $("#edit-track-genre")]) {
        const menu = $(`#${select.id}-menu`);
        if (menu.matches(":popover-open")) menu.hidePopover();
      }
    });
  }

  function currentPlaylist() {
    return library.playlists.find(item => item.id === library.selectedPlaylistId) ?? null;
  }

  function playlistForBuilding(id) {
    return library.playlists.find(item => item.id === library.links[id]) ?? null;
  }

  function connectPlaylist(links, buildingId, playlistId) {
    const affected = [buildingId, ...Object.keys(links).filter(id => links[id] === playlistId)];
    for (const id of affected) delete links[id];
    links[buildingId] = playlistId;
    return affected;
  }

  function uniquePlaylistLinks(links) {
    const lastBuilding = new Map();
    for (const [buildingId, playlistId] of Object.entries(links)) lastBuilding.set(playlistId, buildingId);
    return Object.fromEntries(Object.entries(links).filter(([buildingId, playlistId]) => lastBuilding.get(playlistId) === buildingId));
  }

  function button(label, action, disabled = false) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.dataset.action = action;
    element.disabled = disabled;
    return element;
  }

  function refreshBulkControls() {
    $("#library-bulk-actions").hidden = !editingLibrary;
    $("#library-edit").textContent = editingLibrary ? "완료" : "편집";
    $("#library-edit").setAttribute("aria-pressed", String(editingLibrary));
    $("#library-edit").disabled = saving;
    $("#library-selection-count").textContent = `${selectedTrackIds.size}곡 선택`;
    $("#bulk-playlist").disabled = saving || !library.playlists.length;
    $("#bulk-add").disabled = saving || !selectedTrackIds.size || !bulkPlaylistId;
    $("#bulk-delete").disabled = saving || !selectedTrackIds.size;
  }

  function toggleLibraryTrack(id) {
    if (saving) return;
    if (selectedTrackIds.has(id)) selectedTrackIds.delete(id);
    else selectedTrackIds.add(id);
    for (const row of list.querySelectorAll(".track-item")) {
      const selected = selectedTrackIds.has(row.dataset.id);
      row.classList.toggle("is-selected", selected);
      row.querySelector(".track-select").checked = selected;
      row.querySelector(".track-main").setAttribute("aria-pressed", String(selected));
    }
    refreshBulkControls();
  }

  async function addSelectedTracks() {
    const playlist = library.playlists.find(item => item.id === bulkPlaylistId);
    if (saving || !playlist || !selectedTrackIds.size) return;
    const ids = orderedTracks().filter(track => selectedTrackIds.has(track.id) && !playlist.trackIds.includes(track.id)).map(track => track.id);
    if (!ids.length) {
      notify("선택한 곡은 이미 해당 플레이리스트에 담겨 있어요.");
      return;
    }
    const id = playlist.id;
    if (await editLibrary(next => {
      next.playlists.find(item => item.id === id).trackIds.push(...ids);
      next.selectedPlaylistId = id;
    })) {
      selectedTrackIds.clear();
      editingLibrary = false;
      renderTracks();
      setPlaylistTab("playlists");
      notify(`「${playlist.name}」에 ${ids.length}곡을 담았어요.`);
    }
  }

  function refreshPlaylistEditing() {
    const playlist = currentPlaylist();
    if (editingPlaylistId !== playlist?.id || !playlist?.trackIds.length) {
      editingPlaylistId = null;
      selectedPlaylistTrackIds.clear();
    }
    for (const id of selectedPlaylistTrackIds) {
      if (!playlist.trackIds.includes(id)) selectedPlaylistTrackIds.delete(id);
    }
    const editing = editingPlaylistId !== null;
    $("#playlist-tracks").classList.toggle("is-editing", editing);
    $("#playlist-edit").textContent = editing ? "완료" : "편집";
    $("#playlist-edit").disabled = saving || !playlist?.trackIds.length;
    $("#playlist-edit").setAttribute("aria-pressed", String(editing));
    $("#playlist-bulk-actions").hidden = !editing;
    $("#playlist-selection-count").textContent = `${selectedPlaylistTrackIds.size}곡 선택`;
    $("#playlist-bulk-remove").disabled = saving || !selectedPlaylistTrackIds.size;
  }

  function togglePlaylistTrack(id) {
    if (saving || editingPlaylistId !== currentPlaylist()?.id) return;
    if (selectedPlaylistTrackIds.has(id)) selectedPlaylistTrackIds.delete(id);
    else selectedPlaylistTrackIds.add(id);
    for (const row of $("#playlist-tracks").querySelectorAll(".track-item")) {
      const selected = selectedPlaylistTrackIds.has(row.dataset.id);
      row.classList.toggle("is-selected", selected);
      row.querySelector(".track-select").checked = selected;
      row.querySelector(".track-main").setAttribute("aria-pressed", String(selected));
    }
    refreshPlaylistEditing();
  }

  async function removeSelectedPlaylistTracks() {
    const playlist = currentPlaylist();
    if (saving || !playlist || editingPlaylistId !== playlist.id || !selectedPlaylistTrackIds.size) return;
    const id = playlist.id;
    const removedIds = new Set(selectedPlaylistTrackIds);
    if (await editLibrary(next => {
      const item = next.playlists.find(item => item.id === id);
      item.trackIds = item.trackIds.filter(trackId => !removedIds.has(trackId));
    })) {
      if (queuePlaylistId === id && queue) queue = queue.filter(trackId => !removedIds.has(trackId));
      editingPlaylistId = null;
      selectedPlaylistTrackIds.clear();
      renderTracks();
      notify(`「${playlist.name}」에서 ${removedIds.size}곡을 뺐어요.`);
    }
  }

  function clearPlaylistDrag() {
    const drag = playlistDrag;
    playlistDrag = null;
    if (drag) {
      const list = $("#playlist-tracks");
      const rows = new Map(Array.from(list.querySelectorAll(".track-item"), row => [row.dataset.id, row]));
      drag.originalOrder.forEach((id, index) => {
        const row = rows.get(id);
        if (!row) return;
        list.append(row);
        row.dataset.index = String(index);
        row.querySelector(".track-number").textContent = String(index + 1).padStart(2, "0");
      });
    }
    for (const row of $("#playlist-tracks").querySelectorAll(".track-item")) {
      row.classList.remove("is-dragging");
    }
  }

  function previewPlaylistDrag(clientY) {
    if (!playlistDrag || saving || currentPlaylist()?.id !== playlistDrag.playlistId) return;
    const list = $("#playlist-tracks");
    const rows = Array.from(list.querySelectorAll(".track-item"));
    const source = rows.find(row => row.dataset.id === playlistDrag.trackId);
    if (!source) return;
    const before = rows.find(row => {
      if (row === source) return false;
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    }) ?? null;
    if (source.nextElementSibling !== before) list.insertBefore(source, before);
    playlistDrag.previewOrder = Array.from(list.querySelectorAll(".track-item"), (row, index) => {
      row.dataset.index = String(index);
      row.querySelector(".track-number").textContent = String(index + 1).padStart(2, "0");
      return row.dataset.id;
    });
  }

  async function savePlaylistOrder(playlistId, order, trackId) {
    const playlist = currentPlaylist();
    if (saving || playlist?.id !== playlistId ||
        order.length !== playlist.trackIds.length || new Set(order).size !== order.length ||
        !order.every(id => playlist.trackIds.includes(id)) ||
        order.every((id, index) => id === playlist.trackIds[index])) return;
    pendingPlaylistOrder = { playlistId, order };
    let saved;
    try {
      saved = await editLibrary(next => {
        next.playlists.find(item => item.id === playlistId).trackIds = order;
      });
    } finally {
      pendingPlaylistOrder = null;
      renderPlaylists();
    }
    if (!saved) return;
    if (queuePlaylistId === playlistId && !shuffle && queue) {
      queue = order.filter(id => tracks.some(track => track.id === id && track.hasAudio));
      refreshPlayer();
    }
    const row = Array.from($("#playlist-tracks").querySelectorAll(".track-item")).find(item => item.dataset.id === trackId);
    row?.querySelector(".playlist-drag-handle").focus();
    notify("플레이리스트의 곡 순서를 저장했어요.");
  }

  async function movePlaylistTrack(playlistId, trackId, targetId, after = false) {
    const playlist = currentPlaylist();
    if (saving || playlist?.id !== playlistId || trackId === targetId || !playlist.trackIds.includes(trackId)) return;
    const order = playlist.trackIds.filter(id => id !== trackId);
    const target = targetId === null ? order.length : order.indexOf(targetId);
    if (target < 0) return;
    order.splice(target + (after && targetId !== null ? 1 : 0), 0, trackId);
    await savePlaylistOrder(playlistId, order, trackId);
  }

  function renderPlaylists() {
    clearPlaylistDrag();
    const playlist = currentPlaylist();
    refreshPlaylistEditing();
    $("#named-playlists").hidden = !library.playlists.length;
    $("#no-playlists").hidden = library.playlists.length > 0;
    const select = $("#playlist-select");
    select.replaceChildren(...library.playlists.map(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.name} (${item.trackIds.length})`;
      return option;
    }));
    select.value = playlist?.id ?? "";
    select.disabled = saving;
    $("#playlist-rename").disabled = saving || !playlist;
    $("#playlist-delete").disabled = saving || !playlist;
    $("#playlist-play").disabled = !playlist?.trackIds.some(id => tracks.some(track => track.id === id && track.hasAudio));
    $("#playlist-shuffle").setAttribute("aria-pressed", String(shuffle));
    const repeatText = ["반복 끔", "전체 반복", "한 곡 반복"][repeat];
    $("#playlist-repeat").textContent = repeatText;
    $("#playlist-repeat").setAttribute("aria-label", repeatText);
    $("#playlist-repeat").setAttribute("aria-pressed", String(repeat > 0));
    $("#add-playlist-form button").disabled = saving;
    const bulkSelect = $("#bulk-playlist");
    bulkSelect.replaceChildren(...library.playlists.map(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      return option;
    }));
    if (!library.playlists.some(item => item.id === bulkPlaylistId)) bulkPlaylistId = playlist?.id ?? null;
    if (!library.playlists.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "플레이리스트를 먼저 만들어 주세요";
      bulkSelect.append(option);
    }
    bulkSelect.value = bulkPlaylistId ?? "";
    refreshBulkControls();
    const displayOrder = pendingPlaylistOrder && pendingPlaylistOrder.playlistId === playlist?.id
      ? pendingPlaylistOrder.order : playlist?.trackIds ?? [];
    const rows = displayOrder.map((id, index) => {
      const track = tracks.find(item => item.id === id);
      if (!track) return null;
      const item = template.content.firstElementChild.cloneNode(true);
      item.dataset.id = id;
      item.dataset.index = String(index);
      item.classList.toggle("active", id === selectedTrackId);
      if (editingPlaylistId) {
        const selected = selectedPlaylistTrackIds.has(id);
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "track-select";
        checkbox.checked = selected;
        checkbox.disabled = saving;
        checkbox.setAttribute("aria-label", `${track.title} 선택`);
        item.prepend(checkbox);
        item.classList.toggle("is-selected", selected);
        item.querySelector(".track-main").setAttribute("aria-pressed", String(selected));
      }
      item.querySelector(".track-name").textContent = track.title;
      item.querySelector(".track-meta").textContent = `${track.artist}${track.hasAudio ? "" : " · 음원 없음"}`;
      item.querySelector(".track-number").textContent = String(index + 1).padStart(2, "0");
      item.querySelector(".track-main").setAttribute("aria-label", editingPlaylistId ? `${track.title} 선택` : `${track.title}부터 재생`);
      const handle = button("⠿", "reorder", saving || playlist.trackIds.length < 2);
      handle.className = "playlist-drag-handle";
      handle.draggable = !handle.disabled;
      handle.title = "드래그하면 위치가 바뀌고 놓으면 저장돼요. 위아래 방향키로도 변경할 수 있어요.";
      handle.setAttribute("aria-label", `${track.title} 순서 변경. 드래그 또는 위아래 방향키 사용`);
      item.append(handle);
      return item;
    }).filter(Boolean);
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "playlist-empty";
      empty.textContent = "곡 보관함의 ‘편집’을 눌러 곡을 선택하고 플레이리스트에 담아 보세요.";
      rows.push(empty);
    }
    $("#playlist-tracks").replaceChildren(...rows);
    $("#playlist-links").replaceChildren(...Object.entries(library.links).map(([buildingId, playlistId]) => {
      const linked = library.playlists.find(item => item.id === playlistId);
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${buildingId} · ${linked?.name ?? ""}`;
      item.dataset.buildingId = buildingId;
      const unlink = button("연결 해제", "unlink", saving);
      unlink.setAttribute("aria-label", `${buildingId} 플레이리스트 연결 해제`);
      item.append(text, unlink);
      return item;
    }));
  }

  async function editLibrary(change) {
    if (saving) return;
    const next = structuredClone(library);
    change(next);
    saving = true;
    renderTracks();
    try {
      await writeRecords([], null, null, next);
      const affected = [...Object.keys(library.links), ...Object.keys(next.links)];
      library = next;
      syncBuildings(affected);
      return true;
    } catch (error) {
      notify(`플레이리스트 저장 실패: ${error?.message ?? "저장 공간을 확인해 주세요."}`, true);
      return false;
    } finally {
      saving = false;
      renderTracks();
    }
  }

  async function editPlaylist(change) {
    const id = currentPlaylist()?.id;
    if (!id) return;
    return editLibrary(next => change(next.playlists.find(item => item.id === id)));
  }

  function playQueue(ids, startId = ids[0], playlistId = null) {
    const playable = ids.filter(id => tracks.some(track => track.id === id && track.hasAudio));
    if (!playable.length) {
      notify("재생 가능한 음원이 없어요. 곡 보관함에서 음원을 추가해 주세요.", true);
      return;
    }
    queue = [...playable];
    queuePlaylistId = playlistId;
    if (shuffle) {
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      const index = queue.indexOf(startId);
      if (index >= 0) queue.unshift(...queue.splice(index, 1));
    }
    void playTrack(queue.includes(startId) ? startId : queue[0], false);
  }

  function playbackTracks() {
    if (queue === null) return orderedTracks().filter(track => track.hasAudio);
    return queue.map(id => tracks.find(track => track.id === id && track.hasAudio)).filter(Boolean);
  }

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
        if (!db.objectStoreNames.contains(LIBRARY_STORE)) db.createObjectStore(LIBRARY_STORE, { keyPath: "id" });
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

  function getLibrary() {
    return new Promise((resolve, reject) => {
      const request = database.transaction(LIBRARY_STORE, "readonly").objectStore(LIBRARY_STORE).get("library");
      request.onsuccess = () => resolve(request.result ?? library);
      request.onerror = () => reject(request.error);
    });
  }

  // Promise는 트랜잭션이 완료/실패할 때만 처리합니다. 메타데이터와 음원을 원자적으로 저장합니다.
  function writeRecords(changedTracks, newFile = null, removedId = null, nextLibrary = library) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE, FILES_STORE, LIBRARY_STORE], "readwrite");
      transaction.objectStore(LIBRARY_STORE).put(nextLibrary);
      const trackStore = transaction.objectStore(TRACKS_STORE);
      const fileStore = transaction.objectStore(FILES_STORE);
      for (const track of changedTracks) trackStore.put(track);
      if (newFile) fileStore.put({ id: changedTracks[0].id, blob: newFile });
      if (removedId) {
        const removedIds = Array.isArray(removedId) ? removedId : [removedId];
        for (const id of removedIds) {
          trackStore.delete(id);
          fileStore.delete(id);
        }
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
    document.querySelector(".player-panel").hidden = !audio.dataset.trackId || !audio.hasAttribute("src");
    map.setSelectedTrack?.(selectedTrackId);
    const track = currentTrack();
    $("#now-track").textContent = track?.title ?? "재생할 곡을 선택해 주세요";
    $("#now-artist").textContent = track
      ? `${track.artist} · ${genreLabel(track)}${track.hasAudio ? "" : " · 음원 없음"}`
      : "직접 추가한 음원을 여기서 재생할 수 있어요";

    const playable = Boolean(track?.hasAudio || (!track && currentPlaylist()?.trackIds.some(id => tracks.some(item => item.id === id && item.hasAudio))));
    playButton.disabled = !playable;
    prevButton.disabled = !playbackTracks().length;
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
    linkButton.hidden = activePlaylistTab !== "library";
    $("#link-playlist").hidden = activePlaylistTab !== "playlists";
    const linked = selectedBuildingId ? linkedTo(selectedBuildingId) : null;
    const linkedPlaylist = selectedBuildingId ? playlistForBuilding(selectedBuildingId) : null;
    const track = currentTrack();
    $("#chosen-building").textContent = selectedBuildingId
      ? `선택한 건물: ${selectedBuildingId}`
      : "지도에서 건물을 선택해 주세요";
    $("#building-track").textContent = linkedPlaylist
      ? `연결된 플레이리스트: ${linkedPlaylist.name} (${linkedPlaylist.trackIds.length}곡)`
      : linked
      ? `연결된 곡: ${linked.title} — ${linked.artist}`
      : selectedBuildingId ? "연결된 곡이 없어요" : "건물을 선택하면 곡을 배정할 수 있어요";

    linkButton.disabled = saving || !track || !selectedBuildingId || linked?.id === track.id;
    unlinkButton.disabled = saving || !(linked || linkedPlaylist) || !selectedBuildingId;
    linkButton.textContent = track ? `「${track.title}」 배정` : "선택한 곡 배정";
    const playlist = currentPlaylist();
    $("#link-playlist").disabled = saving || !playlist || !selectedBuildingId || linkedPlaylist?.id === playlist.id;
    $("#link-playlist").textContent = playlist ? `「${playlist.name}」 플레이리스트 배정` : "선택한 플레이리스트 배정";
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
    list.classList.toggle("is-editing", editingLibrary);

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
      desc.textContent = tracks.length ? "다른 제목이나 아티스트로 검색해 보세요" : "위의 ‘추가하기 → 곡 추가’로 첫 곡을 넣어 보세요";
      empty.append(icon, title, desc);
      fragment.append(empty);
    }

    filtered.forEach((track, index) => {
      const item = template.content.firstElementChild.cloneNode(true);
      item.dataset.id = track.id;
      item.classList.toggle("active", track.id === selectedTrackId);
      const main = item.querySelector(".track-main");
      main.setAttribute("aria-label", `${track.title} ${track.artist} ${editingLibrary ? "선택" : track.hasAudio ? "재생" : "선택"}`);
      main.setAttribute("aria-pressed", String(editingLibrary ? selectedTrackIds.has(track.id) : track.id === selectedTrackId));
      item.classList.toggle("is-selected", editingLibrary && selectedTrackIds.has(track.id));
      if (editingLibrary) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "track-select";
        checkbox.checked = selectedTrackIds.has(track.id);
        checkbox.disabled = saving;
        checkbox.setAttribute("aria-label", `${track.title} 선택`);
        item.prepend(checkbox);
      }
      item.querySelector(".track-name").textContent = track.title;
      item.querySelector(".track-meta").textContent =
        `${track.artist} · ${genreLabel(track)}${track.buildingId ? " · 🏙 연결됨" : ""}${track.hasAudio ? "" : " · 음원 없음"}`;
      item.querySelector(".track-number").textContent = String(index + 1).padStart(2, "0");
      const actions = document.createElement("div");
      actions.className = "track-library-actions";
      const edit = button("정보 수정", "edit", saving);
      edit.className = "track-edit";
      edit.title = "정보 수정";
      const editIcon = document.createElement("span");
      editIcon.className = "track-edit-icon";
      editIcon.textContent = "✎";
      editIcon.setAttribute("aria-hidden", "true");
      const editLabel = document.createElement("span");
      editLabel.className = "track-edit-label";
      editLabel.textContent = "정보 수정";
      edit.replaceChildren(editIcon, editLabel);
      edit.hidden = track.id !== editableTrackId || track.id !== selectedTrackId;
      edit.setAttribute("aria-label", `${track.title} 정보 수정`);
      actions.append(edit);
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
        actions.append(label);
      }
      item.append(actions);
      fragment.append(item);
    });
    list.replaceChildren(fragment);
    refreshPlayer();
    refreshBuildingControls();
    refreshGenreOptions();
    renderPlaylists();
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
    syncBuildings(Object.keys(library.links));
    renderTracks();
    if (track.buildingId) map.focusBuilding?.(track.buildingId);

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
    const playable = playbackTracks();
    if (!playable.length) return;
    const position = playable.findIndex(track => track.id === selectedTrackId);
    if (direction < 0 && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    let next = position < 0 ? 0 : position + direction;
    if (next < 0) {
      audio.currentTime = 0;
      return;
    }
    if (next >= playable.length) {
      if (repeat !== 1) {
        audio.pause();
        refreshPlayer();
        return;
      }
      next = 0;
    }
    void playTrack(playable[next].id, false);
  }

  function syncBuildings(ids = null) {
    const buildingIds = ids ?? [...tracks.map(track => track.buildingId).filter(Boolean), ...Object.keys(library.links)];
    const assignments = Object.fromEntries([...new Set(buildingIds)]
      .map(id => {
        const playlist = playlistForBuilding(id);
        const playlistTrackId = playlist?.trackIds.includes(selectedTrackId) ? selectedTrackId : playlist?.trackIds[0];
        return [id, playlist ? (playlistTrackId ?? `playlist:${playlist.id}`) : linkedTo(id)?.id ?? null];
      }));
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
    const nextLibrary = structuredClone(library);
    delete nextLibrary.links[buildingId];
    const playlist = library.playlists.find(item => trackIds.includes(`playlist:${item.id}`));
    const affectedPlaylistBuildings = playlist ? connectPlaylist(nextLibrary.links, buildingId, playlist.id) : [];
    const wanted=new Set(trackIds.filter(id => tracks.some(track => track.id === id)));
    const affected=tracks.filter(track=>track.buildingId===buildingId || wanted.has(track.id));
    const changed=affected.map(track=>({...track,buildingId:wanted.has(track.id)?buildingId:null}));
    const affectedBuildings=[buildingId,...affectedPlaylistBuildings,...affected.map(track=>track.buildingId).filter(Boolean)];
    saving=true;
    refreshBuildingControls();
    try {
      await writeRecords(changed, null, null, nextLibrary);
      library = nextLibrary;
      const byId=new Map(changed.map(track=>[track.id,track]));
      tracks=tracks.map(track=>byId.get(track.id)??track);
      syncBuildings(affectedBuildings);
      return playlist ? (playlist.trackIds.length ? [...playlist.trackIds] : [`playlist:${playlist.id}`]) : getBuildingTrackAssignments(buildingId);
    } finally {
      saving=false;
      renderTracks();
    }
  }

  function getBuildingTrackAssignments(buildingId) {
    const playlist = playlistForBuilding(buildingId);
    return playlist ? [`playlist:${playlist.id}`] : tracks.filter(track => track.buildingId === buildingId).map(track => track.id);
  }

  async function assignPlaylist() {
    const playlist = currentPlaylist();
    const buildingId = selectedBuildingId;
    if (!playlist || !buildingId || saving || !map.getBuilding?.(buildingId)) return;
    const next = structuredClone(library);
    const affectedBuildings = connectPlaylist(next.links, buildingId, playlist.id);
    const changed = tracks.filter(track => track.buildingId === buildingId).map(track => ({ ...track, buildingId: null }));
    saving = true;
    renderTracks();
    try {
      await writeRecords(changed, null, null, next);
      library = next;
      const changedIds = new Set(changed.map(track => track.id));
      tracks = tracks.map(track => changedIds.has(track.id) ? { ...track, buildingId: null } : track);
      syncBuildings(affectedBuildings);
      notify(`「${playlist.name}」 플레이리스트를 이 건물에 연결했어요.`);
    } catch (error) {
      notify(`플레이리스트 연결 실패: ${error?.message}`, true);
    } finally {
      saving = false;
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
    const nextLibrary = structuredClone(library);
    delete nextLibrary.links[buildingId];
    saving = true;
    refreshBuildingControls();
    try {
      await writeRecords([...changed.values()], null, null, nextLibrary);
      library = nextLibrary;
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
    if (!buildingId || saving) return;
    try {
      await setBuildingTrackAssignments(buildingId, []);
      notify("건물의 음악 연결을 해제했어요.");
    } catch (error) {
      notify(`연결 해제 저장 실패: ${error?.message ?? "저장소를 확인해 주세요."}`, true);
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

  function openTrackEditor(id) {
    if (saving) {
      notify("저장이 끝난 뒤 다시 시도해 주세요.", true);
      return;
    }
    const track = tracks.find(item => item.id === id);
    if (!track) return;
    const dialog = $("#edit-track-dialog");
    dialog.dataset.trackId = id;
    $("#edit-track-title").value = track.title;
    $("#edit-track-artist").value = track.artist;
    const genre = $("#edit-track-genre");
    genre.value = track.genre ?? "";
    refreshGenreOptions();
    $("#edit-track-feedback").textContent = "";
    dialog.showModal();
  }

  async function saveTrackInfo(event) {
    event.preventDefault();
    const feedback = $("#edit-track-feedback");
    if (saving) {
      feedback.textContent = "다른 저장 작업이 끝난 뒤 다시 시도해 주세요.";
      return;
    }
    const dialog = $("#edit-track-dialog");
    const track = tracks.find(item => item.id === dialog.dataset.trackId);
    if (!track) {
      feedback.textContent = "수정할 곡을 찾을 수 없어요.";
      return;
    }
    const title = $("#edit-track-title").value.trim();
    const artist = $("#edit-track-artist").value.trim();
    const genre = $("#edit-track-genre").value;
    if (!title || !artist) {
      feedback.textContent = "곡 제목과 아티스트를 입력해 주세요.";
      return;
    }
    const changed = { ...track, title, artist, genre };
    const saveButton = $("#edit-track-form button[type=submit]");
    saving = true;
    saveButton.disabled = true;
    $("#edit-track-cancel").disabled = true;
    feedback.textContent = "저장 중이에요.";
    try {
      await writeRecords([changed]);
      tracks = tracks.map(item => item.id === track.id ? changed : item);
      dialog.close();
      notify(`「${title}」의 곡 정보를 수정했어요.`);
    } catch (error) {
      feedback.textContent = `저장하지 못했어요. 다시 시도해 주세요. (${error?.name ?? "오류"})`;
    } finally {
      saving = false;
      saveButton.disabled = false;
      $("#edit-track-cancel").disabled = false;
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
      queue = null;
      selectedTrackId = track.id;
      form.reset();
      $("#add-track").open = false;
      $("#add-menu").open = false;
      setPlaylistTab("library");
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

  async function deleteTracks(ids) {
    const wanted = new Set(ids);
    const removed = tracks.filter(track => wanted.has(track.id));
    if (!removed.length || saving) return;
    const description = removed.length === 1 ? `「${removed[0].title}」` : `선택한 ${removed.length}곡`;
    if (!confirm(`${description}을(를) 곡 보관함에서 삭제할까요?\n저장된 음원과 모든 플레이리스트의 해당 곡, 건물 연결도 함께 삭제돼요.`)) return;
    saving = true;
    renderTracks();
    try {
      const nextLibrary = structuredClone(library);
      for (const playlist of nextLibrary.playlists) playlist.trackIds = playlist.trackIds.filter(trackId => !wanted.has(trackId));
      await writeRecords([], null, removed.map(track => track.id), nextLibrary);
      library = nextLibrary;
      tracks = tracks.filter(item => !wanted.has(item.id));
      if (queue) queue = queue.filter(trackId => !wanted.has(trackId));
      if (wanted.has(audio.dataset.trackId)) unloadAudio();
      if (wanted.has(selectedTrackId)) selectedTrackId = null;
      if (wanted.has(editableTrackId)) editableTrackId = null;
      for (const id of wanted) selectedTrackIds.delete(id);
      editingLibrary = false;
      syncBuildings([...Object.keys(library.links), ...removed.map(track => track.buildingId)].filter(Boolean));
      notify(`${description}을(를) 삭제했어요.`);
    } catch (error) {
      notify(`곡 삭제에 실패했어요: ${error?.message ?? "저장소를 확인해 주세요."}`, true);
    } finally {
      saving = false;
      renderTracks();
    }
  }

  async function initialize() {
    try {
      database = await openDatabase();
      tracks = await getAllTracks();
      library = await getLibrary();
      const previousBuildingIds = Object.keys(library.links);
      const uniqueLinks = uniquePlaylistLinks(library.links);
      if (Object.keys(uniqueLinks).length !== previousBuildingIds.length) {
        const next = { ...library, links: uniqueLinks };
        await writeRecords([], null, null, next);
        library = next;
      }
      if (!currentPlaylist()) library.selectedPlaylistId = library.playlists[0]?.id ?? null;
      tracks.sort((a, b) => a.createdAt - b.createdAt);
      map.getBuildingTrackAssignments=getBuildingTrackAssignments;
      map.setBuildingTrackAssignments=setBuildingTrackAssignments;
      syncBuildings([...previousBuildingIds, ...tracks.map(track => track.buildingId).filter(Boolean)]);
      renderTracks();
      notify(`${tracks.length}곡을 불러왔어요. 곡을 선택해 재생하거나 건물에 배정할 수 있어요.`);
    } catch (error) {
      form.querySelector("button[type=submit]").disabled = true;
      notify("브라우저 저장소(IndexedDB)를 사용할 수 없어요. localhost나 HTTPS에서 다시 열어 주세요.", true);
      console.error("플레이리스트 초기화 오류:", error);
      return;
    }

    form.addEventListener("submit", addTrack);
    initializeGenreMenus();
    document.querySelector(".playlist-tabs").addEventListener("click", event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) setPlaylistTab(tab.dataset.view);
    });
    document.querySelector(".playlist-tabs").addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const view = event.key === "Home" ? "library" : event.key === "End" ? "playlists"
        : activePlaylistTab === "library" ? "playlists" : "library";
      setPlaylistTab(view, true);
    });
    $("#library-edit").addEventListener("click", () => {
      if (saving) return;
      editingLibrary = !editingLibrary;
      editableTrackId = null;
      selectedTrackIds.clear();
      bulkPlaylistId = currentPlaylist()?.id ?? null;
      renderTracks();
    });
    $("#bulk-playlist").addEventListener("change", event => {
      bulkPlaylistId = event.target.value || null;
      refreshBulkControls();
    });
    $("#bulk-add").addEventListener("click", addSelectedTracks);
    $("#bulk-delete").addEventListener("click", () => { void deleteTracks([...selectedTrackIds]); });
    document.addEventListener("click", event => {
      if (!editableTrackId || event.target.closest(".track-main, .track-edit, #edit-track-dialog")) return;
      editableTrackId = null;
      list.querySelectorAll(".track-edit").forEach(button => { button.hidden = true; });
    }, true);
    $("#edit-track-form").addEventListener("submit", saveTrackInfo);
    $("#edit-track-cancel").addEventListener("click", () => {
      if (!saving) $("#edit-track-dialog").close();
    });
    $("#edit-track-dialog").addEventListener("cancel", event => {
      if (saving) event.preventDefault();
    });
    $("#add-playlist-form").addEventListener("submit", async event => {
      event.preventDefault();
      const name = $("#playlist-name").value.trim();
      if (!name || saving) return;
      const id = createId();
      if (await editLibrary(next => {
        next.playlists.push({ id, name, trackIds: [] });
        next.selectedPlaylistId = id;
      })) {
        $("#add-playlist-form").reset();
        $("#add-playlist").open = false;
        $("#add-menu").open = false;
        setPlaylistTab("playlists");
        notify(`「${name}」 플레이리스트를 만들었어요. 곡 보관함에서 곡을 담아 주세요.`);
      }
    });
    $("#playlist-select").addEventListener("change", event => {
      const id = event.target.value;
      void editLibrary(next => { next.selectedPlaylistId = id; });
    });
    $("#playlist-rename").addEventListener("click", () => {
      const playlist = currentPlaylist();
      if (!playlist || saving) return;
      const name = prompt("새 플레이리스트 이름", playlist.name)?.trim();
      if (name) void editPlaylist(item => { item.name = name; });
    });
    $("#playlist-delete").addEventListener("click", () => {
      const playlist = currentPlaylist();
      if (!playlist || saving || !confirm(`「${playlist.name}」 플레이리스트를 삭제할까요? 곡 보관함의 곡은 유지돼요.`)) return;
      void editLibrary(next => {
        next.playlists = next.playlists.filter(item => item.id !== playlist.id);
        next.selectedPlaylistId = next.playlists[0]?.id ?? null;
        for (const id of Object.keys(next.links)) {
          if (next.links[id] === playlist.id) delete next.links[id];
        }
      });
    });
    $("#playlist-edit").addEventListener("click", () => {
      if (saving || !currentPlaylist()?.trackIds.length) return;
      editingPlaylistId = editingPlaylistId ? null : currentPlaylist().id;
      selectedPlaylistTrackIds.clear();
      renderPlaylists();
    });
    $("#playlist-bulk-remove").addEventListener("click", removeSelectedPlaylistTracks);
    const playlistList = $("#playlist-tracks");
    playlistList.addEventListener("dragstart", event => {
      const handle = event.target.closest(".playlist-drag-handle");
      const playlist = currentPlaylist();
      if (!handle || handle.disabled || saving || !playlist) {
        event.preventDefault();
        return;
      }
      const row = handle.closest(".track-item");
      playlistDrag = {
        playlistId: playlist.id,
        trackId: row.dataset.id,
        originalOrder: [...playlist.trackIds],
        previewOrder: [...playlist.trackIds]
      };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.id);
      event.dataTransfer.setDragImage(row, 20, row.offsetHeight / 2);
      row.classList.add("is-dragging");
    });
    playlistList.addEventListener("dragover", event => {
      if (!playlistDrag || saving || currentPlaylist()?.id !== playlistDrag.playlistId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      previewPlaylistDrag(event.clientY);
    });
    playlistList.addEventListener("drop", event => {
      if (!playlistDrag) return;
      event.preventDefault();
      previewPlaylistDrag(event.clientY);
      const drag = playlistDrag;
      clearPlaylistDrag();
      void savePlaylistOrder(drag.playlistId, drag.previewOrder, drag.trackId);
    });
    playlistList.addEventListener("dragend", clearPlaylistDrag);
    playlistList.addEventListener("keydown", event => {
      const handle = event.target.closest(".playlist-drag-handle");
      const playlist = currentPlaylist();
      if (!handle || handle.disabled || !playlist || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const id = handle.closest(".track-item").dataset.id;
      const index = playlist.trackIds.indexOf(id);
      const next = index + (event.key === "ArrowUp" ? -1 : 1);
      if (next >= 0 && next < playlist.trackIds.length) {
        void movePlaylistTrack(playlist.id, id, playlist.trackIds[next], event.key === "ArrowDown");
      }
    });
    $("#playlist-tracks").addEventListener("change", event => {
      if (editingPlaylistId && event.target.matches(".track-select")) {
        togglePlaylistTrack(event.target.closest(".track-item").dataset.id);
      }
    });
    $("#playlist-tracks").addEventListener("click", event => {
      const row = event.target.closest(".track-item");
      if (!row) return;
      const playlist = currentPlaylist();
      if (!playlist) return;
      if (editingPlaylistId) {
        if (event.target.closest(".track-main")) togglePlaylistTrack(row.dataset.id);
        return;
      }
      if (event.target.closest(".track-main")) {
        editableTrackId = row.dataset.id;
        if (audio.dataset.trackId !== row.dataset.id) playQueue(playlist.trackIds, row.dataset.id, playlist.id);
        else renderTracks();
        return;
      }
    });
    $("#playlist-play").addEventListener("click", () => {
      const playlist = currentPlaylist();
      if (playlist) playQueue(playlist.trackIds, playlist.trackIds[0], playlist.id);
    });
    $("#playlist-shuffle").addEventListener("click", () => {
      shuffle = !shuffle;
      renderPlaylists();
    });
    $("#playlist-repeat").addEventListener("click", () => {
      repeat = (repeat + 1) % 3;
      renderPlaylists();
    });
    $("#link-playlist").addEventListener("click", assignPlaylist);
    $("#playlist-links").addEventListener("click", event => {
      const row = event.target.closest("[data-building-id]");
      if (row && event.target.closest("button")) {
        const id = row.dataset.buildingId;
        void editLibrary(next => { delete next.links[id]; });
      }
    });
    searchInput.addEventListener("input", renderTracks);
    sortInput.addEventListener("change", renderTracks);
    list.addEventListener("change", event => {
      if (editingLibrary && event.target.matches(".track-select")) {
        toggleLibraryTrack(event.target.closest(".track-item").dataset.id);
        return;
      }
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
      if (editingLibrary) {
        if (event.target.closest(".track-main")) toggleLibraryTrack(item.dataset.id);
        return;
      }
      if (event.target.closest(".track-edit")) openTrackEditor(item.dataset.id);
      else if (event.target.closest(".track-main")) {
        editableTrackId = item.dataset.id;
        if (audio.dataset.trackId !== item.dataset.id) {
          queue = null;
          void playTrack(item.dataset.id, false);
        }
        else {
          renderTracks();
          const track=tracks.find(track=>track.id===item.dataset.id);
          if (track?.buildingId) map.focusBuilding?.(track.buildingId);
        }
      }
    });
    playButton.addEventListener("click", () => {
      if (selectedTrackId) void playTrack(selectedTrackId);
      else if (currentPlaylist()) {
        const playlist = currentPlaylist();
        playQueue(playlist.trackIds, playlist.trackIds[0], playlist.id);
      }
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
      const playable = playbackTracks();
      const index = playable.findIndex(track => track.id === selectedTrackId);
      if (repeat === 2 && index >= 0) {
        audio.currentTime = 0;
        void playTrack(selectedTrackId, false);
        return;
      }
      nextPlayable(1);
    });
    audio.addEventListener("error", () => notify("음원을 재생할 수 없어요. 파일 형식을 확인해 주세요.", true));
    map.addEventListener("building-select", event => {
      selectedBuildingId = event.detail?.id ?? null;
      const playlist = playlistForBuilding(selectedBuildingId);
      if (playlist) {
        if (!saving) library.selectedPlaylistId = playlist.id;
        setPlaylistTab("playlists");
        renderTracks();
        playQueue(playlist.trackIds, playlist.trackIds[0], playlist.id);
        return;
      }
      const track = selectedBuildingId ? linkedTo(selectedBuildingId) : null;
      if (track) {
        queue = null;
        void playTrack(track.id, false);
      }
      refreshBuildingControls();
    });
    map.addEventListener("city-layout-change", () => syncBuildings());
    window.addEventListener("pagehide", () => {
      if (activeAudioURL) URL.revokeObjectURL(activeAudioURL);
    });
  }

  void initialize();
})();
