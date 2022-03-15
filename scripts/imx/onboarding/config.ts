import "dotenv/config";
import IMXConfig from "../config";
import collectionMetadata from "./metadata.json";

// General configuration object
// Configuration for all the scripts and the only one necessary for -- 1_register_user.js
const generalConfig = {
  mnemonic: process.env.ONBOARDING_MNEMONIC ?? "", // User wallet mnemonic for onboarding
  address_index: 0, // Address index of the wallet to register on IMX, as defined in BIP-44
};

// Relative configuration object
// Configuration for new IMX project -- 2_create_project.js
const projectConfig = {
  project_name: "test-illuvitar", // Name of the project
  company_name: "illuvium.io", // Name of the company in charge of the project
  contact_email: "dmitry.yakovlevich@illuvium.io", // Contact email of the project "owner"
};

// Relative configuration object
// Configuration for new IMX collection -- 3_create_collection.js
const collectionConfig = {
  project_id: "24975", // Project ID where the collection will be created
  name: "AccessoryIlluvitar", // Name of the collection
  contract_address: "0xA5F4E026D67898A1db90B15AaC5ceaCa2E07a508", // Address of the ERC721 contract on L1
  icon_url: "", // URL or base64 encoded SVG image for the collection icon -- optional
  metadata_api_url: "", // The metadata API base URL (used to feed each token with unique metadata) -- optional
  collection_image_url: "", // URL or base64 encoded SVG image for the collection banner/tile -- optional
};

// Relative configuration object
// Metadata schema for the IMX collection -- 4_add_metadata_schema.js
const collectionMetadataSchema = {
  contract_address: "0xA5F4E026D67898A1db90B15AaC5ceaCa2E07a508",
  metadata: collectionMetadata,
};

// a collection of all configurations necessary for the onboarding scripts
const Config = (network: string) => {
  return {
    ...generalConfig,
    IMXClientConfig: IMXConfig(network).IMXClientConfig,
    project: projectConfig,
    collection: collectionConfig,
    collectionMetadata: collectionMetadataSchema,
  };
};

export const NETWORK = "ropsten";

export default Config;
