/* ==========================================================
   reputation.js : vérification COMPLÉMENTAIRE d'un nom de domaine avec VirusTotal,
   par l'intermédiaire du petit service roshield-sante (un Worker Cloudflare).

   DÉSACTIVÉE PAR DÉFAUT : tant que CONFIG_SITE.reputation.urlWorker (js/config.js) est vide, ce fichier n'envoie RIEN.

   QUAND ELLE EST ACTIVÉE
   - Seulement pour un résultat JAUNE (pas le rouge, pas le vert, pas « officiel mais vérifie le lien »).
   - Jamais pour une adresse IP, ni pour un domaine officiel.
   - Pour tout lien SAUF un raccourci : on envoie SEULEMENT le nom de domaine de l'adresse réelle (jamais le lien complet) :
     POST <urlWorker>/reputation avec {"domaine":"exemple.com"}, sans cookie ni referer.
   - Pour un lien RACCOURCI (hôte de la liste RACCOURCISSEURS, https, 200 caractères au plus) : on envoie le lien complet, SANS le
     « # », à POST <urlWorker>/reputation-lien avec {"lien":"https://tinyurl.com/abc"}. Jamais pour un autre lien.
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
  const DELAI_MS = 6000;
  const cache = new Map();     // nom de domaine -> réponse « connu » / « inconnu », seulement pendant la visite de la page

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

  // ---------- Faut-il interroger ? Renvoie le nom de domaine à envoyer, ou null ----------
  function doitInterroger(res, cfg) {
    if (!lireConfig(cfg === undefined ? configSite() : cfg).url) return null;                 // désactivée
    if (!res || res.erreur || res.niveau !== "jaune") return null;                           // seulement le jaune
    if (res.titreCle === "officielAttention" || !res.hote) return null;                      // domaine officiel : jamais
    const hote = String(res.hote).toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.indexOf(":") !== -1 || hote.charAt(0) === "[") return null;   // adresse IP
    if (!/^[a-z0-9.-]+$/.test(hote) || hote.indexOf(".") === -1) return null;
    if ((window.DOMAINES_OFFICIELS || []).some(function (d) { return estOuSousDomaine(hote, d.domaine); })) return null;
    if ((window.RACCOURCISSEURS || []).some(function (r) { return estOuSousDomaine(hote, r); })) return null;   // jamais un raccourcisseur
    return hote;
  }

  // ---------- Lien RACCOURCI : faut-il envoyer le lien complet ? Renvoie le lien (sans « # »), ou null ----------
  // C'est la SEULE situation où un lien complet part : un résultat jaune, un hôte de la liste des raccourcisseurs, en https.
  function lienAEnvoyer(res, cfg) {
    if (!lireConfig(cfg === undefined ? configSite() : cfg).url) return null;                 // désactivée
    if (!res || res.erreur || res.niveau !== "jaune" || res.titreCle === "officielAttention" || !res.hote) return null;
    const hote = String(res.hote).toLowerCase();
    if (!(window.RACCOURCISSEURS || []).some(function (r) { return estOuSousDomaine(hote, r); })) return null;   // PAS un raccourcisseur
    const lien = res.lien;
    if (typeof lien !== "string" || lien.length > 200 || lien.indexOf("#") !== -1) return null;
    if (lien.indexOf("https://" + hote + "/") !== 0) return null;                            // https, et le bon hôte
    if (/[\s\u0000-\u001f\u007f]/.test(lien)) return null;
    return lien;
  }

  // ---------- La réponse du Worker : on la contrôle avant d'en croire un mot ----------
  function entier(v, max) { return Number.isInteger(v) && v >= 0 && v <= max; }
  function valider(corps) {
    if (!corps || corps.ok !== true) return { etat: "indisponible" };
    if (corps.etat === "inconnu") return { etat: "inconnu" };
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
  async function interroger(domaine, cfg, fetchFn) {
    return appeler("/reputation", { domaine: domaine }, domaine, cfg, fetchFn);
  }
  // Lien RACCOURCI : le lien complet (sans « # ») part vers /reputation-lien
  async function interrogerLien(lien, cfg, fetchFn) {
    return appeler("/reputation-lien", { lien: lien }, "lien|" + lien, cfg, fetchFn);
  }
  async function appeler(chemin, corps, cleCache, cfg, fetchFn) {
    const c = lireConfig(cfg === undefined ? configSite() : cfg);
    if (!c.url) return { etat: "desactive" };
    if (cache.has(cleCache)) return cache.get(cleCache);
    const f = fetchFn || (typeof fetch === "function" ? fetch : null);
    if (!f) return { etat: "indisponible" };
    const controleur = typeof AbortController === "function" ? new AbortController() : null;
    const minuteur = controleur ? setTimeout(function () { controleur.abort(); }, DELAI_MS) : null;
    try {
      const reponse = await f(c.url + chemin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),     // SEULEMENT le nom de domaine (ou, pour un raccourci, le lien complet sans « # »)
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        mode: "cors",
        signal: controleur ? controleur.signal : undefined
      });
      if (reponse.status === 429) return { etat: "limite" };
      if (!reponse.ok) return { etat: "indisponible" };
      const donnees = valider(await reponse.json());
      if (donnees.etat === "connu" || donnees.etat === "inconnu") cache.set(cleCache, donnees);
      return donnees;
    } catch (e) {
      return { etat: "indisponible" };                   // réseau coupé, délai dépassé, réponse illisible...
    } finally {
      if (minuteur) clearTimeout(minuteur);
    }
  }

  // ---------- Appliquer la réponse au résultat : on peut AGGRAVER, jamais alléger ----------
  // nature : "lien" pour un lien RACCOURCI (le lien complet a été comparé), sinon le nom de domaine
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

  // ---------- Pour le vérificateur : affiche d'abord le résultat local (+ « en cours »), puis le résultat complété ----------
  // rendre(resultat) est appelée une ou deux fois ; l'appelant ignore les réponses devenues inutiles.
  function lancer(res, rendre) {
    // Lien RACCOURCI : le lien complet (sans « # ») est comparé ; en cas de panne ou de limite, le jaune « destination cachée » reste
    const lien = lienAEnvoyer(res);
    if (lien) {
      const cle = "lien|" + lien;
      if (cache.has(cle)) { rendre(appliquer(res, cache.get(cle), undefined, "lien")); return; }
      rendre(Object.assign({}, res, { reputation: { etat: "encours", domaine: res.hote, nature: "lien", lien: lien } }));
      interrogerLien(lien).then(function (donnees) { rendre(appliquer(res, donnees, undefined, "lien")); });
      return;
    }
    const domaine = doitInterroger(res);
    if (!domaine) { rendre(res); return; }
    if (cache.has(domaine)) { rendre(appliquer(res, cache.get(domaine))); return; }
    rendre(Object.assign({}, res, { reputation: { etat: "encours", domaine: domaine } }));
    interroger(domaine).then(function (donnees) { rendre(appliquer(res, donnees)); });
  }

  function viderCache() { cache.clear(); }

  window.RoShieldReputation = {
    adresseWorker: adresseWorker, lireConfig: lireConfig, doitInterroger: doitInterroger, interroger: interroger,
    lienAEnvoyer: lienAEnvoyer, interrogerLien: interrogerLien,
    appliquer: appliquer, lancer: lancer, viderCache: viderCache
  };
})();
