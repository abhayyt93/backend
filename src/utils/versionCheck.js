export const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const cleanV1 = String(v1).replace(/[^0-9.]/g, '');
  const cleanV2 = String(v2).replace(/[^0-9.]/g, '');
  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export const getUpdateAction = (appVersion, config) => {
  if (!config || !appVersion) return null;

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
