/* ==========================================================
   textes-fr.js : tous les messages du vérificateur, en français.
   Pour une version anglaise : copier ce fichier en textes-en.js,
   traduire, et charger celui-là à la place dans la page.
   Certains messages sont des fonctions : elles reçoivent des valeurs
   (comme un nom de domaine) et renvoient la phrase complète.
   ========================================================== */

window.TEXTES_VERIF = {
  // ----- Erreurs de saisie -----
  erreurVide: "Colle d'abord un lien dans la case, puis clique sur « Vérifier ».",
  erreurLong: "Ce texte est beaucoup trop long pour être un lien. Colle seulement le lien.",
  erreurEspaces: "Il y a des espaces dans ce texte. Colle un seul lien, sans rien d'autre autour.",
  erreurInvalide: "Ça ne ressemble pas à une adresse de site valide. Vérifie que tu as bien copié tout le lien.",

  // ----- Les 3 niveaux -----
  titres: {
    vert: "Domaine officiel",
    orange: "Suspect : vérifie avant de cliquer",
    rouge: "Danger : faux lien probable, ne clique pas"
  },
  emojis: { vert: "🟢", orange: "🟡", rouge: "🔴" },

  // ----- Affichage du domaine -----
  labelDomaine: "Domaine réel détecté",
  aideDomaine: "Le vrai site est le nom en blanc : c'est la partie juste avant le premier « / » du lien. Ce qui est écrit AVANT (en gris) ne compte pas.",

  // ----- Messages "tout va bien... mais reste prudent" -----
  rappelOfficiel:
    "Ce lien mène bien vers un domaine officiel. Mais attention : un vrai domaine peut quand même " +
    "mener vers un contenu piégé (par exemple une invitation Discord officielle vers un serveur d'arnaqueurs). " +
    "Ne fais jamais confiance uniquement au lien : si on te promet des Robux ou du Nitro gratuits, c'est une arnaque.",
  rappelInvitation:
    "C'est un lien d'invitation Discord. Le lien est officiel, mais n'importe qui peut créer un serveur " +
    "et inviter des gens : vérifie qui te l'a envoyé et ne lance jamais de fichier proposé dans ce serveur.",
  rappelFichiers:
    "Ce domaine héberge aussi des fichiers envoyés par des utilisateurs. Un fichier hébergé sur un site " +
    "officiel peut quand même être un virus : n'ouvre jamais un .exe, .scr, .bat ou .zip venu d'un inconnu.",
  officielInfo: function (domaine) {
    return "Le domaine « " + domaine + " » appartient bien à Roblox ou Discord, MAIS le lien contient un autre problème :";
  },

  // ----- Raisons (danger / suspect) -----
  protocoleDangereux: function (p) {
    return "Ce n'est pas un lien de site web : il commence par « " + p + ": ». Ce genre de lien peut exécuter du code. Ne le colle nulle part et ne l'ouvre pas.";
  },
  protocoleInhabituel: function (p) {
    return "Ce lien n'utilise pas « http » ou « https » mais « " + p + ": ». Ce n'est pas un lien de site web classique : sois très prudent.";
  },
  arobase: function (vrai, officiel) {
    return "Le lien contient un « @ ». Tout ce qui est écrit avant le « @ » est ignoré par le navigateur : c'est une astuce pour te tromper. " +
      "Le lien mène en vrai vers « " + vrai + " »." + (officiel ? "" : " Ce n'est pas un domaine officiel.");
  },
  adresseIP: "Ce lien utilise une adresse IP (des chiffres) à la place d'un nom de site. Roblox et Discord n'envoient jamais de liens comme ça.",
  punycode: "Ce nom de domaine est codé (il contient « xn-- »). C'est souvent utilisé pour cacher des lettres d'un autre alphabet qui ressemblent aux nôtres (par exemple un « о » russe à la place d'un « o »). C'est une technique classique de faux site.",
  raccourcisseur: function (domaine) {
    return "« " + domaine + " » est un raccourcisseur de liens : on ne peut pas savoir où il mène juste en regardant le lien. Évite-le, surtout si on te le demande pour un jeu ou un cadeau.";
  },
  http: "Le lien commence par « http:// » et non « https:// » : la connexion n'est pas chiffrée. Un vrai site de connexion utilise toujours https.",
  imiteSousDomaine: function (officiel, vrai) {
    return "Ce lien imite « " + officiel + " » dans son adresse, mais le vrai domaine est « " + vrai + " ». " +
      "Ce qui compte, c'est la fin du nom, pas le début.";
  },
  ressemble: function (vrai, officiel) {
    return "« " + vrai + " » ressemble beaucoup à « " + officiel + " » mais ce n'est pas le même : ça ressemble à une faute de frappe faite exprès pour te tromper.";
  },
  motCle: function (mot, vrai) {
    return "Ce domaine contient le mot « " + mot + " » mais ce n'est pas un domaine officiel. Le vrai domaine est « " + vrai + " ». Les arnaqueurs utilisent ces mots pour te mettre en confiance.";
  },
  chiffresLettres: function (mot, vrai) {
    return "Ce domaine imite le mot « " + mot + " » en remplaçant des lettres par des chiffres (comme 1 à la place de l ou 0 à la place de o). Le vrai domaine est « " + vrai + " ».";
  },
  partieProche: function (partie, mot, vrai) {
    return "Dans « " + vrai + " », le mot « " + partie + " » ressemble beaucoup à « " + mot + " » : c'est probablement une faute de frappe faite exprès pour te tromper.";
  },
  inconnu: function (vrai) {
    return "Le domaine « " + vrai + " » n'est ni Roblox ni Discord. Si on t'a dit que ce lien vient de Roblox ou de Discord, c'est faux. Vérifie qui te l'a envoyé avant de cliquer.";
  }
};
