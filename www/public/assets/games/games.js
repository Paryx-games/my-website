export const games = [
  {
    id: 'minecraft', title: 'Minecraft', year: '2011', developer: 'Mojang Studios', publisher: 'Mojang Studios',
    genre: 'Sandbox · Survival', website: 'https://www.minecraft.net/en-us/about-minecraft',
    description: 'Build, explore, and survive in worlds made of blocks. Play creatively with unlimited resources, or gather materials and face the night in survival mode.',
    cover: '/assets/games/minecraft-cover.webp',
    pictures: ['minecraft-1.webp', 'minecraft-2.webp', 'minecraft-3.webp'].map(file => `/assets/games/${file}`),
    captions: ['Building in Minecraft', 'Exploring Minecraft biomes', 'Survival in Minecraft'],
  },
  {
    id: 'satisfactory', title: 'Satisfactory', year: '2024', developer: 'Coffee Stain Studios', publisher: 'Coffee Stain Publishing',
    genre: 'Factory building · Exploration', website: 'https://store.steampowered.com/app/526870/Satisfactory/',
    description: 'Explore an alien planet and build increasingly elaborate factories. Connect production lines, automate transport, and expand alone or with friends.',
    cover: '/assets/games/satisfactory-cover.webp',
    pictures: [1, 2, 3].map(index => `/assets/games/satisfactory-${index}.webp`),
    captions: ['Satisfactory world and factories', 'Satisfactory factory building', 'Exploring Satisfactory'],
  },
  {
    id: 'rainbow-six-siege', title: 'Rainbow Six Siege', year: '2015', developer: 'Ubisoft Montreal', publisher: 'Ubisoft',
    genre: 'Tactical shooter · Multiplayer', website: 'https://store.steampowered.com/app/359550/',
    description: 'A tactical team shooter built around attacking and defending objectives. Operators, destructible environments, and coordinated planning shape each round.',
    cover: '/assets/games/rainbow-six-siege-cover.webp',
    pictures: [1, 2, 3].map(index => `/assets/games/rainbow-six-siege-${index}.webp`),
    captions: ['Rainbow Six Siege gameplay', 'Rainbow Six Siege operators', 'Rainbow Six Siege tactical combat'],
  },
];

// Only populate this with titles and statuses supplied by paryx.
export const rotation = [
  {
    "id": "forza-horizon-6",
    "status": "In rotation"
  },
  {
    "id": "forza-horizon-4",
    "status": "In rotation"
  },
  {
    "id": "beamng-drive",
    "status": "In rotation"
  },
  {
    "id": "rainbow-six-siege",
    "status": "In rotation"
  },
  {
    "id": "satisfactory",
    "status": "In rotation"
  },
  {
    "id": "geometry-dash",
    "status": "In rotation"
  },
  {
    "id": "minecraft",
    "status": "In rotation",
    "title": "Minecraft Java"
  },
  {
    "id": "roblox",
    "status": "In rotation"
  },
  {
    "id": "halo-mcc",
    "status": "In rotation"
  },
  {
    "id": "escape-the-backrooms",
    "status": "In rotation"
  },
  {
    "id": "backrooms-escape-together",
    "status": "In rotation"
  },
  {
    "id": "bloons-td-6",
    "status": "In rotation"
  }
];

export const catalogue = [...games, ...[
  {
    "cover": "/assets/games/forza-horizon-6-cover.webp",
    "website": "https://store.steampowered.com/app/2483190/",
    "publisher": "Xbox Game Studios",
    "id": "forza-horizon-6",
    "title": "Forza Horizon 6",
    "captions": [
      "Forza Horizon 6 — official screenshot 1",
      "Forza Horizon 6 — official screenshot 2",
      "Forza Horizon 6 — official screenshot 3"
    ],
    "genre": "Racing · Simulation · Sports",
    "developer": "Playground Games",
    "year": "2026",
    "description": "Discover the breathtaking landscapes of Japan in over 550 real-world cars and become a racing Legend in Forza Horizon's biggest open world driving adventure yet.",
    "pictures": [
      "/assets/games/forza-horizon-6-1.webp",
      "/assets/games/forza-horizon-6-2.webp",
      "/assets/games/forza-horizon-6-3.webp"
    ]
  },
  {
    "cover": "/assets/games/forza-horizon-4-cover.webp",
    "website": "https://store.steampowered.com/app/1293830/",
    "publisher": "Xbox Game Studios",
    "id": "forza-horizon-4",
    "title": "Forza Horizon 4",
    "captions": [
      "Forza Horizon 4 — official screenshot 1",
      "Forza Horizon 4 — official screenshot 2",
      "Forza Horizon 4 — official screenshot 3"
    ],
    "genre": "Racing",
    "developer": "Playground Games",
    "year": "2018",
    "description": "Dynamic seasons change everything at the world’s greatest automotive festival. Go it alone or team up with others to explore beautiful and historic Britain in a shared open world.",
    "pictures": [
      "/assets/games/forza-horizon-4-1.webp",
      "/assets/games/forza-horizon-4-2.webp",
      "/assets/games/forza-horizon-4-3.webp"
    ]
  },
  {
    "cover": "/assets/games/beamng-drive-cover.webp",
    "website": "https://store.steampowered.com/app/284160/",
    "publisher": "BeamNG",
    "id": "beamng-drive",
    "title": "BeamNG.drive",
    "captions": [
      "BeamNG.drive — official screenshot 1",
      "BeamNG.drive — official screenshot 2",
      "BeamNG.drive — official screenshot 3"
    ],
    "genre": "Racing · Simulation · Early Access",
    "developer": "BeamNG",
    "year": "2015",
    "description": "A dynamic soft-body physics vehicle simulator capable of doing just about anything.",
    "pictures": [
      "/assets/games/beamng-drive-1.webp",
      "/assets/games/beamng-drive-2.webp",
      "/assets/games/beamng-drive-3.webp"
    ]
  },
  {
    "cover": "/assets/games/geometry-dash-cover.webp",
    "website": "https://store.steampowered.com/app/322170/",
    "publisher": "RobTop Games",
    "id": "geometry-dash",
    "title": "Geometry Dash",
    "captions": [
      "Geometry Dash — official screenshot 1",
      "Geometry Dash — official screenshot 2",
      "Geometry Dash — official screenshot 3"
    ],
    "genre": "Action · Indie",
    "developer": "RobTop Games",
    "year": "2013",
    "description": "Jump and fly your way through danger in this rhythm-based action platformer!",
    "pictures": [
      "/assets/games/geometry-dash-1.webp",
      "/assets/games/geometry-dash-2.webp",
      "/assets/games/geometry-dash-3.webp"
    ]
  },
  {
    "cover": "/assets/games/halo-mcc-cover.webp",
    "website": "https://store.steampowered.com/app/976730/",
    "publisher": "Xbox Game Studios",
    "id": "halo-mcc",
    "title": "Halo: The Master Chief Collection",
    "captions": [
      "Halo: The Master Chief Collection — official screenshot 1",
      "Halo: The Master Chief Collection — official screenshot 2",
      "Halo: The Master Chief Collection — official screenshot 3"
    ],
    "genre": "Action",
    "developer": "343 Industries, Splash Damage, Ruffian Games, Bungie, Saber Interactive",
    "year": "2014",
    "description": "The Master Chief’s iconic journey includes six games, built for PC and collected in a single integrated experience. Whether you’re a long-time fan or meeting Spartan 117 for the first time, The Master Chief Collection is the definitive Halo gaming experience.",
    "pictures": [
      "/assets/games/halo-mcc-1.webp",
      "/assets/games/halo-mcc-2.webp",
      "/assets/games/halo-mcc-3.webp"
    ]
  },
  {
    "cover": "/assets/games/escape-the-backrooms-cover.webp",
    "website": "https://store.steampowered.com/app/1943950/",
    "publisher": "Secret Mode",
    "id": "escape-the-backrooms",
    "title": "Escape the Backrooms",
    "captions": [
      "Escape the Backrooms — official screenshot 1",
      "Escape the Backrooms — official screenshot 2",
      "Escape the Backrooms — official screenshot 3"
    ],
    "genre": "Action · Indie",
    "developer": "Fancy Games, Blackbird Interactive",
    "year": "2025",
    "description": "Escape the Backrooms is a 1-4 player co-op horror exploration game. Traverse 30+ eerie backrooms levels while avoiding entities and other dangers. Try to escape but be warned: survival isn't guaranteed.",
    "pictures": [
      "/assets/games/escape-the-backrooms-1.webp",
      "/assets/games/escape-the-backrooms-2.webp",
      "/assets/games/escape-the-backrooms-3.webp"
    ]
  },
  {
    "cover": "/assets/games/backrooms-escape-together-cover.webp",
    "website": "https://store.steampowered.com/app/2141730/",
    "publisher": "Triiodide Studios",
    "id": "backrooms-escape-together",
    "title": "Backrooms: Escape Together",
    "captions": [
      "Backrooms: Escape Together — official screenshot 1",
      "Backrooms: Escape Together — official screenshot 2",
      "Backrooms: Escape Together — official screenshot 3"
    ],
    "genre": "Action · Adventure · Casual · Indie · Early Access",
    "developer": "Triiodide Studios",
    "year": "2022",
    "description": "A visually lifelike co-op horror game for 1-6 people. Journey through 11 procedurally generated levels, using what's available to survive and progress deeper into the Backrooms.",
    "pictures": [
      "/assets/games/backrooms-escape-together-1.webp",
      "/assets/games/backrooms-escape-together-2.webp",
      "/assets/games/backrooms-escape-together-3.webp"
    ]
  },
  {
    "cover": "/assets/games/bloons-td-6-cover.webp",
    "website": "https://store.steampowered.com/app/960090/",
    "publisher": "Ninja Kiwi",
    "id": "bloons-td-6",
    "title": "Bloons TD 6",
    "captions": [
      "Bloons TD 6 — official screenshot 1",
      "Bloons TD 6 — official screenshot 2",
      "Bloons TD 6 — official screenshot 3"
    ],
    "genre": "Strategy",
    "developer": "Ninja Kiwi",
    "year": "2018",
    "description": "The Bloons are back and better than ever! Get ready for a massive 3D tower defense game designed to give you hours and hours of the best strategy gaming available.",
    "pictures": [
      "/assets/games/bloons-td-6-1.webp",
      "/assets/games/bloons-td-6-2.webp",
      "/assets/games/bloons-td-6-3.webp"
    ]
  },
  {
    "id": "roblox",
    "title": "Roblox",
    "year": "2006",
    "developer": "Roblox Corporation",
    "publisher": "Roblox Corporation",
    "genre": "Online platform · User-created games",
    "website": "https://corp.roblox.com/",
    "description": "A platform for playing and creating experiences, from competitive games to adventures and social worlds built by its community.",
    "cover": "/assets/games/roblox-cover.webp",
    "pictures": [
      "/assets/games/roblox-1.webp",
      "/assets/games/roblox-2.webp",
      "/assets/games/roblox-3.webp"
    ],
    "captions": [
      "Roblox community and experiences",
      "Creating on Roblox",
      "Roblox experiences"
    ]
  }
]];
