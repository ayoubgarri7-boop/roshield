/* ==========================================================
   outils/tests-regles.js : petits tests automatiques du vérificateur.

   Utilisation :  node outils/tests-regles.js
   Aucun lien n'est visité, aucune requête réseau : on analyse seulement du TEXTE
   avec la vraie logique de js/ (chargée telle quelle).

   Chaque ligne : [lien, réponse à la question, niveau attendu, titre attendu (ou null)].
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = vm.createContext({ URL: URL });
ctx.window = ctx;
["domaines.js", "textes-fr.js", "verificateur.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctx, { filename: f });
});
const analyser = ctx.window.RoShieldVerif.analyser;
const T = ctx.window.TEXTES_VERIF;

const CAS = [
  // --- Fichiers envoyés par des utilisateurs sur le CDN de Discord : domaine officiel, mais JAUNE ---
  ["https://cdn.discordapp.com/attachments/123/456/fichier.png", "inconnu", "jaune", "officielAttention"],
  ["https://media.discordapp.net/attachments/123/456/fichier.png", "inconnu", "jaune", "officielAttention"],
  ["https://cdn.discordapp.com/attachments/123/456/anydesk.exe", "inconnu", "jaune", "officielAttention"],
  ["https://cdn.discordapp.com/ATTACHMENTS/123/456/fichier.png", "inconnu", "jaune", "officielAttention"],
  ["https://cdn.discordapp.com/%61ttachments/123/456/fichier.png", "inconnu", "jaune", "officielAttention"],
  ["https://cdn.discordapp.com/attachments/123/456/fichier.png", "discord", "jaune", "officielAttention"],
  // --- Les autres liens Discord officiels restent VERTS ---
  ["https://discord.com/channels/123/456", "inconnu", "vert", "vert"],
  ["https://discord.gg/abc", "inconnu", "vert", "vert"],
  ["https://cdn.discordapp.com/avatars/123/456.png", "inconnu", "vert", "vert"],
  ["https://cdn.discordapp.com/emojis/123.webp", "inconnu", "vert", "vert"],
  ["https://www.roblox.com/users/123/profile", "inconnu", "vert", "vert"],
  // --- Un faux domaine qui copie /attachments/ n'est PAS officiel : il reste jaune (ou rouge avec la réponse) ---
  ["https://evil.test/attachments/123/456/fichier.png", "inconnu", "jaune", "jaune"],
  ["https://evil.test/attachments/123/456/fichier.png", "discord", "rouge", "nonOfficielDiscord"]
];

let echecs = 0;
CAS.forEach(function (c) {
  const r = analyser(c[0], c[1]);
  const ok = r.niveau === c[2] && r.titreCle === c[3];
  if (!ok) { echecs++; console.log("ÉCHEC : " + c[0] + " [" + c[1] + "] -> " + r.niveau + "/" + r.titreCle + " (attendu " + c[2] + "/" + c[3] + ")"); }
});
// L'explication forte doit être affichée sur un fichier envoyé par un utilisateur
const r = analyser("https://cdn.discordapp.com/attachments/123/456/fichier.png", "inconnu");
if (r.raisons.indexOf(T.fichierEnvoye) === -1) { echecs++; console.log("ÉCHEC : l'explication « fichier envoyé par un utilisateur » est absente"); }
const v = analyser("https://discord.com/channels/123/456", "inconnu");
if (v.raisons.indexOf(T.fichierEnvoye) !== -1) { echecs++; console.log("ÉCHEC : l'explication « fichier envoyé » apparaît sur un lien Discord ordinaire"); }

console.log((CAS.length + 2 - echecs) + " / " + (CAS.length + 2) + " tests réussis");
process.exit(echecs ? 1 : 0);
