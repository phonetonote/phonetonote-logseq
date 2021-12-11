import "@logseq/libs";
import { IBatchBlock, LSPluginBaseInfo } from "@logseq/libs/dist/libs";

const delay = (t = 100) => new Promise((r) => setTimeout(r, t));

async function loadPtnData(ptnKey: string) {
  const endpoint = `https://app.phonetonote.com/feed.json?ptn_key=${ptnKey}`;

  const data = await fetch(endpoint).then((res) => res.json());
  return data?.items ?? [];
}

async function markItemSynced(item, ptnKey) {
  fetch(`https://app.phonetonote.com/feed/${item.id}.json`, {
    method: "PATCH",
    body: JSON.stringify({
      roam_key: `${ptnKey}`,
      status: "synced",
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  }).then((response) => response.json);
}

function english_ordinal_suffix(dt) {
  return (
    dt.getDate() +
    (dt.getDate() % 10 == 1 && dt.getDate() != 11
      ? "st"
      : dt.getDate() % 10 == 2 && dt.getDate() != 12
      ? "nd"
      : dt.getDate() % 10 == 3 && dt.getDate() != 13
      ? "rd"
      : "th")
  );
}

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
        if (currentPage?.originalName !== pageName)
          throw new Error("page error");

        const pageBlocksTree = await logseq.Editor.getCurrentPageBlocksTree();

        if (!pageBlocksTree) {
          throw new Error("no blocks found on this page");
        }

        console.log("pageBlocksTree", pageBlocksTree);

        const ptnKeyBlock = pageBlocksTree?.find(
          (b) => b.content === "ptn_key"
        );

        if (!ptnKeyBlock) {
          throw new Error(
            "make a block called `ptn_key` on this page, and put your ptn_key under it"
          );
        } else {
          const ptnKey = ptnKeyBlock.children[0]?.["content"];
          if (!ptnKey) throw new Error("ptn_key is empty");

          const items = await loadPtnData(ptnKey);

          console.log("items", items);

          if (items.length === 0) {
            throw new Error("no items found"); // not an error, but easy to display message
          } else {
            const currentBlocks =
              await logseq.Editor.getCurrentPageBlocksTree();
            console.log("currentBlocks", currentBlocks);
            let targetBlock = currentBlocks[currentBlocks.length - 1];

            targetBlock = await logseq.Editor.insertBlock(
              targetBlock.uuid,
              "🚀 fetching your notes...",
              { before: true }
            );

            const blocks = items.map(
              (it) => ({ content: it.content_text } as IBatchBlock)
            );

            await logseq.Editor.insertBatchBlock(targetBlock.uuid, blocks, {
              sibling: false,
            });

            const date = new Date();
            const dateMonthStr = date.toLocaleDateString("en-us", {
              month: "short",
            });
            const dateYearStr = date.toLocaleDateString("en-us", {
              year: "numeric",
            });
            const dateStr = `${dateMonthStr} ${english_ordinal_suffix(
              date
            )}, ${dateYearStr}`;

            await logseq.Editor.updateBlock(
              targetBlock.uuid,
              `## 🔖 [[phonetonote sync]] - [[${dateStr}]]`
            );

            items.forEach((item) => {
              markItemSynced(item, ptnKey);
            });
          }
        }
      } catch (e) {
        logseq.App.showMsg(e.toString(), "warning");
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
}

// bootstrap
logseq.ready(main).catch(console.error);
