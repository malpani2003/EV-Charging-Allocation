const cron = require("node-cron");
const { expireAllocations } = require("../services/allocation.service");

const EXPIRY_CRON_SCHEDULE = "*/1 * * * *";

let isRunning = false;

const runExpiryJob = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    await expireAllocations();
  } catch (error) {
    // swallow: a failed tick should not crash the process; next tick retries
  } finally {
    isRunning = false;
  }
};

const startAllocationExpiryJob = () => {
  cron.schedule(EXPIRY_CRON_SCHEDULE, runExpiryJob);
};

module.exports = startAllocationExpiryJob;
