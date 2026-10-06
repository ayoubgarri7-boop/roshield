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
  // --- Règle finale : mots d'appât ROBUX / NITRO dans le NOM D'HÔTE d'un domaine non officiel : ROUGE ---
  ["https://free-robux.xyz/", "inconnu", "rouge", "rouge"],
  ["https://discord-nitro.gift/", "inconnu", "rouge", "rouge"],
  ["https://robux.example/", "inconnu", "rouge", "rouge"],
  ["https://nitro.example/", "inconnu", "rouge", "rouge"],
  ["https://nitro-gratuit.example/", "inconnu", "rouge", "rouge"],
  ["https://giveaway-robux.example/", "inconnu", "rouge", "rouge"],
  ["https://promo-nitro.example/", "inconnu", "rouge", "rouge"],
  ["https://freenitro.example/", "inconnu", "rouge", "rouge"],
  ["https://mes-robux-gratuits.example/", "inconnu", "rouge", "rouge"],
  // « roblox » ou « discord » SEULS dans le nom : jaune avec alerte forte (rouge seulement avec un mot d'arnaque)
  ["https://roblox-fans.example/", "inconnu", "jaune", "alerteMarque_roblox"],
  ["https://todoroblox.example/", "inconnu", "jaune", "alerteMarque_roblox"],
  ["https://roblox-free.example/", "inconnu", "rouge", "rouge"],
  ["https://discord-login.example/", "inconnu", "rouge", "rouge"],
  ["https://roblox.fandom.com/wiki/Gear", "inconnu", "jaune", "jaune"],
  ["https://roblox-gratuit.fandom.com/", "inconnu", "rouge", "rouge"],
  ["https://nitrogen.example/", "inconnu", "jaune", "jaune"],
  ["https://rbxcdn.example/", "inconnu", "jaune", "jaune"],
  // --- Dans le CHEMIN d'un domaine non officiel : jaune avec alerte plus forte, JAMAIS rouge ---
  ["https://exemple.com/robux", "inconnu", "jaune", "alerteAppatChemin"],
  ["https://exemple.com/nitro/claim", "inconnu", "jaune", "alerteAppatChemin"],
  ["https://exemple.com/?offre=free-robux", "inconnu", "jaune", "alerteAppatChemin"],
  ["https://exemple.com/a/b/RoBuX-gratuits", "inconnu", "jaune", "alerteAppatChemin"],
  ["https://www.reddit.com/r/roblox/comments/1/free_robux_scam_warning/", "inconnu", "jaune", "alerteAppatChemin"],
  ["https://exemple.com/robux", "roblox", "rouge", "nonOfficielRoblox"],
  // --- Marque (roblox / discord) dans le CHEMIN avec un mot de piège : jaune ALERTE FORTE « Attention », jamais rouge ---
  ["https://exemple.test/roblox/login", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/verify?service=discord", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://login-exemple.test/roblox", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/groups/1/roblox-official", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/join/roblox-friends-1", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/steam-gift-card-roblox-1710", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/discord-claim", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/roblox-unban/appeal", "inconnu", "jaune", "alerteMarqueChemin"],
  ["https://exemple.test/%72oblox/login", "inconnu", "jaune", "alerteMarqueChemin"],
  // --- Liens honnêtes proches (blog, vidéo, wiki, presse qui parlent de Roblox) : PAS d'alerte forte (jaune simple) ---
  ["https://www.youtube.com/watch?v=abc&list=roblox-tips", "inconnu", "jaune", "jaune"],
  ["https://www.youtube.com/@RobloxLearn", "inconnu", "jaune", "jaune"],
  ["https://blog.example/2025/roblox-ugc-update", "inconnu", "jaune", "jaune"],
  ["https://devforum.example/t/roblox-studio-tips/123", "inconnu", "jaune", "jaune"],
  ["https://en.wikipedia.org/wiki/Roblox", "inconnu", "jaune", "jaune"],
  ["https://www.bbc.co.uk/news/articles/roblox-ban-in-russia", "inconnu", "jaune", "jaune"],
  ["https://exemple.test/discord-server-templates", "inconnu", "jaune", "jaune"],
  ["https://exemple.test/news/roblox-login-scam-warning", "inconnu", "jaune", "jaune"],    // article d'avertissement : pas d'alerte forte
  ["https://exemple.test/how-to-avoid-roblox-phishing-login-pages", "inconnu", "jaune", "jaune"],
  ["https://exemple.test/verify-your-account", "inconnu", "jaune", "jaune"],               // mots de piège SANS marque : inchangé
  ["https://verify-56ncg.test/account", "inconnu", "jaune", "jaune"],
  ["https://bit.ly/abc123", "inconnu", "jaune", "jaune"],                                  // raccourcisseur : inchangé
  // --- « roblox » / « discord » COUPÉ par des tirets, des points ou des chiffres (ro-blox, dis-cord) : ROUGE ---
  ["https://ro-blox.test/home", "inconnu", "rouge", "rouge"],
  ["https://dis-cord.test/", "inconnu", "rouge", "rouge"],
  ["https://r0-blox.test/", "inconnu", "rouge", "rouge"],
  ["https://d1-scord.test/", "inconnu", "rouge", "rouge"],
  ["https://ro.blox.example/", "inconnu", "rouge", "rouge"],
  ["https://free-ro-blox.example/", "inconnu", "rouge", "rouge"],
  ["https://d-i-s-c-o-r-d.example/", "inconnu", "rouge", "rouge"],                          // « discord » écrit lettre par lettre avec des tirets : rouge
  ["https://pro-bloxburg.example/", "inconnu", "jaune", "jaune"],                          // « bloxburg » est un vrai jeu : pas « roblox » coupé
  ["https://bloxburg-fans.example/", "inconnu", "jaune", "jaune"],
  ["https://micro-blox.example/", "inconnu", "jaune", "jaune"],
  ["https://ro.blox.com/Ebh5", "inconnu", "vert", "vert"],                                  // officiel : vert avant toute règle
  // --- Les domaines officiels restent VERTS avant toute autre règle (même avec robux / nitro dans le nom ou le chemin) ---
  ["https://www.roblox.com/catalog", "inconnu", "vert", "vert"],
  ["https://www.roblox.com/robux", "inconnu", "vert", "vert"],
  ["https://robux.roblox.com/", "inconnu", "vert", "vert"],
  ["https://discord.com/nitro", "inconnu", "vert", "vert"],
  ["https://discord.gift/abc", "inconnu", "vert", "vert"],
  ["https://sweetwater-12345.discord.media/", "inconnu", "vert", "vert"],     // confirmé par docs.discord.com (voir js/domaines.js)
  ["https://discord.media/", "inconnu", "vert", "vert"],
  ["https://roblox.link/abc", "inconnu", "jaune", "alerteMarque_roblox"],      // PAS confirmé : reste une alerte jaune
  ["https://discordstatus.com/", "inconnu", "jaune", "alerteMarque_discord"],
  ["https://discord.new/abc", "inconnu", "jaune", "alerteMarque_discord"],
  ["https://robloxlabs.com/", "inconnu", "jaune", "alerteMarque_roblox"],
  ["https://roblox.com/catalog", "roblox", "vert", "vert"],
  ["https://roblox.com/catalog", "discord", "vert", "vert"],
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
// Le texte du rouge « mot d'appât » (FR et EN), exact, et jamais « arnaque confirmée »
const TEXTE_FR = "Ce n'est pas un site officiel et il parle de Robux ou de Nitro. Roblox et Discord ne donnent jamais de Robux ou de Nitro par un autre site. Ne t'y connecte pas.";
const TEXTE_EN = "This is not an official site and it talks about Robux or Nitro. Roblox and Discord never give out Robux or Nitro through another site. Don’t log in there.";
{
  const fr = analyser("https://free-robux.xyz/", "inconnu");
  if (fr.raisons.indexOf(TEXTE_FR) === -1) { echecs++; console.log("ÉCHEC : le texte du rouge (FR) n'est pas celui demandé"); }
  if (T.appatRobuxNitro !== TEXTE_FR) { echecs++; console.log("ÉCHEC : T.appatRobuxNitro (FR) différent du texte demandé"); }
  const ctxEn = vm.createContext({ URL: URL }); ctxEn.window = ctxEn;
  ["domaines.js", "textes-en.js", "verificateur.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctxEn, { filename: f }); });
  const en = ctxEn.window.RoShieldVerif.analyser("https://free-robux.xyz/", "inconnu");
  if (en.niveau !== "rouge" || en.raisons.indexOf(TEXTE_EN) === -1) { echecs++; console.log("ÉCHEC : le texte du rouge (EN) n'est pas celui demandé"); }
  const tousTextes = JSON.stringify([T.appatRobuxNitro, T.appatDansChemin, ctxEn.window.TEXTES_VERIF.appatRobuxNitro, ctxEn.window.TEXTES_VERIF.appatDansChemin]);
  if (/arnaque confirm|confirmed scam|scam confirmed/i.test(tousTextes)) { echecs++; console.log("ÉCHEC : « arnaque confirmée » ne doit jamais être écrit"); }
}
// Un mot d'appât dans le CHEMIN n'est JAMAIS rouge avec « autre chose » ; un domaine officiel est vert avant toute règle
["https://exemple.com/robux", "https://exemple.org/nitro", "https://exemple.net/x?q=free-nitro-gift", "https://forum.exemple.com/t/robux-giveaway-promo/12",
  "https://exemple.com/a/b/c/ROBUX", "https://exemple.com/%72obux"].forEach(function (l) {
  const x = analyser(l, "inconnu");
  if (x.niveau === "rouge") { echecs++; console.log("ÉCHEC : un mot d'appât dans le chemin ne doit jamais être rouge : " + l); }
});
["https://www.roblox.com/robux", "https://www.roblox.com/giftcards", "https://discord.com/nitro", "https://create.roblox.com/robux-nitro", "https://discord.gg/nitro"].forEach(function (l) {
  const x = analyser(l, "inconnu");
  if (x.niveau !== "vert") { echecs++; console.log("ÉCHEC : un domaine officiel doit rester vert : " + l + " -> " + x.niveau); }
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
