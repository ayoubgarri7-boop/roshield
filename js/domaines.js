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
  "blox.com",        // ro.blox.com : liens de mails Roblox (à confirmer)
  "discord.media",   // serveurs vocaux Discord (jamais dans un lien cliqué)
  "dis.gd",          // raccourci Discord (à confirmer)
  "discordstatus.com", // page d'état de Discord (à confirmer)
  "discord.new"      // modèles de serveurs Discord (à confirmer)
];

// ---------- 3. Mots-clés qui attirent les arnaqueurs ----------
// Si un domaine NON officiel contient un de ces mots, c'est très suspect.
window.MOTS_CLES = ["roblox", "discord", "robux", "nitro"];

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

// ---------- 5. Grands sites tiers connus (utilisés SEULEMENT avec la question du vérificateur) ----------
// Quand le message parlait de Roblox ou de Discord, que le lien n'est PAS officiel, mais que son vrai
// domaine est un de ces grands sites, le résultat est gris-bleu ("c'est un autre site connu") au lieu de rouge.
// Ce n'est PAS un verdict de confiance : on dit seulement "ce n'est pas Roblox / Discord, c'est un autre site connu".
//
// RÈGLES POUR AJOUTER UN DOMAINE :
//  - la liste reste COURTE ;
//  - on compare le VRAI domaine (les sous-domaines comptent : fr.wikipedia.org), jamais le chemin du lien ;
//    youtube.com.evil.test n'est donc PAS youtube.com ;
//  - JAMAIS un hébergeur où n'importe qui peut publier une page : github.io, pages.dev, netlify.app,
//    vercel.app, blogspot.com, weebly.com, wixsite.com, sites.google.com, web.app, glitch.me...
//  - "hotes" (facultatif) : si présent, seuls ces noms EXACTS sont acceptés (pas les sous-domaines).
window.DOMAINES_TIERS_CONNUS = [
  { domaine: "youtube.com",   note: "YouTube : vidéos (liens youtube.com/watch...)" },
  { domaine: "youtu.be",      note: "Liens courts officiels de YouTube" },
  { domaine: "reddit.com",    note: "Reddit : forum (liens reddit.com/r/...)" },
  { domaine: "wikipedia.org", note: "Wikipédia et ses langues (en.wikipedia.org, fr.wikipedia.org...)" },
  // GitHub : noms exacts seulement. PAS gist.github.com ni github.io, où n'importe qui publie (donc rouge).
  { domaine: "github.com",    hotes: ["github.com", "www.github.com"], note: "GitHub : code et documentation (github.com/Roblox/...)" },
  { domaine: "twitch.tv",     note: "Twitch : vidéos en direct" },
  { domaine: "x.com",         note: "X, le nouveau nom de Twitter : réseau social" },
  { domaine: "twitter.com",   note: "Twitter, ancien nom de X" },
  { domaine: "tiktok.com",    note: "TikTok : vidéos courtes" },
  { domaine: "fandom.com",    note: "Fandom : wikis de jeux (chaque wiki est un sous-domaine, ex. roblox.fandom.com)" },
  // Google : seulement la page d'accueil/recherche. PAS les sous-domaines (sites.google.com, docs.google.com,
  // drive.google.com, forms...) où n'importe qui peut publier une page ou un formulaire.
  { domaine: "google.com",    hotes: ["google.com", "www.google.com"], note: "Google : moteur de recherche (noms exacts uniquement)" }
];
