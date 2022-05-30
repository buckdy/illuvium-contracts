import { ImmutableXClient } from "@imtbl/imx-sdk";
import { Wallet } from "ethers";
import { getImmutableXClientFromWallet, getWalletFromMnemonic } from "../common";
import Config, { NETWORK } from "./config";

/**
 * @dev Registers new IMX Client for a user
 *
 * @param client already configured ImmutableXClient instance
 */
export const registerUser = async (client: ImmutableXClient, wallet: Wallet) => {
  console.log("Registering user...");
  console.log(client.address.toLowerCase());
  try {
    await client.getUser({
      user: client.address.toLowerCase(),
    });
    console.log(`User ${client.address.toLowerCase()} already registered`);
  } catch (err) {
    console.log(err);
    try {
      await client.registerImx({
        etherKey: wallet.publicKey.toLowerCase(),
        starkPublicKey: client.starkPublicKey.toLowerCase(),
      });
      console.log(`User ${client.address.toLowerCase()} registered successfully!`);
    } catch (error) {
      console.log(error);
      throw JSON.stringify(error, null, 2);
    }
  }
};

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
  // Get configuration for network
  const config = Config(NETWORK);

  const wallet = getWalletFromMnemonic(NETWORK, config.mnemonic, config.address_index);
  // Get IMX client instance
  const client = await getImmutableXClientFromWallet(wallet, config.IMXClientConfig);

  // Register user for given `wallet` and `IMXClientConfig`
  await registerUser(client, wallet);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
