import { ethers } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";

/**
 *
 * @param {Array<string>} signedBundledTransactions
 * @param {number} targetBlockNumber
 * @param {boolean} frontrunning
 * @param {boolean} enable_backrunme
 * @param {FlashbotsOptions | undefined} opts
 * @returns {Promise<object> }
 */
FlashbotsBundleProvider.prototype.blxrSubmitBundle = async function (
  signedBundledTransactions,
  targetBlockNumber,
  frontrunning,
  enable_backrunme,
  opts
) {
  const params = {
    transaction: signedBundledTransactions.map((el) => {
      return el.replace(/^(0x)/, "");
    }),
    block_number: `0x${targetBlockNumber.toString(16)}`,
    min_timestamp: opts?.minTimestamp,
    max_timestamp: opts?.maxTimestamp,
    reverting_hashes: opts?.revertingTxHashes,
    uuid: opts?.replacementUuid,
    frontrunning: frontrunning,
    enable_backrunme: enable_backrunme,
    mev_builders: {
      all: "",
    },
  };

  const request = JSON.stringify(
    this.prepareRelayRequest("blxr_submit_bundle", params)
  );
  const response = await this.request(request);
  if (response.error !== undefined && response.error !== null) {
    return {
      error: {
        message: response.error.message,
        code: response.error.code,
      },
    };
  }

  const bundleTransactions = signedBundledTransactions.map(
    (signedTransaction) => {
      const transactionDetails =
        ethers.utils.parseTransaction(signedTransaction);
      return {
        signedTransaction,
        hash: ethers.utils.keccak256(signedTransaction),
        account: transactionDetails.from || "0x0",
        nonce: transactionDetails.nonce,
      };
    }
  );

  return {
    bundleTransactions,
    wait: () =>
      this.waitForBundleInclusion(
        bundleTransactions,
        targetBlockNumber,
        TIMEOUT_MS
      ),
    simulate: () =>
      this.simulate(
        bundleTransactions.map((tx) => tx.signedTransaction),
        targetBlockNumber,
        undefined,
        opts?.minTimestamp
      ),
    receipts: () => this.fetchReceipts(bundleTransactions),
    bundleHash: response.result?.bundleHash,
  };
};

/**
 *
 * @param {Array<string>} signedBundledTransactions
 * @param {number} targetBlockNumber
 * @param {FlashbotsOptions | undefined} opts
 * @returns
 */
FlashbotsBundleProvider.prototype.sendRawBundleCustom = async function (
  signedBundledTransactions,
  targetBlockNumber,
  opts
) {
  const params = {
    txs: signedBundledTransactions,
    blockNumber: `0x${targetBlockNumber.toString(16)}`,
    minTimestamp: opts?.minTimestamp,
    maxTimestamp: opts?.maxTimestamp,
    revertingTxHashes: opts?.revertingTxHashes,
    replacementUuid: opts?.replacementUuid,
  };

  const request = JSON.stringify(
    this.prepareRelayRequest("eth_sendBundle", [params])
  );
  const response = await this.request(request);
  if (response.error !== undefined && response.error !== null) {
    return {
      error: {
        message: response.error.message,
        code: response.error.code,
      },
    };
  }

  const bundleTransactions = signedBundledTransactions.map(
    (signedTransaction) => {
      const transactionDetails =
        ethers.utils.parseTransaction(signedTransaction);
      return {
        signedTransaction,
        hash: ethers.utils.keccak256(signedTransaction),
        account: transactionDetails.from || "0x0",
        nonce: transactionDetails.nonce,
      };
    }
  );

  return {
    bundleTransactions,
    wait: () =>
      this.waitForBundleInclusion(
        bundleTransactions,
        targetBlockNumber,
        TIMEOUT_MS
      ),
    simulate: () =>
      this.simulate(
        bundleTransactions.map((tx) => tx.signedTransaction),
        targetBlockNumber,
        undefined,
        opts?.minTimestamp
      ),
    receipts: () => this.fetchReceipts(bundleTransactions),
    bundleHash: response.result?.bundleHash,
  };
};
