function getXpRequirement(level) {
  if (level <= 0) {
    return 0;
  }
  const xpToReachLevel1 = 1000;
  const xpToReachLevel10 = xpToReachLevel1 + 9 * 1000;


  const xpToReachLevel20 = xpToReachLevel10 + (10 * 3000);
  const xpToReachLevel30 = xpToReachLevel20 + (10 * 9000);
  const xpToReachLevel40 = xpToReachLevel30 + (10 * 27000);
  const xpToReachLevel50 = xpToReachLevel40 + (10 * 81000);
  const xpToReachLevel60 = xpToReachLevel50 + (10 * 243000);


  let xpRequired = 0;

  if (level === 1) {
      xpRequired = xpToReachLevel1;
  } else if (level <= 10) {
    xpRequired = xpToReachLevel1 + (level - 1) * 1000;
  } else if (level <= 20) {
    xpRequired = xpToReachLevel10 + (level - 10) * 3000;
  } else if (level <= 30) {
    xpRequired = xpToReachLevel20 + (level - 20) * 9000;
  } else if (level <= 40) {
    xpRequired = xpToReachLevel30 + (level - 30) * 27000;
  } else if (level <= 50) {
    xpRequired = xpToReachLevel40 + (level - 40) * 81000;
  } else if (level <= 60) {
    xpRequired = xpToReachLevel60 + (level - 60) * 243000;
  }

  return xpRequired;
}

// Calculate XP per 5 hours for voice activity
function getVoiceXpPer5Hours() {
  return 1000;
}

// Calculate XP per message character
function getMessageXp(message) {
  // 1 XP per character
  return message.length;
}

module.exports = {
  getXpRequirement,
  getVoiceXpPer5Hours,
  getMessageXp
};