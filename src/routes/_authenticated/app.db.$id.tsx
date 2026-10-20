import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Grid3x3,
  Plus,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import {
  LIST_COLORS,
  useCrud,
  useDatabases,
  useDbCells,
  useDbFields,
  useDbRows,
  type DbCell,
  type DbField,
  type DbRow,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/db/$id")({
  head: () => ({ meta: [{ title: "Database — Flowspace" }, { name: "robots", content: "noindex" }] }),
  component: DatabasePage,
});

const FIELD_TYPES = ["text", "number", "select", "checkbox", "date"] as const;
type FieldType = (typeof FIELD_TYPES)[number];
const TYPE_LABEL: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  checkbox: "Checkbox",
  date: "Date",
};
const COLOR_KEYS = Object.keys(LIST_COLORS);
type Option = { name: string; color: string };
const fieldOptions = (f: DbField): Option[] => (Array.isArray(f.options) ? (f.options as Option[]) : []);

function DatabasePage() {
  const { id } = Route.useParams();
  const { data: dbs = [], isLoading } = useDatabases();
  const { data: allFields = [] } = useDbFields();
  const { data: allRows = [] } = useDbRows();
  const { data: allCells = [] } = useDbCells();
  const dbCrud = useCrud("databases");
  const fieldCrud = useCrud("db_fields");
  const rowCrud = useCrud("db_rows");
  const cellCrud = useCrud("db_cells");

  const db = dbs.find((d) => d.id === id);
  const fields = useMemo(
    () => allFields.filter((f) => f.database_id === id).sort((a, b) => a.position - b.position),
    [allFields, id],
  );
  const rows = useMemo(
    () => allRows.filter((r) => r.database_id === id).sort((a, b) => a.position - b.position),
    [allRows, id],
  );
  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const cellMap = useMemo(() => {
    const m = new Map<string, DbCell>();
    allCells.forEach((c) => {
      if (rowIds.has(c.row_id)) m.set(`${c.row_id}:${c.field_id}`, c);
    });
    return m;
  }, [allCells, rowIds]);

  const [view, setView] = useState("table");
  useEffect(() => {
    if (db) setView(db.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.id, db?.view]);

  const [sort, setSort] = useState<{ fieldId: string; dir: "asc" | "desc" } | null>(null);
  const [search, setSearch] = useState("");

  function setCell(rowId: string, fieldId: string, value: unknown) {
    const existing = cellMap.get(`${rowId}:${fieldId}`);
    if (existing) cellCrud.update.mutate({ id: existing.id, value });
    else cellCrud.insert.mutate({ row_id: rowId, field_id: field_id, value });
  }

  function addRow(extra?: { fieldId: string; value: unknown }) {
    rowCrud.insert.mutate(
      { database_id: id, position: Date.now() },
      {
        onSuccess: (row) => {
          if (extra) setCell(row.id, extra.fieldId, extra.value);
        },
      },
    );
  }

  function cycleSort(fieldId: string) {
    setSort((s) =>
      s?.fieldId !== fieldId ? { fieldId, dir: "asc" } : s.dir === "asc" ? { fieldId, dir: "desc" } : null,
    );
  }

  if (isLoading) return null;
  if (!db) return <p className="text-muted-foreground">Database not found.</p>;

  const shown = rows.filter((r) => {
    if (!search.trim()) return true;
    return fields.some((f) => {
      const v = cellMap.get(`${r.id}:${f.id}`)?.value;
      return v != null && String(v).toLowerCase().includes(search.toLowerCase());
    });
  });
  if (sort) {
    const f = fields.find((x) => x.id === sort.fieldId);
    if (f) {
      shown.sort((a, b) => {
        const av = cellMap.get(`${a.id}:${f.id}`)?.value ?? "";
        const bv = cellMap.get(`${b.id}:${f.id}`)?.value ?? "";
        const cmp =
          f.type === "number"
            ? (Number(av) || 0) - (Number(bv) || 0)
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
  }

  const titleField = fields[0];
  const titleOf = (r: DbRow) => {
    const v = titleField ? cellMap.get(`${r.id}:${titleField.id}`)?.value : undefined;
    return v == null || v === "" ? "Untitled" : String(v);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">
        {db.icon} {db.title}
      </h1>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border-2 border-ink bg-card p-1">
          {(
            [
              ["table", Table2],
              ["board", Columns3],
              ["gallery", Grid3x3],
              ["calendar", CalendarDays],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                dbCrud.update.mutate({ id, view: v });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold capitalize",
                view === v ? "bg-ink text-background" : "hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {v}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter rows…"
          className="rounded-xl border-2 border-ink bg-card px-3 py-1.5 text-sm outline-none"
        />
        <button
          onClick={() => addRow()}
          className="ml-auto flex items-center gap-1 rounded-xl border-2 border-ink bg-lime px-3 py-1.5 font-display text-sm font-bold shadow-pop-sm active:translate-y-0.5 active:shadow-none"
        >
          <Plus className="h-4 w-4" /> New row
        </button>
      </div>

      {view === "table" && (
        <TableView
          fields={fields}
          rows={shown}
          cellMap={cellMap}
          setCell={setCell}
          fieldCrud={fieldCrud}
          rowCrud={rowCrud}
          addRow={addRow}
          sort={sort}
          onSort={cycleSort}
        />
      )}
      {view === "board" && (
        <BoardView fields={fields} rows={shown} cellMap={cellMap} setCell={setCell} titleOf={titleOf} />
      )}
      {view === "gallery" && (
        <GalleryView fields={fields} rows={shown} cellMap={cellMap} titleOf={titleOf} />
      )}
      {view === "calendar" && (
        <CalendarView fields={fields} rows={shown} cellMap={cellMap} setCell={setCell} titleOf={titleOf} addRow={addRow} />
      )}
    </div>
  );
}

/* ---------- Table ---------- */

function TableView({
  fields,
  rows,
  cellMap,
  setCell,
  fieldCrud,
  rowCrud,
  addRow,
  sort,
  onSort,
}: {
  fields: DbField[];
  rows: DbRow[];
  cellMap: Map<string, DbCell>;
  setCell: (rowId: string, fieldId: string, value: unknown) => void;
  fieldCrud: ReturnType<typeof useCrud>;
  rowCrud: ReturnType<typeof useCrud>;
  addRow: (extra?: { fieldId: string; value: unknown }) => void;
  sort: { fieldId: string; dir: "asc" | "desc" } | null;
  onSort: (fieldId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-card shadow-pop-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink align-top">
            {fields.map((f) => (
              <th key={f.id} className="group min-w-40 border-r border-border p-2 text-left">
                <div className="flex items-center gap-1">
                  <input
                    key={f.id + f.name}
                    defaultValue={f.name}
                    onBlur={(e) =>
                      e.target.value !== f.name && fieldCrud.update.mutate({ id: f.id, name: e.target.value })
                    }
                    className="w-full min-w-0 bg-transparent font-semibold outline-none"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => fieldCrud.update.mutate({ id: f.id, type: e.target.value })}
                    className="cursor-pointer bg-transparent text-xs text-muted-foreground outline-none"
                    aria-label="Field type"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => onSort(f.id)} className="text-xs" aria-label="Sort">
                    {sort?.fieldId === f.id ? (sort.dir === "asc" ? "↑" : "↓") : "⇅"}
                  </button>
                  <button
                    onClick={() => fieldCrud.remove.mutate(f.id)}
                    className="opacity-0 transition group-hover:opacity-60 hover:!opacity-100"
                    aria-label="Delete field"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {f.type === "select" && <OptionsEditor field={f} fieldCrud={fieldCrud} />}
              </th>
            ))}
            <th className="w-10 p-2">
              <button
                onClick={() => fieldCrud.insert.mutate({ database_id: fields[0]?.database_id, name: "Field", type: "text", position: Date.now() })}
                className="font-semibold text-primary"
                aria-label="Add field"
              >
                <Plus className="h-4 w-4" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="group border-b border-border hover:bg-accent/20">
              {fields.map((f) => (
                <td key={f.id} className="border-r border-border p-1 align-top">
                  <CellEditor field={f} cell={cellMap.get(`${r.id}:${f.id}`)} onSet={(v) => setCell(r.id, f.id, v)} />
                </td>
              ))}
              <td className="p-1 text-center">
                <button
                  onClick={() => rowCrud.remove.mutate(r.id)}
                  className="opacity-0 transition group-hover:opacity-60 hover:!opacity-100"
                  aria-label="Delete row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={fields.length + 1} className="p-1">
              <button
                onClick={() => addRow()}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> New row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function OptionsEditor({ field, fieldCrud }: { field: DbField; fieldCrud: ReturnType<typeof useCrud> }) {
  const opts = fieldOptions(field);
  const [name, setName] = useState("");
  if (field.type !== "select") return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {opts.map((o) => (
        <span
          key={o.name}
          className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", LIST_COLORS[o.color] ?? "bg-muted")}
        >
          {o.name}
          <button
            onClick={() => fieldCrud.update.mutate({ id: field.id, options: opts.filter((x) => x.name !== o.name) })}
            aria-label={`Remove option ${o.name}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            fieldCrud.update.mutate({
              id: field.id,
              options: [...opts, { name: name.trim(), color: COLOR_KEYS[opts.length % COLOR_KEYS.length] }],
            });
            setName("");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="+ option"
          className="w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

function CellEditor({ field, cell, onSet }: { field: DbField; cell?: DbCell; onSet: (v: unknown) => void }) {
  const value = cell?.value;
  if (field.type === "checkbox") {
    return (
      <button
        onClick={() => onSet(!value)}
        aria-label="Toggle checkbox"
        className={cn(
          "grid h-5 w-5 place-items-center rounded border-2 border-ink text-xs",
          value && "bg-lime",
        )}
      >
        {value ? "✓" : ""}
      </button>
    );
  }
  if (field.type === "select") {
    const opts = fieldOptions(field);
    const cur = typeof value === "string" ? opts.find((o) => o.name === value) : undefined;
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onSet(e.target.value || null)}
        className={cn(
          "w-full cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold outline-none",
          cur ? LIST_COLORS[cur.color] ?? "bg-muted" : "hover:bg-accent/40",
        )}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.name} value={o.name}>
            {o.name}
          </option>
        ))}
      </select>
    );
  }
  return <TextCell type={field.type} value={value} onSet={onSet} />;
}

function TextCell({ type, value, onSet }: { type: FieldType; value: unknown; onSet: (v: unknown) => void }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setV(value == null ? "" : String(value));
  }, [value, dirty]);
  function commit() {
    setDirty(false);
    if (type === "number") onSet(v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
    else onSet(v.trim() === "" ? null : v);
  }
  return (
    <input
      value={v}
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      onChange={(e) => {
        setDirty(true);
        setV(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full rounded bg-transparent px-1 py-0.5 outline-none focus:bg-accent/40"
    />
  );
}

/* ---------- Board ---------- */

function BoardView({
  fields,
  rows,
  cellMap,
  setCell,
  titleOf,
}: {
  fields: DbField[];
  rows: DbRow[];
  cellMap: Map<string, DbCell>;
  setCell: (rowId: string, fieldId: string, value: unknown) => void;
  titleOf: (r: DbRow) => string;
}) {
  const groupField = fields.find((f) => f.type === "select");
  const [over, setOver] = useState<string | null>(null);
  if (!groupField) {
    return <p className="text-muted-foreground">Add a Select field to use the board view.</p>;
  }
  const opts = fieldOptions(groupField);
  const groups: { label: string | null; color?: string; rows: DbRow[] }[] = [
    ...opts.map((o) => ({ label: o.name, color: o.color, rows: [] as DbRow[] })),
    { label: null, rows: [] as DbRow[] },
  ];
  rows.forEach((r) => {
    const v = cellMap.get(`${r.id}:${groupField.id}`)?.value;
    const g = groups.find((x) => x.label === v) ?? groups[groups.length - 1]!;
    g.rows.push(r);
  });

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {groups.map((g) => (
        <div
          key={g.label ?? "__none"}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(g.label ?? "__none");
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            const rowId = e.dataTransfer.getData("text/plain");
            setOver(null);
            if (rowId) setCell(rowId, groupField.id, g.label);
          }}
          className={cn(
            "flex min-h-64 flex-col gap-2 rounded-3xl border-2 border-ink bg-card p-3 transition",
            over === (g.label ?? "__none") && "-translate-y-1 shadow-pop",
          )}
        >
          <div className="flex items-center gap-2 px-1">
            {g.color ? (
              <span className={cn("h-3 w-3 rounded-full border-2 border-ink", LIST_COLORS[g.color])} />
            ) : (
              <span className="h-3 w-3 rounded-full border-2 border-ink bg-muted" />
            )}
            <span className="font-display font-bold">{g.label ?? "No value"}</span>
            <span className="ml-auto text-sm text-muted-foreground">{g.rows.length}</span>
          </div>
          {g.rows.map((r) => (
            <div
              key={r.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
              className="cursor-grab rounded-2xl border-2 border-ink bg-background p-3 shadow-pop-sm active:cursor-grabbing"
            >
              <div className="font-medium">{titleOf(r)}</div>
              <Chips fields={fields} row={r} cellMap={cellMap} skip={groupField.id} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Gallery ---------- */

function GalleryView({
  fields,
  rows,
  cellMap,
  titleOf,
}: {
  fields: DbField[];
  rows: DbRow[];
  cellMap: Map<string, DbCell>;
  titleOf: (r: DbRow) => string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border-2 border-ink bg-card p-4 shadow-pop-sm">
          <div className="font-display font-bold">{titleOf(r)}</div>
          <Chips fields={fields} row={r} cellMap={cellMap} />
        </div>
      ))}
      {rows.length === 0 && <p className="text-muted-foreground">No rows yet — add one from the toolbar.</p>}
    </div>
  );
}

function Chips({
  fields,
  row,
  cellMap,
  skip,
}: {
  fields: DbField[];
  row: DbRow;
  cellMap: Map<string, DbCell>;
  skip?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1 text-xs">
      {fields
        .filter((f) => f.id !== skip && (f.type === "select" || f.type === "date"))
        .map((f) => {
          const v = cellMap.get(`${row.id}:${f.id}`)?.value;
          if (v == null || v === "") return null;
          if (f.type === "select") {
            const o = fieldOptions(f).find((x) => x.name === v);
            return (
              <span key={f.id} className={cn("rounded-full px-2 py-0.5 font-semibold", LIST_COLORS[o?.color ?? ""] ?? "bg-muted")}>
                {String(v)}
              </span>
            );
          }
          return (
            <span key={f.id} className="rounded-full bg-muted px-2 py-0.5">
              {format(parseISO(String(v)), "MMM d")}
            </span>
          );
        })}
    </div>
  );
}

/* ---------- Calendar ---------- */

function CalendarView({
  fields,
  rows,
  cellMap,
  setCell,
  titleOf,
  addRow,
}: {
  fields: DbField[];
  rows: DbRow[];
  cellMap: Map<string, DbCell>;
  setCell: (rowId: string, fieldId: string, value: unknown) => void;
  titleOf: (r: DbRow) => string;
  addRow: (extra?: { fieldId: string; value: unknown }) => void;
}) {
  const dateField = fields.find((f) => f.type === "date");
  const [month, setMonth] = useState(startOfMonth(new Date()));
  if (!dateField) {
    return <p className="text-muted-foreground">Add a Date field to use the calendar view.</p>;
  }
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month" className="rounded-lg border-2 border-ink bg-card px-2 py-1 shadow-pop-sm">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-display text-lg font-bold">{format(month, "MMMM yyyy")}</span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" className="rounded-lg border-2 border-ink bg-card px-2 py-1 shadow-pop-sm">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-pop-sm">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="border-b-2 border-ink bg-secondary p-1 text-center text-xs font-bold">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const dayRows = rows.filter((r) => {
            const v = cellMap.get(`${r.id}:${dateField.id}`)?.value;
            return typeof v === "string" && isSameDay(parseISO(v), d);
          });
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-24 border-b border-r border-border p-1 text-xs",
                !isSameMonth(d, month) && "bg-muted/50 text-muted-foreground",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">{format(d, "d")}</span>
                <button
                  onClick={() => addRow({ fieldId: dateField.id, value: format(d, "yyyy-MM-dd") })}
                  className="opacity-40 transition hover:opacity-100"
                  aria-label={`Add row on ${format(d, "MMM d")}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {dayRows.map((r) => (
                <div key={r.id} className="mb-0.5 truncate rounded bg-accent px-1 py-0.5" title={titleOf(r)}>
                  {titleOf(r)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
