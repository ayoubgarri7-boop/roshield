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
  ["https://evil.test/attachments/123/456/fichier.png", "discord", "rouge", "nonOfficielDiscord"],
  // --- Faute de frappe d'un caractère dans un long morceau du nom d'hôte (roblox / discord) : ROUGE ---
  ["https://discrod-egift.example/", "inconnu", "rouge", "rouge"],
  ["https://dlscordapps.example/", "inconnu", "rouge", "rouge"],
  ["https://dicsord-summer.example/", "inconnu", "rouge", "rouge"],
  // --- Mots honnêtes proches de "discord" : JAMAIS rouges avec « autre chose » (jaune simple, ou alerte si "discord" y figure) ---
  ["https://discard.example/", "inconnu", "jaune", "jaune"],
  ["https://discarded-ideas.example/", "inconnu", "jaune", "jaune"],
  ["https://discorde.example/", "inconnu", "jaune", "alerteMarque_discord"],
  ["https://pomme-de-discorde.example/", "inconnu", "jaune", "alerteMarque_discord"],
  ["https://discordance-musicale.example/", "inconnu", "jaune", "alerteMarque_discord"],
  ["https://discordant.example/", "inconnu", "jaune", "alerteMarque_discord"],
  // --- "nitro" n'est pas concerné par la faute de frappe dans un morceau ("intro" est un vrai mot) ---
  ["https://intro-guides.example/", "inconnu", "jaune", "jaune"],
  // --- Ce qui entoure l'adresse est ignoré (jamais une erreur, jamais une accusation) ---
  ["[https://exemple.com", "inconnu", "jaune", "jaune"],
  ["[https://exemple.com]", "inconnu", "jaune", "jaune"],
  ["[exemple.com", "inconnu", "jaune", "jaune"],
  ["<https://exemple.com/page>", "inconnu", "jaune", "jaune"],
  ["(https://exemple.com/page)", "inconnu", "jaune", "jaune"],
  ["\"https://exemple.com/page\"", "inconnu", "jaune", "jaune"],
  ["https://exemple.com/page).", "inconnu", "jaune", "jaune"],
  ["https://www.roblox.com/home]", "inconnu", "vert", "vert"],
  ["[https://[::1]/x", "inconnu", "rouge", "rouge"],
  // --- Adresses « défendues » (hxxp, [.]) : analysées comme les adresses normales ---
  ["hxxps://exemple[.]com/page", "inconnu", "jaune", "jaune"],
  ["exemple[.]com", "inconnu", "jaune", "jaune"],
  ["hxxps://www[.]roblox[.]com/home", "inconnu", "vert", "vert"],
  ["[hxxps://www[.]roblox[.]com/home", "inconnu", "vert", "vert"],
  ["<hxxps://www[.]roblox[.]com/home>", "inconnu", "vert", "vert"],
  ["hxxps://www[.]roblox[.]com[.]evil[.]test/home", "inconnu", "rouge", "rouge"],
  // --- [texte](adresse) : le texte n'est pas une adresse -> on analyse l'adresse réelle ---
  ["[Mon site](https://exemple.com)", "inconnu", "jaune", "jaune"],
  ["[Voir mon profil](https://www.roblox.com/users/123/profile)", "inconnu", "vert", "vert"],
  ["[https://exemple.com](https://exemple.com/page)", "inconnu", "jaune", "jaune"],
  ["[https://www.roblox.com/home](https://www.roblox.com/home)", "inconnu", "vert", "vert"],
  ["[Discord (logiciel)](https://en.wikipedia.org/wiki/Discord_(software))", "inconnu", "jaune", "jaune"],
  // --- [adresse affichée](adresse différente) : alerte forte, ROUGE si le texte affiche un site officiel ---
  ["[exemple.com](https://autre.test/x)", "inconnu", "jaune", "adresseAfficheeJaune"],
  ["[https://www.roblox.com/home](https://autre.test/login)", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[www.discord.com/invite/abc](https://autre.test/x)", "inconnu", "rouge", "adresseAfficheeRouge"],
  // --- Le piège de la liste : faux profil Roblox (espaces, « : » oublié, parenthèses manquantes) -> toujours ROUGE ---
  ["[hxxps://[www.roblox.com/users/](https://www.roblox.com/users/) 123/profil e](hxxps://court.test/abc)", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[hxxps//[www.roblox.com/users/](https://www.roblox.com/users/) 123/profil e](hxxps//court.test/abc)", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[hxxps://[www.roblox.com/users/](https://www.roblox.com/users/ 123/profil e](hxxps://court.test/abc", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[hxxps://www[.]roblox[.]com/users/123/profile](https://court.test/abc)", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[hxxps://[www.roblox.com/users/](https://www.roblox.com/users/) 123/profil e](hxxps://court.test/abc)", "roblox", "rouge", "adresseAfficheeRouge"],
  ["[hxxps://[www.roblox.com/users/](https://www.roblox.com/users/) 123/profil e](hxxps://court.test/abc)", "discord", "rouge", "adresseAfficheeRouge"],
  // --- Raccourcisseur : seul = jaune (note « destination cachée ») ; derrière un texte qui affiche un site officiel = ROUGE ---
  ["https://bit.ly/abc123", "inconnu", "jaune", "jaune"],
  ["[Mon profil](https://bit.ly/abc123)", "inconnu", "jaune", "jaune"],
  ["[https://www.roblox.com/users/123/profile](https://bit.ly/abc123)", "inconnu", "rouge", "adresseAfficheeRouge"],
  ["[https://discord.gg/abc](https://tinyurl.com/x)", "inconnu", "rouge", "adresseAfficheeRouge"]
];

let echecs = 0;
CAS.forEach(function (c) {
  const r = analyser(c[0], c[1]);
  const ok = r.niveau === c[2] && r.titreCle === c[3];
  if (!ok) { echecs++; console.log("ÉCHEC : " + c[0] + " [" + c[1] + "] -> " + r.niveau + "/" + r.titreCle + " (attendu " + c[2] + "/" + c[3] + ")"); }
});
// Le piège « faux profil Roblox » ne doit JAMAIS sortir jaune ni vert, quelle que soit la réponse (ou l'absence de réponse)
const PIEGE = "[hxxps://[www.roblox.com/users/](https://www.roblox.com/users/) 123/profil e](hxxps://court.test/abc)";
[undefined, null, "inconnu", "roblox", "discord", "n'importe quoi"].forEach(function (rep) {
  const rp = analyser(PIEGE, rep);
  if (rp.niveau !== "rouge" || rp.titreCle !== "adresseAfficheeRouge") { echecs++; console.log("ÉCHEC : le piège sort " + rp.niveau + "/" + rp.titreCle + " avec la réponse " + rep); }
});
// Un raccourcisseur seul affiche la note « destination cachée »
const racc = analyser("https://bit.ly/abc123", "inconnu");
if (!racc.notes.some(function (n) { return /Destination cach/.test(n); })) { echecs++; console.log("ÉCHEC : pas de note « destination cachée » sur un raccourcisseur"); }
// Un lien qui entoure l'adresse ne doit jamais être une erreur, ni changer le niveau d'un lien honnête ou officiel
function lire(f) {
  return fs.readFileSync(path.join(__dirname, "evaluation", f), "utf8").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) {
    // on écarte les lignes déjà emballées ou défendues (elles sont testées plus haut, à la main)
    return l && l[0] !== "#" && !/^([\[<("']|hxxp)/i.test(l) && !/\)\.$/.test(l) && !/\[\.\]/.test(l);
  });
}
const BASES = lire("liens-honnetes.txt").concat(lire("liens-officiels.txt"));
function defendre(l) {
  const m = l.match(/^https?:\/\/([^\/?#]+)(.*)$/i);
  if (!m || /[\[\]]/.test(l.split(/[?#]/)[0])) return null;
  return l.replace(/^http/i, "hxxp").replace(m[1], m[1].replace(/\./g, "[.]"));
}
let compares = 0;
BASES.forEach(function (b) {
  const nu = analyser(b, "inconnu");
  const formes = ["[" + b, "[" + b + "]", "<" + b + ">", "[Mon texte](" + b + ")", "[" + b + "](" + b + ")"];
  const d = defendre(b); if (d) formes.push(d);
  formes.forEach(function (f) {
    compares++;
    const r = analyser(f, "inconnu");
    if (r.erreur || r.niveau !== nu.niveau || r.titreCle !== nu.titreCle) {
      echecs++; console.log("ÉCHEC : forme entourée différente de la forme nue : " + f.slice(0, 80) + " -> " + (r.erreur ? "erreur" : r.niveau + "/" + r.titreCle) + " (nu : " + (nu.erreur ? "erreur" : nu.niveau + "/" + nu.titreCle) + ")");
    }
  });
});
console.log("Formes entourées ou défendues comparées à la forme nue : " + compares + " comparaisons");

// Liens PIÉGÉS emballés de la même façon : jamais MOINS graves que leur forme nue (vert 0 < jaune 1 < rouge 2), avec chaque réponse
const GRAVITE = { vert: 0, jaune: 1, rouge: 2 };
const PIEGES = lire("pieges-synthetiques.txt");
let comparesPieges = 0, moinsGraves = 0;
PIEGES.forEach(function (b) {
  const formes = ["[" + b, "[" + b + "]", "<" + b + ">", "[Mon texte](" + b + ")", "[" + b + "](" + b + ")"];
  const d = defendre(b); if (d) formes.push(d);
  ["inconnu", "roblox", "discord"].forEach(function (rep) {
    const nu = analyser(b, rep);
    if (nu.erreur) return;
    formes.forEach(function (f) {
      comparesPieges++;
      const r = analyser(f, rep);
      if (r.erreur || GRAVITE[r.niveau] < GRAVITE[nu.niveau]) {
        moinsGraves++; echecs++;
        console.log("ÉCHEC : piège emballé MOINS grave que sa forme nue [" + rep + "] : " + f.slice(0, 80) + " -> " + (r.erreur ? "erreur" : r.niveau) + " (nu : " + nu.niveau + ")");
      }
    });
  });
});
console.log("Pièges emballés comparés à leur forme nue : " + comparesPieges + " comparaisons (" + PIEGES.length + " pièges), moins graves : " + moinsGraves);
// L'explication forte doit être affichée sur un fichier envoyé par un utilisateur
const r = analyser("https://cdn.discordapp.com/attachments/123/456/fichier.png", "inconnu");
if (r.raisons.indexOf(T.fichierEnvoye) === -1) { echecs++; console.log("ÉCHEC : l'explication « fichier envoyé par un utilisateur » est absente"); }
const v = analyser("https://discord.com/channels/123/456", "inconnu");
if (v.raisons.indexOf(T.fichierEnvoye) !== -1) { echecs++; console.log("ÉCHEC : l'explication « fichier envoyé » apparaît sur un lien Discord ordinaire"); }

console.log(echecs === 0 ? "Tous les tests réussis (" + (CAS.length + 2) + " cas + comparaisons)" : echecs + " échec(s)");
process.exit(echecs ? 1 : 0);
