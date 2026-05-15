function rewardFor(status) {
  if (status === "present") return 1;
  if (status === "late") return 0.5;
  return 0;
}

module.exports = { rewardFor };
