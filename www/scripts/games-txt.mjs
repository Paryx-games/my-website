import { games, catalogue, rotation, robloxGames } from "../public/assets/games/games.js";

const catalogueById = new Map(catalogue.map((game) => [game.id, game]));

function renderSection(title, entries) {
  return `${title}\n--\n${entries
    .map((game) => `${game.title}${game.roblox ? " [ROBLOX]" : ""}`)
    .join("\n")}`;
}

export function generateGamesText() {
  const rotationGames = rotation.map(({ id, title }) => {
    const game = catalogueById.get(id);
    if (!game) {
      throw new Error(`Games rotation references an unknown game: ${id}`);
    }
    return { ...game, title: title || game.title };
  });

  return [
    renderSection("Favorite games", games),
    renderSection("Games in rotation", rotationGames),
    renderSection("Roblox games", robloxGames),
  ].join("\n\n") + "\n";
}
