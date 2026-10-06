/* ==========================================================
   outils/tests-reputation.js : tests de la vérification complémentaire (js/reputation.js).

   Utilisation :  node outils/tests-reputation.js
   AUCUN réseau, AUCUN lien visité : on utilise un FAUX fetch. On charge la vraie logique de js/ telle quelle.
   ========================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Ces tests ne lisent PAS js/config.js : ils utilisent leur propre configuration, VIDE (rien n'est activé).
// Ainsi, activer ou désactiver la vérification dans js/config.js ne change jamais leur résultat.
// Chaque test qui a besoin d'une configuration active la fournit lui-même (voir ACTIVE plus bas).
const VIDE = { reputation: { urlWorker: "", seuilAlerte: 1, seuilRouge: 2 } };

function charger(langue) {
  const ctx = vm.createContext({ URL: URL, setTimeout: setTimeout, clearTimeout: clearTimeout, AbortController: AbortController });
  ctx.window = ctx;
  ctx.window.CONFIG_SITE = JSON.parse(JSON.stringify(VIDE));      // la configuration du test, pas celle du site
  ["domaines.js", "textes-" + langue + ".js", "reputation.js", "verificateur.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctx, { filename: f });
  });
  return ctx.window;
}

let echecs = 0, total = 0;
function verif(ok, msg) { total++; if (!ok) { echecs++; console.log("ÉCHEC : " + msg); } }

const W = charger("fr");
const R = W.RoShieldReputation, T = W.TEXTES_VERIF, analyser = W.RoShieldVerif.analyser;
const GRAVITE = { vert: 0, jaune: 1, rouge: 2 };
const ACTIVE = { reputation: { urlWorker: "https://roshield-sante.exemple.workers.dev", seuilAlerte: 1, seuilRouge: 2 } };
const jaune = analyser("https://exemple.com/page", "inconnu");

// ---------- 1. Une configuration VIDE n'envoie rien ----------
verif(R.lireConfig(VIDE).url === null, "configuration vide : aucune adresse de Worker");
verif(R.doitInterroger(jaune, VIDE) === null, "configuration vide : aucun nom de domaine à envoyer");
verif(R.doitInterroger(jaune) === null, "configuration du test (vide) utilisée par défaut : aucun nom de domaine à envoyer");
verif(R.doitInterroger(jaune, {}) === null && R.doitInterroger(jaune, { reputation: {} }) === null, "sans réglage : rien");
["", "   ", "pas une adresse", "http://exemple.com", "https://exemple.com", "https://exemple.workers.dev.evil.test", "https://evil.test/roshield-sante.workers.dev",
  "https://u:p@roshield-sante.exemple.workers.dev", "https://roshield-sante.exemple.workers.dev/chemin", "https://roshield-sante.exemple.workers.dev/?x=1",
  "ftp://roshield-sante.exemple.workers.dev", "http://roshield-sante.exemple.workers.dev", "https://workers.dev", "https://a.b.c.workers.dev", null, 42].forEach(function (u) {
  verif(R.adresseWorker(u) === null, "adresse refusée attendue : " + JSON.stringify(u));
  verif(R.doitInterroger(jaune, { reputation: { urlWorker: u } }) === null, "adresse invalide -> rien n'est envoyé : " + JSON.stringify(u));
});
["https://roshield-sante.exemple.workers.dev", "https://roshield-sante.exemple.workers.dev/", "http://localhost:8787", "http://127.0.0.1:8787"].forEach(function (u) {
  verif(R.adresseWorker(u) !== null, "adresse acceptée attendue : " + u);
});
verif(R.doitInterroger(jaune, ACTIVE) === "exemple.com", "activée : un résultat jaune déclenche l'envoi du nom de domaine");

// ---------- 2. Seulement le jaune, jamais un raccourcisseur / officiel / IP ----------
const cas = [
  ["https://exemple.com/page", "inconnu", "exemple.com"],
  ["https://www.exemple.com/page?x=1#a", "inconnu", "www.exemple.com"],
  ["https://rbx-fans.example/", "inconnu", "rbx-fans.example"],                          // jaune alerte forte (mot de marque « rbx » seul)
  ["https://exemple.com/robux", "inconnu", "exemple.com"],                               // jaune alerte forte (mot d'appât dans le chemin)
  ["https://todoroblox.example/", "inconnu", "todoroblox.example"],                      // « roblox » seul dans le nom : jaune alerte forte
  ["https://free-robux.xyz/", "inconnu", null],                                          // mot d'appât dans le nom : rouge, rien à vérifier
  ["https://evil.test/roblox.com", "inconnu", "evil.test"],                              // jaune alerte forte (nom copié dans le chemin)
  ["[exemple.com](https://autre.test/x)", "inconnu", "autre.test"],                      // adresse affichée différente : jaune ; on envoie l'adresse RÉELLE
  ["[Mon site](https://exemple.com/page)", "inconnu", "exemple.com"],                    // [texte](adresse) : le domaine de l'adresse réelle
  ["hxxps://exemple[.]com/page", "inconnu", "exemple.com"],
  ["https://bit.ly/abc123", "inconnu", null],                                            // raccourcisseur : jamais
  ["[Mon profil](https://bit.ly/abc123)", "inconnu", null],
  ["https://tinyurl.com/x", "inconnu", null],
  ["https://www.roblox.com/home", "inconnu", null],                                      // vert
  ["https://discord.com/channels/1/2", "inconnu", null],
  ["http://www.roblox.com", "inconnu", null],                                            // officiel mais vérifie : jamais
  ["https://cdn.discordapp.com/attachments/1/2/f.png", "inconnu", null],                 // officiel mais vérifie : jamais
  ["https://roblox-free.test", "inconnu", null],                                         // rouge : rien à vérifier
  ["http://192.0.2.1/x", "inconnu", null],                                               // adresse IP (rouge)
  ["https://exemple.com/page", "roblox", null],                                          // « page Roblox » : rouge
  ["javascript:alert(1)", "inconnu", null],
  ["mailto:quelquun@exemple.com", "inconnu", null],
  ["", "inconnu", null],
  ["bonjour tout le monde", "inconnu", null]
];
cas.forEach(function (c) {
  const res = analyser(c[0], c[1]);
  const d = R.doitInterroger(res, ACTIVE);
  verif(d === c[2], "doitInterroger(" + c[0].slice(0, 50) + " [" + c[1] + "]) = " + d + " (attendu " + c[2] + ")");
});

// ---------- 3. Ce qu'on envoie : SEULEMENT le nom de domaine ----------
(async function () {
  const appels = [];
  const faux = function (reponse) {
    return async function (url, init) { appels.push({ url: url, init: init }); const r = reponse(url, init); if (r instanceof Error) throw r; return r; };
  };
  const ok = function (corps, statut) { return { ok: (statut || 200) < 300, status: statut || 200, json: async function () { return corps; } }; };

  R.viderCache();
  let r = await R.interroger("exemple.com", ACTIVE, faux(function () { return ok({ ok: true, etat: "connu", malveillants: 0, suspects: 0, inoffensifs: 60, nonDetectes: 26, total: 86, date: "2026-01-01" }); }));
  verif(r.etat === "connu" && r.malveillants === 0 && r.total === 86, "réponse « connu » comprise");
  verif(appels.length === 1, "un seul appel");
  verif(appels[0].url === "https://roshield-sante.exemple.workers.dev/reputation", "adresse appelée : " + appels[0].url);
  verif(appels[0].init.method === "POST", "méthode POST");
  verif(appels[0].init.body === JSON.stringify({ domaine: "exemple.com" }), "corps : seulement le nom de domaine : " + appels[0].init.body);
  verif(appels[0].init.credentials === "omit" && appels[0].init.referrerPolicy === "no-referrer" && appels[0].init.cache === "no-store", "ni cookie, ni referer, ni cache");
  verif(Object.keys(appels[0].init.headers).join() === "Content-Type", "un seul en-tête (Content-Type)");

  // le lien complet n'est JAMAIS envoyé
  R.viderCache(); appels.length = 0;
  const resLong = analyser("https://exemple.org/chemin/secret?jeton=12345#ancre", "inconnu");
  const dom = R.doitInterroger(resLong, ACTIVE);
  await R.interroger(dom, ACTIVE, faux(function () { return ok({ ok: true, etat: "inconnu" }); }));
  verif(!JSON.stringify(appels).includes("secret") && !JSON.stringify(appels).includes("12345") && !JSON.stringify(appels).includes("ancre"), "le chemin, la requête et l'ancre ne partent jamais");

  // désactivée : le faux fetch n'est jamais appelé
  appels.length = 0; R.viderCache();
  r = await R.interroger("exemple.com", { reputation: { urlWorker: "" } }, faux(function () { return ok({}); }));
  verif(appels.length === 0 && r.etat === "desactive", "désactivée : aucun appel réseau");

  // cache de la visite : une seule demande par nom de domaine
  R.viderCache(); appels.length = 0;
  const f1 = faux(function () { return ok({ ok: true, etat: "connu", malveillants: 0, suspects: 0, inoffensifs: 1, nonDetectes: 0, total: 1, date: "2026-01-01" }); });
  await R.interroger("a.exemple.com", ACTIVE, f1); await R.interroger("a.exemple.com", ACTIVE, f1);
  verif(appels.length === 1, "une seule demande par nom de domaine pendant la visite");

  // ---------- 4. Le site marche si le Worker est injoignable, en limite ou en panne ----------
  const pannes = [
    ["réseau coupé", function () { return new TypeError("Failed to fetch"); }, "indisponible"],
    ["limite atteinte (429)", function () { return ok({ ok: false, etat: "limite" }, 429); }, "limite"],
    ["panne (502)", function () { return ok({ ok: false, etat: "indisponible" }, 502); }, "indisponible"],
    ["origine refusée (403)", function () { return ok({ ok: false }, 403); }, "indisponible"],
    ["JSON illisible", function () { return { ok: true, status: 200, json: async function () { throw new Error("pas du json"); } }; }, "indisponible"],
    ["réponse inventée", function () { return ok({ ok: true, etat: "connu", malveillants: "beaucoup", total: 5 }); }, "indisponible"],
    ["comptes absurdes", function () { return ok({ ok: true, etat: "connu", malveillants: 9, total: 3 }); }, "indisponible"],
    ["comptes négatifs", function () { return ok({ ok: true, etat: "connu", malveillants: -1, total: 3 }); }, "indisponible"],
    ["réponse vide", function () { return ok(null); }, "indisponible"]
  ];
  for (const p of pannes) {
    R.viderCache();
    const d = await R.interroger("exemple.com", ACTIVE, faux(p[1]));
    verif(d.etat === p[2], p[0] + " -> " + p[2] + " (trouvé " + d.etat + ")");
    const res = analyser("https://exemple.com/page", "inconnu");
    const apres = R.appliquer(res, d, ACTIVE);
    verif(apres.niveau === res.niveau && apres.titreCle === res.titreCle && JSON.stringify(apres.raisons) === JSON.stringify(res.raisons), p[0] + " : le résultat local reste tel quel");
    verif(apres.reputation && apres.reputation.etat === "indisponible", p[0] + " : une ligne discrète « indisponible »");
  }

  // ---------- 5. Les seuils : on peut AGGRAVER, jamais alléger, jamais vert ----------
  const base = analyser("https://exemple.com/page", "inconnu");       // jaune
  const connu = function (m, total) { return { etat: "connu", malveillants: m, total: total || 84, date: "2026-01-01" }; };
  const attendus = [[0, "jaune", base.titreCle], [1, "jaune", "reputationUnJaune"], [2, "rouge", "reputationPlusieursRouge"], [3, "rouge", "reputationPlusieursRouge"], [10, "rouge", "reputationPlusieursRouge"]];
  attendus.forEach(function (a) {
    const x = R.appliquer(base, connu(a[0]), ACTIVE);
    verif(x.niveau === a[1] && x.titreCle === a[2], a[0] + " moteur(s) : " + x.niveau + "/" + x.titreCle + " (attendu " + a[1] + "/" + a[2] + ")");
    verif(GRAVITE[x.niveau] >= GRAVITE[base.niveau], a[0] + " moteur(s) : le niveau ne baisse jamais");
    verif(x.niveau !== "vert", a[0] + " moteur(s) : jamais vert");
    if (a[0] === 0) {
      verif(JSON.stringify(x.raisons) === JSON.stringify(base.raisons) && x.niveau === base.niveau && x.titreCle === base.titreCle, "0 détection : rien ne change dans le résultat");
    } else {
      verif(x.raisons[0].indexOf(a[0] + " moteur") === 0, a[0] + " : le nombre exact est dans le texte : " + x.raisons[0].slice(0, 60));
      verif(!x.raisons.includes(T.inconnu), "aggravé : le message « domaine inconnu » est retiré");
    }
  });
  verif(T.titres.reputationPlusieursRouge === "Plusieurs moteurs de sécurité signalent ce nom de domaine", "titre exact du rouge");
  // seuil modifiable dans config.js
  const seuil5 = { reputation: { urlWorker: ACTIVE.reputation.urlWorker, seuilAlerte: 1, seuilRouge: 5 } };
  [[1, "jaune"], [2, "jaune"], [4, "jaune"], [5, "rouge"], [10, "rouge"]].forEach(function (a) {
    const x = R.appliquer(base, connu(a[0]), seuil5);
    verif(x.niveau === a[1], "seuilRouge = 5, " + a[0] + " moteur(s) : " + x.niveau + " (attendu " + a[1] + ")");
  });
  const seuil1 = { reputation: { urlWorker: ACTIVE.reputation.urlWorker, seuilAlerte: 1, seuilRouge: 1 } };
  verif(R.appliquer(base, connu(1), seuil1).niveau === "rouge" && R.appliquer(base, connu(1), seuil1).titreCle === "reputationUnRouge", "seuilRouge = 1 : un moteur suffit pour le rouge (titre « un moteur »)");
  verif(R.lireConfig({ reputation: { seuilAlerte: 9, seuilRouge: 3 } }).seuilAlerte === 3, "un seuil d'alerte au-dessus du seuil rouge est ramené au seuil rouge");
  verif(R.lireConfig({ reputation: { seuilAlerte: 0, seuilRouge: "x" } }).seuilRouge === 2, "réglages absurdes : valeurs par défaut (1 et 2)");

  // seuls les moteurs « malicious » comptent : suspicious / undetected / harmless n'aggravent rien
  const sansMalicious = R.appliquer(base, { etat: "connu", malveillants: 0, suspects: 40, inoffensifs: 10, nonDetectes: 34, total: 84, date: null }, ACTIVE);
  verif(sansMalicious.niveau === "jaune" && sansMalicious.titreCle === base.titreCle, "0 « malicious » (même avec beaucoup de « suspicious ») : rien ne change");

  // un vert reste vert, un rouge reste tel quel, une erreur de saisie reste une erreur : VirusTotal ne change jamais ça
  const vert = analyser("https://www.roblox.com/home", "inconnu"), rouge = analyser("https://roblox-free.test", "inconnu");
  [0, 1, 2, 10].forEach(function (m) {
    const v = R.appliquer(vert, connu(m), ACTIVE), r2 = R.appliquer(rouge, connu(m), ACTIVE);
    verif(v.niveau === "vert" && v.titreCle === "vert", "un résultat vert n'est jamais modifié (" + m + ")");
    verif(r2.niveau === "rouge" && r2.titreCle === rouge.titreCle && JSON.stringify(r2.raisons) === JSON.stringify(rouge.raisons), "un résultat rouge garde son titre et ses raisons (" + m + ")");
  });
  const erreur = analyser("", "inconnu");
  verif(R.appliquer(erreur, connu(5), ACTIVE) === erreur, "une erreur de saisie n'est jamais modifiée");

  // pour TOUS les liens du jeu de test : le niveau ne baisse jamais, quel que soit le nombre de moteurs
  function lire(f) { return fs.readFileSync(path.join(__dirname, "evaluation", f), "utf8").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l[0] !== "#"; }); }
  const tous = lire("liens-honnetes.txt").concat(lire("liens-officiels.txt"), lire("pieges-synthetiques.txt"));
  let comparaisons = 0, declenchent = 0, mauvais = 0;
  tous.forEach(function (l) {
    ["inconnu", "roblox"].forEach(function (rep) {
      const res = analyser(l, rep);
      if (res.erreur) return;
      const dom2 = R.doitInterroger(res, ACTIVE);
      if (rep === "inconnu" && dom2) declenchent++;
      if (dom2 && (res.niveau !== "jaune" || res.titreCle === "officielAttention")) mauvais++;
      [0, 1, 2, 3, 10].forEach(function (m) {
        comparaisons++;
        const x = R.appliquer(res, connu(m), ACTIVE);
        if (GRAVITE[x.niveau] < GRAVITE[res.niveau] || (res.niveau === "vert" && x.niveau !== "vert")) { mauvais++; console.log("ÉCHEC : le niveau a baissé ou un vert a changé : " + l.slice(0, 70)); }
      });
    });
  });
  verif(mauvais === 0, "jeu de test : aucun résultat plus bas ou interrogé à tort");
  console.log("Jeu de test : " + tous.length + " liens, " + comparaisons + " comparaisons (0, 1, 2, 3, 10 moteurs) ; " + declenchent + " liens déclencheraient une demande (jaunes, hors raccourcisseurs et officiels).");

  // ---------- 6. Anglais : mêmes comportements, texte « sûr » ----------
  const WE = charger("en"), RE = WE.RoShieldReputation, TE = WE.TEXTES_VERIF;
  verif(TE.reputationAvertissement === "No reports doesn’t mean safe." && T.reputationAvertissement === "Aucun signalement ne veut pas dire sûr.", "phrase « Aucun signalement ne veut pas dire sûr » (FR) / « No reports doesn’t mean safe. » (EN)");
  const baseEn = WE.RoShieldVerif.analyser("https://exemple.com/page", "inconnu");
  const xe = RE.appliquer(baseEn, connu(2), ACTIVE);
  verif(xe.niveau === "rouge" && TE.titres[xe.titreCle] === "Several security engines flag this domain name", "anglais : rouge avec le titre « Several security engines flag this domain name »");
  verif(!/\b(safe|secure|proven|sûr|prouvé)\b/i.test(TE.reputationResultat(0, 86, "2026-01-01")), "aucun texte de résultat ne dit « sûr » ou « prouvé »");
  verif(!/(sûr|prouvé)/i.test(T.reputationResultat(0, 86, "2026-01-01") + T.reputationInconnu + T.reputationEnvoye("x.com")), "français : pareil");
  verif(!/^Aucun signalement/.test(T.reputationResultat(0, 86, null)), "le résultat seul ne prétend rien");

  console.log((total - echecs) + " / " + total + " tests réussis");
  process.exit(echecs ? 1 : 0);
})();
