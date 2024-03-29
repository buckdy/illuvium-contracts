import { network } from "hardhat";
import { ImmutableXClient } from "@imtbl/imx-sdk";
// Get IMX common functions
import { get_wallet, get_imx_client_from_wallet } from "../common";

// Onboarding config file
import Config from "./config";

// using logger instead of console to allow output control
import log, { LogLevelDesc } from "loglevel";
log.setLevel(<LogLevelDesc>process.env.LOG_LEVEL ?? "info");

/**
 * @dev Registers new IMX Client for a user
 *
 * @param client already configured ImmutableXClient instance
 */
async function register_user(client: ImmutableXClient) {
  log.info("Registering user...");
  try {
    await client.getUser({
      user: client.address.toLowerCase(),
    });
    log.info(`User ${client.address.toLowerCase()} already registered`);
  } catch {
    try {
      await client.registerImx({
        etherKey: client.address.toLowerCase(),
        starkPublicKey: client.starkPublicKey.toLowerCase(),
      });
      log.info(`User ${client.address.toLowerCase()} registered successfully!`);
    } catch (error) {
      console.log(error);
      throw JSON.stringify(error, null, 2);
    }
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

  // Register user for given `wallet` and `IMXClientConfig`
  await register_user(client);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
