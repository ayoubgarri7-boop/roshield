/* ==========================================================
   textes-en.js : tous les messages du vérificateur, en ANGLAIS.

   C'est la même structure que textes-fr.js (mêmes clés) : la logique
   de verificateur.js ne change pas, seuls les textes changent.
   La page en/verificateur.html charge ce fichier à la place de textes-fr.js.

   Règles d'écriture :
   - anglais américain, direct, compréhensible par un adolescent
   - apostrophes et guillemets typographiques : ’  “ ”
   - pas d'espace avant ? ! : ;
   - guillemets : la virgule et le point restent DEHORS quand on cite une adresse
     ou un mot technique (“roblox.com”), pour qu'on ne les prenne pas pour une
     partie de l'adresse
   - glossaire : scam, fake, official domain, real domain, shortened link...
   - on ne traduit pas les marques : Roblox, Discord, Robux, Nitro
   ========================================================== */

window.TEXTES_VERIF = {
  // ----- Erreurs de saisie -----
  erreurVide: "Paste a link in the box first, then click “Check”.",
  erreurLong: "That text is too long to be a link. Paste only the link.",
  erreurEspaces: "There are spaces in that text. Paste a single link, with nothing else around it.",
  erreurInvalide: "That doesn’t look like a valid website address. Make sure you copied the whole link.",

  // ----- Les 3 niveaux -----
  titres: {
    vert: "Official domain",
    // Tout ce qui n'est ni officiel ni une imitation évidente : un seul titre
    jaune: "Domain unknown to RoShield",
    rouge: "Danger: probably a fake link. Don’t click it.",
    // Cas particulier : domaine officiel, mais avec un détail à vérifier (http://, @...)
    officielAttention: "Official domain, but check the link",
    // Quand le message disait "c'est une page Roblox / Discord" mais que le domaine réel est un autre (nouveau rouge)
    nonOfficielRoblox: "This isn’t the real Roblox site",
    nonOfficielDiscord: "This isn’t the real Discord site",
    // A non-official site writes “roblox.com” or “discord.gg” in full in its path
    imiteChemin: "Roblox’s (or Discord’s) name is copied into this link"
  },

  // ----- Affichage du domaine -----
  labelDomaine: "Real domain detected",
  aideDomaine: "The real site is the name in white: the part right before the first “/” in the link. Anything written BEFORE it (in gray) doesn’t count.",

  // ----- Messages "domaine officiel... mais reste prudent" -----
  rappelOfficiel:
    "This link goes to an official domain. But be careful: a real domain can still lead to something harmful " +
    "(for example, an official Discord invite to a server run by scammers). " +
    "Never trust a link on its own: if someone promises you free Robux or Nitro, it’s a scam.",
  rappelInvitation:
    "This is a Discord invite link. The link is official, but anyone can create a server and invite people. " +
    "Check who sent it to you, and never open a file that gets shared in that server.",
  rappelFichiers:
    "This domain also hosts files uploaded by users. A file hosted on an official site can still be malware: " +
    "never open a .exe, .scr, .bat, or .zip file from someone you don’t know.",
  officielInfo: function (domaine) {
    return "The domain “" + domaine + "” really does belong to Roblox or Discord, BUT this link has another problem:";
  },

  // ----- Raisons (danger / à vérifier) -----
  protocoleDangereux: function (p) {
    return "This isn’t a website link: it starts with “" + p + ":”. This kind of link can run code. Don’t paste it anywhere, and don’t open it.";
  },
  protocoleInhabituel: function (p) {
    return "This link doesn’t use “http” or “https”, but “" + p + ":”. That’s not a regular website link, so be very careful.";
  },
  arobase: function (vrai, officiel) {
    return "The link contains an “@”. Everything before the “@” is ignored by your browser: it’s a trick to fool you. " +
      "The link really goes to “" + vrai + "”." + (officiel ? "" : " That is not an official domain.");
  },
  adresseIP: "This link uses an IP address (a string of numbers) instead of a website name. Roblox and Discord never send links like that.",
  punycode: "This domain name is encoded (it contains “xn--”). That’s often used to hide letters from another alphabet that look like ours (for example, a Russian “о” instead of an “o”). It’s a classic trick used by fake sites.",
  // Petites lignes d'explication (affichées sous le message principal, en jaune)
  raccourcisseur: function (domaine) {
    return "This is a shortened link (“" + domaine + "”): you can’t see where it goes.";
  },
  http: "This link starts with “http://” instead of “https://”: the connection isn’t encrypted.",
  imiteSousDomaine: function (officiel, vrai) {
    return "This link puts “" + officiel + "” in its address to look real, but the real domain is “" + vrai + "”. " +
      "What counts is the end of the name, not the beginning.";
  },
  imiteDansChemin: "Its real domain is a different one. Never type your password or a code on this page, and never share your screen.",
  ressemble: function (vrai, officiel) {
    return "“" + vrai + "” looks a lot like “" + officiel + "”, but it’s not the same. It looks like a typo made on purpose to trick you.";
  },
  motCle: function (mot, vrai) {
    return "This domain contains the word “" + mot + "”, but it’s not an official domain. The real domain is “" + vrai + "”. Scammers use these words to make you trust them.";
  },
  chiffresLettres: function (mot, vrai) {
    return "This domain imitates the word “" + mot + "” by swapping letters for numbers (like 1 instead of l, or 0 instead of o). The real domain is “" + vrai + "”.";
  },
  partieProche: function (partie, mot, vrai) {
    return "In “" + vrai + "”, the word “" + partie + "” looks a lot like “" + mot + "”. It’s probably a typo made on purpose to trick you.";
  },
  // Question "What did the message say about this link?" (plateforme = "Roblox" ou "Discord")
  attenduFaux: function (plateforme) {
    return "The message said this link was a " + plateforme + " page, but its real domain is a different one. " +
      "Never type your password or a code on it, and never share your screen.";
  },
  // Petite ligne (sur le vert et le jaune) : le lien cache une autre adresse
  adresseCachee: "This link contains another address inside it: it may send you somewhere else.",
  inconnu:
    "RoShield only knows the official domains of Roblox and Discord. That doesn’t mean this link is dangerous, " +
    "but we can’t confirm it. Check who sent it to you, and type the address in yourself if you have any doubt."
};
