// ACL token features and roles
const { FEATURE_ALL } = require("../../../scripts/include/features_roles");

// reimport some deployment routines from erc20/erc721 deployment packs
const { erc20_deploy, usdt_deploy } = require("../../erc20/include/deployment_routines");

/**
 * Deploys Escrowed Illuvium Mock used for payments in Land Sale
 *
 * @param a0 smart contract owner, super admin
 * @return ERC20Mock instance with sILV UID
 */
async function sIlv_mock_deploy(a0) {
  // smart contracts required
  const ERC20Contract = artifacts.require("./ERC20Mock");

  // deploy the ERC20
  const token = await ERC20Contract.new("sILV2", "Escrowed Illuvium", { from: a0 });

  // set the correct sILV UID
  await token.setUid("0xac3051b8d4f50966afb632468a4f61483ae6a953b74e387a01ef94316d6b7d62", { from: a0 });

  // enable all the features
  await token.updateFeatures(FEATURE_ALL, { from: a0 });

  // return the deployed instance reference
  return token;
}

/**
 * Deploys Illuvitars Price Oracle instance
 *
 * @param a0 smart contract owner, super admin
 * @param aggregator_address Chainlink Aggregator V3 instance address
 * @return IlluvitarsPriceOracleV1 instance
 */
async function illuvitars_price_oracle_deploy(a0, aggregator_address) {
  // smart contracts required
  const ChainlinkAggregator = artifacts.require("./ChainlinkAggregatorV3Mock");

  // link/deploy the contracts
  const aggregator = aggregator_address
    ? await ChainlinkAggregator.at(aggregator_address)
    : await chainlink_aggregator_deploy_mock(a0);
  const oracle = await illuvitars_price_oracle_deploy_pure(a0, aggregator.address);

  // return the contacts deployed
  return { oracle, aggregator };
}

/**
 * Deploys Illuvitars Price Oracle wrapped into ERC1967Proxy with no features enabled, and no roles set up
 *
 * Requires a valid Chainlink Aggregator V3 instance address to be specified
 *
 * @param a0 smart contract owner, super admin
 * @param aggregator_address Chainlink Aggregator V3 instance address, required
 * @return IlluvitarsPriceOracleV1 instance (mocked)
 */
async function illuvitars_price_oracle_deploy_pure(a0, aggregator_address) {
  // smart contracts required
  const IlluvitarsPriceOracleV1 = artifacts.require("./IlluvitarsPriceOracleV1Mock");
  const Proxy = artifacts.require("./ERC1967Proxy");

  // deploy implementation without a proxy
  const instance = await IlluvitarsPriceOracleV1.new({ from: a0 });

  // prepare the initialization call bytes to initialize the proxy (upgradeable compatibility)
  const init_data = instance.contract.methods.initialize(aggregator_address).encodeABI();

  // deploy proxy, and initialize the implementation (inline)
  const proxy = await Proxy.new(instance.address, init_data, { from: a0 });

  // wrap the proxy into the implementation ABI and return
  return await IlluvitarsPriceOracleV1.at(proxy.address);
}

/**
 * Deploys Chainlink Aggregator V3 Mock
 *
 * @param a0 smart contract owner, super admin
 * @return Chainlink AggregatorV3Interface instance (mocked)
 */
async function chainlink_aggregator_deploy_mock(a0) {
  // smart contracts required
  const ChainlinkAggregator = artifacts.require("./ChainlinkAggregatorV3Mock");

  // deploy and return the reference to instance
  return await ChainlinkAggregator.new({ from: a0 });
}

// export public deployment API
module.exports = {
  erc20_deploy,
  usdt_deploy,
  sIlv_mock_deploy,
  illuvitars_price_oracle_deploy,
  illuvitars_price_oracle_deploy_pure,
  chainlink_aggregator_deploy_mock,
};
