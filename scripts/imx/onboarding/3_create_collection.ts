import { ImmutableXClient, CreateCollectionsResult } from "@imtbl/imx-sdk";
import { getWalletFromMnemonic, getImmutableXClientFromWallet } from "../common";
import Config, { NETWORK } from "./config";

/**
 * @dev creates a collection for the project
 *
 * @param client ImmutableXClient instance
 * @param projectId ID of the project which will own the collection
 * @param collectionMetadata containing the `contract_address`, `icon_url`,
 * 	`metadata_api_url`, `collection_image_url` and `name` fields
 * @return collection metadata
 */
async function createCollection(
  client: ImmutableXClient,
  projectId: string,
  collectionMetadata: any,
): Promise<CreateCollectionsResult> {
  // Check if project exists
  try {
    await client.getProject({ project_id: parseInt(projectId, 10) });
  } catch (error) {
    console.error(error);
    throw JSON.stringify(error, null, 2);
  }

  // If project exists, create a collection for it
  console.log("Creating collection...");
  let collection: CreateCollectionsResult;
  try {
    collection = await client.createCollection({
      name: collectionMetadata.name,
      contract_address: collectionMetadata.contract_address.toLowerCase(),
      owner_public_key: client.address.toLowerCase(),
      icon_url: collectionMetadata.icon_url,
      metadata_api_url: collectionMetadata.metadata_api_url,
      collection_image_url: collectionMetadata.collection_image_url,
      project_id: parseInt(projectId, 10),
    });
  } catch (error) {
    throw JSON.stringify(error, null, 2);
  }

  console.log("Created collection:");
  console.log(JSON.stringify(collection, null, 2));
  return collection;
}

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
  // Get configuration for network
  const config = Config(NETWORK);

  // Get IMX client instance
  const client = await getImmutableXClientFromWallet(
    getWalletFromMnemonic(NETWORK, config.mnemonic, config.address_index),
    config.IMXClientConfig,
  );

  // Create collection given client, project id, collection name and ERC721 L1 contract address
  await createCollection(client, config.collection.project_id, config.collection);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
