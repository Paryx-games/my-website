import { writeFile } from "node:fs/promises";
import { generateGamesText } from "./games-txt.mjs";

await writeFile(new URL("../public/games.txt", import.meta.url), generateGamesText());
