// Get required hre components
import { Web3, web3, artifacts } from "hardhat";

// Get types
import { CollectionMetadata, IMXClientConfig } from "./types";

// Get Web3 types
import { TransactionReceipt } from "web3-core/types";
import { Filter } from "web3-eth-contract/types";

// Get ethers dependencies
import { BigNumber } from "ethers";

// Get ethersproject providers -- compatible to IMX SDK
import { InfuraProvider, AlchemyProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";

// using IMX client and token type
import { ImmutableXClient, ImmutableMethodResults, ERC721TokenType, UpdateCollectionsResults } from "@imtbl/imx-sdk";

// using axios for IMX API requests
import axios from "axios";

// config file contains known deployed token addresses, IMX settings
import Config from "./config";

// using logger instead of console to allow output control
import log, { LogLevelDesc } from "loglevel";
log.setLevel(<LogLevelDesc>process.env.LOG_LEVEL ?? "info");

/**
 *
 * @dev Get the Infura websocket object for 'mainnet' or 'ropsten'
 *
 * @dev Required for the `mint_erc721.js` script
 *
 * @param network name of the network
 * @returns Web3.providers.WebsocketProvider instance for the given `network`
 */
function get_websocket_provider(network: string) {
  const infura_key = process.env.INFURA_KEY;
  if (!infura_key) throw "Please provide the 'INFURA_KEY' env variable to execute this script";
  switch (network) {
    case "mainnet":
      return new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${infura_key}`);
    case "ropsten":
      return new Web3.providers.WebsocketProvider(`wss://ropsten.infura.io/ws/v3/${infura_key}`);
    default:
      throw "Invalid network, please choose 'ropsten' or 'mainnet'";
  }
}

/**
 * @dev Returns the network gas oracle multiplied by `multiplier`
 *
 * @dev if `multiplier is a number greater then one, throws an error
 *
 * @param multiplier a number greater or equal than 1 to multiply the network gas price
 * @param error_msg the error message to display in case `multiplier` is invalid
 *
 * @return the network gas price multiplied by `multiplier`
 */
async function get_network_gas_price(
  multiplier: number,
  error_msg = "`GAS_ORACLE_MULTIPLIER` env variable needs to be a number greater or equal to zero",
) {
  if (!multiplier || multiplier < 1) {
    throw `${error_msg ?? "multiplier needs to be a number greater or equal to zero"}`;
  }
  return parseInt(await web3.eth.getGasPrice()) * multiplier;
}

/**
 * @dev approve `operator` to transfer the LandERC721 token (land)
 *
 * @param sender address of the tx sender
 * @param contract_address illuvitar contract address
 * @param collection_name illuvitar collection name
 * @param token_id ID of the land
 * @param operator the operator address to approve allowance
 * @param gas_limit gas cost limit
 * @param gas_price price per gas
 * @return transaction receipt
 */
async function approve_illuvitar_operator(
  sender: string,
  contract_address: string,
  collection_name: string,
  token_id: string,
  operator: string,
  gas_limit?: string,
  gas_price?: string,
) {
  if (!(collection_name in ["portrait", "accessory"])) throw "Invalid collection name";
  // instantiate ERC721 contract
  const erc721_contract = get_land_erc721_contract(contract_address);

  // check if it's already approved
  if ((await erc721_contract.methods.getApproved(token_id).call()) === operator) {
    return `Token ID ${token_id} from ${contract_address} already approved for ${operator}`;
  }

  // approve operator (ERC721)
  const tx_hash = await erc721_contract.methods.approve(operator, token_id).send({
    from: sender,
    gas: gas_limit,
    gasPrice: gas_price,
  });

  // return transaction receipt
  return await web3.eth.getTransaction(tx_hash);
}

/**
 * @dev Wait for transaction to complete and returns the receipt
 *
 * @param tx_hash hash of the transaction to wait
 * @param interval time interval (ms) to wait to query the receipt again
 * @param max_interval approximate maximum time interval (ms) to wait for transaction
 * @returns transaction receipt
 */
async function _wait_for_transaction(tx_hash: string, interval: number = 10000, max_interval: number = 750000) {
  const start_time = new Date().getTime();
  let receipt = await web3.eth.getTransactionReceipt(tx_hash);
  let end_time = new Date().getTime();
  while (!receipt) {
    if (end_time - start_time > max_interval) throw `Transaction ${tx_hash} not mined in ${max_interval} ms`;
    await new Promise(resolve => setTimeout(resolve, interval));
    receipt = await web3.eth.getTransactionReceipt(tx_hash);
    end_time = new Date().getTime();
  }

  return receipt;
}

/**
 * @dev check if IMX's deposit tx is valid
 *
 * @param client ImmutableXClient -- should be the owner of the assetAddress contract
 * @param asset_address address of the underlying asset
 * @param collection_name illuvitar collection name
 * @param token_id id of the token to deposit
 * @param gas_limit gas cost limit
 * @param gas_price price per gas
 * @param set_approval_if_needed set approval for stark contract if not done yet
 */
async function _check_deposit_validity(
  client: ImmutableXClient,
  asset_address: string,
  collection_name: string,
  token_id: string,
  gas_limit?: string,
  gas_price?: string,
  set_approval_if_needed: boolean = true,
) {
  // Check is status is "eth"
  const asset = await get_asset(client, asset_address, token_id);
  if (asset?.status !== "eth") {
    throw "Asset status needs to be 'eth'";
  }

  // Check if IMX's stark contract has approval to move asset
  const erc721_contract = get_land_erc721_contract(asset_address);
  if (
    (await erc721_contract.methods.getApproved(token_id).call()).toLowerCase() !== client.contractAddress.toLowerCase()
  ) {
    if (set_approval_if_needed)
      await approve_illuvitar_operator(
        client.wallet.signer.signer.address,
        asset_address,
        collection_name,
        token_id,
        client.contractAddress,
        gas_limit,
        gas_price,
      );
    else throw "Approval for StarkContract to move the asset is needed";
  }
}

/**
 * @dev Configure Infura provider based on the network
 *
 * @param network the network name
 * @return instance of AlchemyProvider or InfuraProvider
 */
function get_provider(network: string) {
  if (process.env.ALCHEMY_KEY) {
    return new AlchemyProvider(network, process.env.ALCHEMY_KEY);
  }
  return new InfuraProvider(network, process.env.INFURA_KEY);
}

/**
 * @dev get the network preffix for the IMX API endpoints
 *
 * @param network name of the network
 * @return preffix for the IMX API endpoints
 */
function _get_api_preffix(network: string) {
  switch (network) {
    case "ropsten":
      return ".ropsten";
    case "mainnet":
      return "";
    default:
      throw "Invalid network";
  }
}

/**
 * @dev Get wallet from mnemonic (for IMX client initialization)
 *
 * @param network name of the network
 * @param mnemonic mnemonic to generate the HDWallet from
 * @param n address index as defined in BIP-44 spec
 * @return ethers wallet instance
 */
function get_wallet_from_mnemonic(network: string, mnemonic: string, n = 0) {
  const provider = get_provider(network);

  return Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${n}`).connect(provider);
}

/**
 * @dev Get wallet from private key (for IMX client initialization)
 *
 * @param network name of the network
 * @param private_key private key of the underlying wallet
 * @return ethers wallet instance
 */
function get_wallet_from_private_key(network: string, private_key: string) {
  const provider = get_provider(network);

  return new Wallet(private_key, provider);
}

/**
 * @dev Gets wallet from provided private key or mnemonic provided for the network (for IMX client initializations)
 *
 * @param network name of the network
 * @param n address index as defined in BIP-44 spec
 * @return ethersproject wallet instance
 */
export function get_wallet(network: string, n = 0): Wallet {
  const private_key = network === "ropsten" ? process.env.P_KEY3 : process.env.P_KEY1;
  if (private_key) {
    return get_wallet_from_private_key(network, private_key);
  }
  const mnemonic = network === "ropsten" ? process.env.MNEMONIC3 : process.env.MNEMONIC1;
  return get_wallet_from_mnemonic(network, mnemonic ?? "", n);
}

/**
 * @dev Gets an instance of the IMX client given configuration for the network
 *
 * @param wallet ethersproject wallet instance
 * @param imx_client_config configuration object for ImmutableXClient
 * @return Instance of IMX client
 */
export async function get_imx_client_from_wallet(
  wallet: Wallet,
  imx_client_config: IMXClientConfig,
): Promise<ImmutableXClient> {
  return ImmutableXClient.build({
    publicApiUrl: imx_client_config.public_api_url,
    starkContractAddress: imx_client_config.stark_contract_address,
    registrationContractAddress: imx_client_config.registration_contract_address,
    gasLimit: imx_client_config.gas_limit,
    gasPrice: imx_client_config.gas_price,
    signer: wallet,
  });
}

/**
 * @dev Gets an instance of the IMX client given configuration for the network
 *
 * @param network name of the network ("ropsten" or "mainnet")
 * @return Instance of IMX client
 */
function get_imx_client(network: string) {
  const config = Config(network);

  return get_imx_client_from_wallet(get_wallet(network), config.imx_client_config);
}

/**
 * @dev Instantiate the LandSale contract
 *
 * @param land_sale_address L1 address of LandSale
 * @return LandSale instance
 */
function get_land_sale_contract(land_sale_address: string) {
  // Get required ABIs
  const land_sale_abi = artifacts.require("LandSale").abi;

  // return the Contract instance
  return new web3.eth.Contract(land_sale_abi, land_sale_address);
}

/**
 * @dev Instantiate the LandERC721 contract
 *
 * @param land_erc721_address L1 address of LandERC721
 * @return LandERC721 instance
 */
function get_land_erc721_contract(land_erc721_address: string) {
  // Get required ABIs
  const land_erc721_abi = artifacts.require("LandERC721").abi;

  return new web3.eth.Contract(land_erc721_abi, land_erc721_address);
}

/**
 * @dev Packs plotStore and turn it into a string representation of uint256 in decimal format
 *
 * @param plot_store PlotStore object/structure
 * @return decimal string representation of packed data
 */
/*
function get_blueprint(plot_store) {
	return pack(plot_store).toString(10);
}
*/

/**
 * @dev Unpacks blueprint into a PlotStore object
 *
 * @param blueprint packed PlotStore object/structure into a string of uint256 in decimal format
 * @return PlotStore object/structure
 */
/*
function get_plot_store(blueprint) {
	return unpack(web3.utils.toBN(blueprint));
}
*/

/**
 * @dev Mints an NFT on L2 (IMX)
 *
 * @param client ImmutableXClient -- should be the owner of the assetAddress contract
 * @param asset_address address of the asset to mint
 * @param to address of the owner of the address to be minted
 * @param token_id ID of the token
 * @param blueprint token metadata
 * @return the mint result metadata or null if minting fails
 */
async function mint_l2(
  client: ImmutableXClient,
  asset_address: string,
  to: string,
  token_id: string,
  blueprint: string,
) {
  // a token to mint - plotStorePack should be a string representation of uint256 in decimal format
  const token = {
    id: token_id.toString(),
    // note: blueprint cannot be empty
    blueprint, // This will come in the mintingBlob to the contract mintFor function as {tokenId}:{plotStorePack}
  };

  log.info("Minting on L2...");
  const mint_results = await client.mintV2([
    {
      users: [
        {
          etherKey: to.toLowerCase(),
          tokens: [token],
        },
      ],
      contractAddress: asset_address.toLowerCase(),
    },
  ]);
  log.info(`Minting of tokenId ${token_id} of collection ${asset_address.toLowerCase()} successful on L2`);

  return mint_results.results[0];
}

/**
 * @dev Burn token with given ID using and ImmutableXClient (with token owner as signer)
 *
 * @param client ImmutableXClient with the token owner as signers
 * @param asset_address address of the asset to burn the token from
 * @param token_id ID the token
 * @return deleted token metadata
 */
async function burn(client: ImmutableXClient, asset_address: string, token_id: string) {
  const token = {
    type: ERC721TokenType.ERC721,
    data: {
      tokenId: token_id.toString(),
      tokenAddress: asset_address.toLowerCase(),
    },
  };

  const deleted_token = await client.burn({
    quantity: BigNumber.from("1"),
    sender: client.address.toLowerCase(),
    token,
  });
  log.info(`Token ID ${token_id} of collection contract ${asset_address} successfully deleted.`);

  return deleted_token;
}

/**
 * @dev Get PlotBoughtL2 events emitted from LandSale contract
 *
 * @param land_sale_address L1 address of LandSale
 * @param filter event filters
 * @param from_block get events from the given block number
 * @param to_block get events until the given block number
 * @return events
 */
async function get_plot_bought_l2_events(
  land_sale_address: string,
  filter: Filter,
  from_block?: string | number,
  to_block?: string | number,
) {
  // Get landSale contract instance
  const land_sale = get_land_sale_contract(land_sale_address);

  // Get past PlotBoughtL2 events
  const plot_bought_l2_objs = await land_sale.getPastEvents("PlotBoughtL2", {
    filter,
    fromBlock: from_block ?? 0,
    toBlock: to_block ?? "latest",
  });

  // Populate return array with formatted event topics
  const events_metadata = [] as any[];
  plot_bought_l2_objs.forEach(plot_bought_l2 => {
    const return_values = plot_bought_l2.returnValues;
    events_metadata.push({
      block_number: plot_bought_l2.blockNumber,
      buyer: return_values._by,
      token_id: return_values._tokenId,
      sequenceId: return_values._sequenceId,
      plot_packed: return_values._plotPacked.toString(),
      plot: return_values._plot,
    });
  });

  return events_metadata;
}

/**
 * @dev Prepare asset for withdrawal
 *
 * @param client ImmutableXClient with token owner as signer
 * @param asset_address address of the asset to withdraw
 * @param token_id ID of the token
 * @return withdrawal metadata
 */
async function prepare_withdraw(client: ImmutableXClient, asset_address: string, token_id: string) {
  // Check if asset is withdrawable (zkRollup completed)
  const asset = await get_asset(client, asset_address, token_id);
  if (asset?.status !== "imx") {
    throw "Asset status needs to be 'imx'";
  }

  const withdrawal_data = await client.prepareWithdrawal({
    user: client.address.toLowerCase(),
    quantity: BigNumber.from("1"), // Always one
    token: {
      type: ERC721TokenType.ERC721,
      data: {
        tokenId: token_id.toString(),
        tokenAddress: asset_address.toLowerCase(),
      },
    },
  });

  log.info(`Withdrawal process started for token ID ${token_id} of collection contract ${asset_address.toLowerCase()}`);

  return withdrawal_data;
}

/**
 * @dev Complete withdrawal, asset status needs to be "withdrawable"
 *
 * @param client ImmutableXClient with token owner as signer
 * @param asset_address address of the asset to withdraw
 * @param token_id ID of the token
 * @param wait_for_tx whether to wait for withdrawal transaction to complete or not
 * @returns withdrawal receipt, if `wait_for_tx` is true, withdrawal transaction hash if not
 */
async function complete_withdraw(
  client: ImmutableXClient,
  asset_address: string,
  token_id: string,
  wait_for_tx = true,
) {
  // Check if asset is withdrawable (zkRollup completed)
  const asset = await get_asset(client, asset_address, token_id);
  if (asset?.status !== "withdrawable") {
    throw "Asset status needs to be 'withdrawable'";
  }

  const completed_withdrawal_tx = await client.completeWithdrawal({
    starkPublicKey: client.starkPublicKey.toLowerCase(),
    token: {
      type: ERC721TokenType.ERC721,
      data: {
        tokenId: token_id.toString(),
        tokenAddress: asset_address.toLowerCase(),
      },
    },
  });

  // wait for transaction to take place
  const completed_withdrawal = wait_for_tx
    ? await _wait_for_transaction(completed_withdrawal_tx)
    : completed_withdrawal_tx;

  log.info(`Token ID ${token_id} of collection contract ${asset_address.toLowerCase()} successfully withdrawn.`);

  return completed_withdrawal;
}

/**
 * @dev Check if an asset of given ID exists for the configured collection
 *
 * @param client ImmutableXClient client instance
 * @param asset_address address of the asset
 * @param token_id ID of the token
 * @return token if it exists or undefined
 */
async function get_asset(client: ImmutableXClient, asset_address: string, token_id: string) {
  let token = null;
  try {
    token = await client.getAsset({
      address: asset_address.toLowerCase(),
      id: token_id.toString(),
    });
    log.info(`Token with ID ${token_id} found for address ${asset_address.toLowerCase()}`);
  } catch (error) {
    log.info(`Token with ID ${token_id} does not exist for address ${asset_address.toLowerCase()}`);
  }
  return token;
}

/**
 * @dev Get L2 mint metadata
 *
 * @param network name of the network
 * @param asset_address address of the asset on L1
 * @param token_id ID of the token
 * @return object containing `token_id`, `client_token_id` and `blueprint`
 */
async function get_mint(network: string, asset_address: string, token_id: string) {
  const response = await axios.get(
    `https://api${_get_api_preffix(network)}.x.immutable.com/v1/mintable-token/${asset_address}/${token_id}`,
  );

  if (response.status !== 200) {
    return null;
  }
  return response.data;
}

/**
 * @dev Gets a number or all the assets for the configured collection
 *
 * @param client ImmutableXClient client instance
 * @param asset_address address of the asset
 * @param loop_n_times number of times to request for another batch of assets
 * @return assets found in L2
 */
async function get_all_assets(client: ImmutableXClient, asset_address: string, loop_n_times: number) {
  let assets = [] as any[];
  let response;
  let cursor;

  do {
    response = await client.getAssets({
      collection: asset_address,
    });
    assets = assets.concat(response.result);
    cursor = response.cursor;
  } while (cursor && (!loop_n_times || loop_n_times-- > 1));

  if (assets.length > 0) {
    console.log(`Assets found for address ${asset_address}`);
  } else {
    console.log(`No assets found for address ${asset_address}`);
  }
  return assets;
}

/**
 * @dev Get all trades from L2
 *
 * @param network name of the network
 * @param asset_address address of the asset
 * @param token_id asset token ID
 * @param loop_n_times number of times to request for another batch of trades
 * @param min_timestamp minimum timestamp to search for trades
 * @param max_timestamp maximum timestamp to search for trades
 * @param order_by field to order by
 * @param page_size page size for each batch (number of trades returned will be min(totalNumberOfTrades, loopNTimes * pageSize))
 * @param direction sort order
 * @return trades for provided asset
 */
async function get_all_trades(
  network: string,
  asset_address: string,
  token_id: string,
  loop_n_times: number,
  min_timestamp?: string | number,
  max_timestamp?: string | number,
  order_by: string = "timestamps",
  page_size: number = 1,
  direction: string = "desc",
) {
  let trades = [] as any[];
  let response;
  let cursor;

  do {
    response = await axios.get(`https://api${_get_api_preffix(network)}.x.immutable.com/v1/trades`, {
      params: {
        party_a_token_type: ERC721TokenType.ERC721,
        party_a_token_address: asset_address,
        party_a_token_id: token_id,
        min_timestamp,
        max_timestamp,
        page_size,
        cursor,
        order_by,
        direction,
      },
    });
    if (response.status !== 200) {
      return null;
    }
    cursor = response.data.cursor;
    trades = trades.concat(response.data.result);
  } while (cursor && (!loop_n_times || loop_n_times-- > 1));

  return trades;
}

/**
 * @dev Get all trades from L2
 *
 * @param network name of the network
 * @param asset_address address of the asset
 * @param token_id asset token ID
 * @param loop_n_times number of times to request for another batch of trades
 * @param min_timestamp minimum timestamp to search for trades
 * @param max_timestamp maximum timestamp to search for trades
 * @param order_by field to order by
 * @param page_size page size for each batch (number of trades returned will be min(totalNumberOfTrades, loopNTimes * pageSize))
 * @param direction sort order
 * @return trades for provided asset
 */
async function get_all_transfers(
  network: string,
  asset_address: string,
  token_id: string,
  loop_n_times: number,
  min_timestamp: string,
  max_timestamp: string,
  order_by: string = "timestamps",
  page_size: number = 1,
  direction: string = "desc",
) {
  let transfers = [] as any[];
  let response;
  let cursor;

  do {
    response = await axios.get(`https://api${_get_api_preffix(network)}.x.immutable.com/v1/transfers`, {
      token_type: ERC721TokenType.ERC721,
      token_id: token_id,
      token_address: asset_address,
      min_timestamp,
      max_timestamp,
      page_size,
      cursor,
      order_by,
      direction,
    });
    cursor = response.data.cursor;
    transfers = transfers.concat(response.data.result);
  } while (cursor && (!loop_n_times || loop_n_times-- > 1));

  return transfers;
}

/**
 * @dev Verify event's metadata against the ones on L2
 *
 * @param network name of the network
 * @param land_sale_address L1 address of LandSale
 * @param asset_address address of the asset
 * @param filter event filters
 * @param from_block get events from the given block number
 * @param to_block get events until the given block number
 * @return differences found between events and L2
 */
async function verify(
  network: string,
  land_sale_address: string,
  asset_address: string,
  filter: Filter,
  from_block?: string | number,
  to_block?: string | number,
) {
  // Get PlotBoughtL2 events to match information in L1/L2
  const plot_bought_l2_events = await get_plot_bought_l2_events(land_sale_address, filter, from_block, to_block);

  // Check metadata
  const asset_diff = [] as any[];
  let blueprint;
  let token_id;
  for (const event of plot_bought_l2_events) {
    token_id = typeof event.token_id === "string" ? event.token_id : event.token_id.toString();
    blueprint = (await get_mint(network, asset_address, token_id)).blueprint;
    if (event.plot_packed.toString() !== blueprint) {
      asset_diff.push({
        token_id,
        event: event.plot_packed.toString(),
        l2: blueprint ?? null,
      });
    }
  }

  if (asset_diff.length !== 0) {
    log.info("Difference found between event and L2 blueprints!");
  } else {
    log.info("Blueprints on the events and L2 are fully consistent!");
  }

  return asset_diff;
}

/**
 * @dev Get snapshot of latest land owner on L1
 *
 * @param land_erc721_address L1 address of LandERC721
 * @param token_id ID of the token
 * @param from_block the block from which search for the snapshot
 * @param to_block the block to which search for the snapshot
 * @return latest owner on L1 for the given interval
 */
async function get_owner_of_snapshot_l1(
  land_erc721_address: string,
  token_id: string,
  from_block?: string | number,
  to_block?: string | number,
) {
  // Get landERC721 contract instance
  const land_erc721 = get_land_erc721_contract(land_erc721_address);

  // Get past Transfer event from the ERC721 asset contract
  const transfer_events = await land_erc721.getPastEvents("Transfer", {
    filter: { token_id },
    fromBlock: from_block,
    toBlock: to_block,
  });

  // Return null if no past event have been found
  if (transfer_events.length === 0) {
    return null;
  }

  // Sort and get the last event (with biggest blockNumber)
  const last_transfer_event = transfer_events
    .sort((event_left, event_right) => event_left.blockNumber - event_right.blockNumber)
    .pop();

  // Return owner after last Transfer event
  return last_transfer_event?.returnValues.to;
}

/**
 * @dev Get order given `orderId`
 *
 * @param network name of the network
 * @param order_id ID of the order
 * @return order metadata
 */
async function get_order(network: string, order_id: string) {
  // Get the order given order ID
  const response = await axios.get(`https://api${_get_api_preffix(network)}.x.immutable.com/v1/orders/${order_id}`);

  // Return null if some error occurred for the request
  if (response.status !== 200) {
    return null;
  }

  // Return response data
  return response.data;
}

/**
 * @dev Get snapshot of latest token owner on L2
 *
 * @param network name of the network
 * @param asset_address L1 address of the asset
 * @param token_id ID of the token
 * @param from_block the block from which search for the snapshot
 * @param to_block the block to which search for the snapshot
 * @return latest owner on L2 for the given interval
 */
async function get_owner_of_snapshot_l2(
  network: string,
  asset_address: string,
  token_id: string,
  from_block?: string | number,
  to_block?: string | number,
) {
  // Get timestamp from blocks
  const min_timestamp =
    from_block === undefined ? undefined : (await web3.eth.getBlock(from_block)).timestamp.toString();
  const max_timestamp = to_block === undefined ? undefined : (await web3.eth.getBlock(to_block)).timestamp.toString();

  // Get latest trade
  let latest_trade = (await get_all_trades(network, asset_address, token_id, 1, min_timestamp, max_timestamp))?.pop();
  latest_trade =
    latest_trade !== undefined
      ? { timestamp: latest_trade.timestamp, receiver: (await get_order(network, latest_trade.b.order_id)).user }
      : { timestamp: 0 };

  // Get latest transfer
  let latest_transfer = (
    await get_all_transfers(network, asset_address, token_id, 1, min_timestamp, max_timestamp)
  ).pop();
  latest_transfer = latest_transfer ?? { timestamp: 0 };

  // Return receiver of latest transfer if it's timestamp is greater or equal to the one of the latest trade
  if (latest_transfer.timestamp >= latest_trade.timestamp) {
    return latest_transfer.receiver ?? null;
  }

  // Othewise, return latest trade receiver
  return latest_trade.receiver ?? null;
}

/**
 * @dev Rollback and re-mint asset to a new ERC721 collection on L2
 *
 * @param network name of the network
 * @param land_sale_address L1 address of LandSale
 * @param client ImmutableXClient instance
 * @param from_asset_address the current LandERC721 address
 * @param to_asset_address the LandERC721 address to migrate the tokens
 * @param from_block the block from to get the snapshots (PlotBought events)
 * @param to_block the end block to get the snapshots (PlotBought events)
 */
async function rollback(
  network: string,
  land_sale_address: string,
  client: ImmutableXClient,
  from_asset_address: string,
  to_asset_address: string,
  from_block?: string | number,
  to_block?: string | number,
) {
  // Get past PlotBoughtL2 events to a certain block
  const past_events = await get_plot_bought_l2_events(land_sale_address, from_block, to_block);

  // Loop through past events and remint on L2 for new contract
  let asset_l2;
  let owner;
  for (const event of past_events) {
    // Retrieve asset detail on L2
    asset_l2 = await get_asset(client, from_asset_address, event.token_id);

    // If assetL2 status is 'imx' take owner from L2, otherwise take from L1 snapshot
    if (asset_l2?.status === "imx") {
      // Get owner on L2 (IMX) snapshot
      owner = await get_owner_of_snapshot_l2(network, from_asset_address, event.token_id, from_block, to_block);

      log.debug(`Taking ownership of token ${event.token_id} from L2`);
    } else {
      // get owner on L1 (LandERC721) snapshot
      owner = await get_owner_of_snapshot_l1(from_asset_address, event.token_id, from_block, to_block);

      log.debug(`Taking ownership of token ${event.token_id} from L1`);
    }

    if (owner === null) {
      log.error(`Failed to retrieve owner for token ID ${event.token_id}`);
      throw "Failed to retried owner";
    }

    // Re-mint asset with correct ownership (L1 or L2)
    log.info(`Migrated token ${event.token_id} from ${from_asset_address} to ${to_asset_address} successful!`);
    await mint_l2(client, to_asset_address, owner, event.token_id, event.plot_packed);

    log.info(`Migration from ${from_asset_address} to ${to_asset_address} completed!`);
  }
}

/**
 * @dev Deposit asset from L1 into L2 (IMX)
 *
 * @param client ImmutableXClient client instance
 * @param asset_address address of the asset
 * @param collection_name illuvitar collection name
 * @param token_id token ID to deposit
 * @param wait_for_tx whether to wait for deposit transaction to complete or not
 * @param gas_limit gas cost limit
 * @param gas_price price per gas
 * @returns deposit receipt, if `wait_for_tx` is true, deposit transaction hash if not
 */
export async function deposit(
  client: ImmutableXClient,
  asset_address: string,
  collection_name: string,
  token_id: string,
  wait_for_tx: boolean = true,
  gas_limit?: string,
  gas_price?: string,
): Promise<TransactionReceipt | string> {
  if (!(collection_name in ["portrait", "accessory"])) throw "Invalid collection name";
  // Check deposit transaction validity
  await _check_deposit_validity(client, asset_address, collection_name, token_id, gas_limit, gas_price);

  const deposit_tx = await client.deposit({
    quantity: BigNumber.from("1"),
    user: client.address.toLowerCase(),
    token: {
      type: ERC721TokenType.ERC721,
      data: {
        tokenAddress: asset_address.toLowerCase(),
        tokenId: token_id,
      },
    },
  });

  // wait for transaction to take place
  const deposit = wait_for_tx ? await _wait_for_transaction(deposit_tx) : deposit_tx;

  // Return deposit transaction receipt or transaction hash
  return deposit;
}

/**
 * @dev update an existing collection's metadata
 *
 * @dev needs to be executed by the collection's owner
 *
 * @dev if a new ERC721 address is provided, the owner of the contract needs to be the collection's owner
 *
 * @param client ImmutableXClient client instance
 * @param asset_address address of the asset
 * @param new_collection_metadata object containing the fields to be updated, leave undefined to keep the former metadata
 * @return update collection's API response
 */
export async function update_collection_metadata(
  client: ImmutableXClient,
  asset_address: string,
  new_collection_metadata: CollectionMetadata,
): Promise<UpdateCollectionsResults> {
  // Update collection metadata
  const update_collection_result = await client.updateCollection(asset_address.toLowerCase(), {
    name: new_collection_metadata.collection_name,
    description: new_collection_metadata.description,
    icon_url: new_collection_metadata.icon_url,
    metadata_api_url: new_collection_metadata.metadata_api_url,
    collection_image_url: new_collection_metadata.collection_image_url,
  });

  log.info("Collection metadata successfully updated to:");
  log.info(JSON.stringify(new_collection_metadata));

  return update_collection_result;
}

// export public module API
module.exports = {
  get_imx_client_from_wallet,
  get_imx_client,
  get_land_sale_contract,
  get_land_erc721_contract,
  get_plot_bought_l2_events,
  mint_l2,
  burn,
  prepare_withdraw,
  complete_withdraw,
  get_asset,
  get_all_assets,
  get_all_trades,
  get_all_transfers,
  get_mint,
  rollback,
  verify,
  deposit,
  update_collection_metadata,
  approve_illuvitar_operator,
  get_network_gas_price,
  get_wallet,
  get_websocket_provider,
};
