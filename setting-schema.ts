import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

const settingSchema: SettingSchemaDesc[] = [
  {
    key: "ptn_key",
    title: "ptn key",
    description: "you ptn key, grab it from the phonetonote dashboard",
    type: "string",
    default: "",
  },
  {
    key: "parent_block",
    title: "parent block",
    description:
      "your phonetonote messages get synced on your journal pages under this block. leave blank to sync your messages directly to your journal page",
    type: "string",
    default: "ptn sync",
  },
  {
    key: "ptn_hashtag",
    title: "ptn hashtag",
    description: "the hashtag appended to each message you sync. you do not need to include the #",
    default: "ptn",
    type: "string",
  },
  {
    key: "auto_sync",
    title: "auto sync",
    description:
      "whether to automatically sync messages when you open logseq, and every 90 seconds after. manually sync messages by clicking the phone icon in the top right corner",
    default: true,
    type: "boolean",
  },
];

export { settingSchema };
