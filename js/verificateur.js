/* ==========================================================
   verificateur.js : la logique du vérificateur de lien.

   🔒 RÈGLES DE SÉCURITÉ DE CE FICHIER
   1. On ne visite JAMAIS le lien : pas de fetch(), pas d'iframe, pas de
      window.open(), et le lien n'est JAMAIS mis dans un <a href>.
      On analyse seulement le TEXTE du lien, dans le navigateur.
   2. On n'affiche JAMAIS ce que l'utilisateur a collé avec innerHTML.
      On utilise textContent, qui traite tout comme du simple texte.
      Pourquoi ? Si quelqu'un colle  <img src=x onerror="...">  et qu'on
      l'affiche avec innerHTML, le navigateur EXÉCUTERAIT ce code : c'est
      une faille XSS (Cross-Site Scripting). Avec textContent, le même
      texte s'affiche tel quel, sans jamais être exécuté.
   3. On ne dit jamais "100 % sûr".

   ----------------------------------------------------------
   🧪 LIENS DE TEST (copie-colle chacun dans le vérificateur)

   VERT (domaine officiel)
     https://www.roblox.com/games/123
     web.roblox.com                      (sans https:// : il est ajouté)
     https://discord.com/channels/@me
     https://discord.gg/abcdef           (+ rappel "invitation")
     https://cdn.discordapp.com/attachments/1/2/fichier.png  (+ rappel fichiers)

   ROUGE (danger)
     https://roblox.com.site-pirate.xyz/login   (vrai domaine : site-pirate.xyz)
     https://roblox-free-robux.com              (mot-clé, pas officiel)
     https://discord-nitro-gift.xyz             (mot-clé, pas officiel)
     https://rob1ox.com                         (chiffre à la place d'une lettre)
     https://robiox.com                         (faute de frappe)
     https://roblox.co                          (domaine presque identique)
     https://dlscord.com                        (faute de frappe)
     https://xn--rblox-xxa.com                  (punycode)
     https://rоblox.com                         (le 2e "о" est russe ! → punycode)
     https://roblox.com@site-pirate.xyz         (astuce du @)
     http://192.168.12.34/login                 (adresse IP)
     javascript:alert(1)                        (protocole dangereux)

   ORANGE (suspect)
     https://bit.ly/abc123                      (raccourcisseur)
     http://www.roblox.com                      (http sur domaine officiel)
     https://mon-super-site.com                 (inconnu, sans rapport)
     https://discord.com@roblox.com             (@ mais mène vers un officiel)

   ERREURS
     (vide)   |   bonjour tout le monde   |   bonjour
   ---------------------------------------------------------- */

(function () {
  "use strict";

  const T = window.TEXTES_VERIF;
  const OFFICIELS = window.DOMAINES_OFFICIELS;
  const MOTS_CLES = window.MOTS_CLES;
  const NOMS_OFFICIELS = window.NOMS_OFFICIELS;
  const RACCOURCISSEURS = window.RACCOURCISSEURS;

  // Gravité des niveaux : permet de garder "le pire" à la fin
  const GRAVITE = { vert: 0, orange: 1, rouge: 2 };

  /* ------------------------------------------------------
     Distance de Levenshtein : combien de changements
     (ajouter / enlever / remplacer UNE lettre) pour passer
     d'un mot à l'autre ?
       "roblox" -> "rob1ox" = 1     "roblox" -> "robiox" = 1
     Plus le nombre est petit, plus les mots se ressemblent.
     ------------------------------------------------------ */
  function levenshtein(a, b) {
    // precedent[j] = distance entre le début de a et les j premières lettres de b
    let precedent = [];
    for (let j = 0; j <= b.length; j++) precedent[j] = j;

    for (let i = 1; i <= a.length; i++) {
      const courant = [i];
      for (let j = 1; j <= b.length; j++) {
        const cout = a[i - 1] === b[j - 1] ? 0 : 1;
        courant[j] = Math.min(
          precedent[j] + 1,        // enlever une lettre
          courant[j - 1] + 1,      // ajouter une lettre
          precedent[j - 1] + cout  // remplacer une lettre
        );
      }
      precedent = courant;
    }
    return precedent[b.length];
  }

  // Un domaine est-il "domaine" ou un sous-domaine de "base" ?
  //   estSousDomaineDe("www.roblox.com", "roblox.com")      -> true
  //   estSousDomaineDe("roblox.com.pirate.xyz", "roblox.com") -> false
  // On vérifie la FIN du nom, jamais le début : c'est la clé de tout.
  function estOuSousDomaine(hote, base) {
    return hote === base || hote.endsWith("." + base);
  }

  // Le "vrai" domaine = les 2 derniers morceaux (roblox.com), ou 3 pour
  // des fins comme .co.uk (site.co.uk). Simplification volontaire :
  // une vraie liste (Public Suffix List) serait trop lourde pour la V1.
  const SECOND_NIVEAU = ["co", "com", "net", "org", "gov", "edu", "ac"];
  function domaineReel(hote) {
    const morceaux = hote.split(".");
    const n = morceaux.length;
    if (n <= 2) return hote;
    const dernier = morceaux[n - 1];
    if (dernier.length === 2 && SECOND_NIVEAU.includes(morceaux[n - 2])) {
      return morceaux.slice(-3).join(".");
    }
    return morceaux.slice(-2).join(".");
  }

  // Remplace les chiffres souvent utilisés pour imiter des lettres
  function normaliser(texte) {
    return texte
      .replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e")
      .replace(/4/g, "a").replace(/5/g, "s").replace(/\$/g, "s");
  }

  /* ------------------------------------------------------
     analyser(texte) : le cœur du vérificateur.
     Renvoie soit  { erreur: "..." }
     soit { niveau, hote, sous, reel, raisons: [...] }
     ------------------------------------------------------ */
  function analyser(entree) {
    // --- 1. Nettoyage ---
    const texte = String(entree == null ? "" : entree).trim();
    if (!texte) return { erreur: T.erreurVide };
    if (texte.length > 2048) return { erreur: T.erreurLong };
    if (/\s/.test(texte)) return { erreur: T.erreurEspaces };

    // Protocole écrit comme "javascript:..." (sans "//") : dangereux
    const sansSlashes = texte.match(/^([a-z][a-z0-9+.-]*):(?!\/\/|\d)/i);
    if (sansSlashes) {
      const p = sansSlashes[1].toLowerCase();
      const dangereux = ["javascript", "data", "vbscript", "file", "blob"].includes(p);
      return {
        niveau: dangereux ? "rouge" : "orange",
        hote: null,
        raisons: [dangereux ? T.protocoleDangereux(p) : T.protocoleInhabituel(p)]
      };
    }

    // Si l'utilisateur n'a pas écrit "https://", on l'ajoute pour pouvoir analyser
    const avaitProtocole = /^[a-z][a-z0-9+.-]*:\/\//i.test(texte);
    const complet = avaitProtocole ? texte : "https://" + texte.replace(/^\/+/, "");

    // --- 2. Analyse avec new URL() (ne contacte AUCUN site) ---
    let url;
    try {
      url = new URL(complet);
    } catch (e) {
      return { erreur: T.erreurInvalide };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      const p = url.protocol.replace(":", "");
      const dangereux = ["javascript", "data", "vbscript", "file", "blob"].includes(p);
      return {
        niveau: dangereux ? "rouge" : "orange",
        hote: null,
        raisons: [dangereux ? T.protocoleDangereux(p) : T.protocoleInhabituel(p)]
      };
    }

    // --- 3. Le vrai nom de domaine, en minuscules ---
    // new URL() convertit déjà les lettres exotiques en "xn--..." (punycode).
    const hote = url.hostname.toLowerCase().replace(/\.$/, "");
    const estIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hote);
    const estIPv6 = hote.startsWith("[");
    const estIP = estIPv4 || estIPv6;

    // Un vrai site contient au moins un point (sauf adresse IP)
    if (!hote || (!estIP && !hote.includes("."))) return { erreur: T.erreurInvalide };

    const reel = estIP ? hote : domaineReel(hote);
    const sous = estIP ? "" : hote.slice(0, hote.length - reel.length);

    // --- 4. Domaine officiel ? ---
    const officiel = OFFICIELS.find(function (d) {
      return estOuSousDomaine(hote, d.domaine);
    });

    // --- 5. On collecte les raisons, avec leur niveau ---
    const raisons = [];
    function ajouter(niveau, message) { raisons.push({ niveau: niveau, message: message }); }

    if (url.username || url.password) {
      ajouter(officiel ? "orange" : "rouge", T.arobase(hote, !!officiel));
    }
    if (estIP) ajouter("rouge", T.adresseIP);

    const labels = hote.split(".");
    const estPunycode = labels.some(function (l) { return l.startsWith("xn--"); });
    if (estPunycode) ajouter("rouge", T.punycode);

    const raccourci = RACCOURCISSEURS.find(function (r) { return estOuSousDomaine(hote, r); });
    if (raccourci) ajouter("orange", T.raccourcisseur(raccourci));

    // http:// n'est signalé que si l'utilisateur l'a écrit lui-même
    if (avaitProtocole && url.protocol === "http:") ajouter("orange", T.http);

    // --- 6. Domaine NON officiel : cherche les imitations ---
    if (!officiel && !estIP && !estPunycode && !raccourci) {
      let trouve = false;

      // a) "roblox.com.site-pirate.xyz" : un domaine officiel écrit en début de nom
      const imite = OFFICIELS.find(function (d) { return hote.includes(d.domaine); });
      if (imite) {
        ajouter("rouge", T.imiteSousDomaine(imite.domaine, reel));
        trouve = true;
      }

      // b) domaine presque identique à un officiel (roblox.co, dlscord.com...)
      if (!trouve) {
        const proche = OFFICIELS.find(function (d) {
          const dist = levenshtein(reel, d.domaine);
          return dist >= 1 && dist <= 2;
        });
        if (proche) {
          ajouter("rouge", T.ressemble(reel, proche.domaine));
          trouve = true;
        }
      }

      // c) contient un mot-clé (roblox, discord, robux, nitro)
      if (!trouve) {
        const mot = MOTS_CLES.find(function (m) { return hote.includes(m); });
        if (mot) {
          ajouter("rouge", T.motCle(mot, reel));
          trouve = true;
        }
      }

      // d) chiffres à la place de lettres (rob1ox -> roblox)
      if (!trouve) {
        const hoteNormalise = normaliser(hote);
        const mot = MOTS_CLES.find(function (m) { return hoteNormalise.includes(m); });
        if (mot) {
          ajouter("rouge", T.chiffresLettres(mot, reel));
          trouve = true;
        }
      }

      // e) un morceau du nom ressemble à un mot officiel (robiox-gratuit.com)
      if (!trouve) {
        const morceaux = hote.split(/[-_.]/);
        for (const partie of morceaux) {
          if (partie.length < 5) continue;
          const mot = NOMS_OFFICIELS.find(function (n) {
            return levenshtein(partie, n) === 1;
          });
          if (mot) {
            ajouter("rouge", T.partieProche(partie, mot, reel));
            trouve = true;
            break;
          }
        }
      }

      // f) rien de louche trouvé : domaine simplement inconnu
      if (!trouve) ajouter("orange", T.inconnu(reel));
    }

    // --- 7. Niveau final = le pire des niveaux trouvés ---
    let niveau = "vert";
    raisons.forEach(function (r) {
      if (GRAVITE[r.niveau] > GRAVITE[niveau]) niveau = r.niveau;
    });
    // Pas officiel et aucune raison (ne devrait pas arriver) : prudence
    if (!officiel && niveau === "vert") niveau = "orange";

    const messages = raisons.map(function (r) { return r.message; });

    if (officiel && niveau === "vert") {
      // Domaine officiel et rien de louche : on rappelle quand même la prudence
      messages.push(T.rappelOfficiel);
      const chemin = url.pathname.toLowerCase();
      if (hote === "discord.gg" || chemin.startsWith("/invite")) messages.push(T.rappelInvitation);
      if (estOuSousDomaine(hote, "discordapp.com") || estOuSousDomaine(hote, "discordapp.net")) {
        messages.push(T.rappelFichiers);
      }
    } else if (officiel) {
      // Officiel mais avec un souci : on précise d'abord que le domaine est bon
      messages.unshift(T.officielInfo(officiel.domaine));
    }

    return { niveau: niveau, hote: hote, sous: sous, reel: reel, raisons: messages };
  }

  // On expose la fonction pour pouvoir la tester (et la réutiliser)
  window.RoShieldVerif = { analyser: analyser, levenshtein: levenshtein };

  /* ======================================================
     PARTIE AFFICHAGE (seulement dans une vraie page web)
     ====================================================== */
  if (typeof document === "undefined") return;

  const formulaire = document.getElementById("form-verif");
  if (!formulaire) return;

  const champ = document.getElementById("champ-lien");
  const zoneResultat = document.getElementById("resultat");
  const blocApresClic = document.getElementById("apres-clic");

  // Petit outil pour créer un élément avec du TEXTE (textContent, jamais innerHTML)
  function creer(balise, classe, texte) {
    const el = document.createElement(balise);
    if (classe) el.className = classe;
    if (texte) el.textContent = texte;
    return el;
  }

  function afficher(res) {
    zoneResultat.textContent = ""; // vide l'ancien résultat

    // Cas d'erreur de saisie
    if (res.erreur) {
      const boite = creer("div", "resultat resultat--erreur");
      boite.setAttribute("role", "alert");
      boite.appendChild(creer("p", "resultat__erreur", res.erreur));
      zoneResultat.appendChild(boite);
      blocApresClic.hidden = true;
      return;
    }

    const boite = creer("div", "resultat resultat--" + res.niveau);

    // Titre : emoji + niveau
    const titre = creer("h2", "resultat__titre");
    titre.appendChild(creer("span", "resultat__emoji", T.emojis[res.niveau]));
    titre.appendChild(document.createTextNode(" " + T.titres[res.niveau]));
    boite.appendChild(titre);

    // Domaine réel en gros (le morceau qui compte est mis en valeur)
    if (res.hote) {
      const bloc = creer("div", "domaine");
      bloc.appendChild(creer("p", "domaine__label", T.labelDomaine));
      const gros = creer("p", "domaine__nom");
      if (res.sous) gros.appendChild(creer("span", "domaine__sous", res.sous));
      gros.appendChild(creer("span", "domaine__reel", res.reel));
      bloc.appendChild(gros);
      bloc.appendChild(creer("p", "domaine__aide", T.aideDomaine));
      boite.appendChild(bloc);
    }

    // Liste des raisons
    const liste = creer("ul", "resultat__raisons");
    res.raisons.forEach(function (r) { liste.appendChild(creer("li", "", r)); });
    boite.appendChild(liste);

    zoneResultat.appendChild(boite);
    blocApresClic.hidden = false;
    boite.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Quand on clique sur "Vérifier" ou qu'on appuie sur Entrée
  formulaire.addEventListener("submit", function (evenement) {
    evenement.preventDefault(); // empêche la page de se recharger
    afficher(analyser(champ.value));
  });
})();
