import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
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
      1: "0x514910771af9ca656af840dff83e8264ecf986ca",
      // 3: "0x1f24883025cA1a5cF80a1D183Da8666d90667Ef9",
    },
    vrfCoordinator: {
      1: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
      // 3: "0x9eD66d0F68802d967933f800D602b8B033bf6fCa",
    },
    // Escrowed Illuvium 2 ERC20 (sILV2)
    sIlvAddress: {
      1: "0x7E77dCb127F99ECe88230a64Db8d595F31F1b068",
      // 3: "0x774e30b5bd47125000dEb424547BfFEB13c1B706",
    },
    // Chainlink Price Feed Aggregator
    chainlinkAggregator: {
      1: "0xf600984CCa37cd562E74E3EE514289e3613ce8E4",
      // 3: "0x916FaC543b615FD89155927836440B25130B5ECA",
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  dependencyCompiler: {
    paths: [
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol",
      "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol",
      "@chainlink/contracts/src/v0.6/tests/VRFCoordinatorMock.sol",
      "@chainlink/contracts/src/v0.4/LinkToken.sol",
    ],
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
