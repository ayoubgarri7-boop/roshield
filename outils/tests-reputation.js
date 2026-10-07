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

  // ---------- 5b. Le LIEN COMPLET d'un résultat jaune (sans « # », sans requête sauf raccourci) part vers /reputation-lien ----------
  const RACC = W.RACCOURCISSEURS;
  const hoteDe = function (l) { return new URL(l).hostname.toLowerCase(); };
  const estRacc = function (h) { return RACC.some(function (r) { return h === r || h.endsWith("." + r); }); };

  const court = analyser("https://tinyurl.com/3vk33xhh#ancre-privee", "inconnu");
  verif(court.niveau === "jaune" && court.lien === "https://tinyurl.com/3vk33xhh", "raccourci : jaune, et le lien à envoyer est sans « # » : " + court.lien);
  verif(R.lienAEnvoyer(court, ACTIVE) === "https://tinyurl.com/3vk33xhh", "raccourci : le lien complet est à envoyer");
  verif(R.doitInterroger(court, ACTIVE) === null, "raccourci : jamais de nom de domaine envoyé à /reputation");
  verif(R.lienAEnvoyer(court, VIDE) === null && R.lienAEnvoyer(court, {}) === null, "désactivée : aucun lien à envoyer");
  verif(R.lienAEnvoyer(analyser("https://bit.ly/abc?x=1&y=2#f", "inconnu"), ACTIVE) === "https://bit.ly/abc?x=1&y=2", "la requête reste, le « # » part");

  R.viderCache(); appels.length = 0;
  r = await R.interrogerLien("https://tinyurl.com/3vk33xhh", ACTIVE, faux(function () { return ok({ ok: true, etat: "connu", malveillants: 4, suspects: 0, inoffensifs: 60, nonDetectes: 29, total: 93, date: "2026-01-01" }); }));
  verif(r.etat === "connu" && r.malveillants === 4 && r.total === 93, "raccourci : réponse « connu » comprise");
  verif(appels.length === 1 && appels[0].url === "https://roshield-sante.exemple.workers.dev/reputation-lien", "raccourci : adresse appelée : " + (appels[0] && appels[0].url));
  verif(appels[0].init.method === "POST" && appels[0].init.body === JSON.stringify({ lien: "https://tinyurl.com/3vk33xhh" }), "raccourci : corps = seulement le lien : " + appels[0].init.body);
  verif(appels[0].init.credentials === "omit" && appels[0].init.referrerPolicy === "no-referrer" && Object.keys(appels[0].init.headers).join() === "Content-Type", "raccourci : ni cookie, ni referer, un seul en-tête");
  await R.interrogerLien("https://tinyurl.com/3vk33xhh", ACTIVE, faux(function () { return ok({}); }));
  verif(appels.length === 1, "raccourci : une seule demande par lien pendant la visite");

  // Tout passe par lancer() : on enregistre TOUT ce qui part, pour un mélange de liens
  async function executer(res, reponse) {
    if (!executer.garder) R.viderCache();
    W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
    const envoyes = [];
    W.fetch = async function (url, init) { envoyes.push({ url: url, corps: init.body }); const x = reponse(url, init); if (x instanceof Error) throw x; return x; };
    try {
      return await new Promise(function (resolve) {
        const rendus = [];
        R.lancer(res, function (x) { rendus.push(x); if (!x.attente) resolve({ rendus: rendus, envoyes: envoyes }); });
      });
    } finally { delete W.fetch; W.CONFIG_SITE = JSON.parse(JSON.stringify(VIDE)); }
  }
  const repConnu = function (m) { return function () { return ok({ ok: true, etat: "connu", malveillants: m, suspects: 0, inoffensifs: 50, nonDetectes: 20, total: 84, date: "2026-01-01" }); }; };
  const base2 = "https://roshield-sante.exemple.workers.dev";

  let x = await executer(analyser("https://tinyurl.com/3vk33xhh#ancre-privee", "inconnu"), repConnu(4));
  verif(x.envoyes.length === 1 && x.envoyes[0].url === base2 + "/reputation-lien" && x.envoyes[0].corps === JSON.stringify({ lien: "https://tinyurl.com/3vk33xhh" }), "lancer, raccourci : un seul appel, /reputation-lien, lien sans « # »");
  verif(x.rendus[0].attente === true && x.rendus[0].niveau === undefined && x.rendus[0].titreCle === undefined && x.rendus[0].raisons === undefined, "lancer, raccourci : d'abord SEULEMENT « Vérification en cours… » (aucun jaune)");
  verif(x.rendus[1].niveau === "rouge" && x.rendus[1].titreCle === "reputationLienPlusieursRouge" && x.rendus[1].raisons[0].indexOf("4 moteurs") === 0 && x.rendus[1].raisons[0].indexOf("ce lien") !== -1, "lancer, raccourci : 4 moteurs -> rouge avec le nombre : " + x.rendus[1].raisons[0]);
  verif(x.rendus[1].notes.some(function (n) { return n.indexOf("Destination cachée") === 0; }), "lancer, raccourci : la note « destination cachée » reste");

  // jaune ORDINAIRE : le lien complet, sans « # » ni paramètres de requête, vers /reputation-lien (jamais /reputation)
  x = await executer(analyser("https://exemple.org/chemin/secret?jeton=12345#ancre", "inconnu"), repConnu(0));
  verif(x.envoyes.length === 2 && x.envoyes[0].url === base2 + "/reputation-lien" && x.envoyes[0].corps === JSON.stringify({ lien: "https://exemple.org/chemin/secret" }), "jaune ordinaire (0 moteur) : d'abord le lien complet sans « # » ni requête : " + JSON.stringify(x.envoyes));
  verif(x.envoyes[1].url === base2 + "/reputation" && x.envoyes[1].corps === JSON.stringify({ domaine: "exemple.org" }), "jaune ordinaire (0 moteur) : puis SEULEMENT le nom de domaine");
  verif(!JSON.stringify(x.envoyes).includes("jeton") && !JSON.stringify(x.envoyes).includes("12345") && !JSON.stringify(x.envoyes).includes("ancre"), "jaune ordinaire : ni la requête ni l'ancre ne partent");
  verif(x.envoyes[0].url === base2 + "/reputation-lien", "jaune ordinaire : le lien complet est toujours vérifié EN PREMIER");
  // un raccourci garde ses paramètres de requête (ils peuvent faire partie de l'identifiant)
  x = await executer(analyser("https://bit.ly/abc?x=1#f", "inconnu"), repConnu(0));
  verif(x.envoyes.length === 1 && x.envoyes[0].corps === JSON.stringify({ lien: "https://bit.ly/abc?x=1" }), "raccourci : la requête reste, le « # » part");
  // lien en http (ou trop long) : repli sur le nom de domaine seul
  x = await executer(analyser("http://exemple.org/page?a=1", "inconnu"), repConnu(0));
  verif(x.envoyes.length === 1 && x.envoyes[0].url === base2 + "/reputation" && x.envoyes[0].corps === JSON.stringify({ domaine: "exemple.org" }), "http : repli sur le nom de domaine seul : " + JSON.stringify(x.envoyes));
  x = await executer(analyser("https://exemple.org/" + "a".repeat(250), "inconnu"), repConnu(0));
  verif(x.envoyes.length === 1 && x.envoyes[0].url === base2 + "/reputation" && x.envoyes[0].corps === JSON.stringify({ domaine: "exemple.org" }), "trop long : repli sur le nom de domaine seul");
  // JAMAIS rouge, vert, officiel, IP, nom local : rien ne part
  for (const l of ["https://roblox-free.test/login", "https://www.roblox.com/home", "https://discord.gg/abc", "https://192.0.2.1/x", "https://exemple.local/x", "https://monpc.lan/page", "https://localhost/x", "https://free-robux.xyz/"]) {
    x = await executer(analyser(l, "inconnu"), repConnu(0));
    verif(x.envoyes.length === 0, "rien n'est envoyé pour : " + l + " (" + analyser(l, "inconnu").niveau + ") " + JSON.stringify(x.envoyes));
  }

  // sur TOUT le jeu de test : seul un résultat JAUNE envoie un lien (https, sans « # », sans requête sauf raccourci) ; jamais rouge ni vert
  let nbLiens = 0, nbRepli = 0, nbRien = 0, faux1 = 0;
  const liensTest = tous.concat(["https://bit.ly/abc", "https://tinyurl.com/x?a=1#z", "https://www.bit.ly/abc", "https://t.co/Ab12", "https://rb.gy/zzz", "http://bit.ly/abc", "https://u:p@bit.ly/abc",
    "https://exemple.test/bit.ly/abc", "https://exemple.test/?u=https://bit.ly/abc", "https://bit.ly/" + "a".repeat(300), "http://exemple.test/page", "https://exemple.test:8443/page", "https://exemple.local/x"]);
  for (const l of liensTest) {
    const res = analyser(l, "inconnu");
    if (res.erreur) continue;
    const lien = R.lienAEnvoyer(res, ACTIVE), dom3 = R.doitInterroger(res, ACTIVE);
    if (lien) {
      nbLiens++;
      const h = hoteDe(lien);
      if (!(res.niveau === "jaune" && res.titreCle !== "officielAttention" && lien.indexOf("https://") === 0 && lien.indexOf("#") === -1 && lien.length <= 200 &&
            (lien.indexOf("?") === -1 || estRacc(h)) && !/^[0-9.]+$/.test(h) && /\./.test(h) && !/\.(local|lan|internal|localhost)$/.test(h))) { faux1++; console.log("ÉCHEC : lien envoyé à tort : " + l.slice(0, 70)); }
    } else if (dom3) {
      nbRepli++;
      if (res.niveau !== "jaune" || !/^[a-z0-9.-]+$/.test(dom3) || estRacc(dom3)) { faux1++; console.log("ÉCHEC : domaine envoyé à tort : " + l.slice(0, 70)); }
    } else nbRien++;
    if (res.niveau !== "jaune" && (lien || dom3)) { faux1++; console.log("ÉCHEC : rouge ou vert interrogé : " + l.slice(0, 70)); }
  }
  verif(faux1 === 0, "jeu de test : seul un résultat jaune envoie un lien (https, sans « # », sans requête sauf raccourci) ; jamais un rouge ou un vert");
  console.log("Lien complet : " + nbLiens + " liens complets seraient envoyés (jaunes) ; " + nbRepli + " enverraient seulement le nom de domaine (http, trop long, port...) ; " + nbRien + " n'enverraient rien (rouges, verts, officiels, IP, noms locaux, raccourcis non envoyables).");
  ["http://bit.ly/abc", "https://u:p@bit.ly/abc", "https://bit.ly/" + "a".repeat(300), "https://exemple.local/x", "https://monpc.lan/x", "https://127.0.0.1/x", "https://roblox-free.test/login", "https://www.roblox.com/home"].forEach(function (l) {
    verif(R.lienAEnvoyer(analyser(l, "inconnu"), ACTIVE) === null, "aucun lien envoyé pour : " + l.slice(0, 60));
  });
  // un résultat truqué à la main ne peut pas non plus faire partir autre chose
  const ord = analyser("https://exemple.org/page", "inconnu");
  verif(R.lienAEnvoyer(ord, ACTIVE) === "https://exemple.org/page", "lien ordinaire : https://exemple.org/page");
  verif(R.lienAEnvoyer(Object.assign({}, ord, { lien: "https://autre.test/x" }), ACTIVE) === null, "un lien d'un autre hôte n'est jamais envoyé");
  verif(R.lienAEnvoyer(Object.assign({}, ord, { lien: "https://exemple.org/x?a=1" }), ACTIVE) === null, "une requête n'est jamais envoyée (sauf raccourci)");
  verif(R.lienAEnvoyer(Object.assign({}, court, { lien: "https://tinyurl.com/x#f" }), ACTIVE) === null, "un lien avec « # » n'est jamais envoyé");
  verif(R.lienAEnvoyer(Object.assign({}, ord, { niveau: "rouge" }), ACTIVE) === null && R.lienAEnvoyer(Object.assign({}, ord, { niveau: "vert" }), ACTIVE) === null, "seulement le jaune");

  // les seuils pour un raccourci : mêmes que pour les domaines
  const racc = analyser("https://tinyurl.com/3vk33xhh", "inconnu");
  const r0 = R.appliquer(racc, connu(0), ACTIVE, "lien"), r1 = R.appliquer(racc, connu(1), ACTIVE, "lien"), r2l = R.appliquer(racc, connu(2), ACTIVE, "lien");
  verif(r0.niveau === "jaune" && r0.titreCle === racc.titreCle && JSON.stringify(r0.raisons) === JSON.stringify(racc.raisons) && r0.reputation.malveillants === 0, "raccourci, 0 moteur : reste jaune « destination cachée », rien ne change");
  verif(r1.niveau === "jaune" && r1.titreCle === "reputationLienUnJaune" && r1.raisons[0].indexOf("1 moteur de sécurité sur 84 signale ce lien") === 0, "raccourci, 1 moteur : alerte forte jaune avec le nombre : " + r1.raisons[0]);
  verif(r2l.niveau === "rouge" && r2l.titreCle === "reputationLienPlusieursRouge", "raccourci, 2 moteurs : rouge");
  verif(T.titres.reputationLienPlusieursRouge === "Plusieurs moteurs de sécurité signalent ce lien" && T.titres.reputationLienUnJaune === "Attention : un moteur de sécurité signale ce lien", "titres exacts (lien complet)");
  [0, 1, 2, 10].forEach(function (m) { verif(GRAVITE[R.appliquer(racc, connu(m), ACTIVE, "lien").niveau] >= GRAVITE[racc.niveau], "raccourci : le niveau ne baisse jamais (" + m + ")"); });
  verif(T.reputationLienAucun === "Aucun antivirus ne le signale pour l'instant. Ça ne veut pas dire sûr.", "ligne « Aucun antivirus ne le signale pour l'instant. Ça ne veut pas dire sûr. »");
  const inconnuLien = R.appliquer(racc, { etat: "inconnu" }, ACTIVE, "lien");
  verif(inconnuLien.niveau === "jaune" && inconnuLien.titreCle === racc.titreCle && inconnuLien.reputation.etat === "inconnu" && inconnuLien.reputation.nature === "lien", "raccourci, « inconnu » : reste jaune");

  // la panne du Worker laisse le jaune « destination cachée », sans rien casser
  const pannesLien = [
    ["réseau coupé", function () { return new TypeError("Failed to fetch"); }],
    ["limite atteinte (429)", function () { return ok({ ok: false, etat: "limite" }, 429); }],
    ["panne (502)", function () { return ok({ ok: false, etat: "indisponible" }, 502); }],
    ["refusé (422)", function () { return ok({ ok: false, etat: "non_applicable" }, 422); }],
    ["JSON illisible", function () { return { ok: true, status: 200, json: async function () { throw new Error("x"); } }; }],
    ["réponse inventée", function () { return ok({ ok: true, etat: "connu", malveillants: 99, total: 3 }); }]
  ];
  for (const pl of pannesLien.concat(pannesLien.map(function (q) { return [q[0] + ' (lien ordinaire)', q[1], true]; }))) {
    R.viderCache();
    const racc = pl[2] ? analyser("https://exemple.org/page", "inconnu") : analyser("https://tinyurl.com/3vk33xhh", "inconnu");
    const sortie = await executer(racc, pl[1]);
    const dernier = sortie.rendus[sortie.rendus.length - 1];
    verif(dernier.niveau === "jaune" && dernier.titreCle === racc.titreCle && JSON.stringify(dernier.raisons) === JSON.stringify(racc.raisons) && JSON.stringify(dernier.notes) === JSON.stringify(racc.notes), pl[0] + " : le jaune « destination cachée » reste tel quel");
    verif(dernier.reputation.etat === "indisponible" || dernier.reputation.etat === "limite", pl[0] + " : une ligne discrète (« indisponible »)");
  }

  // une seule demande par lien pendant la visite (cache), via lancer()
  R.viderCache(); executer.garder = true;
  let n2 = 0;
  await executer(racc, function () { n2++; return ok({ ok: true, etat: "connu", malveillants: 0, suspects: 0, inoffensifs: 1, nonDetectes: 0, total: 1, date: "2026-01-01" }); });
  await executer(racc, function () { n2++; return ok({}); });
  executer.garder = false;
  verif(n2 === 1, "lancer, raccourci : deuxième vérification du même lien servie par le cache de la visite");
  R.viderCache();


  // ---------- 5c. Attente : « Vérification en cours… » seule, puis le résultat final (4 secondes au plus) ----------
  verif(T.verificationEnCours === "Vérification en cours…", "texte français de l'attente");
  const attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  // lance lancer() avec un faux fetch ; renvoie les rendus avec l'instant de chacun (en ms depuis le lancement)
  function suivre(res, reponse, compteur) {
    W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
    W.fetch = function (url, init) { if (compteur) compteur.n++; return reponse(url, init); };
    const t0 = Date.now(), rendus = [];
    return new Promise(function (resolve) {
      R.lancer(res, function (x) { rendus.push({ x: x, t: Date.now() - t0 }); if (!x.attente) resolve(rendus); });
      if (rendus.length && !rendus[0].x.attente) resolve(rendus);
    }).then(function (r) { return r; });
  }
  const finSuivi = function () { delete W.fetch; W.CONFIG_SITE = JSON.parse(JSON.stringify(VIDE)); };
  const jauneOrd = analyser("https://exemple.org/page", "inconnu");

  // réponse RAPIDE : d'abord l'attente seule, puis le résultat final, bien avant 4 secondes
  R.viderCache();
  let suivi = await suivre(jauneOrd, async function () { await attendre(100); return ok({ ok: true, etat: "connu", malveillants: 2, suspects: 0, inoffensifs: 80, nonDetectes: 2, total: 84, date: "2026-01-01" }); });
  finSuivi();
  verif(suivi.length === 2 && suivi[0].x.attente === true && suivi[0].t < 50, "réponse rapide : l'attente s'affiche tout de suite");
  verif(suivi[1].x.niveau === "rouge" && suivi[1].t >= 90 && suivi[1].t < 1000, "réponse rapide : le résultat final arrive dès que le Worker répond (" + suivi[1].t + " ms)");

  verif(T.reputationIndisponible.indexOf("Vérification complémentaire indisponible") === 0, "texte de la ligne « Vérification complémentaire indisponible… »");

  // PANNE immédiate : pas d'attente de 4 secondes
  R.viderCache();
  suivi = await suivre(jauneOrd, async function () { throw new TypeError("Failed to fetch"); });
  finSuivi();
  verif(suivi.length === 2 && suivi[1].t < 500 && suivi[1].x.niveau === "jaune" && suivi[1].x.reputation.etat === "indisponible", "panne : jaune + « indisponible » tout de suite (" + suivi[1].t + " ms)");
  R.viderCache();
  suivi = await suivre(jauneOrd, async function () { return ok({ ok: false, etat: "limite" }, 429); });
  finSuivi();
  verif(suivi.length === 2 && suivi[1].t < 500 && suivi[1].x.niveau === "jaune" && suivi[1].x.reputation.etat === "indisponible", "limite (429) : jaune + ligne discrète tout de suite");

  // DEUX CLICS RAPIDES sur le même lien : une seule requête, les deux reçoivent le même résultat final
  R.viderCache();
  const cpt = { n: 0 };
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.fetch = function () { cpt.n++; return attendre(150).then(function () { return ok({ ok: true, etat: "connu", malveillants: 1, suspects: 0, inoffensifs: 80, nonDetectes: 3, total: 84, date: "2026-01-01" }); }); };
  const finaux = [];
  await new Promise(function (resolve) {
    const fini = function (x) { if (!x.attente) { finaux.push(x); if (finaux.length === 2) resolve(); } };
    R.lancer(jauneOrd, fini); R.lancer(jauneOrd, fini);
  });
  finSuivi();
  verif(cpt.n === 1, "deux clics rapides sur le même lien : UNE seule requête (" + cpt.n + ")");
  verif(finaux.length === 2 && finaux[0].titreCle === "reputationLienUnJaune" && finaux[1].titreCle === "reputationLienUnJaune", "deux clics : les deux reçoivent le résultat final");
  // trois clics en rafale, lien raccourci puis repli http : toujours une requête par lien
  R.viderCache(); cpt.n = 0;
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.fetch = function () { cpt.n++; return attendre(100).then(function () { return ok({ ok: true, etat: "inconnu" }); }); };
  let compte = 0;
  await new Promise(function (resolve) {
    const fini = function (x) { if (!x.attente && ++compte === 5) resolve(); };
    R.lancer(analyser("https://bit.ly/abc", "inconnu"), fini); R.lancer(analyser("https://bit.ly/abc#autre", "inconnu"), fini);
    R.lancer(analyser("http://exemple.org/x", "inconnu"), fini); R.lancer(analyser("http://exemple.org/y", "inconnu"), fini);
    R.lancer(analyser("https://exemple.org/page", "inconnu"), fini);
  });
  finSuivi();
  verif(cpt.n === 3, "rafale : une requête par lien distinct (bit.ly/abc ×2 -> 1, http exemple.org ×2 -> 1, exemple.org/page -> 1) : " + cpt.n);
  // un lien différent n'est pas bloqué par le premier
  R.viderCache(); cpt.n = 0;
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.fetch = function () { cpt.n++; return attendre(50).then(function () { return ok({ ok: true, etat: "inconnu" }); }); };
  compte = 0;
  await new Promise(function (resolve) { const fini = function (x) { if (!x.attente && ++compte === 2) resolve(); }; R.lancer(analyser("https://a.exemple.org/", "inconnu"), fini); R.lancer(analyser("https://b.exemple.org/", "inconnu"), fini); });
  finSuivi();
  verif(cpt.n === 4, "deux liens différents : chacun sa vérification du lien et de son domaine (4 requêtes) : " + cpt.n);

  // Rouge, vert, officiel, IP, nom local, raccourci non envoyable : affichés TOUT DE SUITE (un seul rendu, synchrone), sans attente
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.fetch = function () { cpt.n++; return new Promise(function () {}); };
  cpt.n = 0;
  for (const l of ["https://roblox-free.test/login", "https://www.roblox.com/home", "https://discord.gg/abc", "https://192.0.2.1/x", "https://exemple.local/x", "https://monpc.lan/x", "https://free-robux.xyz/", "http://bit.ly/abc"]) {
    const rendus = [];
    R.lancer(analyser(l, "inconnu"), function (x) { rendus.push(x); });
    verif(rendus.length === 1 && !rendus[0].attente && rendus[0].niveau, "affiché tout de suite, sans attente : " + l);
  }
  verif(cpt.n === 0, "rouge, vert, officiel, IP, nom local : aucune requête");
  // résultat déjà connu (cache de la visite) : affiché tout de suite aussi
  finSuivi();
  R.viderCache();
  await suivre(jauneOrd, async function () { return ok({ ok: true, etat: "inconnu" }); }); finSuivi();
  const rapide = [];
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  R.lancer(jauneOrd, function (x) { rapide.push(x); });
  finSuivi();
  verif(rapide.length === 1 && !rapide[0].attente && rapide[0].reputation && rapide[0].reputation.etat === "inconnu", "résultat déjà en cache : affiché tout de suite");
  R.viderCache();

  // ---------- 5d. DOUBLE VÉRIFICATION : le lien d'abord, puis (seulement si rien n'est signalé) le nom de domaine ----------
  // Un faux « Worker » qui répond selon la route : /reputation-lien et /reputation
  const rep = function (m, extra) { return Object.assign({ ok: true, etat: "connu", malveillants: m, suspects: 0, inoffensifs: 60, nonDetectes: 20, total: 80 + m, date: "2026-01-01" }, extra || {}); };
  const attenteVT = { ok: true, etat: "inconnu", analyseEnCours: true };
  function routeur(l, d) {            // l : réponse pour le lien, d : réponse pour le nom de domaine (objets, ou fonctions renvoyant une promesse)
    return function (url, init) {
      const r = url.slice(-5) === "-lien" ? l : d;
      const v = typeof r === "function" ? r(url, init) : ok(r);
      return v;
    };
  }
  async function double(res, l, d) {
    const sortie = await executer(res, routeur(l, d));
    return { rendus: sortie.rendus, finale: sortie.rendus[sortie.rendus.length - 1], envoyes: sortie.envoyes, chemins: sortie.envoyes.map(function (e) { return e.url.slice(base2.length); }) };
  }
  const exemple = analyser("https://exemple.org/page?a=1#f", "inconnu");

  // 1. signalé au premier coup : AUCUNE deuxième vérification
  let dbl = await double(exemple, rep(1), rep(9));
  verif(dbl.chemins.join() === "/reputation-lien", "signalé au premier coup (1 moteur) : une seule requête, le lien : " + dbl.chemins.join());
  verif(dbl.finale.niveau === "jaune" && dbl.finale.titreCle === "reputationLienUnJaune" && dbl.finale.reputation.verifs.length === 1, "signalé (1 moteur) : alerte forte jaune avec le nombre");
  dbl = await double(exemple, rep(3), rep(0));
  verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "rouge" && dbl.finale.titreCle === "reputationLienPlusieursRouge", "signalé (3 moteurs) : rouge, une seule requête");

  // 2. rien d'absent mais 0 moteur pour le lien -> le nom de domaine, avec le SEUL nom de domaine
  dbl = await double(exemple, rep(0), rep(0));
  verif(dbl.chemins.join() === "/reputation-lien,/reputation", "0 moteur : le lien PUIS le nom de domaine : " + dbl.chemins.join());
  verif(dbl.envoyes[1].corps === JSON.stringify({ domaine: "exemple.org" }) && !dbl.envoyes[1].corps.includes("page"), "deuxième vérification : le seul nom de domaine");
  verif(dbl.finale.niveau === "jaune" && dbl.finale.titreCle === exemple.titreCle && JSON.stringify(dbl.finale.raisons) === JSON.stringify(exemple.raisons), "tout à 0 : le jaune reste inchangé");
  verif(dbl.finale.reputation.etat === "connu" && dbl.finale.reputation.verifs.length === 2 && dbl.finale.reputation.premiereFois === undefined, "tout à 0 : deux vérifications affichées, pas de « première fois »");

  // 3. 0 moteur pour le lien, mais le nom de domaine est signalé : le PIRE gagne
  dbl = await double(exemple, rep(0), rep(1));
  verif(dbl.finale.niveau === "jaune" && dbl.finale.titreCle === "reputationUnJaune" && dbl.finale.raisons[0].indexOf("1 moteur") === 0 && dbl.finale.raisons[0].indexOf("nom de domaine") !== -1, "domaine à 1 moteur : alerte forte jaune (nom de domaine) : " + dbl.finale.raisons[0]);
  dbl = await double(exemple, rep(0), rep(2));
  verif(dbl.finale.niveau === "rouge" && dbl.finale.titreCle === "reputationPlusieursRouge" && dbl.finale.raisons[0].indexOf("2 moteurs") === 0, "domaine à 2 moteurs : ROUGE");
  dbl = await double(exemple, attenteVT, rep(5));
  verif(dbl.finale.niveau === "rouge" && dbl.finale.reputation.premiereFois !== true, "analyse pas finie + domaine signalé : rouge, pas de « première fois »");

  // 4. analyse pas finie après la relecture (le Worker répond « inconnu » + analyseEnCours) + domaine à 0 : jaune, « première fois »
  dbl = await double(exemple, attenteVT, rep(0));
  verif(dbl.chemins.join() === "/reputation-lien,/reputation", "analyse pas finie : le nom de domaine est aussi vérifié");
  verif(dbl.finale.niveau === "jaune" && dbl.finale.titreCle === exemple.titreCle && dbl.finale.reputation.premiereFois === true && dbl.finale.reputation.etat === "connu", "analyse pas finie + domaine à 0 : jaune + « première fois »");
  dbl = await double(exemple, { ok: true, etat: "inconnu" }, { ok: true, etat: "inconnu" });
  verif(dbl.finale.niveau === "jaune" && dbl.finale.reputation.etat === "inconnu" && dbl.finale.reputation.premiereFois === undefined, "inconnu partout (sans analyse en cours) : jaune, pas de « première fois »");
  verif(T.reputationPremiereFois === "VirusTotal analyse ce lien pour la première fois. Réessaie dans une minute avant de l'ouvrir.", "texte exact « première fois » (FR)");

  // 5. raccourcisseur : jamais de repli sur le nom de domaine
  const bitly = analyser("https://bit.ly/abc?x=1#f", "inconnu");
  dbl = await double(bitly, rep(0), rep(9));
  verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "jaune" && dbl.finale.reputation.verifs.length === 1, "raccourci à 0 moteur : UNE seule requête, aucun repli sur le domaine");
  dbl = await double(bitly, attenteVT, rep(9));
  verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "jaune" && dbl.finale.reputation.premiereFois === true, "raccourci, analyse pas finie : une requête, jaune, « première fois »");
  dbl = await double(bitly, rep(2), rep(0));
  verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "rouge", "raccourci signalé : rouge");

  // 6. pannes : jamais de deuxième vérification si la première est en panne ou en limite
  for (const cas2 of [["panne", function () { return new TypeError("Failed to fetch"); }], ["limite", function () { return ok({ ok: false, etat: "limite" }, 429); }], ["502", function () { return ok({ ok: false }, 502); }]]) {
    dbl = await double(exemple, function () { const e = cas2[1](); if (e instanceof Error) return Promise.reject(e); return Promise.resolve(e); }, rep(0));
    verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "jaune" && dbl.finale.reputation.etat === "indisponible", cas2[0] + " pour le lien : pas de deuxième vérification, jaune + ligne « indisponible »");
  }
  // le lien à 0, mais le nom de domaine en panne : jaune, avec la ligne « indisponible » pour le domaine
  dbl = await double(exemple, rep(0), function () { return Promise.reject(new TypeError("x")); });
  verif(dbl.finale.niveau === "jaune" && dbl.finale.reputation.verifs.length === 2 && dbl.finale.reputation.verifs[1].etat === "indisponible" && dbl.finale.reputation.etat === "connu", "domaine en panne : le résultat du lien reste, ligne « indisponible » pour le domaine");

  // 7. lien non envoyable (http) : seulement le nom de domaine, une seule requête
  dbl = await double(analyser("http://exemple.org/page?a=1", "inconnu"), rep(0), rep(0));
  verif(dbl.chemins.join() === "/reputation" && dbl.envoyes[0].corps === JSON.stringify({ domaine: "exemple.org" }), "lien http : seulement le nom de domaine, une requête");

  // 8. deux clics rapides : toujours une seule requête par lien, et une seule pour le domaine
  R.viderCache();
  const cptD = { l: 0, d: 0 };
  W.CONFIG_SITE = JSON.parse(JSON.stringify(ACTIVE));
  W.fetch = function (url) { if (url.slice(-5) === "-lien") cptD.l++; else cptD.d++; return attendre(80).then(function () { return ok(rep(0)); }); };
  let nFin = 0;
  await new Promise(function (resolve) { const fini = function (x) { if (!x.attente && ++nFin === 2) resolve(); }; R.lancer(exemple, fini); R.lancer(exemple, fini); });
  finSuivi();
  verif(cptD.l === 1 && cptD.d === 1, "deux clics rapides : une requête pour le lien et UNE pour le domaine (" + cptD.l + "+" + cptD.d + ")");

  // 9. Le cache de la visite : 5 minutes pour 0 moteur / sans résultat, 1 heure pour un lien signalé, 60 secondes si l'analyse n'est pas finie
  verif(R.DUREES_CACHE.signale === 3600000 && R.DUREES_CACHE.zero === 300000 && R.DUREES_CACHE.attente === 60000, "durées du cache : 1 h, 5 min, 60 s");
  let horlogeFaux = 1000000;
  R.reglerHorloge(function () { return horlogeFaux; });
  async function relancer(res, l, d) {          // renvoie le nombre de requêtes faites par cette demande, et si le résultat était immédiat
    const sortie = await executer.sansVider(res, routeur(l, d));
    return { n: sortie.envoyes.length, immediat: sortie.rendus.length === 1 };
  }
  executer.sansVider = async function (res, reponse) { executer.garder = true; try { return await executer(res, reponse); } finally { executer.garder = false; } };
  R.viderCache();
  let c1 = await relancer(exemple, rep(0), rep(0));
  verif(c1.n === 2 && !c1.immediat, "cache : première demande, 2 requêtes");
  horlogeFaux += 4 * 60000;
  c1 = await relancer(exemple, rep(0), rep(0));
  verif(c1.n === 0 && c1.immediat, "cache : 4 minutes plus tard, un résultat à 0 moteur est servi tout de suite, sans requête");
  horlogeFaux += 2 * 60000;                                  // 6 minutes après la première demande
  c1 = await relancer(exemple, rep(0), rep(0));
  verif(c1.n === 2 && !c1.immediat, "cache : 6 minutes plus tard, un résultat à 0 moteur est redemandé (5 minutes seulement)");
  R.viderCache(); horlogeFaux = 1000000;
  c1 = await relancer(exemple, rep(2), rep(0));
  horlogeFaux += 59 * 60000;
  c1 = await relancer(exemple, rep(2), rep(0));
  verif(c1.n === 0 && c1.immediat, "cache : un lien SIGNALÉ est gardé 1 heure (servi à 59 minutes)");
  horlogeFaux += 2 * 60000;
  c1 = await relancer(exemple, rep(2), rep(0));
  verif(c1.n === 1, "cache : un lien signalé est redemandé après 1 heure");
  R.viderCache(); horlogeFaux = 1000000;
  c1 = await relancer(exemple, attenteVT, rep(0));
  horlogeFaux += 30000;
  c1 = await relancer(exemple, attenteVT, rep(0));
  verif(c1.n === 0 && c1.immediat, "cache : analyse pas finie, servie à 30 secondes");
  horlogeFaux += 31000;
  c1 = await relancer(exemple, attenteVT, rep(0));
  verif(c1.n >= 1 && !c1.immediat, "cache : analyse pas finie, redemandée au bout d'une minute (« réessaie dans une minute »)");
  R.reglerHorloge(null);
  R.viderCache();

  // 10. Délais (réduits pour le test : lien 2,5 s, domaine 0,8 s, total 3 s ; en vrai 11 s, 4 s et 15 s)
  const vrais = R.delais();
  verif(vrais.lien === 11000 && vrais.domaine === 4000 && vrais.total === 15000, "délais réels : lien 11 s, domaine 4 s, total 15 s");
  R.reglerDelais({ lien: 2500, domaine: 800, total: 3000 });
  const jamais = function () { return new Promise(function () {}); };
  const apres = function (ms, v) { return function () { return attendre(ms).then(function () { return ok(v); }); }; };
  async function chrono(res, l, d) { R.viderCache(); const t = Date.now(); const x = await double(res, l, d); x.ms = Date.now() - t; return x; }
  dbl = await chrono(exemple, apres(1000, rep(0)), apres(200, rep(0)));
  verif(dbl.finale.reputation.verifs.length === 2 && dbl.ms >= 1150 && dbl.ms < 1800, "lien lent (1 s) mais dans les temps, puis domaine : résultat final complet (" + dbl.ms + " ms)");
  dbl = await chrono(exemple, jamais, rep(0));
  verif(dbl.chemins.join() === "/reputation-lien" && dbl.finale.niveau === "jaune" && dbl.finale.reputation.etat === "indisponible" && dbl.ms >= 2450 && dbl.ms < 3000, "lien qui ne répond jamais : jaune + « indisponible » à la fin du délai du lien, sans deuxième vérification (" + dbl.ms + " ms)");
  dbl = await chrono(exemple, rep(0), jamais);
  verif(dbl.finale.niveau === "jaune" && dbl.finale.reputation.verifs[1].etat === "indisponible" && dbl.ms >= 750 && dbl.ms < 1300, "domaine qui ne répond jamais : jaune après le délai du domaine (" + dbl.ms + " ms)");
  dbl = await chrono(exemple, apres(2300, rep(0)), jamais);
  verif(dbl.finale.niveau === "jaune" && dbl.ms >= 2900 && dbl.ms < 3400, "lien lent (2,3 s) puis domaine qui ne répond pas : jamais plus du délai total (" + dbl.ms + " ms)");
  R.reglerDelais(vrais);
  R.viderCache();

  // ---------- 6. Anglais : mêmes comportements, texte « sûr » ----------
  const WE = charger("en"), RE = WE.RoShieldReputation, TE = WE.TEXTES_VERIF;
  verif(TE.reputationAvertissement === "No reports doesn’t mean safe." && T.reputationAvertissement === "Aucun signalement ne veut pas dire sûr.", "phrase « Aucun signalement ne veut pas dire sûr » (FR) / « No reports doesn’t mean safe. » (EN)");
  const baseEn = WE.RoShieldVerif.analyser("https://exemple.com/page", "inconnu");
  const xe = RE.appliquer(baseEn, connu(2), ACTIVE);
  verif(xe.niveau === "rouge" && TE.titres[xe.titreCle] === "Several security engines flag this domain name", "anglais : rouge avec le titre « Several security engines flag this domain name »");
  verif(!/\b(safe|secure|proven|sûr|prouvé)\b/i.test(TE.reputationResultat(0, 86, "2026-01-01")), "aucun texte de résultat ne dit « sûr » ou « prouvé »");
  verif(!/(sûr|prouvé)/i.test(T.reputationResultat(0, 86, "2026-01-01") + T.reputationInconnu + T.reputationEnvoye("x.com")), "français : pareil");
  verif(!/^Aucun signalement/.test(T.reputationResultat(0, 86, null)), "le résultat seul ne prétend rien");

  verif(TE.reputationPremiereFois === "VirusTotal is analysing this link for the first time. Try again in a minute before opening it." && TE.reputationDomaineAussi("exemple.org").indexOf("exemple.org") !== -1 && T.reputationDomaineAussi("exemple.org").indexOf("exemple.org") !== -1, "anglais et français : textes de la double vérification");
  verif(!/(sûr|prouvé)/i.test(T.reputationPremiereFois + T.reputationDomaineAussi("x.org")) && !/(safe|proven)/i.test(TE.reputationPremiereFois + TE.reputationDomaineAussi("x.org")), "double vérification : aucun texte ne dit « sûr » ou « prouvé »");
  verif(TE.verificationEnCours === "Check in progress…", "anglais : texte de l'attente");
  verif(TE.reputationLienAucun === "No antivirus flags it for now. That doesn’t mean it’s safe." && TE.titres.reputationLienPlusieursRouge === "Several security engines flag this link", "anglais : textes du lien complet");
  verif(!/(sûr|prouvé)/i.test(T.reputationLienResultat(0, 86, "2026-01-01") + T.reputationLienInconnu + T.reputationLienEnvoye("https://bit.ly/x")), "français : les textes du raccourci ne disent pas « sûr »");
  verif(!/(safe|secure|proven)/i.test(TE.reputationLienResultat(0, 86, "2026-01-01") + TE.reputationLienInconnu + TE.reputationLienEnvoye("https://bit.ly/x")), "anglais : pareil");
  verif(T.reputationLienEnvoye("https://tinyurl.com/abc").indexOf("tinyurl.com/abc") !== -1 && T.reputationLienEnvoye("https://tinyurl.com/abc").indexOf("https://") === -1, "la ligne montre le lien envoyé (sans https://)");

  console.log((total - echecs) + " / " + total + " tests réussis");
  process.exit(echecs ? 1 : 0);
})();
