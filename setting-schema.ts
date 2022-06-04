import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

const settingSchema: SettingSchemaDesc[] = [
  {
    key: "ptn_key",
    title: "ptn key",
    description: "you ptn key, grab it from the phonetonote dashboard",
    type: "string",
    default: "",
  },
];

export { settingSchema };
