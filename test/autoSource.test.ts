declare const Zotero: any;

import { assert } from "chai";
import { AddonInfoManager } from "../src/modules/addonInfo";
import { Sources, autoSource, setAutoSource } from "../src/utils/configuration";

describe("automatic source selection", function () {
  it("fetches the fastest reachable source", async function () {
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
      setAutoSource(Sources[1]);
      const request = async (
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

      const infos = await AddonInfoManager.autoSwitchAvaliableApi(
        3000,
        10000,
        request as typeof Zotero.HTTP.request,
      );

      assert.lengthOf(infos, 1);
      assert.equal(autoSource()?.id, "source-zotero-scraper-jsdelivr");
      assert.deepEqual(getRequests, [
        {
          url: jsdelivrSource.api,
          timeout: 10000,
        },
      ]);
    } catch (error) {
      console.error(
        "automatic source selection test failed:",
        error instanceof Error ? error.stack || error.message : String(error),
      );
      throw error;
    } finally {
      setAutoSource(originalAutoSource);
    }
  });
});
