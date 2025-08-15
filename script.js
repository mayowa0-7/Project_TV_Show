 // ===== Global State & Elements =====
 let allEpisodes = []; //current show's episodes
let selectedShowId = null;            // current show id

const rootElem      = document.getElementById("root");
const showSelect    = document.getElementById("show-select");
const episodeSelect = document.getElementById("episode-select");
const searchInput   = document.getElementById("search-input");
const searchCount   = document.getElementById("search-count");
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
      populateShowSelect(shows);

      // Pick a default show (keep your old default if you want)
      // For example, try to default to "Game of Thrones" (id 82) if present
      const got = shows.find((s) => s.id === 82);
      selectedShowId = got ? got.id : shows[0]?.id;

      // Load episodes for the default show
      return loadEpisodesForShow(selectedShowId);
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

  function makePageForEpisodes(episodeList) {
  displayEpisodes(episodeList);
}
 function displayEpisodes(episodes) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = ""; // Clear previous content

  episodes.forEach((episode) => {
    const episodeCard = document.createElement("div");
    episodeCard.className = "episode-card";
    
    const title = document.createElement("h3");
    title.textContent = `${episode.name} — ${formatEpisodeCode(episode.season, episode.number)}`;

    const image = document.createElement("img");
    image.src = episode.image.medium;

    const summary = document.createElement("div");
    summary.innerHTML = episode.summary;

    const link = document.createElement("a");
    link.href = episode.url;
    link.textContent = "View on TVMaze";
    link.target = "_blank";

    
    episodeCard.append(title, image, summary, link);
    rootElem.appendChild(episodeCard);
  });
}
function formatEpisodeCode(season, number) {
  const seasonStr = season.toString().padStart(2, '0');
  const numberStr = number.toString().padStart(2, '0');
  return `S${seasonStr}E${numberStr}`;
}
  // === Live Search ===

searchInput.addEventListener("input", function () {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredEpisodes = allEpisodes.filter((episode) => {
    return (
      episode.name.toLowerCase().includes(searchTerm) ||
      episode.summary.toLowerCase().includes(searchTerm)
    );
  });
   displayEpisodes(filteredEpisodes);
  searchCount.textContent = `Showing ${filteredEpisodes.length} / ${allEpisodes.length} episodes`;
});

// === Episode Selector
function populateEpisodeSelect(episodes) {
  episodeSelect.innerHTML = ""; // Clear previous options
  episodes.forEach((episode) => {
    const option = document.createElement("option");
    option.value = episode.id;
    option.textContent = `S${String(episode.season).padStart(2, "0")}E${String(
      episode.number
    ).padStart(2, "0")} - ${episode.name}`;
    episodeSelect.appendChild(option);
  });
}

episodeSelect.addEventListener("change", function () {
  const selectedId = episodeSelect.value;

  if (selectedId === "all") {
    displayEpisodes(allEpisodes);
    searchInput.value = ""; // Optional: Clear search input
    searchCount.textContent = `Showing ${allEpisodes.length} / ${allEpisodes.length} episodes`;
  } else {
    const selectedEpisode = allEpisodes.find(
      (ep) => ep.id.toString() === selectedId
    );
    displayEpisodes([selectedEpisode]);
    searchInput.value = ""; // Clear search when using selector
    searchCount.textContent = `Showing 1 / ${allEpisodes.length} episodes`;
  }
});

window.onload = setup;
