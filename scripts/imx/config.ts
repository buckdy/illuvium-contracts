// deployed smart contract addresses configuration defines which
// smart contracts require deployment and which are already deployed
// empty address means smart contract requires deployment

// Check if gas oracle multiplier is valid, if not make send warning and set it's value to one
const GAS_ORACLE_MULTIPLIER = parseFloat(process.env.GAS_ORACLE_MULTIPLIER ?? "1");
if (!GAS_ORACLE_MULTIPLIER || GAS_ORACLE_MULTIPLIER < 1) {
  console.warn("`GAS_ORACLE_MULTIPLIER` env must be a number greater than one, setting it to default (1)");
  process.env.GAS_ORACLE_MULTIPLIER = "1";
}

// a collection of all known addresses (smart contracts and external), deployment settings
export = (network: string): any => {
  switch (network) {
    // Mainnet Configuration
    case "mainnet":
      return {
        land_sale_addr: "0x7a47F7707C4b2f2B1dEF04A47cD8681d48eaDEB8",
        land_erc721_addr: "0x9e0d99B864E1Ac12565125c5a82B59adEa5a09Cd",
        migration: {
          from_land_erc721: "",
          to_land_erc721: "",
          from_block: "", // used to restrict snapshot search interval -- reduces computation
          to_block: "", // latest snapshot block
        },
        imx_client_config: {
          public_api_url: "https://api.x.immutable.com/v1",
          stark_contract_address: "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9",
          registration_contract_address: "0x72a06bf2a1CE5e39cBA06c0CAb824960B587d64c",
          gas_limit: "500000",
        },
        new_collection_metadata: {
          // used in the `update_collection_metadata` script
          name: undefined, // new IMX collection name
          description: undefined, // new description for the collection
          icon_url: undefined, // new url for the collection icon
          metadata_api_url: undefined, // new API base url to retrieve the tokens metadata (according to the metadata schema)
          collection_image_url: undefined, // new url for the collection image/banner
        },
      };
    // Ropsten Configuration
    case "ropsten":
      return {
        land_sale_addr: "0x8798357E53bDFcE1A21212bAa1Dc938eB84DfC19",
        land_erc721_addr: "0x7e94bbee789a577cd272c9b7b2fe6b75b6d15557",
        migration: {
          from_land_erc721: "",
          to_land_erc721: "",
          from_block: "", // used to restrict snapshot search interval -- reduces computation
          to_block: "", // latest snapshot block
        },
        imx_client_config: {
          public_api_url: "https://api.ropsten.x.immutable.com/v1",
          stark_contract_address: "0x4527BE8f31E2ebFbEF4fCADDb5a17447B27d2aef",
          registration_contract_address: "0x6C21EC8DE44AE44D0992ec3e2d9f1aBb6207D864",
          gas_limit: "500000",
        },
        new_collection_metadata: {
          // used in the `update_collection_metadata` script
          name: undefined, // new IMX collection name
          description: undefined, // new description for the collection
          icon_url: undefined, // new url for the collection icon
          metadata_api_url: "https://api.dev-illuvium-game.io/gamedata/illuvidex/land/metadata", // new API base url to retrieve the tokens metadata (according to the metadata schema)
          collection_image_url: undefined, // new url for the collection image/banner
        },
      };
    // any other network is not supported
    default:
      throw "unknown network " + network;
  }
};
