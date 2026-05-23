const ICONS = [
  { emoji: "👶", label: "宝宝" },
  { emoji: "👕", label: "上衣" },
  { emoji: "🧦", label: "袜帽" },
  { emoji: "🧥", label: "外套" },
] as const;

type Props = {
  variant?: "poster" | "page";
};

export function ClothingIconStrip({ variant = "page" }: Props) {
  if (variant === "poster") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 14,
          fontSize: 32,
          lineHeight: 1,
        }}
        aria-hidden
      >
        {ICONS.map((item) => (
          <span key={item.label} title={item.label}>
            {item.emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 flex justify-center gap-5 text-3xl leading-none" aria-hidden>
      {ICONS.map((item) => (
        <span key={item.label} title={item.label}>
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
