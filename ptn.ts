import { FeedItem } from "ptn-helpers";

export const loadPtnData = async (ptnKey: string): Promise<FeedItem[]> => {
  const endpoint = `https://app.phonetonote.com/feed.json?ptn_key=${ptnKey}`;

  const data = await fetch(endpoint).then((res) => res.json());
  if (data.error) {
    throw new Error(`error: ${data.error}`);
  }
  return data?.items ?? [];
};

export const markItemSynced = async (item, ptnKey) => {
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
};
