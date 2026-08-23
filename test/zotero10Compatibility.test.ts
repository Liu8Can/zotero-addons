import { assert } from "chai";
import { TableColumnManager } from "../src/ui/table/TableColumnManager";
import { getActiveWindow } from "../src/utils/window";

describe("Zotero 10 UI compatibility", function () {
  it("keeps the add-on name column readable", function () {
    const nameColumn = new TableColumnManager().columns.find(
      (column) => column.dataKey === "menu-name",
    );

    assert.exists(nameColumn);
    assert.isAtLeast(nameColumn?.width ?? 0, 160);
    assert.equal(nameColumn?.minWidth, 160);
  });

  it("uses the active Zotero window for dependent dialogs", function () {
    const activeWindow = Services.focus.activeWindow as Window | null;
    if (
      activeWindow &&
      !Components.utils.isDeadWrapper(activeWindow) &&
      !activeWindow.closed
    ) {
      assert.strictEqual(getActiveWindow(), activeWindow);
    }
  });
});
