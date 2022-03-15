import { ImmutableXClient, CreateProjectResult } from "@imtbl/imx-sdk";
import { getWalletFromMnemonic, getImmutableXClientFromWallet } from "../common";
import Config, { NETWORK } from "./config";

/**
 * @dev creates new project on IMX
 *
 * @param projectName name of the project
 * @param companyName name of the company
 * @param contactEmail email to contact for the project
 * @return Metadata from newly created project
 */
export const createProject = async (
  client: ImmutableXClient,
  projectName: string,
  companyName: string,
  contactEmail: string,
): Promise<CreateProjectResult> => {
  let project: CreateProjectResult;
  console.log("Creating project...");
  try {
    project = await client.createProject({
      name: projectName,
      company_name: companyName,
      contact_email: contactEmail,
    });
  } catch (error) {
    throw JSON.stringify(error, null, 2);
  }

  console.log(`Created project with ID: ${project.id}`);
  return project;
};

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

  // Create project given client, project name, company name and contact email
  await createProject(client, config.project.project_name, config.project.company_name, config.project.contact_email);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
