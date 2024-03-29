import { network } from "hardhat";

// types
import { ImmutableXClient, CreateCollectionsResult } from "@imtbl/imx-sdk";
import { CollectionConfig } from "../types";
import { Wallet } from "ethers";
// Get IMX common functions
import { get_wallet, get_imx_client_from_wallet } from "../common";

// Onboarding config file
import Config from "./config";

// using logger instead of console to allow output control
import log, { LogLevelDesc } from "loglevel";
log.setLevel(<LogLevelDesc>process.env.LOG_LEVEL ?? "info");

/**
 * @dev creates a collection for the project
 *
 * @param client_wallet the ethers wallet of the client who initialised the IMXClient
 * @param client ImmutableXClient instance
 * @param project_id ID of the project which will own the collection
 * @param collection_metadata containing the `contract_address`, `icon_url`,
 * 	`metadata_api_url`, `collection_image_url` and `name` fields
 * @return collection metadata
 */
async function create_collection(
  client_wallet: Wallet,
  client: ImmutableXClient,
  project_id: string,
  collection_metadata: CollectionConfig,
): Promise<CreateCollectionsResult> {
  // Check if project exists
  try {
    await client.getProject({ project_id: parseInt(project_id, 10) });
  } catch (error) {
    log.error(error);
    throw JSON.stringify(error, null, 2);
  }

  // If project exists, create a collection for it
  log.info("Creating collection...");
  let collection;
  try {
    collection = await client.createCollection({
      name: collection_metadata.name,
      description: collection_metadata.description,
      contract_address: collection_metadata.contract_address.toLowerCase(),
      owner_public_key: client_wallet._signingKey().publicKey,
      icon_url: collection_metadata.icon_url,
      metadata_api_url: collection_metadata.metadata_api_url,
      collection_image_url: collection_metadata.collection_image_url,
      project_id: parseInt(project_id, 10),
    });
  } catch (error) {
    throw JSON.stringify(error, null, 2);
  }

  log.info("Created collection:");
  log.info(JSON.stringify(collection, null, 2));
  return collection;
}

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
  // Get configuration for network
  const config = Config(network.name);

  // Get IMX client instance
  const client_wallet = get_wallet(network.name);
  const client = await get_imx_client_from_wallet(client_wallet, config.imx_client_config);

  // Create collection given client, project id, collection name and ERC721 L1 contract address
  await create_collection(client_wallet, client, config.collection.project_id, config.collection);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
