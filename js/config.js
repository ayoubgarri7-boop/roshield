/* ==========================================================
   config.js : les réglages du site, au même endroit.
   Pour changer le nom du site, modifie seulement "nom" ci-dessous.
   Ce fichier doit être chargé AVANT commun.js dans chaque page.
   ========================================================== */

window.CONFIG_SITE = {
  // Nom du site (utilisé dans le menu, le titre des onglets, le pied de page...)
  nom: "RoShield",

  // Lettre affichée dans le carré vert du logo
  lettreLogo: "R",

  // Petit badge à côté du nom dans le menu (mets "" pour le cacher)
  badge: "BETA",

  // Lien du futur bouton de don. Laisse "" tant que tu n'en as pas :
  // le bouton s'affichera alors grisé, avec "bientôt".
  lienDon: "",

  // Adresse du site en ligne (avec le "/" final). Elle sert aux liens "hreflang" entre la
  // version française et la version anglaise. Pour changer de domaine : modifie cette ligne,
  // puis lance  node outils/hreflang.js  (il met à jour toutes les pages d'un coup).
  urlSite: "https://ayoubgarri7-boop.github.io/roshield/",

  // Vérification complémentaire d'un nom de domaine avec VirusTotal, par l'intermédiaire du petit service roshield-sante
  // (un Worker Cloudflare). DÉSACTIVÉE PAR DÉFAUT : tant que "urlWorker" est vide, RIEN n'est envoyé, jamais.
  //   - urlWorker : l'adresse du Worker, par exemple "https://roshield-sante.ton-sous-domaine.workers.dev"
  //     (seules les adresses https://....workers.dev sont acceptées, et http://localhost pour les essais en local).
  //   - Quand elle est activée : seulement pour un résultat JAUNE, jamais pour un raccourcisseur, et seulement le NOM DE
  //     DOMAINE de l'adresse réelle (jamais le lien complet).
  //   - seuilAlerte : à partir de ce nombre de moteurs « malicious » chez VirusTotal, le résultat reste jaune mais devient une
  //     alerte forte avec le nombre de moteurs.
  //   - seuilRouge : à partir de ce nombre de moteurs « malicious », le résultat devient ROUGE.
  //   VirusTotal ne rend JAMAIS un lien vert : il ne peut qu'aggraver un résultat. Seuls les moteurs « malicious » comptent
  //   (pas « suspicious », pas « undetected »).
  reputation: {
    urlWorker: "https://roshield-sante.rs-k7x2p9qa.workers.dev",
    seuilAlerte: 1,
    seuilRouge: 2
  },

  // Le menu du haut. "fichier" doit être le nom exact de la page.
  menu: [
    { texte: "Accueil",      fichier: "index.html" },
    { texte: "Vérificateur", fichier: "verificateur.html" },
    { texte: "Guides",       fichier: "guides.html" },
    { texte: "Sécurité",     fichier: "securite.html" },
    { texte: "À propos",     fichier: "a-propos.html" }
  ],

  // Textes communs (regroupés ici pour faciliter une future version anglaise)
  textes: {
    boutonMenu: "Vérifier un lien",
    ouvrirMenu: "Ouvrir le menu",
    pasAffilie: "Ce site n'est pas affilié à Roblox Corporation ni à Discord Inc.",
    don: "Soutenir le projet",
    donBientot: "Soutenir le projet (bientôt)",
    pied: "Protège ton compte, protège tes amis.",
    confidentialite: "Comment ça marche et confidentialité",

    // Libellés pour les lecteurs d'écran
    accueilAria: "accueil",
    langueGroupe: "Langue",
    langueFrAria: "Français (langue actuelle)",
    langueEnAria: "Passer le site en anglais"
  }
};
