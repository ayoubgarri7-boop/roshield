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
    // Quand le message disait "c'est une page Roblox / Discord" mais que le domaine réel est un autre (nouveau rouge)
    nonOfficielRoblox: "Ce n'est pas le vrai site de Roblox",
    nonOfficielDiscord: "Ce n'est pas le vrai site de Discord",
    // Alertes fortes (JAUNE) : le niveau reste jaune, mais le titre est plus clair que « Domaine inconnu »
    // Liste de liens signalés (Phishing.Database) : rouge. « Signalé » ne veut jamais dire « prouvé ».
    signale: "Signalé comme dangereux",
    signaleFichier: "Ce fichier précis a été signalé comme dangereux",
    // Le texte du lien affiche une autre adresse que l'adresse réelle ([texte](adresse))
    adresseAfficheeRouge: "Danger : l'adresse affichée n'est pas l'adresse réelle",
    adresseAfficheeJaune: "Attention : l'adresse affichée n'est pas l'adresse réelle",
    // Vérification complémentaire (VirusTotal) : un résultat jaune peut être aggravé, jamais allégé
    reputationUnJaune: "Attention : un moteur de sécurité signale ce nom de domaine",
    reputationUnRouge: "Danger : un moteur de sécurité signale ce nom de domaine",
    reputationPlusieursJaune: "Attention : plusieurs moteurs de sécurité signalent ce nom de domaine",
    reputationPlusieursRouge: "Plusieurs moteurs de sécurité signalent ce nom de domaine",
    // Idem quand le LIEN COMPLET est comparé (cas normal d'un résultat jaune)
    reputationLienUnJaune: "Attention : un moteur de sécurité signale ce lien",
    reputationLienUnRouge: "Danger : un moteur de sécurité signale ce lien",
    reputationLienPlusieursJaune: "Attention : plusieurs moteurs de sécurité signalent ce lien",
    reputationLienPlusieursRouge: "Plusieurs moteurs de sécurité signalent ce lien",
    // Mot d'appât (Robux, Nitro) dans le chemin d'un domaine non officiel : jaune, alerte plus forte
    alerteAppatChemin: "Attention : ce lien parle de Robux ou de Nitro",
    // Nom de marque + mot de piège dans le chemin d'un domaine non officiel : jaune, alerte forte
    alerteMarqueChemin: "Attention : ce lien parle de Roblox (ou Discord) avec un mot suspect",
    alerteChemin: "Attention : le nom de Roblox (ou Discord) est copié dans ce lien",
    alerteMarque_roblox: "Ce site ne fait pas partie des sites officiels de Roblox que RoShield connaît : son nom contient « Roblox »",
    alerteMarque_rbx: "Ce site ne fait pas partie des sites officiels de Roblox que RoShield connaît : son nom contient « rbx »",
    alerteMarque_robux: "Ce site ne fait pas partie des sites officiels de Roblox que RoShield connaît : son nom contient « Robux »",
    alerteMarque_discord: "Ce site ne fait pas partie des sites officiels de Discord que RoShield connaît : son nom contient « Discord »",
    alerteMarque_nitro: "Ce site ne fait pas partie des sites officiels de Discord que RoShield connaît : son nom contient « Nitro »"
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
    return "Destination cachée : ce lien est raccourci (« " + domaine + " »), on ne voit pas où il mène.";
  },
  http: "Ce lien commence par « http:// » et non « https:// » : la connexion n'est pas chiffrée.",
  imiteSousDomaine: function (officiel, vrai) {
    return "Ce lien imite « " + officiel + " » dans son adresse, mais le vrai domaine est « " + vrai + " ». " +
      "Ce qui compte, c'est la fin du nom, pas le début.";
  },
  imiteDansChemin: "Son vrai domaine est un autre. Ne tape jamais ton mot de passe ou un code sur cette page, et ne partage jamais ton écran.",
  alerteMarque: function (plateforme) {
    return "Les vrais sites officiels de " + plateforme + " sont peu nombreux, et les imitations utilisent souvent ce nom. " +
      "Ne tape jamais ton mot de passe ou un code sur cette page.";
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
  // Question "Que disait le message à propos de ce lien ?" (plateforme = "Roblox" ou "Discord")
  attenduFaux: function (plateforme) {
    return "Le message disait que ce lien était une page " + plateforme + ", mais son vrai domaine est un autre. " +
      "Ne tape jamais ton mot de passe ou un code dessus, et ne partage jamais ton écran.";
  },
  // Petite ligne (sur le vert et le jaune) : le lien cache une autre adresse
  // Fichier envoyé par un utilisateur sur le CDN de Discord (/attachments/) : domaine officiel, mais pas vérifié par Discord
  fichierEnvoye: "Ce fichier a été envoyé par un utilisateur, pas par Discord. Ne l'ouvre pas si tu ne connais pas la personne, et ne lance jamais un fichier envoyé par un inconnu.",
  // Liste de liens signalés (Phishing.Database) : une liste peut se tromper, et un lien peut avoir été nettoyé depuis
  listeHote: "Ce nom de domaine figure dans une liste publique de liens de phishing (Phishing.Database). Une liste peut se tromper, mais mieux vaut ne pas y aller. Ne tape jamais ton mot de passe ou un code, et ne partage jamais ton écran.",
  listeLien: "Ce lien précis figure dans une liste publique de liens de phishing (Phishing.Database). Une liste peut se tromper, mais mieux vaut ne pas l'ouvrir. Ne tape jamais ton mot de passe ou un code, et ne partage jamais ton écran.",
  listeFichier: "Le domaine est bien celui d'un site officiel, mais ce fichier précis figure dans une liste publique de liens de phishing (Phishing.Database). Il a été envoyé par un utilisateur. Ne l'ouvre pas, et ne lance jamais un fichier envoyé par un inconnu.",
  // Forme [texte](adresse) : le texte affiche une adresse, le lien mène ailleurs
  adresseAffichee: function (visible, reel, officiel) {
    return "Le texte du lien affiche « " + visible + " »" + (officiel ? " (un site officiel)" : "") +
      ", mais le lien mène en réalité vers « " + reel + " ». Seule l'adresse réelle compte, pas le texte affiché. " +
      "Ne tape jamais ton mot de passe ou un code sur cette page, et ne partage jamais ton écran.";
  },
  // Infos neutres sur la préparation du lien (elles ne changent pas le niveau)
  infoCaracteres: "On a ignoré des caractères autour du lien (crochets, parenthèses, guillemets...) pour l'analyser.",
  infoDefendue: "Cette adresse était écrite sous une forme « défendue » (hxxp, [.]) : on l'a remise en forme pour l'analyser. Ça ne la rend pas plus dangereuse.",
  infoTexteLien: "Le texte du lien n'est pas une adresse : seule l'adresse réelle, derrière le texte, est analysée.",
  infoAfficheeRemise: "L'adresse affichée contenait des espaces ou des oublis : on l'a remise en forme pour la comparer.",
  // ----- Vérification complémentaire (VirusTotal) -----
  reputationTitreBloc: "Vérification complémentaire (VirusTotal)",
  reputationEnvoye: function (domaine) {
    return "Le nom de domaine « " + domaine + " » est comparé avec VirusTotal (le lien complet n'est pas envoyé).";
  },
  reputationEnCours: "Comparaison en cours…",
  // Affiché SEUL (à la place du résultat jaune) pendant que le petit service répond, 4 secondes au plus
  verificationEnCours: "Vérification en cours…",
  reputationResultat: function (m, total, date) {
    const quand = date ? " (analyse du " + date + ")" : "";
    if (m === 0) return "0 moteur de sécurité sur " + total + " ne signale ce nom de domaine" + quand + ".";
    if (m === 1) return "1 moteur de sécurité sur " + total + " signale ce nom de domaine comme malveillant" + quand + ".";
    return m + " moteurs de sécurité sur " + total + " signalent ce nom de domaine comme malveillant" + quand + ".";
  },
  reputationInconnu: "VirusTotal ne connaît pas ce nom de domaine.",
  // Le lien complet (sans « # ») est envoyé à VirusTotal
  reputationLienEnvoye: function (lien) {
    return "Le lien complet « " + String(lien).replace(/^https:\/\//, "") + " » est comparé avec VirusTotal, qui peut le garder et le partager avec la communauté de sécurité.";
  },
  reputationLienResultat: function (m, total, date) {
    const quand = date ? " (analyse du " + date + ")" : "";
    if (m === 0) return "0 moteur de sécurité sur " + total + " ne signale ce lien" + quand + ".";
    if (m === 1) return "1 moteur de sécurité sur " + total + " signale ce lien comme malveillant" + quand + ".";
    return m + " moteurs de sécurité sur " + total + " signalent ce lien comme malveillant" + quand + ".";
  },
  reputationLienInconnu: "VirusTotal n'a pas encore de résultat pour ce lien.",
  // Deuxième vérification (rien trouvé pour le lien complet) : le nom de domaine seul
  reputationDomaineAussi: function (domaine) {
    return "Le nom de domaine « " + domaine + " » est aussi comparé avec VirusTotal.";
  },
  // L'analyse du lien n'était pas finie après la relecture, et rien n'est signalé
  reputationPremiereFois: "VirusTotal analyse ce lien pour la première fois. Réessaie dans une minute avant de l'ouvrir.",
  reputationLienAucun: "Aucun antivirus ne le signale pour l'instant. Ça ne veut pas dire sûr.",
  reputationAvertissement: "Aucun signalement ne veut pas dire sûr.",
  reputationConseil: "Ne tape jamais ton mot de passe ou un code sur cette page, et ne partage jamais ton écran.",
  reputationIndisponible: "Vérification complémentaire indisponible pour le moment : le résultat ci-dessus reste valable.",
  // Mots d'appât : Robux, Nitro
  appatRobuxNitro: "Ce n'est pas un site officiel et il parle de Robux ou de Nitro. Roblox et Discord ne donnent jamais de Robux ou de Nitro par un autre site. Ne t'y connecte pas.",
  appatDansChemin: "Ce n'est pas un site officiel, et son adresse parle de Robux ou de Nitro. Roblox et Discord ne donnent jamais de Robux ou de Nitro par un autre site. Fais très attention et ne t'y connecte pas.",
  // Marque + mot de piège dans le chemin (login, verify, claim...) : jaune, alerte forte
  marqueEtPiegeDansChemin: "Ce n'est pas un site officiel, mais son adresse parle de Roblox ou de Discord avec un mot comme « login », « verify » ou « claim ». Ne tape jamais ton mot de passe ou un code sur cette page, et ne partage jamais ton écran.",
  // « roblox » / « discord » coupé par des tirets ou des points (ro-blox, dis-cord)
  motCoupe: function (mot, vrai) {
    return "Ce nom de domaine écrit « " + mot + " » coupé par des tirets ou des points, pour ressembler à un vrai site. Le vrai domaine est « " + vrai + " ». C'est une astuce classique de faux site.";
  },
  adresseCachee: "Ce lien contient une autre adresse cachée : il peut t'envoyer ailleurs.",
  inconnu:
    "RoShield ne connaît que les domaines officiels de Roblox et de Discord. Ça ne veut pas dire que ce lien " +
    "est dangereux, mais on ne peut pas le confirmer. Vérifie qui te l'a envoyé et tape l'adresse toi-même si tu as un doute."
};
