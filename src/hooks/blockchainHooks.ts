export const useBlockchainHooks = () => {
  const onFirstTrade = async (userId: string, analystId: string) => {
    console.log("[HOOK] onFirstTrade", { userId, analystId });
    // TODO: await contract.registerReferral(userId, analystId)
  };

  const onClaimRewards = async (analystId: string, amount: number) => {
    console.log("[HOOK] onClaimRewards", { analystId, amount });
    // TODO: await contract.claimRewards(analystId, amount)
  };

  const onRegisterReferral = async (
    analystWallet: string,
    referralCode: string
  ) => {
    console.log("[HOOK] onRegisterReferral", {
      analystWallet,
      referralCode,
    });
    // TODO: await contract.registerAnalyst(analystWallet)
  };

  const onBatchSettle = async (pendingRewards: Map<string, number>) => {
    const total = Array.from(pendingRewards.values()).reduce(
      (a, b) => a + b,
      0
    );
    if (total < 50) return;
    console.log("[HOOK] onBatchSettle — ready for onchain", total);
    // TODO: await contract.batchSettle(pendingRewards)
  };

  return {
    onFirstTrade,
    onClaimRewards,
    onRegisterReferral,
    onBatchSettle,
  };
};
