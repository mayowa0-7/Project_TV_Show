 let allEpisodes = []; // Global so it can be used across functions.

function setup() {
  allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);
  populateEpisodeSelect(allEpisodes);
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
const searchInput = document.getElementById("search-input");
const searchCount = document.getElementById("search-count");

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
const episodeSelect = document.getElementById("episode-select");

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

window.onload = function() {
    if (typeof getAllEpisodes === "function") {
      makePageForEpisodes(getAllEpisodes());
    }
  };