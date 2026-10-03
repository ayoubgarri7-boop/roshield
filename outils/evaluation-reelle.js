/* ==========================================================
   outils/evaluation-reelle.js : mesure RoShield sur TES vrais liens honnêtes.

   Utilisation :  node outils/evaluation-reelle.js [--fichier <chemin>]
   Par défaut le fichier est donnees-externes/liens-honnetes-reels.txt
   (un lien par ligne ; les lignes qui commencent par # et les lignes vides sont ignorées).
   Le dossier donnees-externes/ est ignoré par git : ce fichier n'est JAMAIS commité.

   RÈGLES DE SÉCURITÉ
   - Aucun lien n'est visité, aucune requête réseau : on analyse seulement du TEXTE avec la vraie logique de js/
     (et la vraie liste js/blocklist.json si elle existe).
   - Ce script n'écrit AUCUN fichier. Il affiche seulement des nombres, et les liens ROUGES sous forme NEUTRALISÉE
     (hxxp à la place de http, [.] à la place des points du nom de domaine).

   Il affiche, pour la réponse « autre chose » puis pour « page Roblox » :
   le nombre de liens, combien sortent ROUGE, JAUNE avec alerte forte, JAUNE simple, VERT, et combien sont dans la liste
   (hôte dédié ou lien exact).
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RACINE = path.join(__dirname, "..");
const args = process.argv.slice(2);
const iF = args.indexOf("--fichier");
const FICHIER = iF !== -1 ? path.resolve(args[iF + 1]) : path.join(RACINE, "donnees-externes", "liens-honnetes-reels.txt");

if (!fs.existsSync(FICHIER)) {
  console.error("Fichier introuvable : " + FICHIER);
  console.error("Crée donnees-externes/liens-honnetes-reels.txt (un lien par ligne) : ce dossier est ignoré par git.");
  process.exit(1);
}

// ---------- La VRAIE logique, avec la vraie liste si elle existe ----------
const ctx = vm.createContext({ URL: URL });
ctx.window = ctx;
["domaines.js", "textes-fr.js", "verificateur.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(RACINE, "js", f), "utf8"), ctx, { filename: f });
});
const fListe = path.join(RACINE, "js", "blocklist.json");
const listeChargee = fs.existsSync(fListe);
if (listeChargee) ctx.window.RoShieldVerif.chargerListe(JSON.parse(fs.readFileSync(fListe, "utf8")));
const analyser = ctx.window.RoShieldVerif.analyser;
const T = ctx.window.TEXTES_VERIF;

const liens = fs.readFileSync(FICHIER, "utf8").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l[0] !== "#"; });

// ---------- Outils ----------
function categorie(r) {
  if (r.erreur) return "erreur";
  if (r.niveau === "rouge") return "rouge";
  if (r.niveau === "jaune") {
    if (r.titreCle === "officielAttention") return "jaune officiel";
    return /^alerte/.test(r.titreCle) ? "alerte" : "simple";
  }
  return "vert";
}
// Quelle règle a rendu ce lien rouge ? (en lisant le texte du message, sans toucher à la logique)
const REGLES = [
  [/figure dans une liste publique/, "liste de liens signalés"],
  [/Ce domaine contient le mot/, "marque + mot d'arnaque dans le nom d'hôte"],
  [/Ce lien imite « /, "nom officiel au début du nom d'hôte / avec tirets"],
  [/ressemble beaucoup à « [^»]+ » mais/, "domaine presque identique à un officiel"],
  [/en remplaçant des lettres par des chiffres/, "chiffres à la place de lettres"],
  [/ressemble beaucoup à « /, "faute de frappe dans un morceau du nom"],
  [/Ce nom de domaine est codé/, "punycode"],
  [/utilise une adresse IP/, "adresse IP"],
  [/Le lien contient un « @ »/, "trompe-l'œil avec @"],
  [/Ce n'est pas un lien de site web/, "protocole dangereux"],
  [/Le message disait que ce lien/, "réponse « page Roblox/Discord » + domaine non officiel"]
];
function regle(r) {
  for (const msg of r.raisons || []) for (const [m, nom] of REGLES) if (m.test(msg)) return nom;
  return "?";
}
function neutraliser(lien) {
  const m = lien.match(/^([a-z][a-z0-9+.-]*):\/\/([^\/?#]*)(.*)$/i);
  if (!m) return lien.replace(/\./g, "[.]").slice(0, 150);
  return (m[1].replace(/^http/i, "hxxp") + "://" + m[2].replace(/\./g, "[.]") + m[3]).slice(0, 150);
}
function pct(n, total) { return total ? (Math.round(n * 1000 / total) / 10).toFixed(1) + " %" : "-"; }

console.log("Évaluation sur tes liens honnêtes réels : " + liens.length + " liens" + (listeChargee ? " (liste js/blocklist.json chargée)" : " (js/blocklist.json absent : pas de liste)"));
[["inconnu", "autre chose"], ["roblox", "page Roblox"]].forEach(function (rep) {
  const c = { rouge: 0, alerte: 0, simple: 0, vert: 0, "jaune officiel": 0, erreur: 0 };
  let listeHote = 0, listeLien = 0, listeFichier = 0;
  const rouges = [];
  liens.forEach(function (l) {
    const r = analyser(l, rep[0]);
    const cat = categorie(r);
    c[cat]++;
    if (!r.erreur) {
      if (r.raisons.indexOf(T.listeHote) !== -1) listeHote++;
      else if (r.raisons.indexOf(T.listeLien) !== -1) listeLien++;
      else if (r.raisons.indexOf(T.listeFichier) !== -1) listeFichier++;
    }
    if (cat === "rouge") rouges.push({ l: l, regle: regle(r) });
  });
  const total = liens.length;
  console.log("\n=== Réponse « " + rep[1] + " » ===");
  console.log("  liens                        : " + total);
  console.log("  ROUGE                        : " + c.rouge + "  (" + pct(c.rouge, total) + ")");
  console.log("  JAUNE avec alerte forte      : " + c.alerte + "  (" + pct(c.alerte, total) + ")");
  console.log("  JAUNE simple                 : " + c.simple + "  (" + pct(c.simple, total) + ")");
  console.log("  jaune « officiel mais vérifie » : " + c["jaune officiel"]);
  console.log("  VERT                         : " + c.vert + "  (" + pct(c.vert, total) + ")");
  if (c.erreur) console.log("  erreurs de saisie            : " + c.erreur);
  console.log("  dans la liste de liens signalés : " + (listeHote + listeLien + listeFichier) +
    " (hôte dédié : " + listeHote + ", lien exact : " + listeLien + ", fichier précis d'un domaine officiel : " + listeFichier + ")");
  if (rep[0] === "inconnu" && rouges.length) {
    console.log("  Liens ROUGES (neutralisés) avec la règle :");
    rouges.forEach(function (x) { console.log("    [" + x.regle + "] " + neutraliser(x.l)); });
  } else if (rep[0] === "roblox") {
    console.log("  (avec « page Roblox », un lien honnête non officiel sort rouge PAR CONCEPTION : ce n'est pas une erreur)");
  }
});
