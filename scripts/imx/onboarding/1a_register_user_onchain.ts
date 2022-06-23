import { network } from "hardhat";
import { ImmutableXClient } from "@imtbl/imx-sdk";
// Get IMX common functions
import { get_wallet, get_imx_client_from_wallet } from "../common";

// Onboarding config file
import Config from "./config";

// using logger instead of console to allow output control
import log, { LogLevelDesc } from "loglevel";
log.setLevel(<LogLevelDesc>process.env.LOG_LEVEL ?? "info");

async function register_user_onchain(client: ImmutableXClient) {
  log.info("Registering user onchain...");

  // get user signature
  let user_signature;
  let onchain_user;
  try {
    user_signature = await client.getSignableRegistration({
      etherKey: client.address,
      starkPublicKey: client.starkPublicKey,
    });
    log.info(`User signature: ${user_signature.operator_signature}`);

    onchain_user = await client.registerStark({
      etherKey: client.address,
      starkPublicKey: client.starkPublicKey,
      operatorSignature: user_signature.operator_signature,
    });
    log.info(`Onchain user registered: ${onchain_user}`);
  } catch (error) {
    console.log(error);
    throw JSON.stringify(error, null, 2);
  }
}

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
  // Get configuration for network
  const config = Config(network.name);

  // Get IMX client instance
  const client = await get_imx_client_from_wallet(get_wallet(network.name), config.imx_client_config);

  // Register user onchain for given `wallet` and `IMXClientConfig`
  await register_user_onchain(client);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
