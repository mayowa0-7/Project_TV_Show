  function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  const html = `
    <div class="episode-grid">
      ${episodeList.map(ep => {
        const code = `S${String(ep.season).padStart(2, "0")}E${String(ep.number).padStart(2, "0")}`;
        return `<div class="episode-card">
          <h2>${ep.name} (${code})</h2>
          <img src="${ep.image && ep.image.medium ? ep.image.medium : "https://via.placeholder.com/210x295?text=No+Image"}" alt="${ep.name}">
          <div>${ep.summary || ""}</div>
          <a href="${ep.url}" target="_blank" rel="noopener noreferrer">View on TVMaze</a>
        </div>`;
      }).join("")}
    </div>
    <div>Data originally from <a href="https://tvmaze.com/" target="_blank" rel="noopener noreferrer">TVMaze.com</a></div>
  `;
  rootElem.innerHTML = html;
}

window.onload = function() {
    if (typeof getAllEpisodes === "function") {
      makePageForEpisodes(getAllEpisodes());
    }
  };

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
