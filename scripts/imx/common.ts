import { ImmutableXClient, ImmutableMethodResults, ERC721TokenType } from "@imtbl/imx-sdk";
import { providers, Wallet, Signer, BigNumber } from "ethers";
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
  console.log(getWallet(network).privateKey);
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
) => {
  //: Promise<ImmutableMethodResults.ImmutableOffchainMintResults> => {
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

  // return result;
};

/**
 * @dev Prepare asset for withdrawal
 *
 * @param client ImmutableXClient with token owner as signer
 * @param assetAddress address of the asset to withdraw
 * @param tokenId ID of the token
 * @return withdrawal metadata
 */

//  export const mintL2 = async (
//   client: ImmutableXClient,
//   assetAddress: string,
//   to: string,
//   tokenId: string,
//   blueprint: string,
// ) => {
export const prepareWithdraw = async (client: ImmutableXClient, asset_address: string, tokenId: string) => {
  // Check if asset is withdrawable (zkRollup completed)
  const asset = await getAsset(client, asset_address, tokenId);
  if (asset.status !== "imx") {
    throw "Asset status needs to be 'imx'";
  }

  const withdrawal_data = await client.prepareWithdrawal({
    user: client.address.toLowerCase(),
    quantity: BigNumber.from(1), // Always one
    token: {
      type: ERC721TokenType.ERC721,
      data: {
        tokenId: tokenId.toString(),
        tokenAddress: asset_address.toLowerCase(),
      },
    },
  });

  console.log(withdrawal_data);
  console.log(
    `Withdrawal process started for token ID ${tokenId} of collection contract ${asset_address.toLowerCase()}`,
  );

  return withdrawal_data;
};

/**
 * @dev Complete withdrawal, asset status needs to be "withdrawable"
 *
 * @param client ImmutableXClient with token owner as signer
 * @param asset_address address of the asset to withdraw
 * @param tokenId ID of the token
 * @param wait_for_tx whether to wait for withdrawal transaction to complete or not
 * @returns withdrawal receipt, if `wait_for_tx` is true, withdrawal transaction hash if not
 */
export const completeWithdraw = async (
  client: ImmutableXClient,
  assetAddress: string,
  tokenId: string,
  wait_for_tx = true,
) => {
  // Check if asset is withdrawable (zkRollup completed)
  const asset = await getAsset(client, assetAddress, tokenId);
  console.log(asset.status);
  if (asset.status !== "withdrawable") {
    throw "Asset status needs to be 'withdrawable'";
  }

  const completed_withdrawal_tx = await client.completeWithdrawal({
    starkPublicKey: client.starkPublicKey.toLowerCase(),
    token: {
      type: ERC721TokenType.ERC721,
      data: {
        tokenId: tokenId.toString(),
        tokenAddress: assetAddress.toLowerCase(),
      },
    },
  });

  // // wait for transaction to take place
  // const completed_withdrawal = wait_for_tx
  //   ? await _wait_for_transaction(completed_withdrawal_tx)
  //   : completed_withdrawal_tx;

  console.log(completed_withdrawal_tx);
  console.log(`Token ID ${tokenId} of collection contract ${assetAddress.toLowerCase()} successfully withdrawn.`);

  // return completed_withdrawal;
};

/**
 * @dev Check if an asset of given ID exists for the configured collection
 *
 * @param client ImmutableXClient client instance
 * @param assetAddress address of the asset
 * @param tokenId ID of the token
 * @return token if it exists or undefined
 */
const getAsset = async (
  client: ImmutableXClient,
  assetAddress: string,
  tokenId: string,
): Promise<ImmutableMethodResults.ImmutableAsset> => {
  let token: ImmutableMethodResults.ImmutableAsset;
  try {
    token = await client.getAsset({
      address: assetAddress.toLowerCase(),
      id: tokenId.toString(),
    });
    console.log(`Token with ID ${tokenId} found for address ${assetAddress.toLowerCase()}`);
    return token;
  } catch (error) {
    throw new Error(`Token with ID ${tokenId} does not exist for address ${assetAddress.toLowerCase()}`);
  }
};
