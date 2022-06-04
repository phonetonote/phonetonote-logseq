import "@logseq/libs";
import { delay } from "./helpers";
import { loadPtnData, markItemSynced } from "./ptn";
import { format } from "date-fns";
import { FeedItem, itemToNode, PtnNode } from "ptn-helpers";
import { LSPluginBaseInfo, IBatchBlock } from "@logseq/libs/dist/LSPlugin.user";
import { settingSchema } from "./setting-schema";

/**
 * main entry
 * @param baseInfo
 */
function main(baseInfo: LSPluginBaseInfo) {
  let loading = false;

  logseq.provideModel({
    async loadPtn() {
      const info = await logseq.App.getUserConfigs();

      if (loading) return;

      const pageName = "phonetonote-logseq";
      logseq.App.pushState("page", { name: pageName });

      await delay(300);

      loading = true;

      try {
        const currentPage = await logseq.Editor.getCurrentPage();
        if (currentPage?.originalName !== pageName) {
          throw new Error("page error");
        }

        const ptnKey = baseInfo?.settings?.["ptn_key"];

        if (!ptnKey) {
          logseq.App.showMsg(
            "ptn key not found. edit in plugin settings",
            "warning"
          );
        } else {
          const items = await loadPtnData(ptnKey);

          if (items.length === 0) {
            logseq.App.showMsg("no new items found", "success");
          } else {
            const currentBlocks =
              await logseq.Editor.getCurrentPageBlocksTree();

            let targetBlock =
              currentBlocks.length > 0
                ? currentBlocks[currentBlocks.length - 1]
                : await logseq.Editor.insertBlock(
                    pageName,
                    "synced notes will appear on this page",
                    { isPageBlock: true }
                  );

            const dateFormat = info?.["preferredDateFormat"] || "MMM do, yyyy";
            const blocks = items.reduce(
              (
                obj: Record<string, Record<string, FeedItem[]>>,
                feedItem: FeedItem
              ) => {
                const date = new Date(feedItem.date_published),
                  pageName = format(date, dateFormat),
                  senderType = feedItem._ptr_sender_type;

                if (!obj.hasOwnProperty(pageName)) {
                  obj[pageName] = {};
                }

                if (!obj[pageName][senderType]) {
                  obj[pageName][senderType] = [];
                }

                obj[pageName][senderType].push(feedItem);
                return obj;
              },
              {}
            );

            for (const formattedDate of Object.keys(blocks)) {
              const dateKey = `[[ptn sync]] — [[${formattedDate}]]`;

              const existingDateBlock = currentBlocks?.filter((block) => {
                return block.content === dateKey;
              })?.[0];

              let dateBlock = existingDateBlock;

              if (!dateBlock && blocks[formattedDate]) {
                dateBlock = await logseq.Editor.insertBlock(
                  targetBlock.uuid,
                  dateKey,
                  {
                    sibling: true,
                  }
                );
              }

              for (const senderType of Object.keys(blocks[formattedDate])) {
                await logseq.Editor.insertBatchBlock(
                  dateBlock.uuid,
                  blocks[formattedDate][senderType]
                    .map((feedItem: FeedItem) => {
                      return itemToNode(
                        feedItem,
                        baseInfo?.settings?.["ptn_hashtag"] || "ptn"
                      );
                    })
                    .map((node: PtnNode): IBatchBlock => {
                      return {
                        content: node.text,
                        children: node.children.map((child) => ({
                          content: child.text,
                        })),
                      };
                    }),
                  {
                    sibling: false,
                  }
                );
              }
            }

            items.forEach((item) => {
              markItemSynced(item, ptnKey);
            });
          }
        }
      } catch (e) {
        logseq.App.showMsg(e.toString(), "error");
        console.error(e);
      } finally {
        loading = false;
      }
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "phonetonote-logseq",
    template: `
      <a data-on-click="loadPtn"
         class="button">
        <i class="ti ti-device-mobile-message"></i>
      </a>
    `,
  });

  logseq.useSettingsSchema(settingSchema);
}

// bootstrap
logseq.ready(main).catch(console.error);
