# mev-bundle-submitter

[![npm version](https://img.shields.io/npm/v/mev-bundle-submitter.svg?style=flat-square)](https://www.npmjs.org/package/mev-bundle-submitter)

This npm package submits given bundles to all known builders in the Ethereum builder space.

## Installation

Using npm, do the following:

```bash
npm install --save mev-bundle-submitter
```

## Example

You can find a usage guide in `tester.js`. Simply replace the placeholders with your bloxroute token,
the Ethereum Mainnet Json RPC provider with your URL or API key from [Chainnodes](https://www.chainnodes.org/),
your bundle transactions (raw transaction strings) with your own and a current or near future block number.

## Configuration

The only required argument in the constructor is `provider`. So the below is a minimal example:

```JS
import { ethers } from "ethers";
import { MEVBundleSubmitter } from "mev-bundle-submitter";

const submitter = new MEVBundleSubmitter({
  provider: new ethers.providers.JsonRpcProvider(
    "https://mainnet.chainnodes.org/api_key"
  ),
});
```

If the optional parameter `bloxrouteAuth` is set, `submitToAll` will also send to BloXroute.

If the optional parameter `authSigner` is set, it will be used to sign the bundles (instead of a random Wallet).

A full example can be seen below:

```JS
import { ethers, Wallet } from "ethers";
import { MEVBundleSubmitter } from "mev-bundle-submitter";

const submitter = new MEVBundleSubmitter({
  bloxrouteAuth: "BloxRoute_Token",
  provider: new ethers.providers.JsonRpcProvider(
    "https://mainnet.chainnodes.org/api_key"
  ),
  authSigner: new Wallet("0xprivate_key"),
});
```

## Usage

After creating the instance `MEVBundleSubmitter`, you can call `submitToAll` as many times as you wish.

The only required parameter is `bundle`, which includes raw transactions and a block number to submit for.

Optionally you can set `exclude`, to exclude an array of builders, and `customBuilders` to add a list of custom builders.

A full list of included builders can be seen by calling `MEVBundleSubmitter.allBuilders` or checking the `index.js`.

Full example:

```JS
const instanceOfFlashbotsBundleProvider = await FlashbotsBundleProvider.create(...);

const response = await submitter.submitToAll({
  bundle: {
    transactions: ["0xmempooltx", "0xraw_tx"],
    blockNumber: BigInt("15000000"),
  },
  exclude: ["beaver", "rsync"],
  customBuilders: {
    my_custom_builder1: instanceOfFlashbotsBundleProvider,
    my_custom_builder2: { url: "https://a-good-builder.com/bundles" }
  }
});
```
