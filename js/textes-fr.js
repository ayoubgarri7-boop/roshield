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
    // Tout ce qui n'est ni officiel ni une imitation évidente : un seul titre
    jaune: "Domaine inconnu de RoShield",
    rouge: "Danger : faux lien probable, ne clique pas",
    // Cas particulier : domaine officiel, mais avec un détail à vérifier (http://, @...)
    // Le titre "inconnu" serait faux ici, puisque le domaine est bien connu.
    officielAttention: "Domaine officiel, mais vérifie le lien",
    // Quand le message parlait de Roblox / Discord mais que le domaine réel est un autre (nouveau rouge)
    nonOfficielRoblox: "Ce n'est pas le vrai site de Roblox",
    nonOfficielDiscord: "Ce n'est pas le vrai site de Discord",
    // Quand le message parlait de Roblox / Discord mais que le lien mène vers un autre grand site connu (gris-bleu)
    autreSiteConnuRoblox: "Ce n'est pas Roblox : c'est un autre site connu",
    autreSiteConnuDiscord: "Ce n'est pas Discord : c'est un autre site connu"
  },

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
  // Petites lignes d'explication (affichées sous le message principal, en jaune)
  raccourcisseur: function (domaine) {
    return "Ce lien est raccourci (« " + domaine + " ») : on ne voit pas où il mène.";
  },
  http: "Ce lien commence par « http:// » et non « https:// » : la connexion n'est pas chiffrée.",
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
  // Question "Que disait le message qui accompagnait ce lien ?" (plateforme = "Roblox" ou "Discord")
  attenduFaux: function (plateforme) {
    return "Le message parlait de " + plateforme + ", mais le vrai domaine de ce lien est un autre. " +
      "Ne tape jamais ton mot de passe ou un code dessus, et ne partage jamais ton écran.";
  },
  // Niveau gris-bleu : un autre grand site connu (jamais "sûr", jamais vert)
  autreSiteConnu: function (plateforme) {
    return "Le message parlait de " + plateforme + ", mais ce lien mène vers un autre site connu. " +
      "Ce n'est pas forcément dangereux, mais vérifie que la page ne te demande pas de te connecter.";
  },
  // Petite ligne (niveau gris-bleu) : le lien cache une autre adresse
  adresseCachee: "Ce lien contient une autre adresse cachée : il peut t'envoyer ailleurs.",
  inconnu:
    "RoShield ne connaît que les domaines officiels de Roblox et de Discord. Ça ne veut pas dire que ce lien " +
    "est dangereux, mais on ne peut pas le confirmer. Vérifie qui te l'a envoyé et tape l'adresse toi-même si tu as un doute."
};
