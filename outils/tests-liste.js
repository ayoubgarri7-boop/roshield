/* ==========================================================
   outils/tests-liste.js : tests de la liste de liens signalés (js/blocklist.json).

   Utilisation :  node outils/tests-liste.js
   Aucun lien n'est visité. La partie 1 utilise une petite liste INVENTÉE (domaines .test et .invalid) ;
   la partie 2 vérifie que js/blocklist.json ne fait sortir en rouge AUCUN de nos liens honnêtes ou officiels.
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const maj = require("./maj-liste.js");

let echecs = 0, total = 0;
function verif(ok, msg) { total++; if (!ok) { echecs++; console.log("ÉCHEC : " + msg); } }

function nouveauContexte() {
  const ctx = vm.createContext({ URL: URL });
  ctx.window = ctx;
  ["domaines.js", "textes-fr.js", "verificateur.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctx, { filename: f });
  });
  return ctx.window;
}

// ---------- 1. Petite liste inventée ----------
const ENTREES = [
  "phish-roblox.test",                                      // domaines : hôte dédié
  "https://roblox-gift.invalid/login",                       // liens : hôte dédié
  "https://roblox-fake.pages.dev/login",                     // hôte partagé : lien EXACT seulement
  "https://pastebin.com/raw/robloxabc",                      // hôte partagé : lien EXACT seulement
  "https://cdn.discordapp.com/attachments/1/2/virus.exe",    // domaine OFFICIEL : lien EXACT seulement
  "https://example.test/rien-a-voir",                        // ne parle pas de Roblox / Discord : jamais gardé
  "https://mairie-exemple.test/wp-content/roblox-gift/login.php",   // hôte SANS signal (site piraté) : lien EXACT seulement
  "https://piratee.test/f/a1b2c3d4e5f6g7h8i9j0rbxk12345",     // la marque n'est que dans une suite aléatoire : écartée
  "https://dicsold.test/nitro/login.php"                      // libellé à 2 fautes de "discord" : promu hôte dédié par la fabrication de la liste
];
const W = nouveauContexte();
const res = maj.construireListe(ENTREES, { logique: W });
W.RoShieldVerif.chargerListe(res.donnees);
const an = W.RoShieldVerif.analyser;
function titre(lien, rep) { const r = an(lien, rep || "inconnu"); return r.erreur ? "erreur" : r.niveau + "/" + r.titreCle; }

verif(res.donnees.nbHotes === 3, "3 hôtes dédiés attendus, trouvé " + res.donnees.nbHotes);
verif(res.donnees.nbLiens === 4, "4 liens exacts attendus, trouvé " + res.donnees.nbLiens);
// hôte dédié : comparé au nom d'hôte COMPLET
verif(titre("https://phish-roblox.test/n-importe-quoi") === "rouge/signale", "hôte dédié -> rouge « signale »");
verif(titre("https://roblox-gift.invalid/") === "rouge/signale", "hôte dédié (2) -> rouge « signale »");
verif(titre("https://autre.phish-roblox.test/") !== "rouge/signale", "un sous-domaine d'un hôte dédié n'est pas dans la liste");
// hôte dédié promu par la fabrication de la liste (libellé proche de "discord") : TOUTES ses pages sont rouges
verif(titre("https://dicsold.test/") === "rouge/signale", "hôte promu : page d'accueil -> rouge");
verif(titre("https://dicsold.test/nitro/login.php") === "rouge/signale", "hôte promu : page listée -> rouge");
verif(titre("https://dicsold.test/une/autre/page") === "rouge/signale", "hôte promu : une autre page -> rouge");
verif(titre("https://www.dicsold.test/") !== "rouge/signale", "un autre nom d'hôte (www.) n'est pas dans la liste");
verif(maj.libelleProcheDeMarque("dicsold.test") && maj.libelleProcheDeMarque("diczord.xyz") && !maj.libelleProcheDeMarque("nitrox.test") && !maj.libelleProcheDeMarque("abc.test"), "la proximité d'un libellé avec roblox / discord (jamais nitro, au moins 6 lettres)");
// hôte SANS signal (site piraté, administration...) : seulement le lien EXACT, jamais la page d'accueil ni les autres pages
verif(titre("https://mairie-exemple.test/wp-content/roblox-gift/login.php") === "rouge/signale", "lien exact d'un hôte sans signal -> rouge");
verif(titre("https://mairie-exemple.test/") !== "rouge/signale" && !/^rouge/.test(titre("https://mairie-exemple.test/")), "la page d'accueil d'un hôte qui n'est que dans les liens exacts n'est PAS rouge : " + titre("https://mairie-exemple.test/"));
verif(!/^rouge/.test(titre("https://mairie-exemple.test/contact")), "une autre page de cet hôte n'est PAS rouge");
verif(res.donnees.hotes.indexOf("mairie-exemple.test") === -1, "cet hôte sans signal n'est pas dans « hotes »");
// bruit : marque seulement dans une suite aléatoire, hôte sans signal -> écartée de la liste
verif(!/signale/.test(titre("https://piratee.test/f/a1b2c3d4e5f6g7h8i9j0rbxk12345")), "entrée dont la marque n'est que dans une suite aléatoire -> écartée");
// hôte partagé : lien exact seulement, jamais l'hôte seul
verif(titre("https://roblox-fake.pages.dev/login") === "rouge/signale", "lien exact sur pages.dev -> rouge");
verif(titre("HTTP://Roblox-Fake.pages.dev/login/?x=1#a") === "rouge/signale", "même lien : majuscules, http, requête, ancre -> rouge");
verif(titre("https://roblox-fake.pages.dev/autre-page") !== "rouge/signale", "autre page du même hôte partagé -> pas dans la liste");
verif(titre("https://pages.dev/") !== "rouge/signale", "l'hébergeur lui-même -> pas dans la liste");
verif(titre("https://pastebin.com/raw/robloxabc") === "rouge/signale", "lien exact sur pastebin.com -> rouge");
verif(titre("https://pastebin.com/raw/autrechose") !== "rouge/signale", "autre lien pastebin.com -> pas dans la liste");
// domaine officiel : jamais rouge au niveau de l'hôte ; un fichier précis peut l'être
verif(titre("https://cdn.discordapp.com/attachments/1/2/virus.exe") === "rouge/signaleFichier", "fichier précis sur un domaine officiel -> rouge « signaleFichier »");
verif(titre("https://cdn.discordapp.com/attachments/1/2/autre.png") === "jaune/officielAttention", "autre fichier du CDN Discord -> jaune, pas rouge");
verif(titre("https://cdn.discordapp.com/avatars/1/2.png") === "vert/vert", "avatar du CDN Discord -> vert");
verif(titre("https://discord.com/channels/1/2") === "vert/vert", "discord.com -> vert");
// avec la réponse « page Roblox » : un lien listé reste rouge, un domaine officiel ne change pas
verif(titre("https://phish-roblox.test/", "roblox") === "rouge/signale", "lien listé + « page Roblox » -> garde son titre « signale »");
verif(titre("https://cdn.discordapp.com/attachments/1/2/virus.exe", "roblox") === "rouge/signaleFichier", "fichier listé + « page Roblox » -> rouge « signaleFichier »");
// aucun domaine officiel, aucun hébergeur partagé dans « hotes »
verif(res.donnees.hotes.every(function (h) { return !/discordapp|pages\.dev|pastebin/.test(h); }), "aucun domaine officiel ni hébergeur dans « hotes »");
// textes : jamais « prouvé », jamais « ce site » pour un fichier d'un domaine officiel
const T = W.TEXTES_VERIF;
["signale", "signaleFichier"].forEach(function (k) { verif(!/prouv/i.test(T.titres[k]), "le titre « " + k + " » ne dit pas « prouvé »"); });
verif(!/prouv/i.test(T.listeHote + T.listeLien + T.listeFichier), "les explications ne disent jamais « prouvé »");
verif(!/ce site/i.test(T.titres.signaleFichier + T.listeFichier), "un fichier d'un domaine officiel n'est jamais « ce site »");
// exceptions : retirer une erreur
const res2 = maj.construireListe(ENTREES, { logique: W, exceptions: { hotes: ["phish-roblox.test"], liens: ["https://pastebin.com/raw/robloxabc"] } });
verif(res2.donnees.nbHotes === 2 && res2.donnees.nbLiens === 3, "les exceptions retirent bien 1 hôte et 1 lien");
// taille
verif(res.octets < 300 * 1024, "la liste fait moins de 300 Ko");

// ---------- 2. La vraie liste : aucun lien honnête ou officiel ne doit en sortir rouge ----------
const fichierListe = path.join(__dirname, "..", "js", "blocklist.json");
if (fs.existsSync(fichierListe)) {
  const W2 = nouveauContexte();
  const donnees = JSON.parse(fs.readFileSync(fichierListe, "utf8"));
  W2.RoShieldVerif.chargerListe(donnees);
  const liens = [];
  ["liens-honnetes.txt", "liens-officiels.txt"].forEach(function (f) {
    fs.readFileSync(path.join(__dirname, "evaluation", f), "utf8").split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (l && l[0] !== "#") liens.push(l);
    });
  });
  let signales = 0;
  liens.forEach(function (l) {
    ["inconnu", "roblox", "discord"].forEach(function (rep) {
      const r = W2.RoShieldVerif.analyser(l, rep);
      if (r.titreCle === "signale" || r.titreCle === "signaleFichier") { signales++; console.log("  signalé à tort ? " + l); }
    });
  });
  verif(signales === 0, "des liens honnêtes ou officiels sortent « signalé » avec la vraie liste (" + signales + ")");
  // sanité : aucun hôte officiel dans « hotes »
  if (!donnees.hotesEmpreintes) {
    const officiels = W2.DOMAINES_OFFICIELS.map(function (d) { return d.domaine; });
    const mauvais = donnees.hotes.filter(function (h) { return officiels.some(function (o) { return h === o || h.endsWith("." + o); }); });
    verif(mauvais.length === 0, "des hôtes officiels sont dans la liste (" + mauvais.length + ")");
  }
  console.log("Vraie liste : " + donnees.nbHotes + " hôtes dédiés, " + donnees.nbLiens + " liens exacts, " + liens.length + " liens honnêtes/officiels vérifiés.");
} else {
  console.log("(js/blocklist.json absent : partie 2 ignorée)");
}

console.log((total - echecs) + " / " + total + " tests réussis");
process.exit(echecs ? 1 : 0);
