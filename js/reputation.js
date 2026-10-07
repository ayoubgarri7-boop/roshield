/* ==========================================================
   reputation.js : vérification COMPLÉMENTAIRE d'un nom de domaine avec VirusTotal,
   par l'intermédiaire du petit service roshield-sante (un Worker Cloudflare).

   DÉSACTIVÉE PAR DÉFAUT : tant que CONFIG_SITE.reputation.urlWorker (js/config.js) est vide, ce fichier n'envoie RIEN.

   QUAND ELLE EST ACTIVÉE
   - Seulement pour un résultat JAUNE (pas le rouge, pas le vert, pas « officiel mais vérifie le lien »).
   - Jamais pour une adresse IP, un nom local, ni un domaine officiel. Jamais pour un résultat rouge ou vert.
   - On envoie le LIEN COMPLET (https, 200 caractères au plus, sans identifiant ni port, sans « # », sans paramètres de requête
     sauf pour un raccourcisseur) : POST <urlWorker>/reputation-lien avec {"lien":"https://exemple.com/page"}, sans cookie ni referer.
   - Si le lien ne peut pas être envoyé (http, trop long, identifiant, port) : repli sur le NOM DE DOMAINE seul,
     POST <urlWorker>/reputation avec {"domaine":"exemple.com"} (jamais pour un raccourcisseur).
   - Le résultat peut être AGGRAVÉ, jamais allégé, jamais vert :
       0 moteur « malicious »              -> rien ne change
       au moins seuilAlerte (1)            -> jaune, alerte forte avec le nombre de moteurs
       au moins seuilRouge (2)             -> rouge, titre « Plusieurs moteurs de sécurité signalent ce nom de domaine »
     Seuls les moteurs « malicious » comptent (pas « suspicious », pas « undetected »).
   - Si le Worker est injoignable, en limite ou en panne : le résultat local reste tel quel, avec une ligne discrète.
   ========================================================== */

(function () {
  "use strict";

  const GRAVITE = { vert: 0, jaune: 1, rouge: 2 };
  // Délais : le Worker peut attendre environ 5 s avant l'unique relecture d'une analyse neuve, donc la demande du lien complet a
  // droit à 11 s ; la vérification du nom de domaine, qui suit, à 4 s ; le tout ne dépasse jamais 15 s.
  const DELAIS = { lien: 11000, domaine: 4000, total: 15000 };      // (millisecondes) modifiables seulement par les tests
  const enVol = new Map();     // demandes en cours : un second clic sur le même lien ne lance PAS une seconde requête
  const cache = new Map();     // clé -> { donnees, fin } : réponse « connu » / « inconnu », gardée un temps limité (voir dureeCache)
  let horloge = function () { return Date.now(); };

  function textes() { return window.TEXTES_VERIF; }
  function configSite() { return window.CONFIG_SITE; }

  // ---------- Réglages ----------
  // L'adresse du Worker : seulement https://....workers.dev (ou http://localhost / 127.0.0.1 pour les essais en local).
  // Une faute de frappe ne peut donc pas envoyer de données ailleurs.
  function adresseWorker(valeur) {
    if (typeof valeur !== "string" || !valeur.trim()) return null;
    let u;
    try { u = new URL(valeur.trim()); } catch (e) { return null; }
    if (u.username || u.password || u.search || u.hash) return null;
    if (u.pathname !== "/" && u.pathname !== "") return null;
    const hote = u.hostname.toLowerCase();
    if (u.protocol === "https:" && /^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(hote)) return u.origin;
    if (u.protocol === "http:" && (hote === "localhost" || hote === "127.0.0.1")) return u.origin;
    return null;
  }

  function lireConfig(cfg) {
    const r = (cfg && cfg.reputation) || {};
    const seuilRouge = Number.isInteger(r.seuilRouge) && r.seuilRouge >= 1 ? r.seuilRouge : 2;
    let seuilAlerte = Number.isInteger(r.seuilAlerte) && r.seuilAlerte >= 1 ? r.seuilAlerte : 1;
    if (seuilAlerte > seuilRouge) seuilAlerte = seuilRouge;
    return { url: adresseWorker(r.urlWorker), seuilAlerte: seuilAlerte, seuilRouge: seuilRouge };
  }

  function estOuSousDomaine(hote, base) { return hote === base || hote.endsWith("." + base); }

  const SUFFIXES_LOCAUX = ["localhost", "local", "localdomain", "internal", "intranet", "lan", "home", "corp", "private", "home.arpa"];

  // ---------- Le nom d'hôte d'un résultat qui peut être vérifié, ou null ----------
  // Seulement le JAUNE (jamais le rouge ni le vert), jamais un domaine officiel, une adresse IP ou un nom local.
  function hoteVerifiable(res, cfg) {
    if (!lireConfig(cfg === undefined ? configSite() : cfg).url) return null;                 // désactivée
    if (!res || res.erreur || res.niveau !== "jaune") return null;                           // seulement le jaune
    if (res.titreCle === "officielAttention" || !res.hote) return null;                      // domaine officiel : jamais
    const hote = String(res.hote).toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.indexOf(":") !== -1 || hote.charAt(0) === "[") return null;   // adresse IP
    if (!/^[a-z0-9.-]+$/.test(hote) || hote.indexOf(".") === -1) return null;
    if (SUFFIXES_LOCAUX.some(function (x) { return estOuSousDomaine(hote, x); })) return null;               // nom local
    if ((window.DOMAINES_OFFICIELS || []).some(function (d) { return estOuSousDomaine(hote, d.domaine); })) return null;
    return hote;
  }
  function estRaccourcisseur(hote) {
    return (window.RACCOURCISSEURS || []).some(function (r) { return estOuSousDomaine(hote, r); });
  }

  // ---------- Repli : faut-il envoyer SEULEMENT le nom de domaine ? (lien non envoyable en entier : http, trop long...) ----------
  function doitInterroger(res, cfg) {
    const hote = hoteVerifiable(res, cfg);
    if (!hote || estRaccourcisseur(hote)) return null;                                       // jamais un raccourcisseur seul
    return hote;
  }

  // ---------- Faut-il envoyer le LIEN COMPLET ? Renvoie le lien (sans « # »), ou null ----------
  // Un résultat jaune seulement ; https, 200 caractères au plus ; pas de paramètres de requête sauf pour un raccourcisseur.
  function lienAEnvoyer(res, cfg) {
    const hote = hoteVerifiable(res, cfg);
    if (!hote) return null;
    const lien = res.lien;
    if (typeof lien !== "string" || lien.length > 200 || lien.indexOf("#") !== -1) return null;
    if (lien.indexOf("https://" + hote + "/") !== 0) return null;                            // https, et le bon hôte
    if (lien.indexOf("?") !== -1 && !estRaccourcisseur(hote)) return null;                   // pas de requête (sauf raccourci)
    if (/[\s\u0000-\u001f\u007f]/.test(lien)) return null;
    return lien;
  }

  // ---------- Le cache de la visite : un résultat SIGNALÉ (1 moteur ou plus) garde 1 heure ; 0 moteur ou « inconnu » 5 minutes ;
  // une analyse pas finie 60 secondes (pour que « réessaie dans une minute » interroge de nouveau VirusTotal) ----------
  const DUREES_CACHE = { signale: 3600 * 1000, zero: 5 * 60 * 1000, attente: 60 * 1000 };
  function dureeCache(donnees) {
    if (donnees.etat === "connu" && donnees.malveillants >= 1) return DUREES_CACHE.signale;
    if (donnees.etat === "inconnu" && donnees.analyseEnCours) return DUREES_CACHE.attente;
    return DUREES_CACHE.zero;
  }
  function lireCache(cle) {
    const e = cache.get(cle);
    if (!e) return null;
    if (horloge() >= e.fin) { cache.delete(cle); return null; }
    return e.donnees;
  }
  function garder(cle, donnees) { cache.set(cle, { donnees: donnees, fin: horloge() + dureeCache(donnees) }); }

  // ---------- La réponse du Worker : on la contrôle avant d'en croire un mot ----------
  function entier(v, max) { return Number.isInteger(v) && v >= 0 && v <= max; }
  function valider(corps) {
    if (!corps || corps.ok !== true) return { etat: "indisponible" };
    if (corps.etat === "inconnu") return corps.analyseEnCours === true ? { etat: "inconnu", analyseEnCours: true } : { etat: "inconnu" };
    if (corps.etat === "connu" && entier(corps.malveillants, 100000) && entier(corps.total, 100000) &&
        corps.total >= 1 && corps.total >= corps.malveillants) {
      return {
        etat: "connu",
        malveillants: corps.malveillants,
        total: corps.total,
        date: typeof corps.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(corps.date) ? corps.date : null
      };
    }
    return { etat: "indisponible" };
  }

  // ---------- L'appel au Worker (la seule requête de ce fichier) ----------
  async function interroger(domaine, cfg, fetchFn, delai) {
    return appeler("/reputation", { domaine: domaine }, domaine, cfg, fetchFn, delai);
  }
  // Lien complet (sans « # ») : part vers /reputation-lien
  async function interrogerLien(lien, cfg, fetchFn, delai) {
    return appeler("/reputation-lien", { lien: lien }, "lien|" + lien, cfg, fetchFn, delai || DELAIS.lien);
  }
  // Une seule requête à la fois pour le même lien (ou nom de domaine), et jamais plus de « delai » d'attente, même si le
  // réseau ou fetch ne répondent plus : au-delà, « indisponible » (le résultat jaune s'affiche alors avec une ligne qui le dit).
  function appeler(chemin, corps, cleCache, cfg, fetchFn, delai) {
    if (enVol.has(cleCache)) return enVol.get(cleCache);
    const duree = delai || DELAIS.domaine;
    let minuteur = null;
    const fin = new Promise(function (resoudre) { minuteur = setTimeout(function () { resoudre({ etat: "indisponible" }); }, duree); });
    const demande = Promise.race([envoyer(chemin, corps, cleCache, cfg, fetchFn, duree), fin]).then(function (donnees) {
      clearTimeout(minuteur);
      enVol.delete(cleCache);
      return donnees;
    });
    enVol.set(cleCache, demande);
    return demande;
  }
  async function envoyer(chemin, corps, cleCache, cfg, fetchFn, duree) {
    const c = lireConfig(cfg === undefined ? configSite() : cfg);
    if (!c.url) return { etat: "desactive" };
    const gardee = lireCache(cleCache);
    if (gardee) return gardee;
    const f = fetchFn || (typeof fetch === "function" ? fetch : null);
    if (!f) return { etat: "indisponible" };
    const controleur = typeof AbortController === "function" ? new AbortController() : null;
    const minuteur = controleur ? setTimeout(function () { controleur.abort(); }, duree) : null;
    try {
      const reponse = await f(c.url + chemin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),     // SEULEMENT le nom de domaine, ou le lien complet sans « # » (sans requête sauf raccourci)
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        mode: "cors",
        signal: controleur ? controleur.signal : undefined
      });
      if (reponse.status === 429) return { etat: "limite" };
      if (!reponse.ok) return { etat: "indisponible" };
      const donnees = valider(await reponse.json());
      if (donnees.etat === "connu" || donnees.etat === "inconnu") garder(cleCache, donnees);
      return donnees;
    } catch (e) {
      return { etat: "indisponible" };                   // réseau coupé, délai dépassé, réponse illisible...
    } finally {
      if (minuteur) clearTimeout(minuteur);
    }
  }

  // ---------- Appliquer UNE réponse au résultat : on peut AGGRAVER, jamais alléger ----------
  // nature : "lien" quand le lien complet a été comparé, sinon le nom de domaine
  function appliquer(res, donnees, cfg, nature) {
    const c = lireConfig(cfg === undefined ? configSite() : cfg);
    const T = textes();
    if (!res || res.erreur) return res;
    const domaine = res.hote;
    const estLien = nature === "lien";
    const base = estLien ? { domaine: domaine, nature: "lien", lien: res.lien } : { domaine: domaine };
    if (!donnees || (donnees.etat !== "connu" && donnees.etat !== "inconnu")) {
      return Object.assign({}, res, { reputation: Object.assign({ etat: "indisponible" }, base) });
    }
    if (donnees.etat === "inconnu") {
      return Object.assign({}, res, { reputation: Object.assign({ etat: "inconnu" }, base) });
    }
    const m = donnees.malveillants;
    const suite = Object.assign({}, res, {
      reputation: Object.assign({ etat: "connu", malveillants: m, total: donnees.total, date: donnees.date }, base)
    });
    // Seul un résultat JAUNE peut être aggravé (un vert reste vert, un rouge reste tel quel)
    if (res.niveau === "jaune" && m >= c.seuilAlerte) {
      const rouge = m >= c.seuilRouge;
      const niveau = rouge ? "rouge" : "jaune";
      if (GRAVITE[niveau] >= GRAVITE[res.niveau]) {
        suite.niveau = niveau;
        suite.titreCle = "reputation" + (estLien ? "Lien" : "") + (m === 1 ? "Un" : "Plusieurs") + (rouge ? "Rouge" : "Jaune");
        suite.raisons = [(estLien ? T.reputationLienResultat : T.reputationResultat)(m, donnees.total, donnees.date) + " " + T.reputationConseil]
          .concat((res.raisons || []).filter(function (r) { return r !== T.inconnu; }));
      }
    }
    return suite;
  }

  // ---------- Appliquer la double vérification : le PIRE niveau des deux gagne ----------
  // d1 : la réponse pour le lien complet (ou null), d2 : la réponse pour le nom de domaine (ou null).
  function appliquerDouble(res, d1, d2, cfg) {
    if (!res || res.erreur) return res;
    const verifs = [];
    function ajouter(nature, d) {
      if (!d) return;
      const v = { nature: nature, etat: d.etat === "connu" || d.etat === "inconnu" ? d.etat : "indisponible" };
      if (nature === "lien") v.lien = res.lien; else v.domaine = res.hote;
      if (d.etat === "connu") { v.malveillants = d.malveillants; v.total = d.total; v.date = d.date; }
      if (d.etat === "inconnu" && d.analyseEnCours) v.analyseEnCours = true;
      verifs.push({ v: v, d: d });
    }
    ajouter("lien", d1);
    ajouter("domaine", d2);
    // la réponse qui signale le plus de moteurs (en cas d'égalité : celle du lien, la première)
    let pire = null;
    verifs.forEach(function (x) {
      if (x.d.etat === "connu" && (pire === null || x.d.malveillants > pire.d.malveillants)) pire = x;
    });
    const choisi = pire || verifs[0] || null;
    const suite = choisi ? appliquer(res, choisi.d, cfg, choisi.v.nature) : res;
    const connus = verifs.filter(function (x) { return x.d.etat === "connu"; });
    const agregee = { etat: connus.length ? "connu" : (verifs.some(function (x) { return x.d.etat === "inconnu"; }) ? "inconnu" : "indisponible"),
                      domaine: res.hote, verifs: verifs.map(function (x) { return x.v; }) };
    if (verifs.some(function (x) { return x.v.nature === "lien"; })) { agregee.nature = "lien"; agregee.lien = res.lien; }
    if (pire) { agregee.malveillants = pire.d.malveillants; agregee.total = pire.d.total; agregee.date = pire.d.date; }
    const signale = pire !== null && pire.d.malveillants >= 1;
    // « VirusTotal analyse ce lien pour la première fois » : l'analyse du lien n'était pas finie, et rien n'est signalé
    if (!signale && d1 && d1.etat === "inconnu" && d1.analyseEnCours === true) agregee.premiereFois = true;
    return Object.assign({}, suite, { reputation: agregee });
  }

  // ---------- La vérification : le lien d'abord, puis (seulement si rien n'est signalé) le nom de domaine ----------
  // Un lien signalé (1 moteur ou plus) arrête tout : aucune deuxième vérification. Un raccourcisseur n'a jamais de repli sur le
  // domaine. Au total, 15 secondes au plus.
  function lienSeSuffit(d1) { return !d1 || d1.etat === "limite" || d1.etat === "indisponible" || d1.etat === "desactive" || (d1.etat === "connu" && d1.malveillants >= 1); }

  async function verifier(res, cfg, fetchFn) {
    const debut = Date.now();
    const lien = lienAEnvoyer(res, cfg);
    const domaine = doitInterroger(res, cfg);
    if (!lien) return { d1: null, d2: domaine ? await interroger(domaine, cfg, fetchFn, DELAIS.domaine) : null };
    const d1 = await interrogerLien(lien, cfg, fetchFn, Math.min(DELAIS.lien, DELAIS.total));
    if (lienSeSuffit(d1) || !domaine) return { d1: d1, d2: null };
    const reste = DELAIS.total - (Date.now() - debut);
    if (reste < 500) return { d1: d1, d2: { etat: "indisponible" } };
    return { d1: d1, d2: await interroger(domaine, cfg, fetchFn, Math.min(DELAIS.domaine, reste)) };
  }

  // Tout est-il déjà en mémoire (cache de la visite) ? Alors le résultat est affiché tout de suite, sans attente.
  function depuisCache(res) {
    const lien = lienAEnvoyer(res), domaine = doitInterroger(res);
    if (!lien) {
      const d2 = domaine ? lireCache(domaine) : null;
      return d2 ? { d1: null, d2: d2 } : null;
    }
    const d1 = lireCache("lien|" + lien);
    if (!d1) return null;
    if (lienSeSuffit(d1) || !domaine) return { d1: d1, d2: null };
    const d2 = lireCache(domaine);
    return d2 ? { d1: d1, d2: d2 } : null;
  }

  // ---------- Pour le vérificateur ----------
  // rendre(resultat) est appelée une ou deux fois ; l'appelant ignore les réponses devenues inutiles.
  // Un résultat jaune qui doit partir chez VirusTotal n'est PAS affiché tout de suite : rendre({ attente: true }) d'abord
  // (« Vérification en cours… »), puis le résultat final. Tout le reste est affiché immédiatement.
  function lancer(res, rendre) {
    if (!lienAEnvoyer(res) && !doitInterroger(res)) { rendre(res); return; }
    const gardees = depuisCache(res);
    if (gardees) { rendre(appliquerDouble(res, gardees.d1, gardees.d2)); return; }
    rendre({ attente: true });
    verifier(res).then(function (r) { rendre(appliquerDouble(res, r.d1, r.d2)); });
  }

  function viderCache() { cache.clear(); enVol.clear(); }

  window.RoShieldReputation = {
    adresseWorker: adresseWorker, lireConfig: lireConfig, doitInterroger: doitInterroger, interroger: interroger,
    lienAEnvoyer: lienAEnvoyer, interrogerLien: interrogerLien,
    appliquer: appliquer, appliquerDouble: appliquerDouble, verifier: verifier, lancer: lancer, viderCache: viderCache,
    dureeCache: dureeCache, DUREES_CACHE: DUREES_CACHE, delais: function () { return Object.assign({}, DELAIS); },
    reglerDelais: function (d) { Object.assign(DELAIS, d); },
    reglerHorloge: function (f) { horloge = typeof f === "function" ? f : function () { return Date.now(); }; }
  };
})();
