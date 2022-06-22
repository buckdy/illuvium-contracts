// types
import { MetadataTypes, ImmutableXClientParams } from "@imtbl/imx-sdk";
import { Signer } from "@ethersproject/abstract-signer";

export interface MetadataSchema {
  name: string;
  type?: MetadataTypes;
  filterable?: boolean;
}

export interface ProjectConfig {
  project_name: string;
  company_name: string;
  contact_email: string;
}

export interface CollectionMetadata {
  name: string;
  contract_address: string;
  icon_url?: string;
  metadata_api_url?: string;
  collection_image_url?: string;
}

export interface CollectionConfig extends CollectionMetadata {
  project_id: string;
}

export interface CollectionMetadataSchema {
  contract_address: string;
  portrait: MetadataSchema[];
  accessory: MetadataSchema[];
}

export interface IMXClientConfig {
  public_api_url: string;
  api_key?: string;
  signer?: Signer;
  gas_limit?: string;
  gas_price?: string;
  stark_contract_address?: string;
  registration_contract_address?: string;
  enable_debug?: boolean;
}

export interface OnboardingScriptsConfig {
  imx_client_config: IMXClientConfig;
  project: ProjectConfig;
  collection: CollectionConfig;
  collection_metadata_schema: CollectionMetadataSchema;
}
