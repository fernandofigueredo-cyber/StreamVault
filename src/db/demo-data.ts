export const STREAM_POOL = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  "https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "https://test-streams.mux.dev/test_001/stream.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8",
  "https://test-streams.mux.dev/pts_shift/master.m3u8",
  "https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8",
];

export function poolStream(index: number): string {
  return STREAM_POOL[index % STREAM_POOL.length];
}

export type DemoLiveGroup = { group: string; channels: string[] };

export const DEMO_LIVE: DemoLiveGroup[] = [
  {
    group: "News",
    channels: [
      "Sky News HD",
      "BBC World News",
      "CNN International",
      "Al Jazeera English",
      "Bloomberg TV US",
      "CNBC World",
      "France 24 English",
      " DW English",
    ],
  },
  {
    group: "Sports",
    channels: [
      "Sky Sports Main Event",
      "Sky Sports Premier League",
      "ESPN HD",
      "Eurosport 1 HD",
      "beIN Sports 1",
      "DAZN Fight Night",
      "NBA TV HD",
      "Formula 1 TV",
    ],
  },
  {
    group: "Entertainment",
    channels: [
      "HBO Signature HD",
      "AMC Global",
      "FX Network HD",
      "Comedy Central UK",
      "E! Entertainment",
      "Paramount Network",
      "Sky Showcase HD",
      "TBS Comedy",
    ],
  },
  {
    group: "Movies",
    channels: [
      "Sky Cinema Premiere HD",
      "Sky Cinema Action",
      "HBO Hits HD",
      "Film4 HD",
      "TCM Classics",
      "Cine MOJO 4K",
    ],
  },
  {
    group: "Documentary",
    channels: [
      "National Geographic Wild",
      "Discovery Channel HD",
      "History Channel HD",
      "BBC Earth 4K",
      "Smithsonian Channel",
      "Animal Planet HD",
    ],
  },
  {
    group: "Kids",
    channels: [
      "Cartoon Network HD",
      "Nickelodeon",
      "Disney Junior",
      "Boomerang",
      "Baby TV",
      "Boomerang Anime",
    ],
  },
  {
    group: "Music",
    channels: ["MTV Hits HD", "MTV Live 4K", "Vevo Pop", "Clubland TV", "Jazz TV HD"],
  },
  {
    group: "Regional",
    channels: [
      "ITV London HD",
      "Channel 4 HD",
      "RTE One",
      "ZDF Neo",
      "TVE La 1",
      "Canal+ France",
      "Rai Uno HD",
    ],
  },
];

export type DemoMovie = {
  title: string;
  group: string;
  year: string;
  rating: string;
  genre: string;
  plot: string;
  cast: string;
  director: string;
  durationSecs: number;
};

export const DEMO_MOVIES: DemoMovie[] = [
  {
    title: "Neon Harbor",
    group: "New Releases 2026",
    year: "2026",
    rating: "8.1",
    genre: "Crime / Thriller",
    plot:
      "A retired dock investigator is pulled back into the harbour's shadowy smuggling routes when a cargo container arrives carrying a passenger who shouldn't exist.",
    cast: "Naomi Reyes, Elias Brandt, Kofi Mensah, Lucy Tran",
    director: "Ana Villalobos",
    durationSecs: 7080,
  },
  {
    title: "The Cartographer's Daughter",
    group: "Drama Vault",
    year: "2025",
    rating: "7.6",
    genre: "Drama / Adventure",
    plot:
      "After her father disappears mapping an unnamed archipelago, a young cartographer retraces his last voyage and discovers the maps were never about the islands.",
    cast: "Imogen Hale, Tomas Nyqvist, Priya Raghunathan",
    director: "Søren Kjeldsen",
    durationSecs: 6540,
  },
  {
    title: "Static Bloom",
    group: "Sci-Fi Gateway",
    year: "2025",
    rating: "7.9",
    genre: "Sci-Fi / Mystery",
    plot:
      "A radio astronomer decoding an impossible signal begins hearing her own voice broadcast back from eleven years in the future.",
    cast: "Adaeze Obi, Marcus Lindqvist, Yara Suleiman",
    director: "Deniz Arslan",
    durationSecs: 7320,
  },
  {
    title: "Concrete Sunday",
    group: "Drama Vault",
    year: "2024",
    rating: "7.2",
    genre: "Drama / Sport",
    plot:
      "A Sunday-league football club in a dying steel town gets one chance at the cup — and the whole town bets its last hope on ninety minutes.",
    cast: "Dean Whitmore, Solomon Adeyemi, Kara Bell",
    director: "Jamie Foot",
    durationSecs: 6300,
  },
  {
    title: "Paper Tigers",
    group: "Action Junction",
    year: "2026",
    rating: "6.8",
    genre: "Action / Comedy",
    plot:
      "Two retired stunt doubles take one last job protecting a pop star, and discover neither of them remembers how to fall properly.",
    cast: "Hal Osmond, Benny Zhou, Rina Kato",
    director: "Chad Mbeki",
    durationSecs: 5880,
  },
  {
    title: "Winterhold",
    group: "Fantasy Keep",
    year: "2025",
    rating: "8.4",
    genre: "Fantasy / Epic",
    plot:
      "The last garrison of a frozen fortress must hold the pass for seven days while a reluctant heir rides south to claim a crown she never wanted.",
    cast: "Sigrid Halvorsen, Bram Oduya, Celene Fournier",
    director: "Matti Rönkkö",
    durationSecs: 8100,
  },
  {
    title: "Half Moon Motel",
    group: "Late Night Horror",
    year: "2024",
    rating: "6.5",
    genre: "Horror / Thriller",
    plot:
      "A night clerk at a desert motel realises every guest who checks into room 7 checks out as somebody else.",
    cast: "Trish Delgado, Owen Parrish, Nadia Kaur",
    director: "Luca Bruni",
    durationSecs: 5520,
  },
  {
    title: "The Quiet Frequency",
    group: "Documentary Now",
    year: "2026",
    rating: "8.0",
    genre: "Documentary",
    plot:
      "Three years inside the world's most remote listening post, where a handful of engineers keep a Cold War broadcast alive for no one.",
    cast: "Narrated by Idris Vaughn",
    director: "Petra Nilsen",
    durationSecs: 5400,
  },
  {
    title: "Velvet Heist",
    group: "Action Junction",
    year: "2025",
    rating: "7.4",
    genre: "Crime / Heist",
    plot:
      "A retired forger assembles her old crew to steal back the painting that sent her to prison — from the museum that bought it knowing it was fake.",
    cast: "Marion Ette, Theo Grady, Ines Cardoso",
    director: "Rémi Chauvin",
    durationSecs: 6960,
  },
  {
    title: "Sunrise Protocol",
    group: "Sci-Fi Gateway",
    year: "2026",
    rating: "7.7",
    genre: "Sci-Fi / Action",
    plot:
      "When an orbital solar array is weaponised, a maintenance engineer has eleven hours of daylight to convince the ground crew not to fire it.",
    cast: "Jonah Park, Amara Diallo, Viktor Larsen",
    director: "Hana Sato",
    durationSecs: 7260,
  },
  {
    title: "Orchard Lane",
    group: "Family Matinee",
    year: "2024",
    rating: "7.1",
    genre: "Family / Comedy",
    plot:
      "Two squabbling siblings inherit an apple orchard and a debt, and one chaotic harvest season to work out which one matters more.",
    cast: "Poppy Ellery, Sam Ellery, Gran Whitlock",
    director: "Nora Bevan",
    durationSecs: 5940,
  },
  {
    title: "Deep Field",
    group: "Documentary Now",
    year: "2025",
    rating: "8.6",
    genre: "Documentary / Science",
    plot:
      "The ten days it took to point the largest telescope on Earth at absolutely nothing — and what looked back.",
    cast: "Narrated by Helen Achebe",
    director: "Ravi Menon",
    durationSecs: 5280,
  },
];

export type DemoSeries = {
  title: string;
  group: string;
  year: string;
  rating: string;
  genre: string;
  plot: string;
  cast: string;
  episodes: { season: number; title: string; plot: string }[];
};

export const DEMO_SERIES: DemoSeries[] = [
  {
    title: "Ashfall Precinct",
    group: "Prestige Drama",
    year: "2025",
    rating: "8.5",
    genre: "Crime / Drama",
    plot:
      "In a city buried to its second storey by volcanic ash, a detective unit works cases the evacuation left behind.",
    cast: "Rosa Quintero, Emeka Ude, Britta Sørensen",
    episodes: [
      { season: 1, title: "Cold Layer", plot: "A body surfaces in the ash after four years, perfectly preserved." },
      { season: 1, title: "Salvage Rights", plot: "Two claims on the same ruined apartment block turn fatal." },
      { season: 1, title: "The Long Walk", plot: "Quintero follows an evacuation list that ends twelve names early." },
      { season: 2, title: "New Foundations", plot: "The rebuild begins, and so does the demolition of evidence." },
      { season: 2, title: "Hairline", plot: "A confession arrives with cracks in it." },
      { season: 2, title: "Ashfall", plot: "The mountain gives one more warning." },
    ],
  },
  {
    title: "Late Checkout",
    group: "Anthology",
    year: "2026",
    rating: "7.8",
    genre: "Anthology / Thriller",
    plot: "Every episode, one hotel room, one guest who cannot leave until they tell the truth.",
    cast: "Rotating ensemble cast",
    episodes: [
      { season: 1, title: "Room 204", plot: "A wedding singer checks in with someone else's luggage." },
      { season: 1, title: "Room 118", plot: "An auditor finds a ledger that audits him." },
      { season: 1, title: "Room 312", plot: "Two strangers book the same room for the same night, on purpose." },
      { season: 2, title: "Room 007", plot: "The night manager finally becomes the guest." },
      { season: 2, title: "Room 421", plot: "A ghost story told entirely through minibar receipts." },
      { season: 2, title: "Room 909", plot: "The last guest is the hotel." },
    ],
  },
  {
    title: "Orbital Six",
    group: "Sci-Fi Series",
    year: "2025",
    rating: "8.2",
    genre: "Sci-Fi / Drama",
    plot: "Six astronauts on a decaying station must decide who gets a seat on the only return capsule.",
    cast: "Yuki Tanabe, Leo Marlowe, Fatima Aziz, Grant Okoye",
    episodes: [
      { season: 1, title: "Delta-V", plot: "The return capsule loses a thruster and a crewmate." },
      { season: 1, title: "Recycler", plot: "Water rationing becomes a vote on who deserves tomorrow." },
      { season: 1, title: "Groundfall", plot: "Mission control stops answering." },
      { season: 2, title: "Second Window", plot: "A launch window nobody planned for." },
      { season: 2, title: "Sixth Seat", plot: "The vote nobody wanted to win." },
      { season: 2, title: "Reentry", plot: "Coming home is the hardest manoeuvre." },
    ],
  },
  {
    title: "The Understudy",
    group: "Comedy Rack",
    year: "2026",
    rating: "7.3",
    genre: "Comedy",
    plot: "A perennial understudy finally gets her shot on opening night, which is also the night everything goes wrong.",
    cast: "Daisy Fenn, Rupert Kalu, Margit Weinberg",
    episodes: [
      { season: 1, title: "Places", plot: "Twelve years of waiting, three hours of chaos." },
      { season: 1, title: "Notes", plot: "The director's notes are in a language nobody speaks." },
      { season: 1, title: "Curtain", plot: "The show goes on, somehow." },
      { season: 2, title: "Tour", plot: "A national tour with a cast of four and a van." },
      { season: 2, title: "Reviews", plot: "One star, one viral clip, one very good week." },
      { season: 2, title: "Encore", plot: "Never do a matinee on a boat." },
    ],
  },
  {
    title: "Silk Road Diner",
    group: "Food & Travel",
    year: "2025",
    rating: "7.9",
    genre: "Documentary / Food",
    plot: "Six family diners along the old trade routes, and the recipes that survived every empire.",
    cast: "Hosted by Farid Nasser",
    episodes: [
      { season: 1, title: "Samarkand, 4am", plot: "Bread baked in a clay oven older than the city walls." },
      { season: 1, title: "Bursa Bites", plot: "A family argument over the correct number of layers." },
      { season: 1, title: "Xian Noodles", plot: "Hand-pulled, twelve thousand times a week." },
      { season: 2, title: "Lisbon Late", plot: "Custard tarts and a monk's handwritten recipe." },
      { season: 2, title: "Mombasa Grills", plot: "Spices that arrived by dhow and stayed forever." },
      { season: 2, title: "Home", plot: "The road ends where the cook was born." },
    ],
  },
  {
    title: "Redline Rally",
    group: "Motorsport",
    year: "2026",
    rating: "7.5",
    genre: "Sport / Reality",
    plot: "Follows three privateer rally teams across an entire season of mud, money problems and mechanical grief.",
    cast: "Featuring the Halden Rally Team",
    episodes: [
      { season: 1, title: "Scrutineering", plot: "The car passes, the budget does not." },
      { season: 1, title: "Stage Four", plot: "A hairpin, a hedge, and a gearbox." },
      { season: 1, title: "Service Park", plot: "Forty minutes to rebuild a weekend." },
      { season: 2, title: "Snowline", plot: "Studded tyres and thinner margins." },
      { season: 2, title: "Privateers", plot: "The championship nobody sponsors." },
      { season: 2, title: "Finish Control", plot: "One stage decides three seasons." },
    ],
  },
];

export const EPG_LIBRARY: Record<string, { title: string; description: string }[]> = {
  News: [
    { title: "Newsroom Live", description: "The latest headlines, business and sport from around the world." },
    { title: "The Day Briefing", description: "What matters in the next twelve hours, explained in twenty minutes." },
    { title: "Market Watch", description: "Live coverage of the European and US trading sessions." },
    { title: "World Report", description: "Field reporting from our correspondents on five continents." },
    { title: "The Interview", description: "A long-form conversation with a decision maker." },
    { title: "Late Bulletin", description: "Overnight developments and rolling coverage." },
  ],
  Sports: [
    { title: "Live: Premier League", description: "Full match coverage with build-up and post-match analysis." },
    { title: "Matchday Extra", description: "Every goal from every ground as it happens." },
    { title: "The Tactics Board", description: "Pundits break down the weekend's key moments." },
    { title: "Grand Slam Darts", description: "Semi-final night from the Winter Gardens." },
    { title: "Rally Highlights", description: "All the action from the mountain stages." },
    { title: "Courtside", description: "Live basketball with fourth quarter drama guaranteed." },
  ],
  Entertainment: [
    { title: "Primetime Premiere", description: "A brand new episode, ad-free from the start." },
    { title: "Late Night Talk", description: "Monologue, celebrity chat and a house band." },
    { title: "Binge Block", description: "Three back-to-back episodes of the cult favourite." },
    { title: "Reality Check", description: "The competition reaches its semi-final." },
    { title: "Comedy Hour", description: "Stand-up and sketch from the legendary studio." },
    { title: "Rewind", description: "Classic episodes restored in high definition." },
  ],
  Movies: [
    { title: "Evening Feature", description: "Tonight's headline movie, uninterrupted." },
    { title: "Action Double", description: "Two blockbusters back to back." },
    { title: "Late Movie", description: "Something darker for after midnight." },
    { title: "Family Film", description: "A crowd-pleaser for all ages." },
    { title: "Director's Cut", description: "The extended version with commentary." },
    { title: "Sunday Classic", description: "Restored in 4K from the original negative." },
  ],
  Documentary: [
    { title: "Wild Frontiers", description: "Predators on the floodplain at first light." },
    { title: "Deep Blue", description: "Life in the hadal zone, filmed for the first time." },
    { title: "Ancient Engineering", description: "How they built it without a single machine." },
    { title: "Planet Deep Field", description: "Astronomy's biggest questions, answered slowly." },
    { title: "Human Planet", description: "Communities living at the extremes." },
    { title: "Secret Histories", description: "Declassified files and fresh testimony." },
  ],
  Kids: [
    { title: "Adventure Hour", description: "Two episodes of the hit animated series." },
    { title: "Story Time", description: "Bedtime stories and songs for younger viewers." },
    { title: "Cartoon Party", description: "Non-stop laughs with the classic crew." },
    { title: "Craft Club", description: "Make something brilliant from a cereal box." },
    { title: "Science Tiny", description: "Big experiments for small scientists." },
    { title: "Movie Matinee", description: "An animated feature the whole family knows." },
  ],
  Music: [
    { title: "Chart Live", description: "The top forty countdown in full." },
    { title: "Unplugged Session", description: "Acoustic sets from the rooftop studio." },
    { title: "Club Hours", description: "Continuous DJ mixes, no interruptions." },
    { title: "Legacy", description: "The story of an album that changed everything." },
    { title: "New Noise", description: "Fresh releases and world premieres." },
    { title: "Jazz After Dark", description: "Standards and standards broken." },
  ],
  Regional: [
    { title: "Regional News", description: "Local headlines, weather and travel." },
    { title: "Tonight", description: "Current affairs from around the region." },
    { title: "Local Sport", description: "Full commentary of this afternoon's fixture." },
    { title: "Drama Series", description: "Episode four of the acclaimed local drama." },
    { title: "Gardens & Coast", description: "A gentle tour of the county's best plots." },
    { title: "Late Film", description: "A European classic with subtitles." },
  ],
};
