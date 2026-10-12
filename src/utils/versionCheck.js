export const parseVersion = (v) => {
  if (!v) return { semver: [0, 0, 0], build: 0 };
  const str = String(v).trim();

  // Format: 6(1.0.5)
  const parenMatch = str.match(/^(\d+)\s*\(([\d.]+)\)$/);
  if (parenMatch) {
    return {
      build: parseInt(parenMatch[1], 10) || 0,
      semver: parenMatch[2].split('.').map(Number)
    };
  }

  // Format: 1.0.5+6 or 1.0.5(6)
  const plusMatch = str.match(/^([\d.]+)(?:[+(\s]+(\d+)\)?)?$/);
  if (plusMatch) {
    return {
      semver: plusMatch[1].split('.').map(Number),
      build: plusMatch[2] ? parseInt(plusMatch[2], 10) : 0
    };
  }

  // General fallback
  const digits = str.replace(/[^0-9.]/g, '').split('.').map(Number);
  return { semver: digits, build: 0 };
};

export const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  if (String(v1).trim() === String(v2).trim()) return 0;

  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  // Compare semantic version parts first
  const maxLen = Math.max(p1.semver.length, p2.semver.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1.semver[i] || 0;
    const num2 = p2.semver[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  // If semantic version is identical, compare build number (if both have build > 0)
  if (p1.build > 0 && p2.build > 0) {
    if (p1.build > p2.build) return 1;
    if (p1.build < p2.build) return -1;
  }

  return 0;
};

export const getUpdateAction = (appVersion, config) => {
  if (!config || !appVersion || config.is_active === false) return null;

  // Check against min_required_version
  if (config.min_required_version && compareVersions(appVersion, config.min_required_version) < 0 && config.force_update) {
    return {
      update_required: true,
      force_update: true,
      message: "A critical update is required. Please update the app to continue.",
      playstore_url: config.playstore_url
    };
  }

  // Check against latest_version
  if (config.latest_version && compareVersions(appVersion, config.latest_version) < 0) {
    return {
      update_required: true,
      force_update: false,
      message: "A new version of the app is available. Please update.",
      playstore_url: config.playstore_url
    };
  }

  // No update needed
  return {
    update_required: false,
    message: "You are on the latest version."
  };
};
