export let isMaintenanceMode = false;

export const setMaintenanceMode = (status) => {
  isMaintenanceMode = Boolean(status);
};
