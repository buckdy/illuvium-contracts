import { utils } from "ethers";
import { getImmutableXClient, completeWithdraw } from "./common";
import { NETWORK } from "./onboarding/config";
import Config from "./onboarding/config";
import { ETHTokenType } from "@imtbl/imx-sdk";

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
  // Get configuration for the network
  const config = Config(NETWORK);

  console.log(NETWORK);
  // const wallet = getWallet(network);
  const client = await getImmutableXClient(NETWORK);
  console.log(client.address);

  const token = await client.getAsset({
    address: config.collection.contract_address.toLowerCase(),
    id: "1",
  });

  await completeWithdraw(client, config.collection.contract_address, "1");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {} /*process.exit(0)*/)
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
