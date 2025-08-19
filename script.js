// ===== Global State & Elements =====
let allEpisodes = []; //current show's episodes
let allShows = [];    //all shows fetched
let onShowsPage = true; // are we on the shows page?
let selectedShowId = null;            // current show id
let currentView = "shows"; // default view on first load



const rootElem = document.getElementById("root");
const showSelect = document.getElementById("show-select");
const searchBox = document.getElementById("show-search");
const episodeSelect = document.getElementById("episode-select");
const showsListing = document.getElementById("shows-listing");
const backToShowsBtn = document.getElementById("back-to-shows");
const showSearchCount = document.getElementById("show-search-count");
const episodeSearchCount = document.getElementById("episode-search-count");
const searchCount = document.getElementById("search-count");
const episodeSearchBox = document.getElementById("episode-search-box");
//caches for shows and episodes
let showsListPromise = null;                     // Promise for /shows
const episodesCache = new Map();                 // showId -> episodes array
const inFlightEpisodeFetch = new Map();          // showId -> Promise

// ===== Setup =====
window.onload = setup;


window.addEventListener("pageshow", (event) => {
  // Detect if page was restored from bfcache
  if (event.persisted || performance.getEntriesByType("navigation")[0].type === "back_forward") {
    currentView = "shows";
    onShowsPage = true;
    showShowsView(); // Rehydrate show page UI
  }
});

function updateUIVisibility() {
  const showControls = document.getElementById("show-controls");
  const episodeControls = document.getElementById("episode-controls");
  const backButton = document.getElementById("back-to-shows");

  if (currentView === "shows") {
    showControls.style.display = "block";
    episodeControls.style.display = "none";
    backButton.style.display = "none";
  } else if (currentView === "episodes") {
    showControls.style.display = "none";
    episodeControls.style.display = "flex";
    backButton.style.display = "inline-block";
  }
  showControls.classList.toggle("hidden", currentView !== "shows");
  episodeControls.classList.toggle("hidden", currentView !== "episodes");
}
function goToEpisodesPage() {
  currentView = "episodes";
  updateUIVisibility();
  // Load episodes...
}
function goToShowsPage() {
  currentView = "shows";
  updateUIVisibility();
  // Load shows...
}

function setup() {
  showLoadingMessage("Loading shows…");
  fetchShowsOnce()
    .then((shows) => {
      // Sort shows alphabetically, case-insensitive
      shows.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "accent" })
      );
      allShows = shows;
      hideMessage();
      populateShowSelect(allShows);
      displayshows(shows);
      onShowsPage = true;
      setupEventListeners();
    })
    .catch((err) => {
      showErrorMessage("Failed to load shows. Please try again later.");
      console.error(err);
    });
}
// Wire up controls
showSelect.addEventListener("change", async () => {
  const selectedId = showSelect.value;
  if (selectedId === "") {
    displayshows(allShows);
    updateSearchCount(0, 0, "show"); // Clear count
    return;
  }
  const selected = allShows.find((s) => String(s.id) === selectedId);
 if (selected) {
  displayshows([selected]);
  updateSearchCount(1, allShows.length, "show", selected.name.toLowerCase());
}});

if (episodeSearchBox) {
  episodeSearchBox.addEventListener("input", debounce(() => {
    const term = episodeSearchBox.value.toLowerCase();
    const filtered = filterEpisodes(allEpisodes, term);
    displayEpisodes(filtered);
    updateSearchCount(filtered.length, allEpisodes.length, "episode", term);
  }, 300));
}

episodeSelect.addEventListener("change", () => {
  const selectedId = episodeSelect.value;
  const term = episodeSearchBox?.value?.toLowerCase() || "";
  const base = filterEpisodes(allEpisodes, term);

  if (selectedId === "all") {
    displayEpisodes(base); // Count handled inside
  } else {
    const selectedEpisode = base.find((ep) => ep.id.toString() === selectedId);
    displayEpisodes(selectedEpisode ? [selectedEpisode] : []);
  }
});
// ===== Fetch Helpers (single-fetch per URL) =====
function fetchShowsOnce() {
  if (showsListPromise) return showsListPromise;
  showsListPromise = fetch("https://api.tvmaze.com/shows")
    .then((res) => {
      if (!res.ok) throw new Error(`Shows HTTP ${res.status}`);
      return res.json();
    });
  return showsListPromise;
}

function fetchEpisodesOnce(showId) {
  if (episodesCache.has(showId)) {
    return Promise.resolve(episodesCache.get(showId));
  }
  if (inFlightEpisodeFetch.has(showId)) {
    return inFlightEpisodeFetch.get(showId);
  }
  const p = fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((res) => {
      if (!res.ok) throw new Error(`Episodes HTTP ${res.status}`);
      return res.json();
    })
    .then((eps) => {
      episodesCache.set(showId, eps);
      inFlightEpisodeFetch.delete(showId);
      return eps;
    })
    .catch((err) => {
      inFlightEpisodeFetch.delete(showId);
      throw err;
    });
  inFlightEpisodeFetch.set(showId, p);
  return p;
}

function loadEpisodesForShow(showId) {
  fetchEpisodesOnce(showId).then((episodes) => {
    allEpisodes = episodes;
    hideMessage();
    toggleEpisodeControls(true);

    // ✅ Explicitly show controls
    if (episodeSearchBox) episodeSearchBox.style.display = "block";
    if (episodeSelect) episodeSelect.style.display = "block";

    populateEpisodeSelect(allEpisodes);
    backToShowsBtn.style.display = "inline";

    const term = episodeSearchBox?.value?.toLowerCase() || "";
    const filtered = filterEpisodes(allEpisodes, term);
    displayEpisodes(filtered);
  }).catch((err) => {
    console.error("Failed to load episodes:", err);
    showMessage("Could not load episodes. Please try again.");
  });
}
function displayEpisodes(episodes) {
  const root = document.getElementById("root");
  root.innerHTML = "";

  episodes.forEach((episode) => {
    const card = createEpisodeCard(episode);
    root.appendChild(card);
  });
}

function displayAllShows() {
  const root = document.getElementById("root");
  root.className = "grid-layout"; // Ensure grid layout is active

  const shows = getAllShows(); // Replace with your actual data source
  root.innerHTML = ""; // Clear previous content

  shows.forEach(show => {
    const card = createShowCard(show);
    rootElem.appendChild(card);
  });
}

function displayshows(shows) {
  if (rootElem) {
    rootElem.className = "grid-layout";
    rootElem.innerHTML = "";
  }

  if (onShowsPage) {
    if (showSelect) showSelect.style.display = "block";
    if (searchBox) searchBox.style.display = "block";
  }

  shows.forEach((show) => {
    const card = createShowCard(show);
    rootElem.appendChild(card);
  });

}
function createShowCard(show) {
  const card = document.createElement("article");
  card.className = "show-card";
  card.setAttribute("aria-label", `Show: ${show.name}`);

  const title = document.createElement("h2");
  title.textContent = show.name;
  title.classList.add("clickable");
  title.addEventListener("click", () => {
    selectedShowId = show.id;
    currentView = "episodes";
    updateUIVisibility();
    showLoadingMessage("Loading episodes…");
    loadEpisodesForShow(show.id);
  });

  const img = document.createElement("img");
  img.src = show.image?.medium || "fallback.jpg";
  img.alt = show.name;

  const summary = document.createElement("div");
  summary.className = "summary";
  summary.innerHTML = show.summary || "No summary available.";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <strong>Genres:</strong> ${show.genres.join(", ")}<br>
    <strong>Status:</strong> ${show.status}<br>
    <strong>Rating:</strong> ${show.rating?.average || "N/A"}<br>
    <strong>Runtime:</strong> ${show.runtime || "N/A"} mins
  `;

  card.append(title, img, summary, meta);
  return card;
}
function updateSearchCount(showing, total, type, term = "") {
  
  const showCountElem = document.getElementById("show-search-count");
  const episodeCountElem = document.getElementById("episode-search-count");

  const label = term ? `"${term}"` : "";
  const message = `Showing ${showing} / ${total} ${type}s ${label ? `matching ${label}` : ""}`;

  if (type === "show" && showCountElem) {
    showCountElem.textContent = message;
  } else if (type === "episode" && episodeCountElem) {
    episodeCountElem.textContent = message;
  }
}
function showShowsView() {
  currentView = "shows";
  onShowsPage = true;
  allEpisodes = [];
  rootElem.innerHTML = "";
  rootElem.className = "grid-layout";

  document.body.classList.toggle("on-shows-page", true);
  document.body.classList.toggle("on-episodes-page", false);

  if (showsListing) showsListing.style.display = "block";
  if (showSelect) showSelect.style.display = "block";
  if (searchBox) searchBox.value = "";

  if (episodeSelect) {
    episodeSelect.value = "all";
    episodeSelect.innerHTML = "";
    episodeSelect.style.display = "none"; // ✅ Hide
  }

  if (episodeSearchBox) {
    episodeSearchBox.value = "";
    episodeSearchBox.style.display = "none"; // ✅ Hide
  }

  toggleEpisodeControls(false);
  populateShowSelect(allShows);
  displayshows(allShows);
  if (backToShowsBtn) backToShowsBtn.style.display = "none";
  updateUIVisibility(); // ✅ Ensure visibility toggles are applied
}


function syncShowSelect() {
  if (selectedShowId) {
    showSelect.value = String(selectedShowId);
  } else if (allShows[0]) {
    showSelect.value = String(allShows[0].id);
  }
}


function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
function setupEventListeners() {
  if (backToShowsBtn) {
    backToShowsBtn.addEventListener("click", showShowsView);
  }
  if (searchBox) {
    searchBox.addEventListener("input", debounce(() => {
      const term = searchBox.value.toLowerCase();
      const filtered = allShows.filter((show) =>
        (show.name || "").toLowerCase().includes(term)
      );
      displayshows(filtered);
      updateSearchCount(filtered.length, allShows.length, "show");
    }, 300));
  }
}
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners(); // include episodeSearchBox logic here
});
function createEpisodeCard(episode) {
  const card = document.createElement("article");
  card.className = "episode-card";
  card.setAttribute("aria-label", `Episode: ${episode.name}`);

  // ✅ Add image if available
  if (episode.image && episode.image.medium) {
    const img = document.createElement("img");
    img.src = episode.image.medium;
    img.alt = `Image for ${episode.name}`;
    img.loading = "lazy"; // Performance boost
    card.appendChild(img);
  }

  const title = document.createElement("h3");
  title.textContent = episode.name;

  const summary = document.createElement("div");
  summary.innerHTML = episode.summary || "";

  card.appendChild(title);
  card.appendChild(summary);

  // ✅ Optional: Add external link
  if (episode.url) {
    const link = document.createElement("a");
    link.href = episode.url;
    link.textContent = "View on TVMaze";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.appendChild(link);
  }

  return card;
}
function populateEpisodeSelect(episodes) {
  episodeSelect.innerHTML = '<option value="all">Show all episodes</option>';
  episodes.forEach((episode) => {
    const opt = document.createElement("option");
    opt.value = episode.id;
    opt.textContent = `S${String(episode.season).padStart(2, "0")}E${String(
      episode.number
    ).padStart(2, "0")} - ${episode.name}`;
    episodeSelect.appendChild(opt);
  });
}

function populateShowSelect(shows) {
  showSelect.innerHTML = '<option value="">-- Select a show --</option>';
  shows.forEach((show) => {
    const opt = document.createElement("option");
    opt.value = show.id;
    opt.textContent = show.name;
    showSelect.appendChild(opt);
  });
}
// Preselect default
if (selectedShowId) {
  showSelect.value = String(selectedShowId);
} else if (allShows[0]) {
  showSelect.value = String(allShows[0].id);
}

// ===== Utils =====
function filterEpisodes(episodes, term) {
  if (!term) return episodes;
  return episodes.filter((ep) =>
    (ep.name || "").toLowerCase().includes(term) ||
    (ep.summary || "").toLowerCase().includes(term)
  );
}
function toggleEpisodeControls(show) {
  const controls = document.getElementById("episode-controls");
  if (controls) {
    controls.style.display = show ? "flex" : "none";
  }
}

function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}
// ===== Messages =====
function showLoadingMessage(text = "Loading…") {
  rootElem.innerHTML = `<p>${text}</p>`;
}
function showErrorMessage(msg) {
  rootElem.innerHTML = `<p style="color:red;">${msg}</p>`;
}
function hideMessage() {
  rootElem.innerHTML = "";
}
//
