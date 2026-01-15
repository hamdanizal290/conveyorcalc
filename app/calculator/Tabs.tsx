"use client";

export type TabKey = "capacity" | "power" | "tension" | "components";

export function Tabs(props: { value: TabKey; onChange: (v: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; dot: "blue" | "green" | "orange" }[] =
    [
      { key: "capacity", label: "Capacity & Speed", dot: "blue" },
      { key: "power", label: "Power Analysis", dot: "green" },
      { key: "tension", label: "Belt Tension", dot: "orange" },
      { key: "components", label: "Components", dot: "green" },
    ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = props.value === t.key;

        const dotClass =
          t.dot === "blue"
            ? "bg-[rgb(var(--re-blue))]"
            : t.dot === "green"
              ? "bg-[rgb(var(--re-green))]"
              : "bg-[rgb(var(--re-orange))]";

        return (
          <button
            key={t.key}
            type="button"
            onClick={() => props.onChange(t.key)}
            className={[
              "px-3 py-2 rounded-xl border text-sm transition font-medium flex items-center gap-2",
              active
                ? "bg-[rgb(var(--re-blue))] text-white border-transparent shadow"
                : "bg-white/70 border-black/10 hover:border-black/20 hover:bg-white/90",
            ].join(" ")}
          >
            <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : dotClass}`} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}


