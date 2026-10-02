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
    pied: "Protège ton compte, protège tes amis."
  }
};
