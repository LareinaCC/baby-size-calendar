import Link from "next/link";

type Props = {
  message: string;
};

/** 超过 0–5 岁适用范围时的友好提示（非冷冰冰的「输入错误」） */
export function OverAgeFriendlyNotice({ message }: Props) {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm sm:p-8">
        <p className="text-center text-4xl" aria-hidden>
          🌱
        </p>
        <h1 className="mt-4 text-center text-lg font-bold text-stone-900">
          哈哈，这位已经是大朋友啦
        </h1>
        <p className="mt-4 text-pretty text-center text-[15px] leading-relaxed text-stone-700">
          {message}
        </p>
        <Link
          href="/baby-size-calendar"
          className="mt-8 flex min-h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-orange-600"
        >
          返回重新填写
        </Link>
      </div>
    </main>
  );
}
