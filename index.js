import { ethers, providers, Wallet, BigNumber } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import "./monkey-patches.js";

export class MEVBundleSubmitter {
  static allBuilders = {
    beaver: {
      url: "https://rpc.beaverbuild.org/",
    },
    rsync: {
      url: "https://rsync-builder.xyz/",
    },
    builder0x69: {
      url: "https://builder0x69.io",
    },
    flashbots: {
      url: "https://relay.flashbots.net",
    },
    titan: {
      url: "https://rpc.titanbuilder.xyz/",
    },
    bloxroute: {
      url: "https://mev.api.blxrbdn.com",
    },
    f1b: {
      url: "https://rpc.f1b.io",
    },
    buildai: {
      url: "https://buildai.net/",
    },
    blocknative: {
      url: "https://api.blocknative.com/v1/auction",
    },
    "eth-builder": {
      url: "https://eth-builder.com/",
    },
    "boba-builder": {
      url: "https://boba-builder.com/searcher/bundle",
    },
    payload: {
      url: "https://rpc.payload.de",
    },
    eden: {
      url: "https://api.edennetwork.io/v1/bundle",
    },
    eigenphi: {
      url: "https://builder.eigenphi.io/",
    },
    loki: {
      url: "https://rpc.lokibuilder.xyz/",
    },
  };

  /**
   * Constructs the bundle submitter.
   *
   * @param {object} opts The options.
   * @param {string | undefined} opts.bloxrouteAuth The authentication token for bloxroute. Empty values will skip bloxroute submission.
   * @param {Wallet | undefined} opts.authSigner The signer of the bundles, necessary for some builders. Will default to a random Wallet if empty.
   * @param {providers.BaseProvider} opts.provider A normal ethers Ethereum Mainnet provider.
   */
  constructor({ bloxrouteAuth, authSigner, provider }) {
    this.bloxrouteAuth = bloxrouteAuth;
    this.authSigner = authSigner || Wallet.createRandom();
    this.provider = provider;
  }

  /**
   *
   * @returns {{[key: string]: FlashbotsBundleProvider}}
   */
  async _initBuilders() {
    if (this.flashbotsProviders) {
      return this.flashbotsProviders;
    }

    this.flashbotsProviders = {};

    for (const builder in MEVBundleSubmitter.allBuilders) {
      const { url } = MEVBundleSubmitter.allBuilders[builder];

      this.flashbotsProviders[builder] = await FlashbotsBundleProvider.create(
        this.provider,
        this.authSigner,
        builder !== "bloxroute"
          ? url
          : { url: url, headers: { Authorization: this.bloxrouteAuth } }
      );
    }

    return this.flashbotsProviders;
  }

  /**
   * Submits the given bundle to all (minus exclude) builders. Resolves with all results.
   *
   * @param {object} opts The options
   * @param {string[] | undefined} opts.exclude Which builders to exclude. Accepts keys of the `MEVBundleSubmitter.allBuilders` object. Empty to send to all.
   * @param {{ transactions: string[], blockNumber: BigNumber | BigInt }} opts.bundle Which builders to exclude. Accepts keys of the `MEVBundleSubmitter.allBuilders` object. Empty to send to all.
   * @param {{ [key: string]: { url: string } | FlashbotsBundleProvider } | undefined} opts.customBuilders Custom list of builders to include.
   *
   * @returns {Promise<{ bundleHash: string, results: { [key: string]: { success: boolean, response: object | undefined, error: { reason: string } | undefined } } }>} The results
   */
  async submitToAll({ exclude, bundle, customBuilders }) {
    const baseProviders = await this._initBuilders();

    /**
     * @type {{ [key: string]: FlashbotsBundleProvider }}
     */
    const customProviders = {};
    if (customBuilders) {
      for (const custom in customBuilders) {
        const customBuilder = customBuilders[custom];

        customProviders[custom] =
          customBuilder instanceof FlashbotsBundleProvider
            ? customBuilder
            : FlashbotsBundleProvider.create(
                this.provider,
                this.authSigner,
                customBuilder.url
              );
      }
    }

    const allProviders = {
      ...baseProviders,
      ...customProviders,
    };

    /**
     * @type {Promise<{ key: string, value: { success: boolean, error: { reason: string } | undefined, response: object | undefined } }>[]}
     */
    const promises = [];

    for (const builder in allProviders) {
      const builderProvider = allProviders[builder];

      let initialPromise;
      if (!(exclude || []).includes(builder)) {
        if (builder === "bloxroute") {
          if (this.bloxrouteAuth) {
            initialPromise = builderProvider.blxrSubmitBundle(
              bundle.transactions,
              BigInt(bundle.blockNumber.toString()),
              false,
              true
            );
          }
        } else {
          initialPromise = builderProvider.sendRawBundleCustom(
            bundle.transactions,
            BigInt(bundle.blockNumber.toString())
          );
        }
      }

      if (initialPromise) {
        promises.push(
          initialPromise
            .then((result) => {
              if (result.error) {
                return {
                  key: builder,
                  value: {
                    success: false,
                    error: {
                      reason: `RPC error. Code: ${result.error.code} Message: ${result.error.message}`,
                    },
                  },
                };
              }

              return {
                key: builder,
                value: {
                  success: true,
                  response: result,
                },
              };
            })
            .catch((err) => {
              return {
                key: builder,
                value: {
                  success: false,
                  error: {
                    reason: `Catch Error: ${err}`,
                  },
                },
              };
            })
        );
      }
    }

    return Promise.all(promises).then((allResponses) => {
      let bundleHash;
      const results = {};

      for (const response of allResponses) {
        if (!bundleHash && response.value.response?.bundleHash) {
          bundleHash = response.value.response.bundleHash;
        }

        results[response.key] = response.value;
      }

      return {
        bundleHash: bundleHash,
        results: results,
      };
    });
  }
}
