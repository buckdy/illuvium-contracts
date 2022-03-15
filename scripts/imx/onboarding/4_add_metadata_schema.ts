import { ImmutableXClient, AddMetadataSchemaToCollectionResult } from "@imtbl/imx-sdk";
import { getWalletFromMnemonic, getImmutableXClientFromWallet } from "../common";
import Config, { NETWORK } from "./config";

/**
 * @dev adds metadata schema for the collection
 *
 * @param collectionMetadata metadata to add to the collection
 * @return collection metadata
 */
async function addMetadataSchema(
  client: ImmutableXClient,
  contractAddress: string,
  collectionMetadata: any,
): Promise<AddMetadataSchemaToCollectionResult> {
  // Check if collection exists
  try {
    await client.getCollection({
      address: contractAddress.toLowerCase(),
    });
  } catch (error) {
    throw JSON.stringify(error, null, 2);
  }

  // If collection exist, modify it's metadata schema
  const result: AddMetadataSchemaToCollectionResult = await client.addMetadataSchemaToCollection(
    contractAddress.toLowerCase(),
    {
      metadata: collectionMetadata,
    },
  );

  console.log(`Added metadata schema to collection: ${contractAddress.toLowerCase()}`);
  console.log(JSON.stringify(result, null, 2));
  return result;
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

  // Add metadata for the collection with the given contract address
  console.log(
    await addMetadataSchema(client, config.collectionMetadata.contract_address, config.collectionMetadata.metadata),
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
