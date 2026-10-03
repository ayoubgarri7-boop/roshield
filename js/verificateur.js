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
     https://roblox.com.example.com/login       (vrai domaine : example.com)
     https://roblox-free-robux.com              (mot-clé, pas officiel)
     https://discord-nitro-gift.xyz             (mot-clé, pas officiel)
     https://rob1ox.com                         (chiffre à la place d'une lettre)
     https://robiox.com                         (faute de frappe)
     https://roblox.co                          (domaine presque identique)
     https://dlscord.com                        (faute de frappe)
     https://xn--rblox-xxa.com                  (punycode)
     https://rоblox.com                         (le 2e "о" est russe ! → punycode)
     https://roblox.com@example.com             (astuce du @)
     http://192.168.12.34/login                 (adresse IP)
     javascript:alert(1)                        (protocole dangereux)

   JAUNE (domaine inconnu de RoShield)
     https://bit.ly/abc123                      (raccourcisseur)
     http://www.roblox.com                      (http sur domaine officiel)
     https://mon-super-site.com                 (inconnu, sans rapport)
     https://discord.com@roblox.com             (@ mais mène vers un officiel)

   AVEC LA QUESTION "Que disait le message à propos de ce lien ?"  (page Roblox / page Discord / autre chose ou je ne sais pas)
     https://dash.cloudflare.com/sign-up        + Roblox  ou  + Discord  -> ROUGE "Ce n'est pas le vrai site de ..."
     https://www.roblox.com/games/123           + Roblox  -> VERT (comme d'habitude)
     https://mon-super-site.com                 + "Je ne sais pas" -> JAUNE (comme d'habitude)
     https://rob1ox.com                         + Roblox  -> ROUGE avec le titre habituel "Danger..." (déjà rouge)
     http://mon-super-site.com                  + Roblox  -> ROUGE (la remarque sur http:// reste affichée)
     http://www.roblox.com                      + Roblox  -> JAUNE (domaine officiel : rien ne change)
     https://roblox.com@example.com             + Roblox  -> ROUGE (le vrai domaine est example.com)
     https://youtube.com.evil.test              + Roblox  -> ROUGE (le vrai domaine est evil.test)
     https://www.youtube.com/watch?v=abc        + Roblox  -> ROUGE "Ce n'est pas le vrai site de Roblox" (tout site non officiel, même YouTube)
     https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.test + "Je ne sais pas" -> JAUNE + note "autre adresse cachée"
     https://www.roblox.com/redirect?url=https%3A%2F%2Fexample.test -> VERT + note "autre adresse cachée" (pas sur le rouge)
     https://www.youtube.com/watch?v=abc        + "Je ne sais pas" -> JAUNE (comme d'habitude)

   ERREURS
     (vide)   |   bonjour tout le monde   |   bonjour
   ---------------------------------------------------------- */

(function () {
  "use strict";

  const T = window.TEXTES_VERIF;
  const OFFICIELS = window.DOMAINES_OFFICIELS;
  const MOTS_CLES = window.MOTS_CLES;
  const NOMS_OFFICIELS = window.NOMS_OFFICIELS;
  const HOTES_SANS_MOT_CLE = window.HOTES_SANS_MOT_CLE || [];
  const MOTS_MARQUE_MORCEAUX = window.MOTS_MARQUE_MORCEAUX;
  const MOTS_MARQUE_ENTIERS = window.MOTS_MARQUE_ENTIERS;
  const FORMES_COLLEES = window.FORMES_COLLEES;
  const MOTS_ARNAQUE = window.MOTS_ARNAQUE;
  const RACCOURCISSEURS = window.RACCOURCISSEURS;

  // Une AUTRE adresse complète cachée dans le chemin ou la requête d'un lien ?
  //   https://...   http://...   https%3A%2F%2F...   %3A%2F%2F...   (et la version encodée deux fois)
  // Exemple : youtube.com/redirect?q=https%3A%2F%2Fexample.test
  // Le mot "http" tout seul (youtube.com/watch?v=httpabc, wikipedia.org/wiki/HTTP) ne compte pas.
  const ADRESSE_CACHEE = /https?(?::|%3a)(?:\/|%2f){2}|%3a%2f%2f|%253a%252f%252f/i;

  // Le chemin / la requête du lien contiennent-ils le NOM COMPLET d'un domaine officiel ?
  // On remet le texte "à plat" avant de chercher : minuscules, %2E / %2F / double encodage (%252E) décodés,
  // et tirets, tirets bas, barres et espaces comptés comme des points ("roblox-com" -> "roblox.com").
  // Le nom doit être COMPLET et finir proprement : "roblox.com" ou "roblox-com/", mais pas "roblox-community"
  // ni le mot "roblox" tout seul. Un tel lien est JAUNE avec alerte forte (rouge si le message disait "page Roblox").
  function nomOfficielDansChemin(url) {
    let texte = url.pathname + url.search + url.hash;
    for (let i = 0; i < 3; i++) {
      let decode;
      try { decode = decodeURIComponent(texte); } catch (e) { break; }
      if (decode === texte) break;
      texte = decode;
    }
    texte = texte.toLowerCase().replace(/[-_\/\s]+/g, ".");
    return OFFICIELS.find(function (d) {
      const debut = texte.indexOf(d.domaine);
      if (debut === -1) return false;
      // on regarde toutes les occurrences : la fin doit être propre (pas une lettre ou un chiffre juste après)
      for (let i = debut; i !== -1; i = texte.indexOf(d.domaine, i + 1)) {
        if (!/[a-z0-9]/.test(texte.charAt(i + d.domaine.length))) return true;
      }
      return false;
    });
  }

  // Gravité des niveaux : permet de garder "le pire" à la fin
  const GRAVITE = { vert: 0, jaune: 1, rouge: 2 };

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
     analyser(texte, attendu) : le cœur du vérificateur.
     Renvoie soit  { erreur: "..." }
     soit { niveau, hote, sous, reel, raisons: [...] }

     "attendu" (facultatif) = ce que le message PRÉTENDAIT : "c'est une page Roblox / Discord" :
       "roblox" ou "discord"  -> si le domaine réel n'est pas officiel : rouge
       "inconnu" ou rien      -> comportement habituel, rien ne change
     Cette réponse ne sert qu'à comparer : le lien n'est jamais visité.
     ------------------------------------------------------ */
  function analyser(entree, attendu) {
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
        niveau: dangereux ? "rouge" : "jaune",
        titreCle: dangereux ? "rouge" : "jaune",
        hote: null,
        // Dangereux : explication en rouge. Sinon : explication jaune + petite ligne sur le protocole.
        raisons: dangereux ? [T.protocoleDangereux(p)] : [T.inconnu],
        notes: dangereux ? [] : [T.protocoleInhabituel(p)].concat(ADRESSE_CACHEE.test(texte) ? [T.adresseCachee] : [])
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
        niveau: dangereux ? "rouge" : "jaune",
        titreCle: dangereux ? "rouge" : "jaune",
        hote: null,
        // Dangereux : explication en rouge. Sinon : explication jaune + petite ligne sur le protocole.
        raisons: dangereux ? [T.protocoleDangereux(p)] : [T.inconnu],
        notes: dangereux ? [] : [T.protocoleInhabituel(p)].concat(ADRESSE_CACHEE.test(url.pathname + url.search) ? [T.adresseCachee] : [])
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
    const notes = [];   // petites lignes en plus (raccourcisseur, http://) : elles ne changent pas le titre
    function ajouter(niveau, message) { raisons.push({ niveau: niveau, message: message }); }

    if (url.username || url.password) {
      ajouter(officiel ? "jaune" : "rouge", T.arobase(hote, !!officiel));
    }
    if (estIP) ajouter("rouge", T.adresseIP);

    const labels = hote.split(".");
    const estPunycode = labels.some(function (l) { return l.startsWith("xn--"); });
    if (estPunycode) ajouter("rouge", T.punycode);

    const raccourci = RACCOURCISSEURS.find(function (r) { return estOuSousDomaine(hote, r); });
    if (raccourci) notes.push(T.raccourcisseur(raccourci));

    // http:// n'est signalé que si l'utilisateur l'a écrit lui-même
    if (avaitProtocole && url.protocol === "http:") notes.push(T.http);

    // Titre imposé par une règle précise (sinon on prend celui du niveau)
    let titreForce = null;
    // Alerte forte JAUNE (nom officiel copié dans le chemin, ou mot de marque seul dans le nom d'hôte) : clé du titre
    let alerte = null;

    // --- 6. Domaine NON officiel : cherche les imitations ---
    if (!officiel && !estIP && !estPunycode && !raccourci) {
      let trouve = false;
      // Hôte exact exempté de la règle du mot-clé (voir domaines.js) : on saute c), d) et e).
      // Comparaison EXACTE : jamais un autre sous-domaine du même site.
      const sansMotCle = HOTES_SANS_MOT_CLE.includes(hote);

      // a) "roblox.com.example.com" : un domaine officiel écrit en début de nom, SUIVI d'autre chose.
      //    Un nom qui se termine simplement par "roblox.com" ("todoroblox.com") est un autre domaine : il n'imite pas
      //    un sous-domaine, il contient seulement le mot de marque (voir c ci-dessous : jaune avec alerte forte).
      const imite = OFFICIELS.find(function (d) {
        const place = hote.indexOf(d.domaine);
        return place !== -1 && place + d.domaine.length < hote.length;
      });
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

      // c) un mot de MARQUE dans le nom d'hôte (roblox, discord, robux, rbx, nitro)
      //    - avec un mot d'arnaque dans le nom d'hôte (free, gift, login...) : ROUGE
      //    - tout seul : on le garde de côté (marqueSeule) ; ce sera une alerte JAUNE si rien de plus grave n'est trouvé
      //    "roblox", "discord", "robux" sont cherchés comme morceaux (todoroblox) ; "rbx", "nitro" et tous les mots
      //    d'arnaque comme MOTS ENTIERS (séparés par des points ou des tirets), sauf quelques formes collées connues.
      let marqueSeule = null;
      if (!trouve && !sansMotCle) {
        const mots = hote.split(/[.\-]/);
        const entier = function (m) { return mots.includes(m); };
        const collee = FORMES_COLLEES.find(function (f) { return hote.includes(f); });
        const marque = MOTS_MARQUE_MORCEAUX.find(function (m) { return hote.includes(m); }) ||
                       MOTS_MARQUE_ENTIERS.find(entier);
        const arnaque = collee || (marque && MOTS_ARNAQUE.find(function (m) { return m !== marque && entier(m); }));
        if (arnaque) {
          ajouter("rouge", T.motCle(collee || marque, reel));
          trouve = true;
        } else if (marque) {
          marqueSeule = marque;
        }
      }

      // d) chiffres à la place de lettres dans un NOM DE MARQUE (rob1ox, r0blox, d1sc0rd, di5cord, n1tro) : ROUGE.
      //    Le "1" peut remplacer un "l" (rob1ox) ou un "i" (d1scord) : on essaie les deux.
      //    On exige que le mot n'y soit PAS déjà écrit tel quel, et on ne cherche que les noms de marque :
      //    "web3-roblox-fans" ou "2fa-help" ne sont pas rouges.
      if (!trouve && !sansMotCle) {
        const variantes = [normaliser(hote), normaliser(hote.replace(/1/g, "i"))];
        const mot = MOTS_CLES.find(function (m) {
          return !hote.includes(m) && variantes.some(function (v) { return v.includes(m); });
        });
        if (mot) {
          ajouter("rouge", T.chiffresLettres(mot, reel));
          trouve = true;
        }
      }

      // e) un morceau du nom ressemble à un mot officiel (robiox-gratuit.com)
      if (!trouve && !sansMotCle) {
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

      // e2) le nom officiel COMPLET écrit avec des tirets dans le nom d'hôte : www-roblox-com.invalid,
      //     roblox-com.example.com, discord-com-invite.test, discord-gg-abc.test. ROUGE.
      //     Le nom doit être ENTIER et délimité (début du nom, point ou tiret de chaque côté) :
      //     "notroblox-community" ou "notroblox-com" ne comptent pas (ce sont des mots de marque, voir c).
      if (!trouve) {
        const imiteTirets = OFFICIELS.find(function (d) {
          const motif = new RegExp("(^|[._-])" + d.domaine.replace(/\./g, "[-_]") + "($|[._-])");
          return motif.test(hote);
        });
        if (imiteTirets) {
          ajouter("rouge", T.imiteSousDomaine(imiteTirets.domaine, reel));
          trouve = true;
        }
      }

      // f) Rien de rouge : deux signaux JAUNES avec alerte forte (jamais rouges tout seuls, car des sites honnêtes
      //    les déclenchent : archives, moteurs de recherche, wikis, sites de fans...). Avec la réponse « page Roblox /
      //    Discord », le 6c ci-dessous les passe en rouge.
      if (!trouve) {
        if (nomOfficielDansChemin(url)) {
          // le NOM COMPLET d'un site officiel est écrit dans le chemin ou la requête (evil.test/roblox.com/login)
          ajouter("jaune", T.imiteDansChemin);
          alerte = "alerteChemin";
        } else if (marqueSeule) {
          // un mot de marque tout seul dans le nom d'hôte (todoroblox.example)
          const plateformeMarque = (marqueSeule === "discord" || marqueSeule === "nitro") ? "Discord" : "Roblox";
          ajouter("jaune", T.alerteMarque(plateformeMarque));
          alerte = "alerteMarque_" + marqueSeule;
        }
      }
    }

    // --- 6b. Ni officiel, ni imitation évidente : "domaine inconnu de RoShield" (jaune) ---
    // (raccourcisseurs et domaines sans rapport avec Roblox/Discord arrivent ici)
    if (!officiel && !alerte && !raisons.some(function (r) { return r.niveau === "rouge"; })) {
      ajouter("jaune", T.inconnu);
    }

    // --- 6c. Le message disait que c'était une page Roblox ou Discord ---
    // Si le domaine réel n'est PAS officiel (les sous-domaines officiels comptent comme officiels),
    // c'est rouge : quelqu'un se fait passer pour Roblox/Discord. Les autres raisons restent affichées.
    // Si le domaine est officiel (même celui de l'AUTRE plateforme), on ne change rien.
    // Si on ne sait pas, on ne change rien.
    const plateforme = attendu === "roblox" ? "Roblox" : attendu === "discord" ? "Discord" : null;
    if (plateforme && !officiel) {
      // Était-ce DÉJÀ rouge sans la question (imitation, adresse IP, punycode...) ?
      const dejaRouge = raisons.some(function (r) { return r.niveau === "rouge"; });
      // Le message "inconnu, ça ne veut pas dire dangereux" ne va plus avec un résultat rouge
      for (let i = raisons.length - 1; i >= 0; i--) {
        if (raisons[i].message === T.inconnu) raisons.splice(i, 1);
      }
      // Tout domaine non officiel est rouge, quel que soit le site (même YouTube) : le message prétendait
      // que c'était Roblox/Discord, et ce n'est pas vrai.
      raisons.unshift({ niveau: "rouge", message: T.attenduFaux(plateforme) });
      // Le titre "Ce n'est pas le vrai site de ..." est réservé aux NOUVEAUX rouges (domaine simplement inconnu).
      // Un cas déjà rouge garde son titre habituel : "Danger : faux lien probable, ne clique pas".
      if (!dejaRouge) titreForce = attendu === "roblox" ? "nonOfficielRoblox" : "nonOfficielDiscord";
    }

    // --- 7. Niveau final = le pire des niveaux trouvés ---
    let niveau = "vert";
    raisons.forEach(function (r) {
      if (GRAVITE[r.niveau] > GRAVITE[niveau]) niveau = r.niveau;
    });
    // Un domaine officiel avec une petite remarque (http://, raccourci...) passe en jaune
    if (niveau === "vert" && notes.length > 0) niveau = "jaune";
    // Pas officiel et aucune raison (ne devrait pas arriver) : prudence
    if (!officiel && niveau === "vert") niveau = "jaune";

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

    // Petite ligne : le chemin ou la requête cache une AUTRE adresse complète (redirection ?).
    // Seulement sur le VERT et le JAUNE : le rouge a déjà un avertissement fort. On l'ajoute APRÈS le calcul
    // du niveau, pour qu'un lien vert reste vert.
    if ((niveau === "vert" || niveau === "jaune") && ADRESSE_CACHEE.test(url.pathname + url.search)) {
      notes.push(T.adresseCachee);
    }

    // Titre : un seul titre pour tout le jaune ("Domaine inconnu de RoShield").
    // Exception : domaine officiel avec un détail (http://, @) -> "inconnu" serait faux.
    const titreCle = titreForce || (alerte && niveau === "jaune" ? alerte : (officiel && niveau === "jaune" ? "officielAttention" : niveau));

    return { niveau: niveau, titreCle: titreCle, hote: hote, sous: sous, reel: reel, raisons: messages, notes: notes };
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

  let resultatAffiche = false;   // vrai quand un résultat (pas une erreur) est à l'écran

  // La réponse choisie à la question "Que disait le message à propos de ce lien ?"
  function reponseChoisie() {
    const choix = formulaire.querySelector('input[name="attendu"]:checked');
    return choix ? choix.value : "inconnu";
  }

  function afficher(res, sansDefiler) {
    resultatAffiche = !res.erreur;
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

    // Titre : rond de couleur + niveau.
    // Le rond est dessiné en CSS (et non un emoji) pour avoir exactement le même
    // rendu sur tous les appareils. aria-hidden : les lecteurs d'écran l'ignorent,
    // car il est purement décoratif (le niveau est déjà écrit en toutes lettres).
    const titre = creer("h2", "resultat__titre");
    const rond = creer("span", "resultat__rond resultat__rond--" + res.niveau);
    rond.setAttribute("aria-hidden", "true");
    titre.appendChild(rond);
    titre.appendChild(document.createTextNode(T.titres[res.titreCle || res.niveau]));
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

    // Petites lignes en plus (raccourcisseur, http://...) : sous le message principal
    (res.notes || []).forEach(function (n) {
      boite.appendChild(creer("p", "resultat__note", n));
    });

    zoneResultat.appendChild(boite);
    blocApresClic.hidden = false;
    if (!sansDefiler) boite.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Quand on clique sur "Vérifier" ou qu'on appuie sur Entrée
  formulaire.addEventListener("submit", function (evenement) {
    evenement.preventDefault(); // empêche la page de se recharger
    afficher(analyser(champ.value, reponseChoisie()));
  });

  // Si on change de réponse alors qu'un résultat est déjà affiché, on le recalcule tout de suite
  // (sans faire défiler la page).
  formulaire.addEventListener("change", function (evenement) {
    if (evenement.target.name === "attendu" && resultatAffiche && champ.value.trim()) {
      afficher(analyser(champ.value, reponseChoisie()), true);
    }
  });
})();
