export let latestAppUpdate = {
  isUpdateAvailable: false,
  title: "",
  version: "",
  type: "",
  releaseNotes: "",
  playStoreUrl: "",
  publishedAt: null
};

export const setLatestAppUpdate = (updateData) => {
  latestAppUpdate = { ...latestAppUpdate, ...updateData };
};

