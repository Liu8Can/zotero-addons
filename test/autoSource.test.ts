declare const Zotero: any;

import { assert } from "chai";
import { AddonInfoManager } from "../src/modules/addonInfo";
import {
  Sources,
  autoSource,
  currentSource,
  setAutoSource,
  setCurrentSource,
} from "../src/utils/configuration";

describe("automatic source selection", function () {
  it("re-probes on refresh and fetches the fastest reachable source", async function () {
    const originalRequest = Zotero.HTTP.request;
    const originalSource = currentSource().id;
    const originalAutoSource = autoSource();
    const jsdelivrSource = Sources.find(
      (source) => source.id === "source-zotero-scraper-jsdelivr",
    )!;
    const getRequests: { url: string; timeout?: number }[] = [];
    const targetZoteroVersion = Zotero.version.split(".")[0];
    const addonInfos = [
      {
        repo: "example/zotero-addon",
        releases: [
          {
            targetZoteroVersion,
            tagName: "v1.0.0",
            xpiDownloadUrl: {
              github:
                "https://github.com/example/zotero-addon/releases/download/v1.0.0/addon.xpi",
            },
          },
        ],
      },
    ];

    try {
      setCurrentSource("source-auto");
      setAutoSource(Sources[1]);
      Zotero.HTTP.request = async (
        method: string,
        url: string,
        options?: { timeout?: number },
      ) => {
        if (method === "HEAD") {
          if (url.includes("gitee.com")) {
            throw new Error("unreachable");
          }
          // Keep the gaps wider than the Zotero/Firefox timer granularity so
          // a busy CI runner cannot collapse every candidate to the same
          // measured latency and make this ordering assertion flaky.
          const delay = url.includes("cdn.jsdelivr.net")
            ? 5
            : url.includes("gh-proxy.org")
              ? 100
              : 200;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return {};
        }

        getRequests.push({ url, timeout: options?.timeout });
        return { response: JSON.stringify(addonInfos) };
      };

      const infos = await AddonInfoManager.shared.fetchAddonInfos(true);

      assert.lengthOf(infos, 1);
      assert.equal(autoSource()?.id, "source-zotero-scraper-jsdelivr");
      assert.deepEqual(getRequests, [
        {
          url: jsdelivrSource.api,
          timeout: 10000,
        },
      ]);
    } finally {
      Zotero.HTTP.request = originalRequest;
      setCurrentSource(originalSource);
      setAutoSource(originalAutoSource);
    }
  });
});
