/* ==========================================================
   domaines.js : les listes utilisées par le vérificateur.

   ⚠️ RÈGLE D'OR : on n'ajoute un domaine "officiel" que si on est
   CERTAIN qu'il appartient à Roblox ou Discord. Un faux "officiel"
   dans cette liste = un piège affiché en vert = très grave.
   En cas de doute, on le met dans DOMAINES_A_CONFIRMER (non utilisée).
   ========================================================== */

// ---------- 1. Domaines officiels (utilisés pour le vert) ----------
// Un sous-domaine est accepté automatiquement (ex: www.roblox.com, web.roblox.com).
window.DOMAINES_OFFICIELS = [
  // --- Roblox ---
  { domaine: "roblox.com",      note: "Site officiel de Roblox (et tous ses sous-domaines : www, web, create, devforum...)" },
  // ro.blox.com : confirmé par une page OFFICIELLE de Roblox, le 3 octobre 2026.
  // Page : https://create.roblox.com/docs/production/promotion/deeplinks (« Deep links »). Elle donne ce préfixe pour les
  // liens d'ouverture de l'app Roblox : « https://ro.blox.com/Ebh5? ». Seul « ro.blox.com » (et ses sous-domaines) est officiel,
  // PAS « blox.com » : evil.blox.com et blox.com restent rouges.
  { domaine: "ro.blox.com",     note: "Liens d'ouverture de l'app Roblox (deep links), cités par create.roblox.com" },

  // --- Discord ---
  { domaine: "discord.com",     note: "Site et application web officiels de Discord" },
  { domaine: "discord.gg",      note: "Raccourci officiel des liens d'invitation vers un serveur Discord" },
  { domaine: "discordapp.com",  note: "Ancien domaine officiel de Discord (encore utilisé, par exemple pour les fichiers : cdn.discordapp.com)" },
  { domaine: "discordapp.net",  note: "Domaine officiel de Discord pour les images et fichiers (media.discordapp.net)" },
  { domaine: "discord.gift",    note: "Raccourci officiel des liens de cadeaux Nitro" }
];

// ---------- 2. Domaines À CONFIRMER (NON utilisés pour le moment) ----------
// Ils sont probablement liés à Roblox/Discord (cités par des listes de la
// communauté), mais je n'ai pas trouvé de page OFFICIELLE qui le confirme.
// Tant que ce n'est pas confirmé, on ne les met pas en vert.
// Ils sont donc affichés "domaine inconnu" (jaune) ou "imitation" selon le cas.
window.DOMAINES_A_CONFIRMER = [
  "rbxcdn.com",      // serveur d'images/fichiers de Roblox (très probable)
  "robloxlabs.com",  // domaine interne de Roblox (probable)
  "roblox.link",     // liens de partage Roblox (à confirmer)
  "rblx.co",         // raccourci Roblox (à confirmer)
  // (ro.blox.com est maintenant confirmé et listé plus haut ; « blox.com » lui-même ne l'est PAS)
  "discord.media",   // serveurs vocaux Discord (jamais dans un lien cliqué)
  "dis.gd",          // raccourci Discord (à confirmer)
  "discordstatus.com", // page d'état de Discord (à confirmer)
  "discord.new"      // modèles de serveurs Discord (à confirmer)
];

// ---------- 3. Mots de MARQUE et mots d'ARNAQUE dans le nom d'hôte ----------
// Règle sur le NOM D'HÔTE d'un domaine NON officiel (pas sur le chemin) :
//   - un mot de marque + un mot d'arnaque  -> ROUGE        (roblox-free.example, discord-gift.example)
//   - un mot de marque tout seul           -> JAUNE avec alerte forte (todoroblox.example : on ne peut pas savoir)
// « robux » est dans les deux listes : seul il donne l'alerte jaune, avec un AUTRE mot d'arnaque (free-robux) il est rouge.
//
// MOTS ENTIERS : les séparateurs d'un nom d'hôte sont le point et le tiret. Un mot court ou courant n'est compté que
// s'il est un morceau ENTIER du nom : "hackathon-roblox.example" ne contient pas le mot "hack", "nitrogen.example"
// ne contient pas le mot "nitro". Cela évite de rendre rouges des sites honnêtes à cause d'un mot courant.

// Mots de marque cherchés comme MORCEAUX (même collés à autre chose : todoroblox, robloxfans, discordance)
window.MOTS_MARQUE_MORCEAUX = ["roblox", "discord", "robux"];
// Mots de marque courts, cherchés comme MOTS ENTIERS seulement ("nitrogen" et "rbxcdn" ne comptent pas)
window.MOTS_MARQUE_ENTIERS = ["rbx", "nitro"];
// Mots d'arnaque, cherchés comme MOTS ENTIERS
window.MOTS_ARNAQUE = [
  "free", "gratuit", "gratuite", "robux", "gift", "cadeau", "claim", "generator", "generateur", "hack", "cheat",
  "verify", "verification", "login", "signin", "unban", "giveaway", "reward", "support", "account", "official",
  // Pluriels : "free-robux-gifts.test", "robux-generators.test", "daily-rewards-roblox.test" (un mot entier "gift" ne suffit pas)
  "gratuits", "gifts", "rewards", "cheats", "hacks", "generators", "giveaways"
];
// Formes COLLÉES connues : des noms d'arnaque très répandus, écrits sans séparateur. Chacune est cherchée comme
// morceau du nom d'hôte, et suffit à rendre le lien rouge (elle contient déjà une marque ET un mot d'arnaque).
window.FORMES_COLLEES = [
  "freerobux",       // "free robux" collé : le piège le plus répandu
  "robuxfree",       // la même chose à l'envers
  "robuxgenerator",  // faux "générateur de Robux"
  "robuxgen",        // version courte du faux générateur
  "freenitro",       // "free nitro" collé : faux cadeau Discord
  "nitrofree",       // la même chose à l'envers
  "robloxhack",      // faux "hack" Roblox
  "robloxgift",      // faux cadeau Roblox
  "robloxlogin",     // fausse page de connexion Roblox
  "discordnitro",    // "Discord Nitro" collé : faux Nitro
  "giftnitro"        // "gift nitro" collé : faux cadeau Nitro
];
// Mots-clés pour repérer les chiffres à la place des lettres (rob1ox -> roblox), voir normaliser().
window.MOTS_CLES = ["roblox", "discord", "robux", "nitro"];

// Hôtes EXACTS dispensés des règles sur le mot de marque dans le nom d'hôte (c, d, e), et seulement d'elles.
// Exemple : roblox.fandom.com est le wiki communautaire de Roblox, hébergé par Fandom : un joueur
// le rencontre vraiment. Le mot « roblox » y est dans le NOM DE SOUS-DOMAINE, pas dans le domaine réel (fandom.com).
// ATTENTION : la comparaison est EXACTE. N'importe quel autre sous-domaine de fandom.com
// (roblox-gratuit.fandom.com : mot d'arnaque -> rouge ; robux.fandom.com : alerte jaune) n'est PAS exempté : n'importe qui peut en créer un.
// Ces hôtes restent JAUNES (domaine inconnu) avec « autre chose », et ROUGES avec « page Roblox / Discord ».
// Les règles a) et b) (imitation d'un domaine officiel) s'appliquent toujours.
window.HOTES_SANS_MOT_CLE = ["roblox.fandom.com"];

// Noms "de base" des vrais sites, pour repérer les fautes de frappe
// volontaires (rob1ox, dlscord...). "discordapp" est le nom de l'ancien domaine.
window.NOMS_OFFICIELS = ["roblox", "discord", "discordapp", "robux", "nitro"];

// ---------- 4. Raccourcisseurs de liens ----------
// On ne peut pas savoir où ils mènent juste en lisant le lien.
window.RACCOURCISSEURS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy",
  "ow.ly", "buff.ly", "shorturl.at", "tiny.cc", "rebrand.ly", "t.ly",
  "s.id", "v.gd", "shorte.st", "adf.ly", "lnkd.in", "bl.ink"
];
