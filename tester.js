import { ethers } from "ethers";
import { MEVBundleSubmitter } from "./index.js";

const submitter = new MEVBundleSubmitter({
  bloxrouteAuth: "BloxRoute_Token",
  provider: new ethers.providers.JsonRpcProvider(
    "https://mainnet.chainnodes.org/api_key"
  ),
});

(async () => {
  const response = await submitter.submitToAll({
    bundle: {
      transactions: ["0xmempooltx", "0xraw_tx"],
      blockNumber: BigInt("15000000"),
    },
  });

  console.log(response);
})();
