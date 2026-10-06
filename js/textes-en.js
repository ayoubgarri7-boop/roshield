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
    // Strong warnings (YELLOW): the level stays yellow, but the title is clearer than “Unknown domain”
    // List of reported links (Phishing.Database): red. “Reported” never means “proven”.
    signale: "Reported as dangerous",
    signaleFichier: "This specific file was reported as dangerous",
    // The link text shows a different address than the real one ([text](address))
    adresseAfficheeRouge: "Danger: the displayed address is not the real address",
    adresseAfficheeJaune: "Warning: the displayed address is not the real address",
    // Additional check (VirusTotal): a yellow result can be made worse, never milder
    reputationUnJaune: "Warning: one security engine flags this domain name",
    reputationUnRouge: "Danger: one security engine flags this domain name",
    reputationPlusieursJaune: "Warning: several security engines flag this domain name",
    reputationPlusieursRouge: "Several security engines flag this domain name",
    // Same for a SHORTENED link (the full link is compared, not just the domain name)
    reputationLienUnJaune: "Warning: one security engine flags this shortened link",
    reputationLienUnRouge: "Danger: one security engine flags this shortened link",
    reputationLienPlusieursJaune: "Warning: several security engines flag this shortened link",
    reputationLienPlusieursRouge: "Several security engines flag this shortened link",
    // Bait word (Robux, Nitro) in the path of a non-official domain: yellow, stronger warning
    alerteAppatChemin: "Warning: this link talks about Robux or Nitro",
    // Brand name + trap word in the path of a non-official domain: yellow, strong warning
    alerteMarqueChemin: "Warning: this link talks about Roblox (or Discord) with a suspicious word",
    alerteChemin: "Warning: Roblox’s (or Discord’s) name is copied into this link",
    alerteMarque_roblox: "This isn’t one of the official Roblox sites that RoShield knows: its name contains “Roblox”",
    alerteMarque_rbx: "This isn’t one of the official Roblox sites that RoShield knows: its name contains “rbx”",
    alerteMarque_robux: "This isn’t one of the official Roblox sites that RoShield knows: its name contains “Robux”",
    alerteMarque_discord: "This isn’t one of the official Discord sites that RoShield knows: its name contains “Discord”",
    alerteMarque_nitro: "This isn’t one of the official Discord sites that RoShield knows: its name contains “Nitro”"
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
    return "Hidden destination: this is a shortened link (“" + domaine + "”), you can’t see where it goes.";
  },
  http: "This link starts with “http://” instead of “https://”: the connection isn’t encrypted.",
  imiteSousDomaine: function (officiel, vrai) {
    return "This link puts “" + officiel + "” in its address to look real, but the real domain is “" + vrai + "”. " +
      "What counts is the end of the name, not the beginning.";
  },
  imiteDansChemin: "Its real domain is a different one. Never type your password or a code on this page, and never share your screen.",
  alerteMarque: function (plateforme) {
    return "There are only a few real official " + plateforme + " sites, and imitations often use this name. " +
      "Never type your password or a code on this page.";
  },
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
  // File sent by a user on Discord's CDN (/attachments/): official domain, but not checked by Discord
  fichierEnvoye: "This file was sent by a user, not by Discord. Don’t open it if you don’t know the person, and never run a file sent by a stranger.",
  // List of reported links (Phishing.Database): a list can be wrong, and a link may have been cleaned up since
  listeHote: "This domain name appears in a public list of phishing links (Phishing.Database). A list can be wrong, but it’s better not to go there. Never type your password or a code, and never share your screen.",
  listeLien: "This specific link appears in a public list of phishing links (Phishing.Database). A list can be wrong, but it’s better not to open it. Never type your password or a code, and never share your screen.",
  listeFichier: "The domain really belongs to an official site, but this specific file appears in a public list of phishing links (Phishing.Database). It was sent by a user. Don’t open it, and never run a file sent by a stranger.",
  // [text](address) form: the text shows one address, the link goes somewhere else
  adresseAffichee: function (visible, reel, officiel) {
    return "The link text shows “" + visible + "”" + (officiel ? " (an official site)" : "") +
      ", but the link really goes to “" + reel + "”. Only the real address counts, not the displayed text. " +
      "Never type your password or a code on this page, and never share your screen.";
  },
  // Neutral info about how the link was prepared (they don't change the level)
  infoCaracteres: "We ignored some characters around the link (brackets, parentheses, quotes...) to check it.",
  infoDefendue: "This address was written in a “defanged” form (hxxp, [.]): we put it back in shape to check it. That doesn’t make it more dangerous.",
  infoTexteLien: "The link text is not an address: only the real address, behind the text, is checked.",
  infoAfficheeRemise: "The displayed address had spaces or slips: we put it back in shape to compare it.",
  // ----- Additional check (VirusTotal) -----
  reputationTitreBloc: "Additional check (VirusTotal)",
  reputationEnvoye: function (domaine) {
    return "The domain name “" + domaine + "” is being compared with VirusTotal (the full link is not sent).";
  },
  reputationEnCours: "Comparing…",
  reputationResultat: function (m, total, date) {
    const quand = date ? " (analysis of " + date + ")" : "";
    if (m === 0) return "0 security engines out of " + total + " flag this domain name" + quand + ".";
    if (m === 1) return "1 security engine out of " + total + " flags this domain name as malicious" + quand + ".";
    return m + " security engines out of " + total + " flag this domain name as malicious" + quand + ".";
  },
  reputationInconnu: "VirusTotal doesn’t know this domain name.",
  // SHORTENED link: the full link (without “#”) is sent, because the site name alone doesn’t say where it leads
  reputationLienEnvoye: function (lien) {
    return "The full link “" + String(lien).replace(/^https:\/\//, "") + "” is being compared with VirusTotal, because the site name alone doesn’t say where it leads. VirusTotal may keep this address and share it with the security community.";
  },
  reputationLienResultat: function (m, total, date) {
    const quand = date ? " (analysis of " + date + ")" : "";
    if (m === 0) return "0 security engines out of " + total + " flag this link" + quand + ".";
    if (m === 1) return "1 security engine out of " + total + " flags this link as malicious" + quand + ".";
    return m + " security engines out of " + total + " flag this link as malicious" + quand + ".";
  },
  reputationLienInconnu: "VirusTotal has no result for this link yet.",
  reputationLienAucun: "No antivirus flags it for now. That doesn’t mean it’s safe.",
  reputationAvertissement: "No reports doesn’t mean safe.",
  reputationConseil: "Never type your password or a code on this page, and never share your screen.",
  reputationIndisponible: "Additional check unavailable right now: the result above is still valid.",
  // Bait words: Robux, Nitro
  appatRobuxNitro: "This is not an official site and it talks about Robux or Nitro. Roblox and Discord never give out Robux or Nitro through another site. Don’t log in there.",
  appatDansChemin: "This is not an official site, and its address talks about Robux or Nitro. Roblox and Discord never give out Robux or Nitro through another site. Be very careful and don’t log in there.",
  // Brand + trap word in the path (login, verify, claim...): yellow, strong warning
  marqueEtPiegeDansChemin: "This is not an official site, but its address talks about Roblox or Discord with a word like “login”, “verify” or “claim”. Never type your password or a code on this page, and never share your screen.",
  // “roblox” / “discord” split by hyphens or dots (ro-blox, dis-cord)
  motCoupe: function (mot, vrai) {
    return "This domain name spells “" + mot + "” split by hyphens or dots, to look like a real site. The real domain is “" + vrai + "”. It’s a classic fake-site trick.";
  },
  adresseCachee: "This link contains another address inside it: it may send you somewhere else.",
  inconnu:
    "RoShield only knows the official domains of Roblox and Discord. That doesn’t mean this link is dangerous, " +
    "but we can’t confirm it. Check who sent it to you, and type the address in yourself if you have any doubt."
};
