import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-dependency-compiler";
import "hardhat-deploy";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  hardhat: 31337,
  mainnet: 1,
  ropsten: 3,
};

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

function getChainConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: chainIds.hardhat,
    },
    ropsten: getChainConfig("ropsten"),
    mainnet: getChainConfig("mainnet"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.14",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
    },
    imxMinter: {
      1: "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9",
      3: "0x4527BE8f31E2ebFbEF4fCADDb5a17447B27d2aef",
    },
    linkToken: {
      3: "0xb953b44b4e776313B1236D92C09D9ce39135EdbE",
    },
    weth: {
      3: "0xc778417e063141139fce010982780140aa0cd5ab",
    },
    vrfCoordinator: {
      3: "0xf8046Eb28d62D12AB1b55e8e6A9742C1b1F51164",
    },
    // Escrowed Illuvium 2 ERC20 (sILV2)
    sIlvAddress: {
      mainnet: "0x7E77dCb127F99ECe88230a64Db8d595F31F1b068",
      rinkeby: "0xbfF2129e06a7e76323e7ceA754eBD045Bc3E82A5",
      ropsten: "0xCe34A06141B2131aD6C6E293275d22123bcf1865",
    },
    // Chainlink Price Feed Aggregator
    chainlinkAggregator: {
      mainnet: "0xf600984CCa37cd562E74E3EE514289e3613ce8E4",
      rinkeby: "0x48731cF7e84dc94C5f84577882c14Be11a5B7456",
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  dependencyCompiler: {
    paths: [
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
      "@chainlink/contracts/src/v0.6/tests/VRFCoordinatorMock.sol",
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol",
      "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol",
    ],
  },
};

export default config;
