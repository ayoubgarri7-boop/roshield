/* ==========================================================
   outils/maj-liste.js : fabrique js/blocklist.json à partir de Phishing.Database.

   Source : Phishing.Database (licence MIT), dépôt Phishing-Database/Phishing.Database.
   Fichiers lus : phishing-links-ACTIVE.txt et phishing-domains-ACTIVE.txt (du TEXTE).

   Utilisation :
       node outils/maj-liste.js                      télécharge les 2 fichiers texte, puis fabrique js/blocklist.json
       node outils/maj-liste.js --local <dossier>    lit les 2 fichiers déjà téléchargés (par défaut : donnees-externes/)

   RÈGLES DE SÉCURITÉ
   - Ce script ne fait JAMAIS de requête vers une adresse de la liste. La seule requête possible est le
     téléchargement des deux fichiers texte, depuis raw.githubusercontent.com (adresse écrite en dur ci-dessous).
     Les adresses de la liste sont seulement LUES comme du texte.
   - Les fichiers téléchargés vont dans donnees-externes/ (dossier ignoré par git, jamais commité).

   CE QUE CONTIENT js/blocklist.json (seulement les entrées qui parlent de Roblox / Discord : roblox, rbx, robux, discord, nitro) :
   (a) "hotes"  : les noms d'hôte DÉDIÉS (un nom de domaine qui n'appartient qu'à un site) : comparés au nom d'hôte COMPLET.
                  Jamais un hébergeur ouvert (github.io, workers.dev...), jamais un CDN, jamais un domaine officiel.
   (b) "liens"  : les liens EXACTS (hôte + chemin normalisés, en empreinte) pour tout hôte PARTAGÉ ou OFFICIEL
                  (pages.dev, pastebin.com, cdn.discordapp.com...) : comparés à l'adresse complète, jamais à l'hôte seul.
   Les doublons sont retirés. Taille limitée à 300 Ko (si les hôtes en clair dépassent, ils passent en empreintes).
   outils/exceptions-liste.json permet de RETIRER une erreur (voir le fichier).

   Licence de la liste : voir LICENSE-PHISHING-DATABASE (MIT).
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const https = require("https");

const RACINE = path.join(__dirname, "..");
const LIMITE_OCTETS = 300 * 1024;
const MOTS_MARQUE = ["roblox", "rbx", "robux", "discord", "nitro"];

// La SEULE adresse jamais contactée : le dépôt Phishing.Database sur GitHub (pour télécharger les 2 fichiers texte)
const HOTE_TELECHARGEMENT = "raw.githubusercontent.com";
const FICHIERS = ["phishing-links-ACTIVE.txt", "phishing-domains-ACTIVE.txt"];
const CHEMIN_DEPOT = "/Phishing-Database/Phishing.Database/master/";

// ---------- La VRAIE logique du site (pour utiliser exactement la même empreinte et la même normalisation) ----------
function chargerLogique() {
  const ctx = vm.createContext({ URL: URL });
  ctx.window = ctx;
  ["domaines.js", "textes-fr.js", "verificateur.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(RACINE, "js", f), "utf8"), ctx, { filename: f });
  });
  return ctx.window;
}

// ---------- Hôtes PARTAGÉS (n'importe qui peut y publier une page ou un fichier) : liens EXACTS seulement ----------
const SUFFIXES_PARTAGES = [
  // hébergeurs de pages et de sites gratuits
  "pages.dev", "workers.dev", "vercel.app", "netlify.app", "github.io", "gitlab.io", "web.app", "firebaseapp.com",
  "herokuapp.com", "onrender.com", "glitch.me", "repl.co", "replit.app", "replit.dev", "surge.sh", "fleek.co",
  "000webhostapp.com", "infinityfreeapp.com", "rf.gd", "epizy.com", "webcindario.com", "wixsite.com", "weebly.com",
  "webflow.io", "carrd.co", "notion.site", "gitbook.io", "wordpress.com", "myshopify.com", "square.site", "framer.website",
  "framer.app", "yolasite.com", "site123.me", "strikingly.com", "jimdofree.com", "azurewebsites.net", "pythonanywhere.com",
  "typedream.app", "super.site", "canva.site", "my.canva.site", "bubbleapps.io", "godaddysites.com",
  // outils, fichiers, réseaux : un lien précis, jamais tout le site
  "sites.google.com", "docs.google.com", "drive.google.com", "forms.gle", "google.com", "pastebin.com", "github.com",
  "githubusercontent.com", "gist.github.com", "dropbox.com", "mediafire.com", "mega.nz", "wetransfer.com", "we.tl",
  "1drv.ms", "onedrive.live.com", "sharepoint.com", "telegra.ph", "t.me", "linktr.ee", "bio.link", "lnk.bio",
  "youtube.com", "youtu.be", "facebook.com", "twitter.com", "x.com", "instagram.com", "tiktok.com", "reddit.com",
  "steamcommunity.com", "imgur.com", "tenor.com", "giphy.com", "typeform.com", "jotform.com", "forms.office.com",
  // IPFS, tunnels, stockage
  "ipfs.io", "dweb.link", "ngrok.io", "ngrok-free.app", "trycloudflare.com", "r2.dev", "s3.amazonaws.com",
  "storage.googleapis.com", "cloudfront.net"
];
// blogspot.fr, blogspot.hr, blogspot.com.br... : "blogspot" suivi de n'importe quel pays
const MOTIFS_PARTAGES = [/(^|\.)blogspot\.[a-z.]+$/];
// Si un domaine enregistré porte au moins ce nombre de noms d'hôte DIFFÉRENTS dans toute la liste, on le traite aussi comme partagé
const SEUIL_HEBERGEUR_OUVERT = 25;

// Approximation du "domaine enregistré" sans liste des suffixes publics : 2 derniers morceaux, ou 3 pour co.uk, com.br...
const SECONDS_NIVEAUX = ["co", "com", "org", "net", "gov", "edu", "ac", "or", "ne", "go", "gob", "nom", "ltd", "plc"];
function domaineEnregistre(hote) {
  const m = hote.split(".");
  if (m.length <= 2) return hote;
  const n = m.length;
  if (m[n - 1].length === 2 && SECONDS_NIVEAUX.indexOf(m[n - 2]) !== -1) return m.slice(n - 3).join(".");
  return m.slice(n - 2).join(".");
}
function estOuSous(hote, base) { return hote === base || hote.endsWith("." + base); }

// ---------- Lecture d'une entrée de la liste (TEXTE seulement : jamais de requête) ----------
function decoder(t) {
  for (let i = 0; i < 3; i++) { let d; try { d = decodeURIComponent(t); } catch (e) { break; } if (d === t) break; t = d; }
  return t;
}
function normaliser(t) { return t.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/\$/g, "s"); }
function parlePlateformes(entree) {
  const t = decoder(entree).toLowerCase();
  return [t, normaliser(t), normaliser(t.replace(/1/g, "i"))].some(function (v) {
    return MOTS_MARQUE.some(function (m) { return v.includes(m); });
  });
}
function hoteBrut(entree) {
  const m = entree.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^\/?#@]*@)?([^\/?#:]+)/i);
  const h = m ? m[1] : entree.split(/[\/?#:]/)[0];
  return h.toLowerCase().replace(/\.$/, "");
}
function urlDe(entree) { return /^[a-z][a-z0-9+.-]*:\/\//i.test(entree) ? entree : "https://" + entree; }

// ---------- Un nom d'hôte a-t-il LUI-MÊME un signal (mot de marque ou mot d'arnaque) ? ----------
// Mêmes règles de mots que js/verificateur.js : roblox / discord / robux comme MORCEAUX ; rbx, nitro et les mots d'arnaque
// comme MOTS ENTIERS (séparés par des points ou des tirets) ; quelques formes collées connues ; chiffres à la place des lettres.
function signalDansHote(h, W) {
  const morceaux = W.MOTS_MARQUE_MORCEAUX, entiers = W.MOTS_MARQUE_ENTIERS, arnaque = W.MOTS_ARNAQUE, collees = W.FORMES_COLLEES;
  const mots = h.split(/[.\-]/);
  if (morceaux.some(function (m) { return h.includes(m); })) return true;
  if (entiers.some(function (m) { return mots.indexOf(m) !== -1; })) return true;
  if (arnaque.some(function (m) { return mots.indexOf(m) !== -1; })) return true;
  if (collees.some(function (f) { return h.includes(f); })) return true;
  // faute de frappe d'un caractère sur "roblox" / "discord" à l'intérieur d'un long morceau (la même règle que le site)
  if (W.RoShieldVerif.fauteDansMorceau(h)) return true;
  // chiffres à la place de lettres dans un nom de marque (r0blox, d1sc0rd) : 1 peut valoir l ou i
  return [normaliser(h), normaliser(h.replace(/1/g, "i"))].some(function (v) {
    return W.MOTS_CLES.some(function (m) { return v.includes(m) && !h.includes(m); });
  });
}
// La marque n'apparaît QUE dans une suite aléatoire de lettres et de chiffres (16 caractères ou plus), sur un hôte sans signal :
// c'est du bruit du filtre (un faux Microsoft avec un identifiant au hasard), pas une page Roblox / Discord.
function marqueSeulementDansSuiteAleatoire(entree) {
  const t = decoder(entree).toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const morceaux = t.split(/[^a-z0-9]+/).filter(Boolean);
  const avecMarque = morceaux.filter(function (j) { return MOTS_MARQUE.some(function (m) { return j.includes(m); }); });
  if (!avecMarque.length) return false;   // la marque n'apparaît qu'après normalisation des chiffres : on ne tranche pas ici
  return avecMarque.every(function (j) { return j.length >= 16 && /\d/.test(j) && /[a-z]/.test(j); });
}

// ---------- Extension réservée à la FABRICATION de la liste (jamais utilisée sur un lien collé) ----------
// Un hôte DÉJÀ présent dans la liste devient aussi "dédié" si le libellé de son domaine enregistré (la partie avant la
// terminaison, tirets retirés) est à une distance d'édition d'au plus 2 de "roblox" ou "discord", avec au moins 6 lettres
// (diczord, dilscourd, dicsold, discarb...). Pas pour nitro. Cela n'agit que sur les hôtes de la liste : un lien collé
// par quelqu'un n'est jamais jugé avec cette règle plus large.
function distanceDamerau(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
function libelleEnregistre(h) { return domaineEnregistre(h).split(".")[0].replace(/-/g, ""); }
function libelleProcheDeMarque(h) {
  const libelle = libelleEnregistre(h);
  if (libelle.length < 6) return false;
  return ["roblox", "discord"].some(function (m) { return distanceDamerau(libelle, m) <= 2; });
}

// ---------- Fabrication de la liste ----------
// entrees : toutes les lignes des 2 fichiers (pour repérer les hébergeurs ouverts) ; filtrees : seulement celles qui parlent de Roblox/Discord
function construireListe(entrees, options) {
  options = options || {};
  const W = options.logique || chargerLogique();
  const V = W.RoShieldVerif;
  const officiels = W.DOMAINES_OFFICIELS.map(function (d) { return d.domaine; });
  const exceptions = options.exceptions || { hotes: [], liens: [] };

  // 1. hébergeurs ouverts repérés automatiquement
  const hotesParDomaine = {};
  entrees.forEach(function (e) {
    const h = hoteBrut(e); if (!h) return;
    const d = domaineEnregistre(h);
    (hotesParDomaine[d] = hotesParDomaine[d] || new Set()).add(h);
  });
  const ouverts = new Set(Object.keys(hotesParDomaine).filter(function (d) { return hotesParDomaine[d].size >= SEUIL_HEBERGEUR_OUVERT; }));

  function categorieHote(h) {
    if (officiels.some(function (o) { return estOuSous(h, o); })) return "officiel";
    if (SUFFIXES_PARTAGES.some(function (s) { return estOuSous(h, s); })) return "partage";
    if (MOTIFS_PARTAGES.some(function (m) { return m.test(h); })) return "partage";
    if (ouverts.has(domaineEnregistre(h))) return "partage";
    // un nom d'hôte qui est LUI-MÊME un suffixe public ou une adresse IP n'est pas un domaine dédié à un site
    if (!h.includes(".")) return "ignore";
    // un hôte DÉDIÉ n'entre dans la liste d'hôtes que si son nom contient lui-même un signal (marque ou mot d'arnaque).
    // Les autres (sites piratés, administrations, suivi d'e-mails...) : liens EXACTS seulement.
    if (signalDansHote(h, W)) return "dedie";
    return libelleProcheDeMarque(h) ? "dedie-proche" : "dedie-sans-signal";
  }

  // 2. filtre Roblox / Discord, puis rangement
  const hotes = new Set(), cles = new Set(), deplaces = new Set(), promus = new Set();
  const stats = { entrees: entrees.length, filtrees: 0, dedies: 0, partages: 0, officiels: 0, ignores: 0, ouverts: Array.from(ouverts) };
  entrees.forEach(function (e) {
    if (!parlePlateformes(e)) return;
    stats.filtrees++;
    const h = hoteBrut(e);
    if (!h) { stats.ignores++; return; }
    const cat = categorieHote(h);
    if (cat === "ignore") { stats.ignores++; return; }
    // bruit du filtre : marque seulement dans une suite aléatoire, sur un hôte sans signal -> écarté
    if (cat !== "dedie" && !signalDansHote(h, W) && marqueSeulementDansSuiteAleatoire(e)) { stats.bruit = (stats.bruit || 0) + 1; return; }
    if (cat === "dedie") { hotes.add(h); return; }
    if (cat === "dedie-proche") { hotes.add(h); promus.add(h); return; }   // extension de la liste : libellé proche de roblox / discord
    if (cat === "dedie-sans-signal") deplaces.add(h);
    // hôte partagé ou officiel : lien EXACT (hôte + chemin normalisés), jamais l'hôte seul
    let url;
    try { url = new URL(urlDe(e)); } catch (err) { stats.ignores++; return; }
    cles.add(V.empreinte(V.cleLien(url)));
    if (cat === "partage") stats.partages++; else if (cat === "officiel") stats.officiels++; else stats.sansSignal = (stats.sansSignal || 0) + 1;
  });
  stats.dedies = hotes.size;
  stats.deplaces = Array.from(deplaces).sort();
  stats.promus = Array.from(promus).sort();

  // 3. exceptions (pour RETIRER une erreur)
  (exceptions.hotes || []).forEach(function (h) { hotes.delete(String(h).toLowerCase()); });
  (exceptions.liens || []).forEach(function (l) {
    try { cles.delete(V.empreinte(V.cleLien(new URL(urlDe(String(l)))))); } catch (err) { /* lien mal écrit : ignoré */ }
  });

  // 4. fichier final : hôtes en clair si ça tient, sinon en empreintes (même fonction que le site)
  const liens = Array.from(cles).sort();
  const hotesTries = Array.from(hotes).sort();
  let donnees = { version: 1, source: "Phishing.Database (licence MIT)", genere: options.date || new Date().toISOString().slice(0, 10), nbHotes: hotesTries.length, nbLiens: liens.length, hotesEmpreintes: false, hotes: hotesTries, liens: liens };
  let texte = JSON.stringify(donnees);
  if (Buffer.byteLength(texte) > LIMITE_OCTETS) {
    donnees.hotesEmpreintes = true;
    donnees.hotes = hotesTries.map(function (h) { return V.empreinte(h); }).sort();
    texte = JSON.stringify(donnees);
  }
  return { donnees: donnees, texte: texte, octets: Buffer.byteLength(texte), stats: stats };
}

// ---------- Téléchargement des 2 fichiers texte (la seule requête réseau de ce script) ----------
function telecharger(nom, destination) {
  return new Promise(function (resolve, reject) {
    const req = https.get({ host: HOTE_TELECHARGEMENT, path: CHEMIN_DEPOT + nom, timeout: 120000 }, function (rep) {
      if (rep.statusCode !== 200) { reject(new Error(nom + " : code " + rep.statusCode)); return; }
      const sortie = fs.createWriteStream(destination);
      rep.pipe(sortie);
      sortie.on("finish", function () { sortie.close(); resolve(); });
    });
    req.on("error", reject);
    req.on("timeout", function () { req.destroy(new Error("délai dépassé")); });
  });
}
function lire(dossier, nom) {
  return fs.readFileSync(path.join(dossier, nom), "utf8").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l[0] !== "#"; });
}

async function main() {
  const args = process.argv.slice(2);
  const iLocal = args.indexOf("--local");
  const dossier = iLocal !== -1 ? path.resolve(args[iLocal + 1]) : path.join(RACINE, "donnees-externes");
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  if (iLocal === -1) {
    for (const f of FICHIERS) { console.log("Téléchargement de " + f + " depuis " + HOTE_TELECHARGEMENT + " ..."); await telecharger(f, path.join(dossier, f)); }
  }
  let exceptions = { hotes: [], liens: [] };
  const fe = path.join(__dirname, "exceptions-liste.json");
  if (fs.existsSync(fe)) exceptions = JSON.parse(fs.readFileSync(fe, "utf8"));
  const entrees = FICHIERS.reduce(function (acc, f) { return acc.concat(lire(dossier, f)); }, []);
  const res = construireListe(entrees, { exceptions: exceptions });
  fs.writeFileSync(path.join(RACINE, "js", "blocklist.json"), res.texte, "utf8");
  const s = res.stats;
  console.log("Entrées lues : " + s.entrees + " ; qui parlent de Roblox/Discord : " + s.filtrees);
  console.log("  hôtes dédiés : " + res.donnees.nbHotes + " ; liens exacts : " + res.donnees.nbLiens +
    " (hôtes partagés : " + s.partages + ", domaines officiels : " + s.officiels + ", hôtes dédiés SANS signal : " + (s.sansSignal || 0) + ", ignorées : " + s.ignores + ", bruit écarté : " + (s.bruit || 0) + ")");
  console.log("  hôtes dédiés SANS signal dans le nom, laissés en liens exacts : " + s.deplaces.length + " ; promus « dédiés » (libellé à ≤ 2 fautes de roblox / discord) : " + s.promus.length);
  console.log("  hébergeurs ouverts repérés automatiquement (≥ " + SEUIL_HEBERGEUR_OUVERT + " noms d'hôte différents) : " + s.ouverts.length);
  console.log("  hôtes en " + (res.donnees.hotesEmpreintes ? "empreintes" : "clair") + " ; taille de js/blocklist.json : " + res.octets + " octets (" + (res.octets / 1024).toFixed(1) + " Ko, limite " + (LIMITE_OCTETS / 1024) + " Ko)");
}

if (require.main === module) {
  main().catch(function (e) { console.error("Erreur : " + e.message); process.exit(1); });
}
module.exports = { SUFFIXES_PARTAGES: SUFFIXES_PARTAGES, MOTIFS_PARTAGES: MOTIFS_PARTAGES, libelleProcheDeMarque: libelleProcheDeMarque, signalDansHote: signalDansHote, construireListe: construireListe, chargerLogique: chargerLogique, domaineEnregistre: domaineEnregistre };
