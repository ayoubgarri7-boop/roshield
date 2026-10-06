/* ==========================================================
   config-en.js : la version ANGLAISE des réglages du site.

   Ce fichier est chargé APRÈS config.js, dans les pages du dossier en/.
   Il ne remplace que ce qui doit changer de langue (le menu et les textes).
   Le nom du site, le logo, le badge, le lien de don et l'adresse du site
   restent définis UNE SEULE FOIS, dans config.js.

   Règles d'écriture (anglais américain) :
   - orthographe américaine (color, authorize...)
   - apostrophes et guillemets typographiques : ’  “ ”
   - pas d'espace avant ? ! : ;
   ========================================================== */

(function () {
  "use strict";

  const fr = window.CONFIG_SITE;

  window.CONFIG_SITE = Object.assign({}, fr, {
    // Même noms de fichiers qu'en français : les liens restent dans le dossier en/
    menu: [
      { texte: "Home",         fichier: "index.html" },
      { texte: "Link checker", fichier: "verificateur.html" },
      { texte: "Guides",       fichier: "guides.html" },
      { texte: "Security",     fichier: "securite.html" },
      { texte: "About",        fichier: "a-propos.html" }
    ],

    textes: Object.assign({}, fr.textes, {
      boutonMenu: "Check a link",
      ouvrirMenu: "Open menu",
      pasAffilie: "This site is not affiliated with Roblox Corporation or Discord Inc.",
      don: "Support the project",
      donBientot: "Support the project (soon)",
      pied: "Protect your account. Protect your friends.",
      confidentialite: "How it works and privacy",

      // Libellés pour les lecteurs d'écran
      accueilAria: "home",
      langueGroupe: "Language",
      langueFrAria: "Switch the site to French",
      langueEnAria: "English (current language)",

      // Page "Security checklist" : compteur (ex. "1 of 8 done") et message de fin
      progression: function (faits, total) {
        return faits + " of " + total + " done";
      },
      progressionFin: "Great job, you’ve gone through the whole checklist! Stay alert anyway: no protection is 100% perfect."
    })
  });
})();
