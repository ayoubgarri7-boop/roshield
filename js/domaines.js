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
