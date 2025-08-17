// ===== Global State & Elements =====
let allEpisodes = []; //current show's episodes
let allShows = [];    //all shows fetched
let onShowsPage = true; // are we on the shows page?
let selectedShowId = null;            // current show id

const rootElem = document.getElementById("root");
const showSelect = document.getElementById("show-select");
const searchInput = document.getElementById("search-input");
const episodeSelect = document.getElementById("episode-select");
const showSearchInput = document.getElementById("show-search");
const showsListing = document.getElementById("shows-listing");
const backToShowsBtn = document.getElementById("back-to-shows");
const searchCount = document.getElementById("search-count");
const showSearchCount = document.getElementById("show-search-count");

//caches for shows and episodes
let showsListPromise = null;                     // Promise for /shows
const episodesCache = new Map();                 // showId -> episodes array
const inFlightEpisodeFetch = new Map();          // showId -> Promise

// ===== Setup =====
window.onload = setup;

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
      populateShowSelect(shows);
      displayshows(shows);
      onShowsPage = true;
    })
    .catch((err) => {
      showErrorMessage("Failed to load shows. Please try again later.");
      console.error(err);
    });
  // Wire up controls
  showSelect.addEventListener("change", async () => {
    const newId = parseInt(showSelect.value, 10);
    selectedShowId = newId;

    // Keep whatever the user typed in search and re-apply it to the new show's episodes
    const term = searchInput.value.toLowerCase();

    showLoadingMessage("Loading episodes…");
    try {
      await loadEpisodesForShow(newId);
      const filtered = filterEpisodes(allEpisodes, term);
      displayEpisodes(filtered);
      updateSearchCount(filtered.length, allEpisodes.length);
    } catch (err) {
      showErrorMessage("Failed to load episodes for this show.");
      console.error(err);
      toggleEpisodeControls(false);
    }
  });

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = filterEpisodes(allEpisodes, term);
    displayEpisodes(filtered);
    updateSearchCount(filtered.length, allEpisodes.length);

    // Reset episode select to "all" when searching
    if (episodeSelect) episodeSelect.value = "all";
  });

  episodeSelect.addEventListener("change", () => {
    const selectedId = episodeSelect.value;

    // Respect any current search term
    const term = searchInput.value.toLowerCase();
    const base = filterEpisodes(allEpisodes, term);

    if (selectedId === "all") {
      displayEpisodes(base);
      updateSearchCount(base.length, allEpisodes.length);
    } else {
      const selectedEpisode = base.find((ep) => ep.id.toString() === selectedId);
      displayEpisodes(selectedEpisode ? [selectedEpisode] : []);
      updateSearchCount(selectedEpisode ? 1 : 0, allEpisodes.length);
    }
  });
}
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

async function loadEpisodesForShow(showId) {
  const episodes = await fetchEpisodesOnce(showId);
  allEpisodes = episodes;
  hideMessage();
  toggleEpisodeControls(true);
  populateEpisodeSelect(allEpisodes);
  backToShowsBtn.style.display = "inline";
  // Apply current search term on first load of this show
  const term = searchInput.value.toLowerCase();
  const filtered = filterEpisodes(allEpisodes, term);
  displayEpisodes(filtered);
  updateSearchCount(filtered.length, allEpisodes.length);
}
function displayAllShows() {
  const root = document.getElementById("root");
  root.className = "grid-layout"; // Ensure grid layout is active

  const shows = getAllShows(); // Replace with your actual data source
  root.innerHTML = ""; // Clear previous content

  shows.forEach(show => {
    const card = createShowCard(show);
    root.appendChild(card);
  });
}

function displayshows(shows) {
  if (rootElem) {
    rootElem.className = "grid-layout"; // Ensure grid layout is active
    rootElem.innerHTML = ""; // Clear previous content
  }

  shows.forEach((show) => {
    const card = document.createElement("article");
    card.className = "show-card";
    card.setAttribute("aria-label", `Show: ${show.name}`);
    const title = document.createElement("h2");
    title.textContent = show.name;
    title.classList.add("clickable");
    title.addEventListener("click", () => {
      selectedShowId = show.id;
      onShowsPage = false;
     if (showSelect) showSelect.value = String(show.id);
  showLoadingMessage("Loading episodes…");
  loadEpisodesForShow(show.id);
  if (showsListing) showsListing.style.display = "none";
  if (rootElem) rootElem.className = "grid-layout";
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
    rootElem.appendChild(card);
  });
}
if (showsListing) {  
  showsListing.style.display = "none";
}
if (backToShowsBtn) {
backToShowsBtn.addEventListener("click", () => {
  onShowsPage = true;
  rootElem.className = "grid-layout";
  if (showsListing) showsListing.style.display = "block";
  backToShowsBtn.style.display = "none";
  displayshows(allShows);
  searchInput.value = "";
  episodeSelect.value = "all";
  searchCount.textContent = "";
  toggleEpisodeControls(false);
});
}
 //const showSearchInput = document.getElementById("show-search");
///if (showsListing) 

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
if (showSearchInput) {
showSearchInput.addEventListener("input", debounce(() => {
  const term = showSearchInput.value.toLowerCase();
  const filtered = allShows.filter((show) =>
    (show.name || "").toLowerCase().includes(term) ||
    (show.summary || "").toLowerCase().includes(term) ||
    show.genres.some((g) => g.toLowerCase().includes(term))
  );
   displayshows(filtered);

    if (showSearchCount) {
      showSearchCount.textContent = `${filtered.length} show${filtered.length !== 1 ? "s" : ""} found`;
    }
}, 300));
}
function displayEpisodes(episodes) {
  rootElem.innerHTML = ""; // Clear previous content

  episodes.forEach((episode) => {
    const episodeCard = document.createElement("article");
    episodeCard.className = "episode-card";
    episodeCard.setAttribute("aria-label", `Episode: ${episode.name}`);

    const title = document.createElement("h3");
    title.textContent = `${episode.name} — ${formatEpisodeCode(episode.season, episode.number)}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Runtime: ${episode.runtime || "N/A"} mins | Airdate: ${episode.airdate || "Unknown"}`;
    const summary = document.createElement("div");
    summary.innerHTML = episode.summary || "No summary available.";

    episodeCard.appendChild(title);
    episodeCard.appendChild(meta);
    episodeCard.appendChild(summary);

    if (episode.url) {
      const link = document.createElement("a");
      link.href = episode.url;
      link.textContent = "View on TVMaze";
      link.target = "_blank";
      episodeCard.appendChild(link);
    }
    rootElem.appendChild(episodeCard);
  });
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
  // Clear and fill
  showSelect.innerHTML = "";
  shows.forEach((show) => {
    const opt = document.createElement("option");
    opt.value = show.id;
    opt.textContent = show.name;
    showSelect.appendChild(opt);
  });

  // Preselect default
  if (selectedShowId) {
    showSelect.value = String(selectedShowId);
  } else if (shows[0]) {
    showSelect.value = String(shows[0].id);
  }
}
// ===== Utils =====
function filterEpisodes(episodes, term) {
  if (!term) return episodes;
  return episodes.filter((ep) =>
    (ep.name || "").toLowerCase().includes(term) ||
    (ep.summary || "").toLowerCase().includes(term)
  );
}
function updateSearchCount(showing, total) {
  searchCount.textContent = `Showing ${showing} / ${total} episodes`;
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

