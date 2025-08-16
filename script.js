// ===== Global State & Elements =====
let allEpisodes = []; //current show's episodes
let allShows = [];    //all shows fetched
let onShowsPage = true; // are we on the shows page?
let selectedShowId = null;            // current show id

const rootElem = document.getElementById("root");
const showSelect = document.getElementById("show-select");
const episodeSelect = document.getElementById("episode-select");
const searchInput = document.getElementById("search-input");
const searchCount = document.getElementById("search-count");
const showsListing = document.getElementById("shows-listing");
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
      displayshows(shows);
      populateShowSelect(shows);
      const got = shows.find((s) => s.id === 82);
      selectedShowId = got ? got.id : shows[0]?.id;
      // Load episodes for the default show
      return loadEpisodesForShow(selectedShowId);
    })
    .catch((err) => {
      showErrorMessage("Failed to load shows. Please try again later.");
      console.error(err);
    });
}
showSelect.addEventListener("change", async () => {
  const newId = parseInt(showSelect.value, 10);
  selectedShowId = newId;
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
document.getElementById("show-search").addEventListener("input", () => {
  const term = document.getElementById("show-search").value.toLowerCase();
  const filtered = allShows.filter(show =>
    show.name.toLowerCase().includes(term) ||
    show.genres.join(" ").toLowerCase().includes(term) ||
    show.summary.toLowerCase().includes(term)
  );
  displayshows(filtered);
});
episodeSelect.addEventListener("change", () => {
  const selectedId = episodeSelect.value;
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
  populateEpisodeSelect(allEpisodes);
  // Apply current search term on first load of this show
  const term = searchInput.value.toLowerCase();
  const filtered = filterEpisodes(allEpisodes, term);
  displayEpisodes(filtered);
  updateSearchCount(filtered.length, allEpisodes.length);
}

function displayEpisodes(episodes) {
  rootElem.innerHTML = ""; // Clear previous content

  episodes.forEach((episode) => {
    const episodeCard = document.createElement("div");
    episodeCard.className = "episode-card";

    const title = document.createElement("h3");
    title.textContent = `${episode.name} — ${formatEpisodeCode(episode.season, episode.number)}`;
    episodeCard.appendChild(title);
    if (episode.image?.medium) {
      const img = document.createElement("img");
      img.src = episode.image.medium;
      img.alt = episode.name;
      episodeCard.appendChild(img);
    }
    const summary = document.createElement("div");
    summary.innerHTML = episode.summary || "No summary available.";
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


  function displayshows(shows) {
    rootElem.innerHTML = "";
    shows.forEach(show) => {
      const showCard = document.createElement("div");
      showCard.className = "show-card";

      const title = document.createElement("h2");
      title.textContent = show.name;
      showCard.appendChild(title);
      if (show.image?.medium) {
        const img = document.createElement("img");
        img.src = show.image.medium;
        img.alt = show.name;
        showCard.appendChild(img);
      }
      const summary = document.createElement("div");
      summary.innerHTML = show.summary || "No summary available.";
      showCard.appendChild(summary);
    }
    const details = document.createElement("div");
    details.innerHTML = `
    <p>Language: ${show.language || "Unknown"}</p>
    <p>Genres: ${show.genres.length > 0 ? show.genres.join(", ") : "None"}</p>
    <p>Premiered: ${show.premiered || "Unknown"}</p>
    <p>Status: ${show.status || "Unknown"}</p>`;
    showCard.appendChild(details);
    showCard.addEventListener("click", () => {
      selectedShowId = show.id;
      onShowsPage = false;
      switchToEpisodesView();
      loadEpisodesForShow(show.id)
    });
    rootElem.appendChild(showCard);
  }
  function switchToEpisodesView() {
    showSelect.style.display = "inline-block";
    episodeSelect.style.display = "inline-block";
    searchInput.style.display = "inline-block";
    searchCount.style.display = "block";
  }
}
  function switchToShowsListing() {
    showSelect.style.display = "none";
    episodeSelect.style.display = "none";
    searchInput.style.display = "none";
    searchCount.style.display = "none";
    displayshows(allShows);
    onShowsPage = true;
  }
  if (episode.image?.medium) {
    const img = document.createElement("img");
    img.src = episode.image.medium;
    img.alt = episode.name;
    episodeCard.appendChild(img);
  }
  const summary = document.createElement("div");
  summary.innerHTML = episode.summary || "No summary available.";
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

