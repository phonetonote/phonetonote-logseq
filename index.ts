import "@logseq/libs";
import { delay } from "./helpers";
import { loadPtnData, markItemSynced } from "./ptn";
import { format, sub } from "date-fns";
import { FeedItem, itemToNode, organizeFeedItems, PtnNode } from "ptn-helpers";
import { LSPluginBaseInfo, IBatchBlock } from "@logseq/libs/dist/LSPlugin.user";
import { settingSchema } from "./setting-schema";

/**
 * main entry
 * @param baseInfo
 */
function main(baseInfo: LSPluginBaseInfo) {
  let loading = false;
  const findOrCreateParentUid = async (
    date: Date,
    parentBlock: string,
    dateFormat: string
  ): Promise<string> => {
    let datePageUid;
    const possibleExistingDatePage = await logseq.DB.datascriptQuery(`
              [
            :find (pull ?p [*])
            :where
            [?b :block/page ?p]
            [?p :block/journal? true]
            [?p :block/journal-day ?d]
            [(== ?d ${format(date, "yyyyMMdd")})]
          ]
    `);

    if (possibleExistingDatePage.length > 0) {
      datePageUid = possibleExistingDatePage[0][0]["uuid"];
    } else {
      const datePageTitle = format(date, dateFormat);

      const newDatePage = await window.logseq.Editor.createPage(
        datePageTitle,
        {},
        {
          journal: true,
          redirect: false,
        }
      );
      datePageUid = newDatePage!.uuid;
    }

    if (!parentBlock || parentBlock.length === 0) {
      return datePageUid;
    }

    const existingBlockQuery: any[][] = (await logseq.DB.datascriptQuery(`
          [
            :find (pull ?b [*])
            :where
            [?b :block/page ?p]
            [?p :block/journal? true]
            [?p :block/journal-day ?d]
            [(== ?d ${format(date, "yyyyMMdd")})]
          ]
    `)) ?? [[]];

    const existingBlocks = existingBlockQuery.map((x) => x[0]);
    const possibleExistingParentBlock = existingBlocks.filter(
      (x) => x["content"].trim() === parentBlock.trim()
    );

    if (possibleExistingParentBlock.length > 0) {
      const existingParentUuid = possibleExistingParentBlock[0]["uuid"];
      return existingParentUuid;
    }

    const newParentBlock = await window.logseq.Editor.appendBlockInPage(datePageUid, parentBlock);
    return newParentBlock!.uuid;
  };

  const getMessages = async (showNotifcation: boolean) => {
    const info = await logseq.App.getUserConfigs();

    if (loading) return;

    loading = true;

    try {
      const dateFormat = info?.["preferredDateFormat"] || "MMM do, yyyy";
      const ptnKey = baseInfo?.settings?.["ptn_key"];
      const parentBlock: string = baseInfo?.settings?.["parent_block"] ?? "";

      if (!ptnKey) {
        logseq.UI.showMsg("ptn key not found. edit in plugin settings", "warning", {
          timeout: 2500,
        });
      } else {
        const items: FeedItem[] = await loadPtnData(ptnKey);

        if (items.length === 0 && showNotifcation) {
          logseq.UI.showMsg("no new items found", "success", { timeout: 1500 });
        } else {
          const organizedItems = organizeFeedItems(items, dateFormat);

          for (const pageName of Object.keys(organizedItems)) {
            for (const senderType of Object.keys(organizedItems[pageName])) {
              const feedItems: FeedItem[] = organizedItems[pageName][senderType];
              const date = new Date(feedItems[0].date_published),
                parentUid = await findOrCreateParentUid(date, parentBlock, dateFormat),
                batch = organizedItems[pageName][senderType]
                  .map((feedItem: FeedItem) => {
                    return itemToNode(feedItem, baseInfo?.settings?.["ptn_hashtag"] || "ptn");
                  })
                  .map((node: PtnNode): IBatchBlock => {
                    return {
                      content: node.text,
                      children: node.children.map((child) => ({
                        content: child.text,
                      })),
                    };
                  });

              await logseq.Editor.insertBatchBlock(parentUid, batch, {
                sibling: false,
              });
            }
          }
        }

        items.forEach((item) => {
          markItemSynced(item, ptnKey);
        });
      }
    } catch (e) {
      logseq.UI.showMsg(e.message, "warning");
      console.error(e);
    } finally {
      loading = false;
    }
  };

  logseq.provideModel({
    async loadPtnAndNotify() {
      getMessages(true);
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "phonetonote-logseq",
    template: `
      <a data-on-click="loadPtnAndNotify"
         class="button">
        <i class="ti ti-device-mobile-message"></i>
      </a>
    `,
  });

  logseq.useSettingsSchema(settingSchema);

  if (baseInfo?.settings?.["auto_sync"]) {
    getMessages(false);
    window.setInterval(() => getMessages(false), 1000 * 90);
  }
}

logseq.ready(main).catch(console.error);
