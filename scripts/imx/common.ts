import { ImmutableXClient, ImmutableMethodResults } from "@imtbl/imx-sdk";
import { providers, Wallet, Signer } from "ethers";
import { Minter__factory, Minter } from "../../typechain";
import "dotenv/config";
import Config from "./config";

/**
 * @dev Configure Infura provider based on the network
 *
 * @param network the network name
 * @return instance of InfuraProvider
 */
export const getProvider = (network: string): providers.Provider => {
  return new providers.InfuraProvider(network, process.env.INFURA_API_KEY);
};

/**
 * @dev Get wallet from mnemonic
 *
 * @param network name of the network
 * @param mnemonic mnemonic to generate the HDWallet from
 * @param n address index as defined in BIP-44 spec
 * @return ethers wallet instance
 */
export const getWalletFromMnemonic = (network: string, mnemonic: string, n = 0): Wallet => {
  const provider = getProvider(network);

  return Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${n}`).connect(provider);
};

/**
 * @dev Gets wallet from provided mnemonic provided for the network
 *
 * @param network name of the network
 * @param n address index as defined in BIP-44 spec
 * @return ethersproject wallet instance
 */
export const getWallet = (network: string, n = 0): Wallet => {
  const mnemonic = network === "ropsten" ? process.env.ONBOARDING_MNEMONIC : process.env.ONBOARDING_MNEMONIC;

  return getWalletFromMnemonic(network, mnemonic ?? "", n);
};

/**
 * @dev Gets an instance of the IMX client given configuration for the network
 *
 * @param wallet ethersproject wallet instance
 * @param IMXClientConfig configuration object for ImmutableXClient
 * @return Instance of IMX client
 */
export const getImmutableXClientFromWallet = (wallet: Wallet, IMXClientConfig: any): Promise<ImmutableXClient> => {
  return ImmutableXClient.build({
    ...IMXClientConfig,
    signer: wallet,
  });
};

/**
 * @dev Gets an instance of the IMX client given configuration for the network
 *
 * @param network name of the network ("ropsten" or "mainnet")
 * @return Instance of IMX client
 */
export const getImmutableXClient = (network: string): Promise<ImmutableXClient> => {
  const config = Config(network);

  return getImmutableXClientFromWallet(getWallet(network), config.IMXClientConfig);
};

/**
 * @dev Instantiate the Minter contract
 *
 * @param network name of the network ("ropsten" or "mainnet")
 * @return Minter instance
 */
export const getMinterContract = async (network: string): Promise<Minter> => {
  const config = Config(network);
  return new Minter__factory(getWallet(network) as Signer).attach(config.minter);
};

/**
 * @dev Mints an NFT on L2 (IMX)
 *
 * @param client ImmutableXClient -- should be the owner of the assetAddress contract
 * @param assetAddress address of the asset to mint
 * @param to address of the owner of the address to be minted
 * @param tokenId ID of the token
 * @param blueprint token metadata
 * @return the mint result metadata or null if minting fails
 */
export const mintL2 = async (
  client: ImmutableXClient,
  assetAddress: string,
  to: string,
  tokenId: string,
  blueprint: string,
): Promise<ImmutableMethodResults.ImmutableOffchainMintV2Results> => {
  // a token to mint - plotStorePack should be a string representation of uint256 in decimal format
  const token = {
    id: tokenId.toString(),
    // note: blueprint cannot be empty
    blueprint, // This will come in the mintingBlob to the contract mintFor function as {tokenId}:{plotStorePack}
  };

  console.log("Minting on L2...");
  const mintResults = await client.mintV2([
    {
      users: [
        {
          etherKey: to.toLowerCase(),
          tokens: [token],
        },
      ],
      contractAddress: assetAddress.toLowerCase(),
    },
  ]);
  console.log(`Minting of tokenId ${tokenId} of collection ${assetAddress.toLowerCase()} successful on L2`);

  return mintResults;
};
