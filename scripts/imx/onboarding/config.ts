// Configuration for the onboarding scripts

// General config file for IMX scripts
import imx_config from "../config";

// Get types
import {
  MetadataSchema,
  ProjectConfig,
  CollectionConfig,
  CollectionMetadataSchema,
  OnboardingScriptsConfig,
} from "../types";

// Import collection metadata
import portrait_metadata_schema from "./portrait_metadata_schema.json";
import accessory_metadata_schema from "./accessory_metadata_schema.json";

// The configuration for about the wallet address is derived from "hardhat.config.js"
// In order to register a new user, just provide the mnemonic (or private key)
// for the correct network, MNEMONIC3 or P_KEY3 for ropsten,
// MNEMONIC1 or P_KEY1 for mainnet -- 1_register_user.js
// The same address will be used to execute the rest of the onboarding scripts

// Relative configuration object
// Configuration for new IMX project -- 2_create_project.js
const project_config: ProjectConfig = {
  project_name: "PROJECT_NAME", // Name of the project
  company_name: "COMPANY_NAME", // Name of the company in charge of the project
  contact_email: "CONTACT_EMAIL", // Contact email of the project "owner"
};

// Relative configuration object
// Configuration for new IMX collection -- 3_create_collection.js
const collection_config: CollectionConfig = {
  project_id: "PROJECT_ID", // Project ID where the collection will be created
  name: "COLLECTION_NAME", // Name of the collection
  contract_address: "COLLECTION_ADDRESS", // Address of the ERC721 contract on L1
  icon_url: "", // URL or base64 encoded SVG image for the collection icon -- optional
  metadata_api_url: "", // The metadata API base URL (used to feed each token with unique metadata) -- optional
  collection_image_url: "", // URL or base64 encoded SVG image for the collection banner/tile -- optional
};

// Relative configuration object
// Metadata schema for the IMX collection -- 4_add_metadata_schema.js
const collection_metadata_schema: CollectionMetadataSchema = {
  contract_address: "COLLECTION_ADDRESS",
  portrait: portrait_metadata_schema as MetadataSchema[],
  accessory: accessory_metadata_schema as MetadataSchema[],
};

// a collection of all configurations necessary for the onboarding scripts
export = (network: string): OnboardingScriptsConfig => {
  return {
    imx_client_config: imx_config(network).imx_client_config,
    project: project_config,
    collection: collection_config,
    collection_metadata_schema,
  };
};
