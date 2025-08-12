let allEpisodes = []; // Global so it can be used across functions.

function setup() {
showLoadingMessage();
  const root = document.getElementById("root");
  const loadingElement = document.createElement("div");
  loadingElement.id = "loading";
  loadingElement.textContent = "Loading episodes...";
  loadingElement.style.textAlign = "center";
  loadingElement.style.fontSize = "1.2em";
  root.appendChild(loadingElement);
}
function hideLoadingMessage() {
  const loadingElement = document.getElementById("loading");
  if (loadingElement) loadingElement.remove();
}
  fetch("https://api.tvmaze.com/shows/82/episodes")
    .then(response => {
      if (!response.ok) throw new Error("Network error");
      return response.json();
    })
    .then(data => {
      allEpisodes = data;
      hideLoadingMessage();
      makePageForEpisodes(allEpisodes);
      populateEpisodeSelect(allEpisodes);
    })

    .catch(error => {
      hideLoadingMessage(); // Optional: clear spinner before showing error
      showErrorMessage("page not loading, please kindly check your connection and try again.");
    });

function showErrorMessage(msg) {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div style="color: red; padding: 1em; background: #ffe6e6; border: 1px solid red; border-radius: 5px;">
      <strong>Error:</strong> ${msg}
      <br>
      <button onclick="setup()" style="margin-top: 0.5em;">Retry</button>
    </div>
  `;
}

function makePageForEpisodes(episodeList) {
  displayEpisodes(episodeList);
}
function displayEpisodes(episodes) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = ""; // Clear previous content

  if (episodes.length === 0) {
    const message = document.createElement("div");
    message.className = "no-results";
    message.textContent = "Oops! No episodes match your search.";
    rootElem.appendChild(message);
    return;
  }

  episodes.forEach((episode) => {
    const episodeCard = document.createElement("div");
    episodeCard.className = "episode-card";

    const title = document.createElement("h3");
    title.textContent = `${episode.name} — ${formatEpisodeCode(episode.season, episode.number)}`;

    const image = document.createElement("img");
    image.src = episode.image.medium || "";
    image.alt = episode.name || "Episode image";

    const summary = document.createElement("div");
    summary.innerHTML = episode.summary || "No summary available.";


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

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Episodes";
  episodeSelect.appendChild(allOption);

  episodes.forEach((episode) => {
    const option = document.createElement("option");
    option.value = episode.id;
    option.textContent = `${formatEpisodeCode(episode.season, episode.number)} - ${episode.name}`;
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
