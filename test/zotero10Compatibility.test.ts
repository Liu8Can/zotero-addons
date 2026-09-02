import { assert } from "chai";
import {
  TableColumnManager,
  type TableColumnManagerDependencies,
} from "../src/ui/table/TableColumnManager";
import {
  getActiveWindow,
  isWindowAlive,
  resolveProgressWindowOwner,
} from "../src/utils/window";

type StoredColumn = {
  dataKey: string;
  hidden?: boolean;
  ordinal?: number;
  width?: unknown;
};

function getDefaultStoredColumns(): StoredColumn[] {
  const manager = new TableColumnManager({
    columnPreferenceStore: {
      getValue: () => [],
      setValue: () => undefined,
    },
    getMigrationPref: () => true,
    setMigrationPref: () => undefined,
    getColumnLabel: (key) => key,
  });

  return manager.columns.map(({ dataKey, hidden, ordinal, width }) => ({
    dataKey,
    hidden,
    ordinal,
    width,
  }));
}

function createColumnMigrationHarness(nameWidth: unknown) {
  let storedColumns = getDefaultStoredColumns();
  const storedNameColumn = storedColumns.find(
    (column) => column.dataKey === "menu-name",
  )!;
  if (typeof nameWidth === "undefined") {
    delete storedNameColumn.width;
  } else {
    storedNameColumn.width = nameWidth;
  }

  const migrationPrefs = new Map([
    ["tagColumnLayoutMigrated", true],
    ["nameColumnWidthMigrated", false],
  ]);
  let writeCount = 0;
  const dependencies: TableColumnManagerDependencies = {
    columnPreferenceStore: {
      getValue: () => storedColumns,
      setValue: (_key, value) => {
        storedColumns = (value as StoredColumn[]).map((column) => ({
          ...column,
        }));
        writeCount += 1;
      },
    },
    getMigrationPref: (key) => migrationPrefs.get(key),
    setMigrationPref: (key, value) => migrationPrefs.set(key, value),
    getColumnLabel: (key) => key,
  };

  return {
    dependencies,
    getStoredColumns: () => storedColumns,
    getWriteCount: () => writeCount,
    migrationPrefs,
  };
}

describe("Zotero 10 UI compatibility", function () {
  for (const [legacyWidth, expectedWidth, label] of [
    [undefined, 200, "missing"],
    ["invalid", 200, "invalid"],
    [159, 200, "159"],
    [160, 160, "160"],
    [240, 240, "240"],
  ] as const) {
    it(`migrates the persisted add-on name width ${label}`, function () {
      const harness = createColumnMigrationHarness(legacyWidth);
      const manager = new TableColumnManager(harness.dependencies);
      const nameColumn = manager.columns.find(
        (column) => column.dataKey === "menu-name",
      );

      assert.exists(nameColumn);
      assert.equal(nameColumn?.width, expectedWidth);
      assert.equal(nameColumn?.minWidth, 160);
      assert.equal(
        harness
          .getStoredColumns()
          .find((column) => column.dataKey === "menu-name")?.width,
        expectedWidth,
      );
      assert.isTrue(harness.migrationPrefs.get("nameColumnWidthMigrated"));
      assert.equal(harness.getWriteCount(), 1);

      const secondManager = new TableColumnManager(harness.dependencies);
      assert.isNotEmpty(secondManager.columns);
      assert.equal(harness.getWriteCount(), 1, "migration must be idempotent");
    });
  }

  it("returns only a live active window for dependent dialogs", function () {
    const activeWindow = Services.focus.activeWindow as Window | null;

    assert.strictEqual(
      getActiveWindow(),
      isWindowAlive(activeWindow) ? activeWindow : undefined,
    );
  });

  it("prefers a live owner and falls back from invalid owners", function () {
    const explicitOwner = { closed: false } as Window;
    const fallbackOwner = { closed: false } as Window;
    const closedWindow = { closed: true } as Window;

    assert.isTrue(isWindowAlive(explicitOwner));
    assert.isTrue(isWindowAlive(fallbackOwner));
    assert.strictEqual(
      resolveProgressWindowOwner(explicitOwner, fallbackOwner),
      explicitOwner,
    );
    assert.strictEqual(
      resolveProgressWindowOwner(closedWindow, fallbackOwner),
      fallbackOwner,
    );
    assert.isUndefined(resolveProgressWindowOwner(closedWindow, null));
  });
});
