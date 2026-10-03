/* ==========================================================
   outils/evaluation.js : mesure les erreurs de RoShield avec un jeu de test.

   Utilisation (dans le dossier du projet) :
       node outils/evaluation.js                  -> tableau + toutes les listes
       node outils/evaluation.js --resume         -> seulement les chiffres
       node outils/evaluation.js --json           -> les chiffres en une ligne JSON (pour comparer avant/après)
       node outils/evaluation.js --js <dossier>   -> évalue une AUTRE copie du dossier js/ (ex. une version précédente)

   RÈGLES DE SÉCURITÉ
   - Ce script ne visite AUCUN lien et ne fait AUCUNE requête réseau : il lit
     seulement du TEXTE (les fichiers du dossier outils/evaluation/).
     Il n'utilise ni "http", ni "https", ni "net" (voir les require ci-dessous).
   - Il ne modifie PAS le vérificateur : il charge la VRAIE logique
     (domaines.js, textes-fr.js, verificateur.js) telle qu'elle est.

   LES TROIS FICHIERS (un lien par ligne ; # = commentaire ; "# --- titre ---" = nouveau groupe) :
   - liens-honnetes.txt        : liens que des joueurs rencontrent vraiment
   - liens-officiels.txt       : liens vers des domaines officiels Roblox et Discord
   - pieges-synthetiques.txt   : liens INVENTÉS (.test, .invalid, example...), jamais un vrai domaine malveillant

   Le groupe dont le titre contient « GROUPE DIFFICILE » (domaines de Roblox/Discord qui ne sont pas
   dans la liste officielle) est compté À PART : ses rouges sont une décision (ils restent rouges
   tant qu'il n'y a pas de source officielle), pas des erreurs à corriger.
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RACINE = path.join(__dirname, "..");
const DOSSIER = path.join(__dirname, "evaluation");
const args = process.argv.slice(2);
const RESUME = args.includes("--resume") || args.includes("--json");
const JSON_SORTIE = args.includes("--json");
const iJs = args.indexOf("--js");
const DOSSIER_JS = iJs !== -1 ? path.resolve(args[iJs + 1]) : path.join(RACINE, "js");
const log = JSON_SORTIE ? function () {} : console.log;

// ---------- 1. Charger la VRAIE logique, telle quelle ----------
const contexte = vm.createContext({ URL: URL });
contexte.window = contexte;
["domaines.js", "textes-fr.js", "verificateur.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(DOSSIER_JS, f), "utf8"), contexte, { filename: f });
});
const analyser = contexte.window.RoShieldVerif.analyser;
const T = contexte.window.TEXTES_VERIF;

// ---------- 2. Lire les fichiers de liens (avec le titre de chaque groupe) ----------
function lireLiens(nom) {
  const chemin = path.join(DOSSIER, nom);
  if (!fs.existsSync(chemin)) { console.error("Fichier introuvable : " + chemin); process.exit(1); }
  const liens = [];
  let groupe = "(sans groupe)";
  fs.readFileSync(chemin, "utf8").split(/\r?\n/).forEach(function (ligne) {
    const t = ligne.trim();
    if (!t) return;
    const titre = t.match(/^# --- (.*) ---$/);
    if (titre) { groupe = titre[1]; return; }
    if (t.startsWith("#")) return;
    liens.push({ lien: t, groupe: groupe });
  });
  return liens;
}
const HONNETES = lireLiens("liens-honnetes.txt");
const OFFICIELS = lireLiens("liens-officiels.txt");
const PIEGES = lireLiens("pieges-synthetiques.txt");
const estDifficile = function (x) { return /GROUPE DIFFICILE/.test(x.groupe); };
// Test de résistance : liens honnêtes qui contiennent un nom officiel dans leur chemin. Comptés À PART, jamais mélangés.
const estResistance = function (x) { return /rouge par prudence/.test(x.groupe); };

// ---------- 3. Outils ----------
const R_ROBLOX = "roblox", R_DISCORD = "discord", R_AUTRE = "inconnu";

// Classe un résultat : vert / jaune (inconnu) / jaune (officiel mais vérifie) / rouge / erreur
function categorie(r) {
  if (r.erreur) return "erreur";
  if (r.niveau === "rouge") return "rouge";
  if (r.niveau === "jaune") return r.titreCle === "officielAttention" ? "jaune officiel" : "jaune";
  return "vert";
}

// Devine QUELLE règle a rendu un résultat rouge (en lisant le texte du message, sans toucher à la logique)
const REGLES = [
  [/Ce domaine contient le mot « (\w+) »/, function (m) { return "mot-clé « " + m[1] + " » dans le domaine"; }],
  [/Ce lien imite « /, function () { return "nom officiel au début du domaine"; }],
  [/« [^»]+ » ressemble beaucoup à « [^»]+ » mais/, function () { return "domaine presque identique à un officiel"; }],
  [/en remplaçant des lettres par des chiffres/, function () { return "chiffres à la place de lettres"; }],
  [/le mot « [^»]+ » ressemble beaucoup à/, function () { return "un morceau du nom ressemble à un mot officiel"; }],
  [/Ce nom de domaine est codé/, function () { return "punycode"; }],
  [/utilise une adresse IP/, function () { return "adresse IP"; }],
  [/Le lien contient un « @ »/, function () { return "trompe-l'œil avec @"; }],
  [/Ce n'est pas un lien de site web/, function () { return "protocole dangereux"; }],
  [/Son vrai domaine est un autre\. Ne tape jamais/, function () { return "nom officiel complet dans le chemin ou la requête"; }]
];
function regleDuRouge(r) {
  for (const msg of r.raisons || []) {
    for (const [motif, nom] of REGLES) { const m = msg.match(motif); if (m) return nom(m); }
  }
  // Seul le message « le message disait que c'était une page Roblox/Discord » reste
  return "réponse « page Roblox/Discord » + domaine non officiel";
}

function evaluer(liens, reponse) {
  return liens.map(function (x) {
    const r = analyser(x.lien, reponse);
    return { lien: x.lien, groupe: x.groupe, r: r, cat: categorie(r) };
  });
}
function compter(resultats) {
  const c = { vert: 0, "jaune officiel": 0, jaune: 0, rouge: 0, erreur: 0 };
  resultats.forEach(function (x) { c[x.cat]++; });
  return c;
}
function pct(n, total) { return total ? (Math.round(n * 1000 / total) / 10).toFixed(1) + " %" : "-"; }
function court(lien, max) { max = max || 118; return lien.length > max ? lien.slice(0, max - 1) + "…" : lien; }
function titre(t) { log("\n" + "=".repeat(96) + "\n" + t + "\n" + "=".repeat(96)); }
function ligneTableau(cols, largeurs) { return cols.map(function (c, i) { return String(c).padEnd(largeurs[i]); }).join(" "); }

// ---------- 4. Vérifications du jeu de test lui-même ----------
function hoteReserve(lien) {
  let u;
  try { u = new URL(lien.indexOf("://") !== -1 ? lien : "https://" + lien); } catch (e) { return false; }
  const h = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return /\.(test|invalid|example)$/.test(h) || /(^|\.)example\.(com|net|org)$/.test(h) ||
    /^192\.0\.2\.\d+$/.test(h) || /^198\.51\.100\.\d+$/.test(h) || /^203\.0\.113\.\d+$/.test(h) || /^2001:db8:/.test(h);
}

log("RoShield : évaluation sur un jeu de test (aucun lien n'est visité, aucune requête réseau)");
log("Logique chargée depuis : " + DOSSIER_JS + " (telle quelle, non modifiée)");
titre("0. Le jeu de test");
const MINI = [["liens-honnetes.txt", HONNETES, 200], ["liens-officiels.txt", OFFICIELS, 40], ["pieges-synthetiques.txt", PIEGES, 100]];
let jeuOk = true;
MINI.forEach(function (m) {
  const uniques = new Set(m[1].map(function (x) { return x.lien; })).size;
  const ok = m[1].length >= m[2];
  if (!ok) jeuOk = false;
  log("  " + m[0].padEnd(28) + String(m[1].length).padStart(4) + " liens (" + uniques + " uniques)   minimum demandé : " + m[2] + "   " + (ok ? "OK" : "TROP PEU"));
});
const nbDifficile = HONNETES.filter(estDifficile).length;
log("  Parmi les liens honnêtes, « GROUPE DIFFICILE » (comptés à part) : " + nbDifficile);
const horsReserve = PIEGES.filter(function (x) { return !hoteReserve(x.lien); });
log("  Pièges dont le domaine n'est PAS réservé (.test/.invalid/.example/example.*/IP de documentation) : " + horsReserve.length);
horsReserve.forEach(function (x) { log("     ATTENTION : " + x.lien); });
if (horsReserve.length) jeuOk = false;

// ---------- 5. Les évaluations ----------
const honnetes = {}, officiels = {}, pieges = {};
[R_AUTRE, R_ROBLOX, R_DISCORD].forEach(function (rep) {
  honnetes[rep] = evaluer(HONNETES, rep);
  officiels[rep] = evaluer(OFFICIELS, rep);
  pieges[rep] = evaluer(PIEGES, rep);
});
const NOM_REP = { inconnu: "autre chose / je ne sais pas", roblox: "page Roblox", discord: "page Discord" };

// ---- 1. Liens honnêtes avec « autre chose » : FAUX ROUGES ----
titre("1. LIENS HONNÊTES avec « autre chose / je ne sais pas » : combien sortent ROUGE (faux rouges) ?");
const hAutre = honnetes[R_AUTRE];
const rougesH = hAutre.filter(function (x) { return x.cat === "rouge"; });
const fauxRouges = rougesH.filter(function (x) { return !estDifficile(x) && !estResistance(x); });
const fauxRougesResistance = rougesH.filter(estResistance);
const nResistance = hAutre.filter(estResistance).length;
const rougesDifficiles = rougesH.filter(estDifficile);
const nHorsDifficile = hAutre.filter(function (x) { return !estDifficile(x) && !estResistance(x); }).length;
log("  Liens testés : " + hAutre.length + " (dont " + nbDifficile + " dans le groupe difficile)");
log("  FAUX ROUGES, liste d'origine (hors groupe difficile et hors test de résistance) : " + fauxRouges.length + " sur " + nHorsDifficile + "  (" + pct(fauxRouges.length, nHorsDifficile) + ")");
log("  FAUX ROUGES, test de résistance « rouge par prudence » (compté À PART) : " + fauxRougesResistance.length + " sur " + nResistance + "  (" + pct(fauxRougesResistance.length, nResistance) + ")");
log("  Groupe difficile : " + rougesDifficiles.length + " rouges sur " + nbDifficile + "  (décision : ils restent rouges tant qu'il n'y a pas de source officielle)");
if (!RESUME) {
  log("\n  Liste des faux rouges (lien -> règle qui l'a mis en rouge) :");
  fauxRouges.forEach(function (x) { log("   - " + court(x.lien, 92).padEnd(94) + "-> " + regleDuRouge(x.r)); });
  log("\n  Test de résistance (liens qui contiennent un nom officiel dans leur chemin, rouge par prudence) :");
  fauxRougesResistance.forEach(function (x) { log("   - " + court(x.lien, 92).padEnd(94) + "-> " + regleDuRouge(x.r)); });
  log("\n  Groupe difficile (rouges décidés) :");
  rougesDifficiles.forEach(function (x) { log("   - " + court(x.lien, 92).padEnd(94) + "-> " + regleDuRouge(x.r)); });
  const parRegle = {};
  rougesH.forEach(function (x) { const g = regleDuRouge(x.r).replace(/« \w+ »/, "« … »"); parRegle[g] = (parRegle[g] || 0) + 1; });
  log("\n  Tous les rouges honnêtes, par règle :");
  Object.entries(parRegle).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (e) { log("     " + String(e[1]).padStart(3) + "  " + e[0]); });
}
// par groupe (seulement ceux qui ont au moins un rouge)
const parGroupeH = {};
hAutre.forEach(function (x) { const g = (parGroupeH[x.groupe] = parGroupeH[x.groupe] || { n: 0, rouges: 0 }); g.n++; if (x.cat === "rouge") g.rouges++; });
if (!RESUME) {
  log("\n  Groupes de liens honnêtes qui contiennent au moins un rouge :");
  Object.entries(parGroupeH).filter(function (e) { return e[1].rouges > 0; }).forEach(function (e) {
    log("     " + (e[1].rouges + " / " + e[1].n).padEnd(8) + e[0].slice(0, 82));
  });
}

// ---- 2. Liens officiels avec « page Roblox / Discord » ----
titre("2. LIENS OFFICIELS avec « page Roblox » ou « page Discord » : combien ne sortent PAS vert ou jaune « officiel mais vérifie » ?");
const oRD = officiels[R_ROBLOX].concat(officiels[R_DISCORD]);
const ratesOff = oRD.filter(function (x) { return x.cat !== "vert" && x.cat !== "jaune officiel"; });
log("  Évaluations : " + oRD.length + " (" + OFFICIELS.length + " liens × 2 réponses)");
log("  MAL CLASSÉS (ni vert ni jaune « officiel mais vérifie ») : " + ratesOff.length + " sur " + oRD.length);
if (!RESUME) {
  ratesOff.forEach(function (x) { log("   - " + court(x.lien, 92).padEnd(94) + "-> " + x.cat + " (" + String((x.r.raisons || [x.r.erreur || ""])[0] || "").slice(0, 60) + ")"); });
}

// ---- 3. Pièges avec « autre chose » ----
titre("3. PIÈGES SYNTHÉTIQUES avec « autre chose / je ne sais pas » : détectés (ROUGE) ou ratés (JAUNE) ?");
const pAutre = pieges[R_AUTRE], cP = compter(pAutre);
const rates = pAutre.filter(function (x) { return x.cat !== "rouge"; });
log("  Pièges testés : " + pAutre.length);
log("  ROUGES (détectés) : " + cP.rouge + " (" + pct(cP.rouge, pAutre.length) + ")");
log("  JAUNES (pièges RATÉS) : " + cP.jaune + " (" + pct(cP.jaune, pAutre.length) + ")");
log("  VERTS (très grave) : " + cP.vert + "   jaunes « officiel » : " + cP["jaune officiel"] + "   erreurs de saisie : " + cP.erreur);
log("\n  Par motif (groupe du fichier) :");
const groupes = [];
pAutre.forEach(function (x) { if (groupes.indexOf(x.groupe) === -1) groupes.push(x.groupe); });
const L = [64, 6, 8, 8, 8];
log("  " + ligneTableau(["motif", "liens", "rouge", "jaune", "autre"], L));
groupes.forEach(function (g) {
  const sel = pAutre.filter(function (x) { return x.groupe === g; }), c = compter(sel);
  log("  " + ligneTableau([g.slice(0, 62), sel.length, c.rouge, c.jaune, c.vert + c["jaune officiel"] + c.erreur], L));
});
if (!RESUME) {
  log("\n  Liste des pièges RATÉS (restent jaunes) :");
  rates.forEach(function (x) { log("   - " + court(x.lien, 110)); });
}

// ---- 4. Pièges avec « page Roblox / Discord » ----
titre("4. PIÈGES SYNTHÉTIQUES avec « page Roblox » ou « page Discord » : combien sont rouges ?");
const pRD = pieges[R_ROBLOX].concat(pieges[R_DISCORD]);
const pRDnonRouges = pRD.filter(function (x) { return x.cat !== "rouge"; });
log("  Évaluations : " + pRD.length + " (" + PIEGES.length + " pièges × 2 réponses)");
log("  ROUGES : " + (pRD.length - pRDnonRouges.length) + " sur " + pRD.length + " (" + pct(pRD.length - pRDnonRouges.length, pRD.length) + ")");
if (!RESUME) pRDnonRouges.forEach(function (x) { log("   - PAS ROUGE : " + court(x.lien, 100) + " -> " + x.cat); });

// ---- 5. Répartition des niveaux ----
titre("5. RÉPARTITION DES NIVEAUX pour chaque groupe et chaque réponse");
const L5 = [34, 29, 6, 6, 8, 6, 6];
log(ligneTableau(["groupe", "réponse", "vert", "jaune", "jaune off.", "rouge", "autre"], L5));
function ligne5(nomGroupe, tabs) {
  [R_AUTRE, R_ROBLOX, R_DISCORD].forEach(function (rep) {
    const c = compter(tabs[rep]);
    log(ligneTableau([nomGroupe, NOM_REP[rep], c.vert, c.jaune, c["jaune officiel"], c.rouge, c.erreur], L5));
  });
}
ligne5("liens honnêtes (" + HONNETES.length + ")", honnetes);
ligne5("liens officiels (" + OFFICIELS.length + ")", officiels);
ligne5("pièges synthétiques (" + PIEGES.length + ")", pieges);
log("\n  (« jaune off. » = jaune « Domaine officiel, mais vérifie le lien » ; « autre » = erreurs de saisie)");

// ---- Précision sur la conception ----
titre("À SAVOIR : le rouge « par conception » n'est PAS un faux rouge");
const hRD = honnetes[R_ROBLOX].concat(honnetes[R_DISCORD]);
const hRDrouges = hRD.filter(function (x) { return x.cat === "rouge"; });
log("  Avec « page Roblox » ou « page Discord », un lien honnête NON OFFICIEL sort rouge PAR CONCEPTION :");
log("  le message prétendait que c'était Roblox/Discord, et ce n'est pas vrai (YouTube, Wikipédia, un wiki...).");
log("  Ces rouges ne sont donc pas comptés comme des faux rouges. À titre d'information : " + hRDrouges.length + " sur " + hRD.length + " évaluations.");

// ---- Résumé ----
const piegesVerts = cP.vert + pRD.filter(function (x) { return x.cat === "vert"; }).length;
titre("RÉSUMÉ");
log("  Faux rouges, liste d'origine (« autre chose »)                       : " + fauxRouges.length + " / " + nHorsDifficile + "  (" + pct(fauxRouges.length, nHorsDifficile) + ")");
log("  Faux rouges, test de résistance « rouge par prudence » (à part)      : " + fauxRougesResistance.length + " / " + nResistance + "  (" + pct(fauxRougesResistance.length, nResistance) + ")");
log("  Groupe difficile : rouges (décidés)                                  : " + rougesDifficiles.length + " / " + nbDifficile);
log("  Liens officiels mal classés (« page Roblox/Discord »)               : " + ratesOff.length + " / " + oRD.length + "  (" + pct(ratesOff.length, oRD.length) + ")");
log("  Pièges détectés en rouge (« autre chose »)                          : " + cP.rouge + " / " + pAutre.length + "  (" + pct(cP.rouge, pAutre.length) + ")");
log("  Pièges ratés, restés jaunes (« autre chose »)                       : " + cP.jaune + " / " + pAutre.length + "  (" + pct(cP.jaune, pAutre.length) + ")");
log("  Pièges rouges avec « page Roblox/Discord »                          : " + (pRD.length - pRDnonRouges.length) + " / " + pRD.length + "  (" + pct(pRD.length - pRDnonRouges.length, pRD.length) + ")");
log("  Pièges verts (très grave)                                            : " + piegesVerts);

if (JSON_SORTIE) {
  console.log(JSON.stringify({
    honnetes: { total: HONNETES.length, horsDifficile: nHorsDifficile, fauxRouges: fauxRouges.length, resistance: nResistance, fauxRougesResistance: fauxRougesResistance.length, difficile: nbDifficile, difficileRouges: rougesDifficiles.length,
      listeFauxRouges: fauxRouges.map(function (x) { return x.lien; }), groupesAvecRouges: Object.entries(parGroupeH).filter(function (e) { return e[1].rouges > 0; }).map(function (e) { return [e[0], e[1].rouges, e[1].n]; }) },
    officiels: { evaluations: oRD.length, malClasses: ratesOff.length },
    pieges: { total: PIEGES.length, rouges: cP.rouge, jaunes: cP.jaune, verts: piegesVerts, rougesAvecReponse: pRD.length - pRDnonRouges.length, evaluationsAvecReponse: pRD.length,
      listeRates: rates.map(function (x) { return x.lien; }) }
  }));
}
if (!jeuOk) { log("\n  ATTENTION : le jeu de test ne respecte pas les minimums ou contient un domaine non réservé."); process.exit(1); }
